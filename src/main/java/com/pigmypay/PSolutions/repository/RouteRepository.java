package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {

    List<Route> findByTenantId(Long tenantId);
    List<Route> findByBranchId(Long branchId);

    // For the mobile app: finding which route an agent is permanently assigned to
    List<Route> findByAssignedAgentId(Long agentId);

    // Prevents an admin from creating two routes with the exact same name in the same company
    Optional<Route> findByNameAndTenantId(String name, Long tenantId);
}