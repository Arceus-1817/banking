package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.AuditLog;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.AuditLogRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin
@RequestMapping("/api/audit-logs")
public class AuditLogController {

    @Autowired private AuditLogRepository auditLogRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<?> getCompanyAuditLogs(@PathVariable Long tenantId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User requestingUser = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            // 🚨 SECURITY: Only Admins can view the CCTV logs
            if (!tenantId.equals(tokenTenantId) || requestingUser.getRole().name().equals("AGENT")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: You do not have permission to view Audit Logs.");
            }

            List<AuditLog> logs = auditLogRepository.findByTenantIdOrderByTimestampDesc(tenantId);

            // Clean Mapper to prevent JSON recursion
            List<Map<String, Object>> safeLogs = logs.stream().map(log -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", log.getId());
                map.put("actorName", log.getUser().getName());
                map.put("actionType", log.getActionType());
                map.put("targetEntity", log.getTargetEntity());
                map.put("targetEntityId", log.getTargetEntityId());
                map.put("previousState", log.getPreviousState());
                map.put("newState", log.getNewState());
                map.put("timestamp", log.getTimestamp());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(safeLogs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}