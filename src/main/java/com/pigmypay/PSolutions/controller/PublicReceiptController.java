package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin
@Transactional
@RequestMapping("/api/public/transactions")
public class PublicReceiptController {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private CustomerRepository customerRepository;

    @GetMapping("/receipt/{txnId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getPublicReceipt(@PathVariable Long txnId) {
        try {
            Transaction txn = transactionRepository.findById(txnId)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));
            
            Customer customer = txn.getCustomer();
            
            // Fetch mini ledger (last 5 transactions) for this customer
            List<Transaction> miniLedger = transactionRepository.findByCustomerIdOrderByTransactionDateDesc(customer.getId());
            int limit = Math.min(5, miniLedger.size());
            List<Transaction> miniLedgerSub = miniLedger.subList(0, limit);

            Map<String, Object> data = new HashMap<>();
            
            // Transaction summary
            Map<String, Object> txnData = new HashMap<>();
            txnData.put("id", txn.getId());
            txnData.put("amount", txn.getAmount());
            txnData.put("transactionDate", txn.getTransactionDate());
            txnData.put("transactionCategory", txn.getTransactionCategory());
            txnData.put("paymentMode", txn.getPaymentMode());
            txnData.put("isReversed", txn.getIsReversed());
            txnData.put("rating", txn.getRating());
            txnData.put("feedback", txn.getFeedback());
            txnData.put("agentName", txn.getAgent() != null ? txn.getAgent().getName() : "System");
            data.put("transaction", txnData);

            // Customer summary
            Map<String, Object> custData = new HashMap<>();
            custData.put("name", customer.getName());
            custData.put("accountNumber", customer.getAccountNumber());
            custData.put("currentBalance", customer.getCurrentBalance());
            data.put("customer", custData);

            // Mini ledger list (mapped nicely to avoid circular references and lazy exceptions)
            List<?> ledgerData = miniLedgerSub.stream().map(t -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", t.getId());
                m.put("amount", t.getAmount());
                m.put("transactionDate", t.getTransactionDate());
                m.put("transactionCategory", t.getTransactionCategory());
                m.put("paymentMode", t.getPaymentMode());
                m.put("isReversed", t.getIsReversed());
                return m;
            }).toList();
            data.put("miniLedger", ledgerData);

            return ResponseEntity.ok(data);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching receipt: " + e.getMessage());
        }
    }

    @PostMapping("/receipt/{txnId}/rate")
    public ResponseEntity<?> submitRating(
            @PathVariable Long txnId,
            @RequestBody Map<String, Object> payload) {
        try {
            Transaction txn = transactionRepository.findById(txnId)
                    .orElseThrow(() -> new RuntimeException("Transaction not found"));
            
            Integer rating = (Integer) payload.get("rating");
            String feedback = (String) payload.get("feedback");

            if (rating == null || rating < 1 || rating > 5) {
                return ResponseEntity.badRequest().body("Rating must be between 1 and 5");
            }

            txn.setRating(rating);
            txn.setFeedback(feedback);
            transactionRepository.save(txn);

            return ResponseEntity.ok(Map.of(
                    "status", "success",
                    "message", "Thank you! Your feedback has been recorded.",
                    "rating", rating,
                    "feedback", feedback
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error saving rating: " + e.getMessage());
        }
    }
}
