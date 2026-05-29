package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.dto.CreateUserRequest;
import com.pigmypay.PSolutions.model.Branch;
import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.BranchRepository;
import com.pigmypay.PSolutions.repository.TenantRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import com.pigmypay.PSolutions.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@CrossOrigin
@RequestMapping("/api/users")
public class UserController {

    @Autowired private UserRepository userRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    // 🚨 ENTERPRISE ADDITION: Injecting the new secure UserService
    @Autowired private UserService userService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        throw new RuntimeException("Missing or invalid Authorization header");
    }

    // ════════════════════════════════════════════════════════════
    // 1. GET USERS (Strict Hierarchy)
    // ════════════════════════════════════════════════════════════
    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<?> getUsersForDashboard(@PathVariable Long tenantId, @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String userEmail = jwtService.extractUsername(token);
            User requestingUser = userRepository.findByEmail(userEmail).orElseThrow();

            if (!requestingUser.getTenant().getId().equals(tenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: Cross-tenant breach blocked.");
            }

            Role role = requestingUser.getRole();

            if (role == Role.ADMIN) {
                return ResponseEntity.ok(userRepository.findByTenantIdAndRoleNot(tenantId, Role.SYSTEM_ADMIN));
            } else if (role == Role.MANAGER) {
                Long branchId = requestingUser.getBranch().getId();
                return ResponseEntity.ok(userRepository.findByBranchIdAndRoleNot(branchId, Role.SYSTEM_ADMIN));
            } else {
                return ResponseEntity.status(403).body("Access Denied: Agents cannot view company directory.");
            }

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 2. CREATE USER
    // ════════════════════════════════════════════════════════════
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request, @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String currentUserEmail = jwtService.extractUsername(token);
            Long tokenTenantId = jwtService.extractTenantId(token);

            User requestingUser = userRepository.findByEmail(currentUserEmail).orElseThrow();

            if (userRepository.findByEmail(request.getEmail()).isPresent()) {
                return ResponseEntity.badRequest().body("Email already exists");
            }

            Tenant tenant = tenantRepository.findById(tokenTenantId).orElseThrow();

            User user = new User();
            user.setName(request.getName());
            user.setEmail(request.getEmail());
            user.setPhoneNumber(request.getPhoneNumber() != null ? request.getPhoneNumber() : "");
            user.setPassword(passwordEncoder.encode(request.getPassword()));

            // 🚨 DEFAULT SECURITY STATUS
            user.setIsActive(true);
            user.setFailedLoginAttempts(0);

            Role requestedRole = Role.valueOf(request.getRole());

            // 🚨 MANAGER BLAST WALL
            if (requestingUser.getRole() == Role.MANAGER) {
                if (requestedRole != Role.AGENT) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("SECURITY VIOLATION: Managers can only create Agents.");
                }
                user.setRole(Role.AGENT);
                user.setBranch(requestingUser.getBranch());
            } else {
                user.setRole(requestedRole);
                if (request.getBranchId() != null) {
                    Branch branch = branchRepository.findById(request.getBranchId()).orElseThrow();
                    user.setBranch(branch);
                }
            }

            user.setTenant(tenant);
            return ResponseEntity.ok(userRepository.save(user));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to create user: " + e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 3. UPDATE USER
    // ════════════════════════════════════════════════════════════
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User user = userRepository.findById(id).orElseThrow();

            if (!user.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: Cross-tenant breach blocked.");
            }

            if (updates.containsKey("role")) user.setRole(Role.valueOf((String) updates.get("role")));
            if (updates.containsKey("name")) user.setName((String) updates.get("name"));
            if (updates.containsKey("phoneNumber")) user.setPhoneNumber((String) updates.get("phoneNumber"));

            if (updates.containsKey("branchId")) {
                Object branchIdRaw = updates.get("branchId");
                if (branchIdRaw == null) {
                    user.setBranch(null);
                } else {
                    Branch branch = branchRepository.findById(Long.valueOf(branchIdRaw.toString())).orElseThrow();
                    user.setBranch(branch);
                }
            }

            return ResponseEntity.ok(userRepository.save(user));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 4. CASH LIMIT MANAGEMENT (NEW)
    // ════════════════════════════════════════════════════════════
    @PatchMapping("/{id}/cash-limit")
    public ResponseEntity<?> updateCashLimit(@PathVariable Long id, @RequestBody Map<String, Object> payload, @RequestHeader("Authorization") String authHeader) {
        try {
            String email = jwtService.extractUsername(extractToken(authHeader));
            User requestingAdmin = userRepository.findByEmail(email).orElseThrow();

            BigDecimal newLimit = new BigDecimal(payload.get("newLimit").toString());

            User updatedAgent = userService.updateAgentCashLimit(requestingAdmin, id, newLimit);
            return ResponseEntity.ok(updatedAgent);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to update cash limit: " + e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 5. DEVICE BINDING RESET (NEW)
    // ════════════════════════════════════════════════════════════
    @PatchMapping("/{id}/reset-device")
    public ResponseEntity<?> resetDeviceBinding(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User targetUser = userRepository.findById(id).orElseThrow();

            if (!targetUser.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }

            targetUser.setRegisteredDeviceId(null); // Unbinds the old phone
            targetUser.setFailedLoginAttempts(0);   // Resets any brute-force lockouts
            targetUser.setAccountLockedUntil(null);
            userRepository.save(targetUser);

            return ResponseEntity.ok(Map.of("message", "Device binding cleared. User can log in from a new device."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 6. TERMINATE EMPLOYEE (Replaces Hard Delete)
    // ════════════════════════════════════════════════════════════
    @DeleteMapping("/{id}")
    public ResponseEntity<?> terminateUser(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        try {
            String email = jwtService.extractUsername(extractToken(authHeader));
            User requestingAdmin = userRepository.findByEmail(email).orElseThrow();

            // 🚨 DELETION IS ILLEGAL IN BANKING. WE SOFT-DELETE/TERMINATE INSTEAD.
            userService.terminateEmployee(requestingAdmin, id);

            return ResponseEntity.ok(Map.of("message", "User successfully terminated. Audit log generated."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Cannot terminate: " + e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 7. RESET PASSWORD
    // ════════════════════════════════════════════════════════════
    @PatchMapping("/{id}/password")
    public ResponseEntity<?> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            String newPassword = body.get("password");

            if (newPassword == null || newPassword.length() < 6) return ResponseEntity.badRequest().body("Password must be at least 6 characters");

            User user = userRepository.findById(id).orElseThrow();
            if (!user.getTenant().getId().equals(tokenTenantId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");

            user.setPassword(passwordEncoder.encode(newPassword));
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 8. FETCH MY PROFILE (For Mobile App Bootup)
    // ════════════════════════════════════════════════════════════
    @GetMapping("/me")
    public ResponseEntity<?> getMyProfile(@RequestHeader("Authorization") String authHeader) {
        try {
            String email = jwtService.extractUsername(extractToken(authHeader));
            User user = userRepository.findByEmail(email).orElseThrow();

            // Return a clean map so we don't accidentally leak encrypted passwords to the frontend
            return ResponseEntity.ok(Map.of(
                    "id", user.getId(),
                    "name", user.getName(),
                    "email", user.getEmail(),
                    "phoneNumber", user.getPhoneNumber(),
                    "role", user.getRole().name(),
                    "maxCashHoldingLimit", user.getMaxCashHoldingLimit(),
                    "tenantName", user.getTenant() != null ? user.getTenant().getCompanyName() : "HQ",
                    "branchName", user.getBranch() != null ? user.getBranch().getName() : "Unassigned"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Session invalid");
        }
    }
}