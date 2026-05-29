package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {

    // Lookup by Exact Company Name
    Optional<Tenant> findByCompanyName(String companyName);

    // Find all active companies (Useful for the midnight Cron Job that triggers the CSV exports)
    List<Tenant> findByStatus(String status);
}