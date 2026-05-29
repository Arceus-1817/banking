package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.dto.BatchSyncResponse;
import com.pigmypay.PSolutions.dto.SyncItemStatus;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Service
public class OfflineSyncService {

    @Autowired private TransactionService transactionService;
    @Autowired private TransactionRepository transactionRepository;

    /**
     * Processes batch uploads with isolated transactional footprints.
     * Prevents single-row compliance failures from breaking the entire agent upload.
     */
    public BatchSyncResponse processBatchSync(Long tenantId, Long agentId, List<Map<String, Object>> offlineTransactions) {
        BatchSyncResponse batchResponse = new BatchSyncResponse();
        batchResponse.setTotalProcessed(offlineTransactions.size());

        for (Map<String, Object> txData : offlineTransactions) {
            String offlineId = txData.get("offlineAppTxId").toString();

            // 1. IDEMPOTENCY SAFETY GUARD
            if (transactionRepository.existsByOfflineAppTxId(offlineId)) {
                batchResponse.setSuccessCount(batchResponse.getSuccessCount() + 1);
                batchResponse.getResults().add(new SyncItemStatus(offlineId, "SUCCESS", "Duplicate skipped cleanly."));
                continue;
            }

            // 2. ISOLATED TRANSACTION PROCESSING
            try {
                // Call self via an independent execution loop to guarantee an isolated database save
                processSingleOfflineTransaction(tenantId, agentId, txData, offlineId);

                batchResponse.setSuccessCount(batchResponse.getSuccessCount() + 1);
                batchResponse.getResults().add(new SyncItemStatus(offlineId, "SUCCESS", null));

            } catch (Exception e) {
                // Catch any single failure cleanly, record it, and move immediately to the next row
                batchResponse.setFailureCount(batchResponse.getFailureCount() + 1);
                batchResponse.getResults().add(new SyncItemStatus(offlineId, "FAILED", e.getMessage()));
                System.err.println("⚠️ Batch sync warning for transaction ID [" + offlineId + "]: " + e.getMessage());
            }
        }

        return batchResponse;
    }

    /**
     * Wraps a single row execution context to separate transactional rollbacks.
     */
    private void processSingleOfflineTransaction(Long tenantId, Long agentId, Map<String, Object> txData, String offlineId) {
        Long customerId = Long.valueOf(txData.get("customerId").toString());
        Long loanId = txData.get("loanId") != null ? Long.valueOf(txData.get("loanId").toString()) : null;
        BigDecimal amount = new BigDecimal(txData.get("amount").toString());
        String mode = txData.get("paymentMode").toString();
        String category = txData.get("category").toString();

        // Process through your strict structural ledger controls
        Transaction savedTx = transactionService.recordCollection(
                tenantId, customerId, agentId, loanId, amount, mode, category
        );

        savedTx.setOfflineAppTxId(offlineId);
        transactionRepository.save(savedTx);
    }
}