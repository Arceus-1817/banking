package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {

    // 🚨 SATELLITE ETL LOOKUPS: For matching the Bank's CSV drop to our database instantly
    Optional<Customer> findByHqCustomerIdAndTenantId(String hqCustomerId, Long tenantId);
    Optional<Customer> findByAccountNumberAndTenantId(String accountNumber, Long tenantId);

    // SECURITY: Tenant-scoped dashboard views
    List<Customer> findByTenantId(Long tenantId);
    List<Customer> findByAssignedAgentIdAndTenantId(Long agentId, Long tenantId);

    // LOGISTICS: For the Manager's branch-level sorting
    List<Customer> findByAssignedAgentBranchId(Long branchId);

    // LOGISTICS: For the Agent's mobile app route generation
    List<Customer> findByRouteIdOrderByRouteSequenceAsc(Long routeId);
}