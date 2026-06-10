package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.TenantRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin
@RequestMapping("/api/superadmin")
public class SuperAdminController {

    @Autowired private TenantRepository tenantRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    private void verifySystemAdmin(String token) {
        String email = jwtService.extractUsername(token);
        User user = userRepository.findByEmail(email).orElseThrow();
        if (user.getRole() != Role.SYSTEM_ADMIN) {
            throw new SecurityException("CRITICAL BREACH: Only the Platform Owner can access this endpoint.");
        }
    }

    // ── 1. GET ALL CLIENTS ──
    @GetMapping("/clients")
    public ResponseEntity<?> getAllClients(@RequestHeader("Authorization") String authHeader) {
        try {
            verifySystemAdmin(extractToken(authHeader));
            return ResponseEntity.ok(tenantRepository.findAll());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(e.getMessage());
        }
    }

    // ── 2. ONBOARD NEW CLIENT ──
    @PostMapping("/onboard")
    @Transactional // PREVENTS GHOST COMPANIES
    public ResponseEntity<?> onboardNewClient(@RequestBody OnboardRequest request, @RequestHeader("Authorization") String authHeader) {
        try {
            verifySystemAdmin(extractToken(authHeader));

            // Step 1: Create the new Company
            Tenant newCompany = new Tenant();
            newCompany.setCompanyName(request.getCompanyName());
            newCompany.setPlan(request.getPlan() != null ? request.getPlan() : "BASIC");
            newCompany.setStatus("ACTIVE");
            newCompany.setCreatedAt(LocalDateTime.now());
            newCompany.setUpiId(request.getUpiId());
            newCompany.setUpiMerchantName(request.getUpiMerchantName() != null && !request.getUpiMerchantName().isEmpty() ? request.getUpiMerchantName() : request.getCompanyName());
            newCompany.setCompanyAddress(request.getCompanyAddress());
            newCompany.setGstNumber(request.getGstNumber());
            newCompany.setCompanyEmail(request.getCompanyEmail());
            newCompany.setCompanyPhone(request.getCompanyPhone());

            // 🚨 SATELLITE ETL FIX: Default CSV Mapping so the midnight cron job doesn't crash!
            String defaultMapping = "{\"hqCustomerId\": 0, \"accountNumber\": 1, \"name\": 2, \"hqLoanId\": 3, \"expectedDailyEmi\": 4}";
            newCompany.setCsvMappingConfig(defaultMapping);

            Tenant savedCompany = tenantRepository.save(newCompany);

            // Step 2: Create their primary Admin User
            if (userRepository.findByEmail(request.getAdminEmail()).isPresent()) {
                throw new RuntimeException("Email already exists in the system."); // Triggers @Transactional Rollback
            }

            User firstAdmin = new User();
            firstAdmin.setName(request.getAdminName());
            firstAdmin.setEmail(request.getAdminEmail());
            firstAdmin.setPassword(passwordEncoder.encode(request.getAdminPassword()));
            firstAdmin.setPhoneNumber(request.getAdminPhoneNumber());
            firstAdmin.setRole(Role.ADMIN);
            firstAdmin.setTenant(savedCompany);
            firstAdmin.setIsActive(true);
            firstAdmin.setFailedLoginAttempts(0);

            userRepository.save(firstAdmin);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Client successfully onboarded!");
            response.put("tenantId", savedCompany.getId());
            response.put("adminEmail", firstAdmin.getEmail());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Onboarding failed: " + e.getMessage());
        }
    }

    // DTO
    public static class OnboardRequest {
        private String companyName;
        private String plan;
        private String adminName;
        private String adminEmail;
        private String adminPassword;
        private String adminPhoneNumber;
        private String upiId;
        private String upiMerchantName;
        private String companyAddress;
        private String gstNumber;
        private String companyEmail;
        private String companyPhone;

        public String getCompanyName() { return companyName; }
        public String getPlan() { return plan; }
        public String getAdminName() { return adminName; }
        public String getAdminEmail() { return adminEmail; }
        public String getAdminPassword() { return adminPassword; }
        public String getAdminPhoneNumber() { return adminPhoneNumber; }
        public String getUpiId() { return upiId; }
        public String getUpiMerchantName() { return upiMerchantName; }
        public String getCompanyAddress() { return companyAddress; }
        public String getGstNumber() { return gstNumber; }
        public String getCompanyEmail() { return companyEmail; }
        public String getCompanyPhone() { return companyPhone; }
    }
}