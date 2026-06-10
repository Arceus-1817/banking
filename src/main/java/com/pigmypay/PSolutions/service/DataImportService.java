package com.pigmypay.PSolutions.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.opencsv.CSVReader;
import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.DataSyncLog;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.DataSyncLogRepository;
import com.pigmypay.PSolutions.repository.LoanRepository;
import com.pigmypay.PSolutions.repository.TenantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.File;
import java.io.FileReader;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DataImportService {

    @Autowired private TenantRepository tenantRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private DataSyncLogRepository syncLogRepository;
    @Autowired private PlatformTransactionManager transactionManager;

    private static final int BATCH_SIZE = 1000;

    @Scheduled(cron = "0 0 3 * * ?") // 3:00 AM Every Day
    public void importNightlyBankDrops() {
        System.out.println("⏳ [ETL INBOUND] Waking up to process HQ CSV drops...");
        List<Tenant> activeTenants = tenantRepository.findByStatus("ACTIVE");

        for (Tenant tenant : activeTenants) {
            File file = new File("imports/hq_drop_" + tenant.getId() + ".csv");
            if (!file.exists()) continue;

            try {
                importTenantBankDrop(tenant, file);
            } catch (Exception e) {
                System.err.println("❌ [ETL INBOUND] Failed nightly import for tenant " + tenant.getId() + ": " + e.getMessage());
            }
        }
    }

    @Scheduled(fixedDelay = 10000) // Every 10 seconds poll directory
    public void pollImportsDirectory() {
        File dir = new File("imports");
        if (!dir.exists()) {
            dir.mkdirs();
            return;
        }

        File[] files = dir.listFiles((parentDir, name) -> name.startsWith("hq_drop_") && name.endsWith(".csv"));
        if (files == null || files.length == 0) return;

        for (File file : files) {
            String name = file.getName();
            // Skip manual temp files or directories
            if (name.contains("manual") || name.contains("archive")) continue;
            try {
                String tenantIdStr = name.substring("hq_drop_".length(), name.length() - ".csv".length());
                Long tenantId = Long.parseLong(tenantIdStr);

                Tenant tenant = tenantRepository.findById(tenantId).orElse(null);
                if (tenant != null && tenant.getStatus().equals("ACTIVE")) {
                    System.out.println("⚡ [ETL WATCHER] Detected new drop file: " + name + ". Starting ingestion...");
                    importTenantBankDrop(tenant, file);
                } else {
                    System.out.println("⚠️ [ETL WATCHER] Skipping file " + name + " (Tenant not found or inactive)");
                    file.delete();
                }
            } catch (Exception e) {
                System.err.println("❌ [ETL WATCHER] Failed to process drop file " + name + ": " + e.getMessage());
            }
        }
    }

    public DataSyncLog importTenantBankDrop(Tenant tenant, File file) throws Exception {
        System.out.println("⏳ [ETL INBOUND] Processing import file: " + file.getName() + " for tenant: " + tenant.getCompanyName());
        
        DataSyncLog syncLog = new DataSyncLog();
        syncLog.setTenant(tenant);
        syncLog.setSyncDirection("INBOUND");
        syncLog.setFileName(file.getName());

        TransactionTemplate transactionTemplate = new TransactionTemplate(transactionManager);

        try {
            transactionTemplate.executeWithoutResult(status -> {
                try (CSVReader reader = new CSVReader(new FileReader(file))) {
                    String[] headers = reader.readNext(); // Read headers
                    if (headers == null) throw new RuntimeException("CSV file is empty");

                    ObjectMapper mapper = new ObjectMapper();
                    Map<String, Integer> columnMap;
                    try {
                        columnMap = mapper.readValue(tenant.getCsvMappingConfig(), new TypeReference<Map<String, Integer>>(){});
                    } catch (Exception e) {
                        columnMap = new java.util.HashMap<>();
                    }

                    // Dynamically override mapping based on actual headers dropped
                    for (int i = 0; i < headers.length; i++) {
                        String h = headers[i].trim().toLowerCase();
                        if (h.equals("hq_customer_id") || h.equals("customer_id") || h.equals("cust_id") || h.equals("customerid")) {
                            columnMap.put("hqCustomerId", i);
                        } else if (h.equals("account_number") || h.equals("acc_no") || h.equals("accountnumber") || h.equals("acc_number")) {
                            columnMap.put("accountNumber", i);
                        } else if (h.equals("full_name") || h.equals("name") || h.equals("customer_name") || h.equals("customername")) {
                            columnMap.put("name", i);
                        } else if (h.equals("hq_loan_id") || h.equals("loan_id") || h.equals("loanid")) {
                            columnMap.put("hqLoanId", i);
                        } else if (h.equals("expected_daily_emi") || h.equals("daily_emi") || h.equals("expected_emi") || h.equals("expecteddailyemi")) {
                            columnMap.put("expectedDailyEmi", i);
                        } else if (h.equals("principal_amount") || h.equals("principal") || h.equals("loan_amount") || h.equals("loan_amt") || h.equals("principalamount")) {
                            columnMap.put("principalAmount", i);
                        } else if (h.equals("total_amount_due") || h.equals("total_due") || h.equals("outstanding_balance") || h.equals("totalamountdue")) {
                            columnMap.put("totalAmountDue", i);
                        } else if (h.equals("interest_rate") || h.equals("interest") || h.equals("interestrate") || h.equals("rate")) {
                            columnMap.put("interestRate", i);
                        }
                    }

                    // Validate that we have all mandatory mapping indexes
                    Integer custIdIdx = columnMap.get("hqCustomerId");
                    Integer nameIdx = columnMap.get("name");
                    Integer accNumIdx = columnMap.get("accountNumber");
                    
                    if (custIdIdx == null || nameIdx == null || accNumIdx == null) {
                        throw new RuntimeException("Missing critical columns in CSV file. Headers detected: " + String.join(", ", headers));
                    }

                    String[] line;
                    List<Loan> loanBatch = new ArrayList<>();
                    int totalProcessed = 0;

                    while ((line = reader.readNext()) != null) {
                        if (line.length == 0 || (line.length == 1 && line[0].trim().isEmpty())) continue;
                        totalProcessed++;

                        // Read fields dynamically based on matched indexes
                        String hqCustId = custIdIdx < line.length ? line[custIdIdx].trim() : "";
                        String name = nameIdx < line.length ? line[nameIdx].trim() : "";
                        String accNum = accNumIdx < line.length ? line[accNumIdx].trim() : "";
                        
                        if (hqCustId.isEmpty() || name.isEmpty() || accNum.isEmpty()) continue;

                        Integer loanIdIdx = columnMap.get("hqLoanId");
                        String hqLoanId = (loanIdIdx != null && loanIdIdx < line.length) ? line[loanIdIdx].trim() : "";

                        Integer emiIdx = columnMap.get("expectedDailyEmi");
                        BigDecimal dueToday = BigDecimal.ZERO;
                        if (emiIdx != null && emiIdx < line.length && !line[emiIdx].trim().isEmpty()) {
                            try { dueToday = new BigDecimal(line[emiIdx].trim()); } catch (Exception e) {}
                        }

                        // Update or Create Customer
                        Customer customer = customerRepository.findByHqCustomerIdAndTenantId(hqCustId, tenant.getId())
                                .orElse(new Customer());
                        customer.setHqCustomerId(hqCustId);
                        customer.setName(name);
                        customer.setAccountNumber(accNum);
                        customer.setTenant(tenant);
                        customer.setStatus("ACTIVE");

                        customer = customerRepository.save(customer);

                        // Update or Create the Loan
                        if (!hqLoanId.isEmpty()) {
                            Loan loan = loanRepository.findByHqLoanIdAndCustomerTenantId(hqLoanId, tenant.getId())
                                    .orElse(new Loan());
                            loan.setHqLoanId(hqLoanId);
                            loan.setCustomer(customer);
                            loan.setExpectedMonthlyEmi(dueToday);
                            loan.setAmountPaidLocally(BigDecimal.ZERO); // Reset local tracker for the new day
                            loan.setStatus("ACTIVE");

                            // Map loan amount and details dynamically if columns exist, else use smart defaults
                            BigDecimal principalVal = null;
                            Integer principalIdx = columnMap.get("principalAmount");
                            if (principalIdx != null && principalIdx < line.length && !line[principalIdx].trim().isEmpty()) {
                                try { principalVal = new BigDecimal(line[principalIdx].trim()); } catch (Exception e) {}
                            }
                            if (principalVal != null) {
                                loan.setPrincipalAmount(principalVal);
                            } else if (loan.getPrincipalAmount() == null || loan.getPrincipalAmount().compareTo(BigDecimal.ZERO) == 0) {
                                loan.setPrincipalAmount(dueToday.multiply(new BigDecimal("100")));
                            }

                            BigDecimal totalDueVal = null;
                            Integer totalDueIdx = columnMap.get("totalAmountDue");
                            if (totalDueIdx != null && totalDueIdx < line.length && !line[totalDueIdx].trim().isEmpty()) {
                                try { totalDueVal = new BigDecimal(line[totalDueIdx].trim()); } catch (Exception e) {}
                            }
                            if (totalDueVal != null) {
                                loan.setTotalAmountDue(totalDueVal);
                            } else if (loan.getTotalAmountDue() == null || loan.getTotalAmountDue().compareTo(BigDecimal.ZERO) == 0) {
                                loan.setTotalAmountDue(dueToday.multiply(new BigDecimal("120")));
                            }

                            BigDecimal interestRateVal = null;
                            Integer interestRateIdx = columnMap.get("interestRate");
                            if (interestRateIdx != null && interestRateIdx < line.length && !line[interestRateIdx].trim().isEmpty()) {
                                try { interestRateVal = new BigDecimal(line[interestRateIdx].trim()); } catch (Exception e) {}
                            }
                            if (interestRateVal != null) {
                                loan.setInterestRate(interestRateVal);
                            } else if (loan.getInterestRate() == null || loan.getInterestRate().compareTo(BigDecimal.ZERO) == 0) {
                                loan.setInterestRate(new BigDecimal("12.00"));
                            }

                            loanBatch.add(loan);
                        }

                        if (loanBatch.size() >= BATCH_SIZE) {
                            loanRepository.saveAll(loanBatch);
                            loanBatch.clear();
                        }
                    }

                    if (!loanBatch.isEmpty()) {
                        loanRepository.saveAll(loanBatch);
                    }

                    syncLog.setTotalRecordsFound(totalProcessed);
                    syncLog.setSuccessfulRecords(totalProcessed);
                    syncLog.setFailedRecords(0);
                    syncLog.setStatus("SUCCESS");
                    
                    System.out.println("✅ [ETL INBOUND] Successfully imported " + totalProcessed + " records for " + tenant.getCompanyName());
                } catch (Exception e) {
                    throw new RuntimeException(e);
                }
            });

        } catch (Exception e) {
            Throwable cause = e.getCause() != null ? e.getCause() : e;
            syncLog.setStatus("CRITICAL_FAIL");
            syncLog.setErrorReport(cause.getMessage());
            System.err.println("❌ [ETL INBOUND] Error manual processing tenant " + tenant.getId() + ": " + cause.getMessage());
        } finally {
            try {
                TransactionTemplate logTxTemplate = new TransactionTemplate(transactionManager);
                logTxTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
                logTxTemplate.executeWithoutResult(status -> {
                    syncLogRepository.save(syncLog);
                });
            } catch (Exception logEx) {
                System.err.println("❌ [ETL INBOUND] Failed to save sync log: " + logEx.getMessage());
            }
            archiveFile(file);
        }
        return syncLog;
    }

    private void archiveFile(File originalFile) {
        File archiveDir = new File("imports/archive");
        if (!archiveDir.exists()) archiveDir.mkdirs();
        originalFile.renameTo(new File(archiveDir, originalFile.getName() + "_" + System.currentTimeMillis()));
    }
}