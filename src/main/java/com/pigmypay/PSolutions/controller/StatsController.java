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

    private int calculateAgentStreak(Long agentId) {
        List<Transaction> txns = transactionRepository.findByAgentIdSafe(agentId);
        if (txns.isEmpty()) return 0;
        
        java.util.Set<java.time.LocalDate> activeDates = txns.stream()
                .filter(t -> !t.getIsReversed() && !t.getTransactionCategory().startsWith("SKIPPED"))
                .map(t -> t.getTransactionDate().toLocalDate())
                .collect(Collectors.toSet());
                
        if (activeDates.isEmpty()) return 0;
        
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate yesterday = today.minusDays(1);
        
        // Streak must be active either today or yesterday
        if (!activeDates.contains(today) && !activeDates.contains(yesterday)) {
            return 0;
        }
        
        int streak = 0;
        java.time.LocalDate current = activeDates.contains(today) ? today : yesterday;
        
        while (activeDates.contains(current)) {
            streak++;
            current = current.minusDays(1);
        }
        return streak;
    }

    @GetMapping("/leaderboard")
    public ResponseEntity<?> getWeeklyLeaderboard(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String userEmail = jwtService.extractUsername(token);
            User requestingUser = userRepository.findByEmail(userEmail).orElseThrow();
            Long tenantId = requestingUser.getTenant().getId();

            List<User> agents = userRepository.findByTenantId(tenantId).stream()
                    .filter(u -> "AGENT".equals(u.getRole().name()))
                    .toList();

            LocalDateTime oneWeekAgo = LocalDateTime.now().minusDays(7);
            
            List<Map<String, Object>> standings = new java.util.ArrayList<>();

            for (User agent : agents) {
                // Fetch transactions for this agent in the last 7 days
                List<Transaction> txns = transactionRepository.findByAgentIdSafe(agent.getId()).stream()
                        .filter(t -> t.getTransactionDate().isAfter(oneWeekAgo))
                        .filter(t -> !t.getIsReversed())
                        .filter(t -> "SAVINGS_DEPOSIT".equals(t.getTransactionCategory()) || "LOAN_REPAYMENT".equals(t.getTransactionCategory()))
                        .toList();

                BigDecimal totalCollected = txns.stream()
                        .map(Transaction::getAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                int collectionsCount = txns.size();
                int streak = calculateAgentStreak(agent.getId());

                Map<String, Object> agentStats = new java.util.HashMap<>();
                agentStats.put("agentId", agent.getId());
                agentStats.put("agentName", agent.getName());
                agentStats.put("agentEmail", agent.getEmail());
                agentStats.put("weeklyVolume", totalCollected);
                agentStats.put("weeklyCount", collectionsCount);
                agentStats.put("streak", streak);
                
                standings.add(agentStats);
            }

            // Sort by weeklyVolume descending, then weeklyCount descending
            standings.sort((a, b) -> {
                BigDecimal volA = (BigDecimal) a.get("weeklyVolume");
                BigDecimal volB = (BigDecimal) b.get("weeklyVolume");
                int cmp = volB.compareTo(volA);
                if (cmp != 0) return cmp;
                
                Integer cntA = (Integer) a.get("weeklyCount");
                Integer cntB = (Integer) b.get("weeklyCount");
                return cntB.compareTo(cntA);
            });

            // Assign ranks and trophies
            for (int i = 0; i < standings.size(); i++) {
                Map<String, Object> s = standings.get(i);
                int rank = i + 1;
                s.put("rank", rank);
                String trophy = "";
                if (rank == 1) trophy = "🏆";
                else if (rank == 2) trophy = "🥈";
                else if (rank == 3) trophy = "🥉";
                s.put("trophy", trophy);
            }

            return ResponseEntity.ok(standings);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Leaderboard error: " + e.getMessage());
        }
    }
}