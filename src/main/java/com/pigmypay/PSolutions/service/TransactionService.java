package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.LoanRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class TransactionService {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private NotificationService notificationService;

    @Transactional
    public Transaction recordCollection(Long tenantId, Long customerId, Long agentId, Long loanId, BigDecimal amount, String paymentMode, String category) {

        Customer customer = customerRepository.findById(customerId).orElseThrow(() -> new RuntimeException("Customer not found"));
        User agent = userRepository.findById(agentId).orElseThrow(() -> new RuntimeException("Agent not found"));

        // 🚨 SECURITY: Strict Tenant Isolation
        if (!customer.getTenant().getId().equals(tenantId) || !agent.getTenant().getId().equals(tenantId)) {
            throw new SecurityException("Tenant mismatch block triggered!");
        }

        Transaction tx = new Transaction();
        tx.setTenant(customer.getTenant());
        tx.setCustomer(customer);
        tx.setAgent(agent);
        tx.setAmount(amount);
        tx.setPaymentMode(paymentMode);
        tx.setTransactionCategory(category);
        tx.setTransactionType("DEPOSIT");

        // 🚨 CASH LOGIC: UPI is instantly settled in the bank. Physical cash goes to the agent's pocket.
        if (paymentMode.equalsIgnoreCase("UPI")) {
            tx.setSettlementStatus("SETTLED");
        } else {
            tx.setSettlementStatus("UNSETTLED");

            // FRAUD PREVENTION: Check if agent has too much un-deposited cash
            BigDecimal currentCash = transactionRepository.calculateTodayTotal(agentId, "CASH");
            if (currentCash.add(amount).compareTo(agent.getMaxCashHoldingLimit()) > 0) {
                throw new RuntimeException("CASH LIMIT EXCEEDED: Agent must return to branch and settle cash before collecting more.");
            }
        }

        // ROUTE MONEY TO SAVINGS OR LOANS
        if (category.equals("LOAN_REPAYMENT") && loanId != null) {
            Loan loan = loanRepository.findById(loanId).orElseThrow();
            loan.setAmountPaidLocally(loan.getAmountPaidLocally().add(amount)); // Update local UI
            loanRepository.save(loan);
            tx.setAssociatedLoan(loan);
        } else {
            customer.setCurrentBalance(customer.getCurrentBalance().add(amount)); // Update local UI
            customerRepository.save(customer);
        }

        Transaction savedTx = transactionRepository.save(tx);

        // Fire background WhatsApp notification
        notificationService.sendWhatsAppReceipt(savedTx);

        return savedTx;
    }
}