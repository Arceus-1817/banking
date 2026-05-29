package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;

@Data
@Entity
@Table(name = "branches", indexes = {
        @Index(name = "idx_branch_tenant", columnList = "tenant_id")
})
public class Branch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;            // e.g. "Shivaji Nagar Branch"

    @Column(length = 50)
    private String branchCode;      // e.g. "SHIV-01" (Crucial for HQ CSV matching)

    @Column(length = 255)
    private String address;

    @Column(length = 100)
    private String city;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
}