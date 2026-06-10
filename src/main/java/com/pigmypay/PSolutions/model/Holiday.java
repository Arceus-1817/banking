package com.pigmypay.PSolutions.model;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Data
@Entity
@Table(name = "holidays", indexes = {
        @Index(name = "idx_holiday_tenant", columnList = "tenant_id"),
        @Index(name = "idx_holiday_date", columnList = "holidayDate")
})
public class Holiday {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private LocalDate holidayDate;

    @Column(nullable = false, length = 200)
    private String description; // e.g., "Sunday", "Diwali Market Closure"

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tenant_id", nullable = false)
    @com.fasterxml.jackson.annotation.JsonIgnore
    private Tenant tenant;
}