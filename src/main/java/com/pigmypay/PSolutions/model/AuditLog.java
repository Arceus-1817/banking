package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "audit_logs", indexes = {
        @Index(name = "idx_audit_tenant", columnList = "tenant_id"),
        @Index(name = "idx_audit_action", columnList = "actionType")
})
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The user who performed the action
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 50)
    private String actionType; // "CREATE_ROUTE", "APPROVE_LOAN", "DELETE_USER"

    @Column(nullable = false, length = 100)
    private String targetEntity; // "LOAN", "ROUTE", "USER"

    @Column(nullable = false)
    private Long targetEntityId; // The ID of the thing they changed

    // Stores the JSON representation of what it looked like BEFORE the change
    @Column(columnDefinition = "TEXT")
    private String previousState;

    // Stores the JSON representation of what it looked like AFTER the change
    @Column(columnDefinition = "TEXT")
    private String newState;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Tenant tenant;
}