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

    @Column(length = 100, name = "upi_id")
    private String upiId;

    @Column(length = 150, name = "upi_merchant_name")
    private String upiMerchantName;

    @Column(length = 255, name = "company_address")
    private String companyAddress;

    @Column(length = 50, name = "gst_number")
    private String gstNumber;

    @Column(length = 100, name = "company_email")
    private String companyEmail;

    @Column(length = 20, name = "company_phone")
    private String companyPhone;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "subscription_expires_at")
    private LocalDateTime subscriptionExpiresAt;
}