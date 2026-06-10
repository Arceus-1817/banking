package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * FIXED: Added all missing fields referenced across the codebase:
 *  - kycStatus (referenced in CustomersTab, CustomerProfileModal, CustomerController)
 *  - aadharNumber (referenced in CustomerProfileModal KYC tab)
 *  - panNumber (referenced in CustomerProfileModal KYC tab)
 *  - guarantorName (referenced in CustomerProfileModal)
 *  - guarantorPhoneNumber (referenced in CustomerProfileModal)
 */
@Data
@Entity
@Table(name = "customers", uniqueConstraints = {
        @UniqueConstraint(name = "uk_customer_hq_tenant", columnNames = {"hq_customer_id", "tenant_id"}),
        @UniqueConstraint(name = "uk_customer_acc_tenant", columnNames = {"account_number", "tenant_id"})
}, indexes = {
        @Index(name = "idx_customer_tenant", columnList = "tenant_id"),
        @Index(name = "idx_customer_route", columnList = "route_id"),
        @Index(name = "idx_customer_hq_id", columnList = "hq_customer_id")
})
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // SATELLITE MAPPING: The Bank's Master ID from the imported CSV
    @Column(length = 100)
    private String hqCustomerId;

    @Column(nullable = false, length = 100)
    private String accountNumber;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(length = 20)
    private String phoneNumber;

    @Column(length = 500)
    private String residentialAddress;

    // ─── KYC Fields ──────────────────────────────────────────────────────────
    @Column(length = 20)
    private String kycStatus = "PENDING"; // PENDING, VERIFIED, REJECTED

    @Column(length = 20)
    private String aadharNumber;

    @Column(length = 20)
    private String panNumber;

    @Column(length = 150)
    private String guarantorName;

    @Column(length = 20)
    private String guarantorPhoneNumber;

    // ─── Relationships ────────────────────────────────────────────────────────
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_agent_id")
    private User assignedAgent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private Route route;

    @Column(nullable = false)
    private Integer routeSequence = 0;

    @Column(precision = 12, scale = 2)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE"; // ACTIVE, CLOSURE_REQUESTED, CLOSED

    private Double latitude;

    private Double longitude;

    @Column(nullable = false, length = 20)
    private String riskStatus = "LOW"; // LOW, MEDIUM, HIGH, CRITICAL

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Tenant tenant;

    // Transient field calculated on the fly for the mobile app keypad
    @Transient
    private BigDecimal activeMonthlyEmi;

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