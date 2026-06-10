package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.repository.BranchRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
@RequestMapping("/api/stats")
public class StatsController {

    @Autowired private UserRepository userRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private JwtService jwtService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    // ── COMPANY WIDE STATS (Admins Only) ──
    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<?> getTenantStats(@PathVariable Long tenantId, @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            User requestingUser = userRepository.findByEmail(jwtService.extractUsername(token)).orElseThrow();

            // SATELLITE SECURITY: Blast Wall Check
            if (!requestingUser.getTenant().getId().equals(tenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: Cross-Tenant Data Request Blocked.");
            }

            // Route managers safely to their isolated dashboard
            if (requestingUser.getRole().name().equals("MANAGER")) {
                if (requestingUser.getBranch() == null) throw new RuntimeException("Manager has no assigned branch.");
                return getBranchStats(requestingUser.getBranch().getId(), tenantId);
            }

            var users = userRepository.findByTenantId(tenantId);
            var customers = customerRepository.findByTenantId(tenantId);

            long agentCount = users.stream().filter(u -> "AGENT".equals(u.getRole().name())).count();
            long managerCount = users.stream().filter(u -> "MANAGER".equals(u.getRole().name())).count();
            long branchCount = branchRepository.findByTenantId(tenantId).size();

            BigDecimal totalPortfolio = customers.stream()
                    .map(c -> c.getCurrentBalance() != null ? c.getCurrentBalance() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            // Today's Collections (Savings + Loans)
            LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
            List<Transaction> todayTxns = transactionRepository.findByTenantIdAndTransactionDateAfter(tenantId, startOfDay);

            BigDecimal todayCollection = todayTxns.stream()
                    .filter(t -> t.getTransactionCategory().equals("SAVINGS_DEPOSIT") || t.getTransactionCategory().equals("LOAN_REPAYMENT"))
                    .filter(t -> !t.getIsReversed())
                    .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);

            long todayTxnCount = todayTxns.stream()
                    .filter(t -> !t.getTransactionCategory().startsWith("SKIPPED") && !t.getIsReversed())
                    .count();

            // Agent distribution per Branch
            Map<String, Long> agentsPerBranch = users.stream()
                    .filter(u -> u.getBranch() != null && "AGENT".equals(u.getRole().name()))
                    .collect(Collectors.groupingBy(u -> u.getBranch().getName(), Collectors.counting()));

            Map<String, Object> stats = new LinkedHashMap<>();
            stats.put("agentCount", agentCount);
            stats.put("managerCount", managerCount);
            stats.put("customerCount", (long) customers.size());
            stats.put("branchCount", branchCount);
            stats.put("totalPortfolio", totalPortfolio);
            stats.put("todayCollection", todayCollection);
            stats.put("todayTxnCount", todayTxnCount);
            stats.put("agentsPerBranch", agentsPerBranch);

            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Stats error: " + e.getMessage());
        }
    }

    // ── ISOLATED BRANCH STATS (Managers Only) ──
    @GetMapping("/branch/{branchId}")
    public ResponseEntity<?> getBranchStatsDirect(@PathVariable Long branchId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            return getBranchStats(branchId, tokenTenantId);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // Helper Engine for Managers
    private ResponseEntity<?> getBranchStats(Long branchId, Long tenantId) {
        var agents = userRepository.findByBranchId(branchId);
        var customers = customerRepository.findByAssignedAgentBranchId(branchId);

        // Security check: Make sure this branch actually belongs to this company
        if (agents.stream().anyMatch(a -> !a.getTenant().getId().equals(tenantId))) {
            throw new SecurityException("Tenant Isolation Breach");
        }

        long agentCount = agents.stream().filter(u -> "AGENT".equals(u.getRole().name())).count();

        BigDecimal branchPortfolio = customers.stream()
                .map(c -> c.getCurrentBalance() != null ? c.getCurrentBalance() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime startOfDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        List<Transaction> branchTxns = transactionRepository.findByAgentBranchIdAndTransactionDateAfter(branchId, startOfDay);

        BigDecimal todayCollection = branchTxns.stream()
                .filter(t -> t.getTransactionCategory().equals("SAVINGS_DEPOSIT") || t.getTransactionCategory().equals("LOAN_REPAYMENT"))
                .filter(t -> !t.getIsReversed())
                .map(t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        Map<String, BigDecimal> agentCollections = branchTxns.stream()
                .filter(t -> t.getTransactionCategory().equals("SAVINGS_DEPOSIT") || t.getTransactionCategory().equals("LOAN_REPAYMENT"))
                .filter(t -> !t.getIsReversed())
                .collect(Collectors.groupingBy(
                        t -> t.getAgent() != null ? t.getAgent().getName() : "Unknown",
                        Collectors.mapping(
                                t -> t.getAmount() != null ? t.getAmount() : BigDecimal.ZERO,
                                Collectors.reducing(BigDecimal.ZERO, BigDecimal::add)
                        )
                ));

        return ResponseEntity.ok(Map.of(
                "agentCount", agentCount,
                "customerCount", (long) customers.size(),
                "branchPortfolio", branchPortfolio,
                "todayCollection", todayCollection,
                "agentCollections", agentCollections
        ));
    }
}