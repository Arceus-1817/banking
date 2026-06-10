package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * FIXED: Added all missing fields referenced across the codebase:
 *  - principalAmount (referenced in LoanController, CustomerProfileModal)
 *  - monthlyEmiAmount (referenced in TransactionController as getMonthlyEmiAmount())
 *  - amountPaid (referenced in TransactionController, separate from amountPaidLocally)
 *  - arrearsBalance (referenced in TransactionController)
 *  - penaltyCharges (referenced in TransactionController)
 *  - endDate (referenced in TransactionController when loan closes)
 *  - interestRate (referenced in CustomerProfileModal)
 */
@Data
@Entity
@Table(name = "loans", uniqueConstraints = {
        @UniqueConstraint(name = "uk_loan_hq_customer", columnNames = {"hq_loan_id", "customer_id"})
}, indexes = {
        @Index(name = "idx_loan_customer", columnList = "customer_id"),
        @Index(name = "idx_loan_status", columnList = "status"),
        @Index(name = "idx_loan_hq", columnList = "hq_loan_id")
})
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SATELLITE MAPPING: The Bank's Loan ID to attach to the export file
    @Column(length = 100)
    private String hqLoanId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    // The original principal sanctioned
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal principalAmount = BigDecimal.ZERO;

    // The flat interest rate percentage (e.g., 10.0 for 10%)
    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal interestRate = BigDecimal.ZERO;

    // The overall outstanding debt reported by HQ in the morning CSV
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmountDue = BigDecimal.ZERO;

    // What the mobile app should automatically prompt the agent to collect per month
    // ALIASED: monthlyEmiAmount is the canonical name; expectedMonthlyEmi is the Satellite CSV field
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal monthlyEmiAmount = BigDecimal.ZERO;

    // Satellite CSV field alias - kept for backward compat with DataImportService
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedMonthlyEmi = BigDecimal.ZERO;

    @Column(name = "tenure_months", nullable = false)
    private Integer tenureMonths = 12;

    // Total amount paid back (canonical tracking)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    // Tracks locally what we collected today before syncing back to HQ
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPaidLocally = BigDecimal.ZERO;

    // Overdue amount carried from previous periods
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal arrearsBalance = BigDecimal.ZERO;

    // Late payment penalties
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal penaltyCharges = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE"; // ACTIVE, CLOSED, PENDING_APPROVAL

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // Date the loan was fully closed/paid off
    private LocalDate endDate;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        // Sync convenience fields on create
        if (this.monthlyEmiAmount.compareTo(BigDecimal.ZERO) == 0 && this.expectedMonthlyEmi.compareTo(BigDecimal.ZERO) > 0) {
            this.monthlyEmiAmount = this.expectedMonthlyEmi;
        }
        if (this.expectedMonthlyEmi.compareTo(BigDecimal.ZERO) == 0 && this.monthlyEmiAmount.compareTo(BigDecimal.ZERO) > 0) {
            this.expectedMonthlyEmi = this.monthlyEmiAmount;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Convenience: keep both EMI fields in sync
    public void setMonthlyEmiAmount(BigDecimal amount) {
        this.monthlyEmiAmount = amount;
        this.expectedMonthlyEmi = amount;
    }

    public void setExpectedMonthlyEmi(BigDecimal amount) {
        this.expectedMonthlyEmi = amount;
        this.monthlyEmiAmount = amount;
    }
}