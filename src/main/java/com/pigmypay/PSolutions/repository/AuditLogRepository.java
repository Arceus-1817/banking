package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    // RBI Compliance: Track exactly who approved a loan or deleted a route
    List<AuditLog> findByTenantIdOrderByTimestampDesc(Long tenantId);
    List<AuditLog> findByTenantIdAndTargetEntity(Long tenantId, String targetEntity);
}