package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // ---------------------------------------------------------
    // 1. DASHBOARD ANALYTICS (Admin & Manager Views)
    // ---------------------------------------------------------
    List<Transaction> findByTenantIdAndTransactionDateAfter(Long tenantId, LocalDateTime after);
    List<Transaction> findByAgentBranchIdAndTransactionDateAfter(Long branchId, LocalDateTime after);
    List<Transaction> findByTenantIdOrderByTransactionDateDesc(Long tenantId);

    // ---------------------------------------------------------
    // 2. MOBILE APP (Agent Views)
    // ---------------------------------------------------------
    // Passbook view for a specific customer
    List<Transaction> findByCustomerIdOrderByTransactionDateDesc(Long customerId);

    // Agent's recent history
    List<Transaction> findTop50ByAgentIdOrderByTransactionDateDesc(Long agentId);

    // 🚨 PERFORMANCE NATIVE QUERY: Calculate physical cash collected today by the agent
    @Query(value = "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE agent_id = :agentId AND DATE(transaction_date) = CURDATE() AND payment_mode = :paymentMode AND is_reversed = false", nativeQuery = true)
    BigDecimal calculateTodayTotal(@Param("agentId") Long agentId, @Param("paymentMode") String paymentMode);

    // 🚨 PERFORMANCE NATIVE QUERY: Count skipped customers for the agent's route today
    @Query(value = "SELECT COUNT(*) FROM transactions WHERE agent_id = :agentId AND DATE(transaction_date) = CURDATE() AND (transaction_category LIKE 'SKIPPED%' OR transaction_category = 'CLOSURE_REQUESTED')", nativeQuery = true)
    Integer countTodaySkips(@Param("agentId") Long agentId);

    // ---------------------------------------------------------
    // 3. SETTLEMENT & ETL (The Nightly Sync)
    // ---------------------------------------------------------
    // Find physical cash sitting in an agent's pocket
    List<Transaction> findByAgentIdAndSettlementStatus(Long agentId, String status);

    // Nightly ETL EXPORT: Grab all transactions that happened today to send back to HQ
    List<Transaction> findByTenantIdAndTransactionDateBetween(Long tenantId, LocalDateTime start, LocalDateTime end);

    // Helper to calculate total collected against a specific HQ Loan today
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.associatedLoan.id = :loanId AND t.transactionDate >= :startDate AND t.transactionDate <= :endDate AND t.isReversed = false")
    BigDecimal sumAmountByLoanAndDateRange(
            @Param("loanId") Long loanId,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);


    boolean existsByOfflineAppTxId(String offlineAppTxId);

    List<Transaction> findByTenantIdAndSettlementStatus(Long tenantId, String unsettled);

    // Find all transactions by agent ID, ignoring null agent relationships
    @Query("SELECT t FROM Transaction t WHERE t.agent.id = :agentId ORDER BY t.transactionDate DESC")
    List<Transaction> findByAgentIdSafe(@Param("agentId") Long agentId);
}