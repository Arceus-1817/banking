package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "cash_settlements", indexes = {
        @Index(name = "idx_settlement_tenant", columnList = "tenant_id"),
        @Index(name = "idx_settlement_agent", columnList = "agent_id")
})
public class CashSettlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // The Field Agent handing over the cash
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id", nullable = false)
    private User agent;

    // The Branch Manager verifying and receiving the cash
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id", nullable = false)
    private User manager;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal systemExpectedAmount; // What the app says they collected

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal actualHandoverAmount; // What the manager physically counted

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal discrepancyAmount = BigDecimal.ZERO; // e.g., -₹500 (Shortfall)

    @Column(length = 255)
    private String managerNotes; // "Agent lost a 500 note, deducting from their commission."

    @Column(nullable = false, updatable = false)
    private LocalDateTime settlementTime = LocalDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
}