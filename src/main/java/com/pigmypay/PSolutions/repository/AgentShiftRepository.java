package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.AgentShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AgentShiftRepository extends JpaRepository<AgentShift, Long> {

    // MOBILE APP: Gets the agent's active route for today
    List<AgentShift> findByAgentIdAndStatus(Long agentId, String status);

    // DASHBOARD: Manager view of all active shifts in their company
    List<AgentShift> findByTenantIdAndStatus(Long tenantId, String status);

    // ADVANCED LOGISTICS: Check if an agent is currently scheduled for a specific date
    List<AgentShift> findByAgentIdAndTenantIdAndStartDateLessThanEqual(Long agentId, Long tenantId, LocalDate date);
}