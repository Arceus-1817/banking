package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.DataSyncLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DataSyncLogRepository extends JpaRepository<DataSyncLog, Long> {
    // Tracks if the midnight CSV import/export failed or succeeded
    List<DataSyncLog> findByTenantIdOrderBySyncDateDesc(Long tenantId);
    List<DataSyncLog> findByTenantIdAndStatus(Long tenantId, String status);
}