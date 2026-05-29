package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Loan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LoanRepository extends JpaRepository<Loan, Long> {

    // 🚨 SATELLITE ETL LOOKUPS: Match Bank's Loan ID
    Optional<Loan> findByHqLoanIdAndCustomerTenantId(String hqLoanId, Long tenantId);

    // MAKER-CHECKER SECURITY: Fetches loans awaiting Admin approval for a specific company
    List<Loan> findByCustomerTenantIdAndStatus(Long tenantId, String status);

    // MOBILE APP: Find active loans so the agent knows what to collect today
    List<Loan> findByCustomerIdAndStatus(Long customerId, String status);

    // DASHBOARD: General customer profile view
    List<Loan> findByCustomerId(Long customerId);
}