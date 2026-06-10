package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.service.AuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private AuthService authService; // 🚨 ENTERPRISE FIX: Use the secure service!

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        try {
            String email = credentials.get("email");
            String password = credentials.get("password");

            // 1. The AuthService handles password checks, brute-force locks, and company suspension!
            String token = authService.login(email, password);

            // 2. Fetch the user safely after validation to return their basic info to the React frontend
            User user = userRepository.findByEmail(email).orElseThrow();

            return ResponseEntity.ok(Map.of(
                    "token",    token,
                    "userId",   user.getId(),
                    "name",     user.getName(),
                    "role",     user.getRole().name(),
                    "tenantId", user.getTenant() != null ? user.getTenant().getId() : 1L,
                    "tenantName", user.getTenant() != null ? user.getTenant().getCompanyName() : "HQ Institution",
                    "tenantUpiId", user.getTenant() != null && user.getTenant().getUpiId() != null ? user.getTenant().getUpiId() : "pigmypay@icici",
                    "tenantUpiMerchantName", user.getTenant() != null && user.getTenant().getUpiMerchantName() != null ? user.getTenant().getUpiMerchantName() : (user.getTenant() != null ? user.getTenant().getCompanyName() : "PigmyPay FinTech")
            ));

        } catch (Exception e) {
            // Returns 401 with the exact reason (e.g., "Account Locked", "Invalid Password")
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }
}