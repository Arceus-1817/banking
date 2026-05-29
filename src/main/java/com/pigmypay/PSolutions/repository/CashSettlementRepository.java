package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.CashSettlement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CashSettlementRepository extends JpaRepository<CashSettlement, Long> {
    // Audit trail of physical cash handed over to the Branch Manager
    List<CashSettlement> findByTenantIdOrderBySettlementTimeDesc(Long tenantId);
    List<CashSettlement> findByAgentIdAndTenantId(Long agentId, Long tenantId);
}