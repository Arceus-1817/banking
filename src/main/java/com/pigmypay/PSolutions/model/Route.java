package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "routes", indexes = {
        @Index(name = "idx_route_tenant", columnList = "tenant_id"),
        @Index(name = "idx_route_branch", columnList = "branch_id")
})
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name; // e.g., "Station Road South"

    @Column(length = 255)
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "branch_id", nullable = false)
    private Branch branch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "agent_id")
    private User assignedAgent;
}