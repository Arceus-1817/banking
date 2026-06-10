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
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.UserRepository;
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
    @Autowired private UserRepository userRepository;
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
                importTenantBankDrop(tenant, file, null);
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
                    importTenantBankDrop(tenant, file, null);
                } else {
                    System.out.println("⚠️ [ETL WATCHER] Skipping file " + name + " (Tenant not found or inactive)");
                    file.delete();
                }
            } catch (Exception e) {
                System.err.println("❌ [ETL WATCHER] Failed to process drop file " + name + ": " + e.getMessage());
            }
        }
    }

    public DataSyncLog importTenantBankDrop(Tenant tenant, File file, Long overrideAgentId) throws Exception {
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
                        } else if (h.equals("agent_email") || h.equals("agentemail") || h.equals("agent_id") || h.equals("agentid") || h.equals("agent_employee_id") || h.equals("agentemployeeid") || h.equals("agent")) {
                            columnMap.put("agentIdentifier", i);
                        }
                    }

                    // Validate that we have all mandatory mapping indexes
                    Integer custIdIdx = columnMap.get("hqCustomerId");
                    Integer nameIdx = columnMap.get("name");
                    Integer accNumIdx = columnMap.get("accountNumber");
                    
                    if (custIdIdx == null || nameIdx == null || accNumIdx == null) {
                        throw new RuntimeException("Missing critical columns in CSV file. Headers detected: " + String.join(", ", headers));
                    }

                    // In-memory caching for batch performance
                    List<Customer> tenantCustomers = customerRepository.findByTenantId(tenant.getId());
                    Map<String, Customer> customerMap = new java.util.HashMap<>();
                    for (Customer c : tenantCustomers) {
                        if (c.getHqCustomerId() != null) {
                            customerMap.put(c.getHqCustomerId(), c);
                        }
                    }

                    List<Loan> tenantLoans = loanRepository.findByCustomerTenantId(tenant.getId());
                    Map<String, Loan> loanMap = new java.util.HashMap<>();
                    for (Loan l : tenantLoans) {
                        if (l.getHqLoanId() != null) {
                            loanMap.put(l.getHqLoanId(), l);
                        }
                    }

                    List<User> tenantUsers = userRepository.findByTenantId(tenant.getId());
                    Map<Long, User> userByIdMap = new java.util.HashMap<>();
                    Map<String, User> userByEmailMap = new java.util.HashMap<>();
                    Map<String, User> userByEmpIdMap = new java.util.HashMap<>();
                    for (User u : tenantUsers) {
                        userByIdMap.put(u.getId(), u);
                        if (u.getEmail() != null) userByEmailMap.put(u.getEmail().toLowerCase(), u);
                        if (u.getAgentEmployeeId() != null) userByEmpIdMap.put(u.getAgentEmployeeId(), u);
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

                        // Resolve the agent to assign using in-memory cache
                        User assignedAgent = null;
                        if (overrideAgentId != null) {
                            assignedAgent = userByIdMap.get(overrideAgentId);
                        } else {
                            Integer agentIdx = columnMap.get("agentIdentifier");
                            String agentIdentifier = (agentIdx != null && agentIdx < line.length) ? line[agentIdx].trim() : "";
                            if (!agentIdentifier.isEmpty()) {
                                try {
                                    Long agentDbId = Long.parseLong(agentIdentifier);
                                    assignedAgent = userByIdMap.get(agentDbId);
                                } catch (NumberFormatException e) {
                                    assignedAgent = userByEmailMap.get(agentIdentifier.toLowerCase());
                                    if (assignedAgent == null) {
                                        assignedAgent = userByEmpIdMap.get(agentIdentifier);
                                    }
                                }
                            }
                        }

                        // Update or Create Customer using in-memory cache
                        Customer customer = customerMap.get(hqCustId);
                        if (customer == null) {
                            customer = new Customer();
                            customer.setHqCustomerId(hqCustId);
                            customer.setTenant(tenant);
                        }
                        customer.setName(name);
                        customer.setAccountNumber(accNum);
                        customer.setStatus("ACTIVE");
                        if (assignedAgent != null && assignedAgent.getTenant().getId().equals(tenant.getId())) {
                            customer.setAssignedAgent(assignedAgent);
                        }

                        customer = customerRepository.save(customer);
                        customerMap.put(customer.getHqCustomerId(), customer); // Add/update in cache

                        // Update or Create the Loan using in-memory cache
                        if (!hqLoanId.isEmpty()) {
                            Loan loan = loanMap.get(hqLoanId);
                            if (loan == null) {
                                loan = new Loan();
                                loan.setHqLoanId(hqLoanId);
                            }
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
                            loanMap.put(loan.getHqLoanId(), loan); // Update cache
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