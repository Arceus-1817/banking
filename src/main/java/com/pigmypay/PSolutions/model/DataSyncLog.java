package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "data_sync_logs", indexes = {
        @Index(name = "idx_sync_tenant", columnList = "tenant_id"),
        @Index(name = "idx_sync_date", columnList = "syncDate")
})
public class DataSyncLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20)
    private String syncDirection; // "INBOUND" (From HQ) or "OUTBOUND" (To HQ)

    @Column(nullable = false, length = 255)
    private String fileName;

    @Column(nullable = false)
    private Integer totalRecordsFound = 0;

    @Column(nullable = false)
    private Integer successfulRecords = 0;

    @Column(nullable = false)
    private Integer failedRecords = 0;

    @Column(nullable = false, length = 20)
    private String status; // "SUCCESS", "PARTIAL_FAIL", "CRITICAL_FAIL"

    // Stores the exact rows/errors if something breaks (e.g., "Row 45: Missing Acc Num")
    @Column(columnDefinition = "TEXT")
    private String errorReport;

    @Column(nullable = false, updatable = false)
    private LocalDateTime syncDate = LocalDateTime.now();

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;
}