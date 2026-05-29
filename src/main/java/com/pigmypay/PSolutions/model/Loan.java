package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Entity
@Table(name = "loans", indexes = {
        @Index(name = "idx_loan_customer", columnList = "customer_id"),
        @Index(name = "idx_loan_status", columnList = "status"),
        @Index(name = "idx_loan_hq", columnList = "hqLoanId")
})
public class Loan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 🚨 SATELLITE MAPPING: The Bank's Loan ID to attach to the export file
    @Column(unique = true, length = 100)
    private String hqLoanId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    // The overall outstanding debt reported by HQ in the morning CSV
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal totalAmountDue = BigDecimal.ZERO;

    // What the mobile app should automatically prompt the agent to collect
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal expectedMonthlyEmi = BigDecimal.ZERO;

    // Tracks locally what we collected today before syncing back to HQ
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amountPaidLocally = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE"; // ACTIVE, CLOSED

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }


}