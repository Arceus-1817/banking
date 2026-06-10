package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@RestController
@CrossOrigin
@Transactional
@RequestMapping("/api/settlements")
public class SettlementController {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private JwtService jwtService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    @GetMapping("/pending/{tenantId}")
    public ResponseEntity<?> getPendingSettlementsForTenant(@PathVariable Long tenantId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            if (!tenantId.equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            // 🚨 PERFORMANCE FIX: Directly query the database instead of loading everything into RAM
            List<Transaction> allUnsettled = transactionRepository.findByTenantIdAndSettlementStatus(tenantId, "UNSETTLED");

            Map<String, Map<String, Object>> response = new HashMap<>();

            for (Transaction t : allUnsettled) {
                User agent = t.getAgent();
                String key = agent.getName() + "|" + agent.getId();

                response.putIfAbsent(key, new HashMap<>(Map.of(
                        "totalCash", BigDecimal.ZERO,
                        "transactionCount", 0
                )));

                Map<String, Object> agentData = response.get(key);
                BigDecimal currentTotal = (BigDecimal) agentData.get("totalCash");
                int currentCount = (int) agentData.get("transactionCount");

                agentData.put("totalCash", currentTotal.add(t.getAmount()));
                agentData.put("transactionCount", currentCount + 1);
            }

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/confirm/{agentId}")
    public ResponseEntity<?> confirmSettlement(@PathVariable Long agentId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));

            // Fetch only this specific agent's unsettled cash
            List<Transaction> unsettled = transactionRepository.findByAgentIdAndSettlementStatus(agentId, "UNSETTLED");

            if (unsettled.isEmpty()) {
                return ResponseEntity.ok("No pending transactions to settle.");
            }

            // Security check: Ensure the agent belongs to the manager's company
            if (!unsettled.get(0).getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            for (Transaction t : unsettled) {
                t.setSettlementStatus("SETTLED");
            }
            transactionRepository.saveAll(unsettled);

            return ResponseEntity.ok(Map.of("message", "Successfully settled " + unsettled.size() + " transactions in the branch vault."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}