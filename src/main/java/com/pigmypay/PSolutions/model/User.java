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
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id")
    private Branch branch;

    @Column(unique = true, length = 50)
    private String agentEmployeeId; // e.g., "PGMY-1001"

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
    @Override
    public boolean isAccountNonLocked() { return true; }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() { return true; }


    // 🚨 SECURITY: Instantly kills their JWT token and app access if set to false
    @Column(nullable = false)
    private Boolean isActive = true;

    // Optional: Tracks when they last opened the app
    private java.time.LocalDateTime lastLoginAt;

    // -------------------------------------------------------------
    // ENTERPRISE SECURITY & DEVICE BINDING
    // -------------------------------------------------------------

    // Locks the agent to a specific company-issued phone or their personal device ID
    @Column(length = 255)
    private String registeredDeviceId;

    // Brute-force protection counter
    @Column(nullable = false)
    private Integer failedLoginAttempts = 0;

    // If they fail 5 times, we lock the account until this timestamp
    private java.time.LocalDateTime accountLockedUntil;

}