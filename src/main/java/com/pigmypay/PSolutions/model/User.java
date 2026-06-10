package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

/**
 * FIXED CRITICAL BUG: isEnabled() and isAccountNonLocked() were hardcoded to return true,
 * meaning the JwtAuthenticationFilter kill-switch and brute-force lock were completely broken.
 * Now they correctly use isActive and accountLockedUntil fields.
 */
@Data
@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email"),
        @Index(name = "idx_user_tenant", columnList = "tenant_id")
})
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(unique = true, nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false, length = 20)
    private String phoneNumber;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(unique = true, length = 50)
    private String agentEmployeeId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    // FRAUD PREVENTION: Limits agent risk exposure out in the field
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal maxCashHoldingLimit = new BigDecimal("50000.00");

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() { return email; }

    @Override
    public boolean isAccountNonExpired() { return true; }

    /**
     * FIXED: Was hardcoded `return true`. Now checks accountLockedUntil timestamp.
     * This makes JwtAuthenticationFilter's brute-force lockout actually work.
     */
    @Override
    public boolean isAccountNonLocked() {
        if (accountLockedUntil == null) return true;
        return LocalDateTime.now().isAfter(accountLockedUntil);
    }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    /**
     * FIXED: Was hardcoded `return true`. Now checks isActive flag.
     * This makes the employee termination kill-switch actually work.
     */
    @Override
    public boolean isEnabled() {
        return isActive != null && isActive;
    }

    // SECURITY: Instantly kills JWT token and app access if set to false
    @Column(nullable = false)
    private Boolean isActive = true;

    // Tracks when they last opened the app
    private LocalDateTime lastLoginAt;

    // ENTERPRISE SECURITY & DEVICE BINDING
    @Column(length = 255)
    private String registeredDeviceId;

    // Brute-force protection counter
    @Column(nullable = false)
    private Integer failedLoginAttempts = 0;

    // If they fail 5 times, we lock the account until this timestamp
    private LocalDateTime accountLockedUntil;

    // PAYROLL & COMPENSATION DETAILS
    @Column(precision = 5, scale = 2, name = "commission_rate")
    private BigDecimal commissionRate = BigDecimal.ZERO;

    @Column(precision = 12, scale = 2, name = "base_salary")
    private BigDecimal baseSalary = BigDecimal.ZERO;

    // COMPLIANCE & IDENTITY
    @Column(length = 10, name = "pan_number")
    private String panNumber;

    @Column(length = 12, name = "aadhaar_number")
    private String aadhaarNumber;

    // BANK SETTLEMENT DETAILS
    @Column(length = 100, name = "bank_name")
    private String bankName;

    @Column(length = 50, name = "bank_account_number")
    private String bankAccountNumber;

    @Column(length = 20, name = "bank_ifsc_code")
    private String bankIfscCode;

    // EMPLOYMENT TIMELINE
    @Column(name = "date_of_birth")
    private java.time.LocalDate dateOfBirth;

    @Column(name = "date_of_joining")
    private java.time.LocalDate dateOfJoining;
}