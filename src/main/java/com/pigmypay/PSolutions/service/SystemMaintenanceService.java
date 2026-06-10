package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.model.AgentShift;
import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.repository.AgentShiftRepository;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import com.pigmypay.PSolutions.repository.LoanRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SystemMaintenanceService {

    @Autowired
    private AgentShiftRepository shiftRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private LoanRepository loanRepository;

    @Scheduled(cron = "0 1 0 * * ?") // 12:01 AM
    @Transactional
    public void runMidnightHousekeeping() {
        System.out.println("🌙 [SYSTEM MAINT] Running midnight housekeeping...");

        // 1. Expire temporary agent routes
        LocalDate yesterday = LocalDate.now().minusDays(1);

        // 2. Recalculate customer default risk status
        try {
            recalculateAllCustomersRisk();
        } catch (Exception e) {
            System.err.println("❌ [SYSTEM MAINT] Risk calculation failed: " + e.getMessage());
        }

        System.out.println("🏁 [SYSTEM MAINT] Complete.");
    }

    @Transactional
    public void recalculateAllCustomersRisk() {
        System.out.println("⚡ [RISK ANALYTICS] Recalculating customer default risk scores...");
        List<Customer> customers = customerRepository.findAll();
        for (Customer customer : customers) {
            String risk = "LOW";
            
            // Check active loans
            List<Loan> activeLoans = loanRepository.findByCustomerIdAndStatus(customer.getId(), "ACTIVE");
            if (!activeLoans.isEmpty()) {
                // Determine missed collections count (days since last deposit)
                List<Transaction> txns = transactionRepository.findByCustomerIdOrderByTransactionDateDesc(customer.getId());
                long daysSinceLastTx = 30; // default to 30 if no txns
                if (!txns.isEmpty()) {
                    Transaction lastTx = txns.stream()
                            .filter(t -> !t.getIsReversed())
                            .findFirst()
                            .orElse(null);
                    if (lastTx != null) {
                        daysSinceLastTx = java.time.temporal.ChronoUnit.DAYS.between(lastTx.getTransactionDate(), LocalDateTime.now());
                    }
                }
                
                if (daysSinceLastTx > 90) {
                    risk = "CRITICAL";
                } else if (daysSinceLastTx > 60) {
                    risk = "HIGH";
                } else if (daysSinceLastTx > 30) {
                    risk = "MEDIUM";
                }
            } else {
                // Non-loan savings client
                List<Transaction> txns = transactionRepository.findByCustomerIdOrderByTransactionDateDesc(customer.getId());
                long daysSinceLastTx = 30; // default to 30 if no txns
                if (!txns.isEmpty()) {
                    Transaction lastTx = txns.stream()
                            .filter(t -> !t.getIsReversed())
                            .findFirst()
                            .orElse(null);
                    if (lastTx != null) {
                        daysSinceLastTx = java.time.temporal.ChronoUnit.DAYS.between(lastTx.getTransactionDate(), LocalDateTime.now());
                    }
                }
                
                if (daysSinceLastTx > 30) {
                    risk = "HIGH";
                } else if (daysSinceLastTx > 14) {
                    risk = "MEDIUM";
                }
            }
            
            customer.setRiskStatus(risk);
            customerRepository.save(customer);
        }
        System.out.println("✅ [RISK ANALYTICS] Customer default risk recalculation complete.");
    }
}