package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "tenants", indexes = {
        @Index(name = "idx_tenant_status", columnList = "status")
})
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false, length = 150)
    private String companyName;

    @Column(nullable = false, length = 20)
    private String plan = "BASIC";        // BASIC, PRO, ENTERPRISE

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";     // ACTIVE, SUSPENDED, TRIAL

    // 🚨 ENTERPRISE ADDITION: Stores JSON mapping configuration for custom file imports
    @Column(columnDefinition = "TEXT", name = "csv_mapping_config")
    private String csvMappingConfig;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
}