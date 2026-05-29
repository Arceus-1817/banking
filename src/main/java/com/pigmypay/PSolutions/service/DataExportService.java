package com.pigmypay.PSolutions.service;

import com.opencsv.CSVWriter;
import com.pigmypay.PSolutions.model.DataSyncLog;
import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.repository.DataSyncLogRepository;
import com.pigmypay.PSolutions.repository.TenantRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.FileWriter;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class DataExportService {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private DataSyncLogRepository syncLogRepository;

    @Scheduled(cron = "0 30 23 * * ?") // 11:30 PM Every Night
    public void exportDailyCollectionsToHQ() {
        System.out.println("⏳ [ETL OUTBOUND] Waking up to generate Bank transaction files...");

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().plusDays(1).atStartOfDay();

        List<Tenant> activeTenants = tenantRepository.findByStatus("ACTIVE");

        for (Tenant tenant : activeTenants) {
            String fileName = "exports/tx_journal_" + tenant.getId() + "_" + LocalDate.now() + ".csv";
            new File("exports").mkdirs();

            DataSyncLog syncLog = new DataSyncLog();
            syncLog.setTenant(tenant);
            syncLog.setSyncDirection("OUTBOUND");
            syncLog.setFileName(fileName);

            try (CSVWriter writer = new CSVWriter(new FileWriter(fileName))) {

                // STANDARD BANKING OUTPUT FORMAT
                String[] header = {"PigmyTxID", "HQ_Customer_ID", "HQ_Loan_ID", "Amount", "Mode", "Agent_Emp_ID", "Timestamp"};
                writer.writeNext(header);

                List<Transaction> todayTxns = transactionRepository.findByTenantIdAndTransactionDateBetween(
                        tenant.getId(), startOfDay, endOfDay);

                for (Transaction tx : todayTxns) {
                    String hqLoanId = (tx.getAssociatedLoan() != null) ? tx.getAssociatedLoan().getHqLoanId() : "SAVINGS";

                    String[] data = {
                            tx.getId().toString(),
                            tx.getCustomer().getHqCustomerId(),
                            hqLoanId,
                            tx.getAmount().toString(),
                            tx.getPaymentMode(),
                            tx.getAgent().getAgentEmployeeId(),
                            tx.getTransactionDate().toString()
                    };
                    writer.writeNext(data);
                }

                syncLog.setTotalRecordsFound(todayTxns.size());
                syncLog.setSuccessfulRecords(todayTxns.size());
                syncLog.setStatus("SUCCESS");

                System.out.println("✅ [ETL OUTBOUND] Exported " + todayTxns.size() + " transactions for " + tenant.getCompanyName());

                // 🚨 TODO: Upload via SFTP here

            } catch (Exception e) {
                syncLog.setStatus("CRITICAL_FAIL");
                syncLog.setErrorReport(e.getMessage());
                System.err.println("❌ [ETL OUTBOUND] Failed export for tenant " + tenant.getId());
            } finally {
                syncLogRepository.save(syncLog);
            }
        }
    }
}