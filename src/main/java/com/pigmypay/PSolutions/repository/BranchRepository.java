package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Branch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BranchRepository extends JpaRepository<Branch, Long> {
    List<Branch> findByTenantId(Long tenantId);

    // Banks use Branch Codes (e.g., PUNE-01), not names, for routing files!
    Optional<Branch> findByBranchCodeAndTenantId(String branchCode, Long tenantId);
}