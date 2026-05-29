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
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
import java.io.FileReader;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DataImportService {

    @Autowired private TenantRepository tenantRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private DataSyncLogRepository syncLogRepository;

    private static final int BATCH_SIZE = 1000;

    @Scheduled(cron = "0 0 3 * * ?") // 3:00 AM Every Day
    @Transactional
    public void importNightlyBankDrops() {
        System.out.println("⏳ [ETL INBOUND] Waking up to process HQ CSV drops...");

        List<Tenant> activeTenants = tenantRepository.findByStatus("ACTIVE");

        for (Tenant tenant : activeTenants) {
            File file = new File("imports/hq_drop_" + tenant.getId() + ".csv");
            if (!file.exists()) continue;

            DataSyncLog syncLog = new DataSyncLog();
            syncLog.setTenant(tenant);
            syncLog.setSyncDirection("INBOUND");
            syncLog.setFileName(file.getName());

            try (CSVReader reader = new CSVReader(new FileReader(file))) {

                // 1. Get the dynamic mapping configuration for this specific bank
                ObjectMapper mapper = new ObjectMapper();
                Map<String, Integer> columnMap = mapper.readValue(tenant.getCsvMappingConfig(), new TypeReference<Map<String, Integer>>(){});

                reader.readNext(); // Skip headers
                String[] line;
                List<Customer> customerBatch = new ArrayList<>();
                List<Loan> loanBatch = new ArrayList<>();
                int totalProcessed = 0;

                while ((line = reader.readNext()) != null) {
                    totalProcessed++;

                    // 2. Read fields dynamically based on the Bank's mapping
                    String hqCustId = line[columnMap.get("hqCustomerId")];
                    String name = line[columnMap.get("name")];
                    String accNum = line[columnMap.get("accountNumber")];
                    String hqLoanId = line[columnMap.get("hqLoanId")];
                    BigDecimal dueToday = new BigDecimal(line[columnMap.get("expectedDailyEmi")]);

                    // 3. Update or Create Customer
                    Customer customer = customerRepository.findByHqCustomerIdAndTenantId(hqCustId, tenant.getId())
                            .orElse(new Customer());
                    customer.setHqCustomerId(hqCustId);
                    customer.setName(name);
                    customer.setAccountNumber(accNum);
                    customer.setTenant(tenant);
                    customer.setStatus("ACTIVE");

                    // Note: We don't save immediately, we batch it.
                    // But we need the ID for the loan, so if it's new, we must save it first.
                    if(customer.getId() == null) { customer = customerRepository.save(customer); }

                    // 4. Update or Create the Dumb Terminal Loan
                    if (hqLoanId != null && !hqLoanId.isEmpty()) {
                        Loan loan = loanRepository.findByHqLoanIdAndCustomerTenantId(hqLoanId, tenant.getId())
                                .orElse(new Loan());
                        loan.setHqLoanId(hqLoanId);
                        loan.setCustomer(customer);
                        loan.setExpectedMonthlyEmi(dueToday); // The ONLY math we care about
                        loan.setAmountPaidLocally(BigDecimal.ZERO); // Reset local tracker for the new day
                        loan.setStatus("ACTIVE");
                        loanBatch.add(loan);
                    }

                    if (loanBatch.size() >= BATCH_SIZE) {
                        loanRepository.saveAll(loanBatch);
                        loanBatch.clear();
                    }
                }

                if (!loanBatch.isEmpty()) loanRepository.saveAll(loanBatch);

                syncLog.setTotalRecordsFound(totalProcessed);
                syncLog.setSuccessfulRecords(totalProcessed);
                syncLog.setStatus("SUCCESS");
                System.out.println("✅ [ETL INBOUND] Successfully imported " + totalProcessed + " records for " + tenant.getCompanyName());

            } catch (Exception e) {
                syncLog.setStatus("CRITICAL_FAIL");
                syncLog.setErrorReport(e.getMessage());
                System.err.println("❌ [ETL INBOUND] Error processing tenant " + tenant.getId() + ": " + e.getMessage());
            } finally {
                syncLogRepository.save(syncLog);
                archiveFile(file);
            }
        }
    }

    private void archiveFile(File originalFile) {
        File archiveDir = new File("imports/archive");
        if (!archiveDir.exists()) archiveDir.mkdirs();
        originalFile.renameTo(new File(archiveDir, originalFile.getName() + "_" + System.currentTimeMillis()));
    }
}