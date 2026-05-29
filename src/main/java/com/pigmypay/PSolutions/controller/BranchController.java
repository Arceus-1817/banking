package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Branch;
import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.repository.BranchRepository;
import com.pigmypay.PSolutions.repository.TenantRepository;
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
@RequestMapping("/api/branches")
public class BranchController {

    @Autowired private BranchRepository branchRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private JwtService jwtService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<?> getBranchesByTenant(@PathVariable Long tenantId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            if (!tenantId.equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: Cross-Tenant breach.");
            }

            List<Branch> branches = branchRepository.findByTenantId(tenantId);

            // MAPPER to prevent JSON Loops
            List<Map<String, Object>> safeBranches = branches.stream().map(b -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", b.getId());
                map.put("name", b.getName());
                map.put("branchCode", b.getBranchCode());
                map.put("address", b.getAddress());
                map.put("city", b.getCity());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(safeBranches);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<?> createBranch(@RequestBody Branch branch, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Tenant tenant = tenantRepository.findById(tokenTenantId).orElseThrow();

            branch.setTenant(tenant);
            Branch saved = branchRepository.save(branch);

            return ResponseEntity.ok(Map.of("message", "Branch created successfully", "id", saved.getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBranch(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Branch branch = branchRepository.findById(id).orElseThrow();

            if (!branch.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            branchRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "Branch deleted successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}