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
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.HashMap;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
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
            List<User> usersList;

            if (role == Role.ADMIN) {
                usersList = userRepository.findByTenantIdAndRoleNot(tenantId, Role.SYSTEM_ADMIN);
            } else if (role == Role.MANAGER) {
                Long branchId = requestingUser.getBranch().getId();
                usersList = userRepository.findByBranchIdAndRoleNot(branchId, Role.SYSTEM_ADMIN);
            } else {
                return ResponseEntity.status(403).body("Access Denied: Agents cannot view company directory.");
            }

            List<Map<String, Object>> mappedUsers = usersList.stream()
                    .map(this::mapUserForFrontend)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(mappedUsers);

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 2. CREATE USER
    // ════════════════════════════════════════════════════════════
    @PostMapping
    @Transactional
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

            // PAYROLL & COMPLIANCE
            user.setCommissionRate(request.getCommissionRate() != null ? request.getCommissionRate() : BigDecimal.ZERO);
            user.setBaseSalary(request.getBaseSalary() != null ? request.getBaseSalary() : BigDecimal.ZERO);
            user.setDailyCollectionLimit(request.getDailyCollectionLimit() != null ? request.getDailyCollectionLimit() : new BigDecimal("40000.00"));
            user.setPanNumber(request.getPanNumber());
            user.setAadhaarNumber(request.getAadhaarNumber());
            user.setBankName(request.getBankName());
            user.setBankAccountNumber(request.getBankAccountNumber());
            user.setBankIfscCode(request.getBankIfscCode());
            user.setDateOfBirth(request.getDateOfBirth());
            user.setDateOfJoining(request.getDateOfJoining());

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
            User saved = userRepository.save(user);
            return ResponseEntity.ok(mapUserForFrontend(saved));

        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to create user: " + e.getMessage());
        }
    }

    private String cleanString(Object val) {
        if (val == null) return null;
        String s = val.toString().trim();
        if (s.isEmpty() || "null".equalsIgnoreCase(s)) return null;
        return s;
    }

    private BigDecimal cleanBigDecimal(Object val) {
        if (val == null) return BigDecimal.ZERO;
        String s = val.toString().trim();
        if (s.isEmpty() || "null".equalsIgnoreCase(s)) return BigDecimal.ZERO;
        try {
            return new BigDecimal(s);
        } catch (Exception e) {
            return BigDecimal.ZERO;
        }
    }

    // ════════════════════════════════════════════════════════════
    // 3. UPDATE USER
    // ════════════════════════════════════════════════════════════
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> updates, @RequestHeader("Authorization") String authHeader) {
        try {
            System.out.println(">>> UPDATE USER REQUEST FOR ID " + id + " | PAYLOAD: " + updates);
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User user = userRepository.findById(id).orElseThrow();

            if (!user.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied: Cross-tenant breach blocked.");
            }

            if (updates.containsKey("role")) {
                String roleStr = cleanString(updates.get("role"));
                if (roleStr != null) user.setRole(Role.valueOf(roleStr));
            }
            if (updates.containsKey("name")) {
                String nameStr = cleanString(updates.get("name"));
                if (nameStr != null) user.setName(nameStr);
            }
            if (updates.containsKey("phoneNumber")) {
                String phoneStr = cleanString(updates.get("phoneNumber"));
                if (phoneStr != null) user.setPhoneNumber(phoneStr);
            }
            if (updates.containsKey("commissionRate")) user.setCommissionRate(cleanBigDecimal(updates.get("commissionRate")));
            if (updates.containsKey("baseSalary")) user.setBaseSalary(cleanBigDecimal(updates.get("baseSalary")));
            if (updates.containsKey("dailyCollectionLimit")) user.setDailyCollectionLimit(cleanBigDecimal(updates.get("dailyCollectionLimit")));
            if (updates.containsKey("panNumber")) user.setPanNumber(cleanString(updates.get("panNumber")));
            if (updates.containsKey("aadhaarNumber")) user.setAadhaarNumber(cleanString(updates.get("aadhaarNumber")));
            if (updates.containsKey("bankName")) user.setBankName(cleanString(updates.get("bankName")));
            if (updates.containsKey("bankAccountNumber")) user.setBankAccountNumber(cleanString(updates.get("bankAccountNumber")));
            if (updates.containsKey("bankIfscCode")) user.setBankIfscCode(cleanString(updates.get("bankIfscCode")));
            if (updates.containsKey("dateOfBirth")) {
                String dobRaw = cleanString(updates.get("dateOfBirth"));
                user.setDateOfBirth(dobRaw != null ? java.time.LocalDate.parse(dobRaw) : null);
            }
            if (updates.containsKey("dateOfJoining")) {
                String dojRaw = cleanString(updates.get("dateOfJoining"));
                user.setDateOfJoining(dojRaw != null ? java.time.LocalDate.parse(dojRaw) : null);
            }

            if (updates.containsKey("branchId")) {
                String branchIdRaw = cleanString(updates.get("branchId"));
                if (branchIdRaw == null) {
                    user.setBranch(null);
                } else {
                    Branch branch = branchRepository.findById(Long.valueOf(branchIdRaw)).orElseThrow();
                    user.setBranch(branch);
                }
            }

            User saved = userRepository.save(user);
            return ResponseEntity.ok(mapUserForFrontend(saved));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 4. CASH LIMIT MANAGEMENT (NEW)
    // ════════════════════════════════════════════════════════════
    @PatchMapping("/{id}/cash-limit")
    @Transactional
    public ResponseEntity<?> updateCashLimit(@PathVariable Long id, @RequestBody Map<String, Object> payload, @RequestHeader("Authorization") String authHeader) {
        try {
            String email = jwtService.extractUsername(extractToken(authHeader));
            User requestingAdmin = userRepository.findByEmail(email).orElseThrow();

            BigDecimal newLimit = new BigDecimal(payload.get("newLimit").toString());

            User updatedAgent = userService.updateAgentCashLimit(requestingAdmin, id, newLimit);
            return ResponseEntity.ok(mapUserForFrontend(updatedAgent));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to update cash limit: " + e.getMessage());
        }
    }

    // ════════════════════════════════════════════════════════════
    // 5. DEVICE BINDING RESET (NEW)
    // ════════════════════════════════════════════════════════════
    @PatchMapping("/{id}/reset-device")
    @Transactional
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
    @Transactional
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
    @Transactional
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
                    "dailyCollectionLimit", user.getDailyCollectionLimit(),
                    "tenantName", user.getTenant() != null ? user.getTenant().getCompanyName() : "HQ",
                    "branchName", user.getBranch() != null ? user.getBranch().getName() : "Unassigned"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Session invalid");
        }
    }

    @PostMapping("/{id}/approve-device")
    @Transactional
    public ResponseEntity<?> approveDevice(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User targetUser = userRepository.findById(id).orElseThrow();

            if (!targetUser.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }

            if (targetUser.getPendingDeviceId() == null || targetUser.getPendingDeviceId().isEmpty()) {
                return ResponseEntity.badRequest().body("No pending device binding request found for this user.");
            }

            targetUser.setRegisteredDeviceId(targetUser.getPendingDeviceId());
            targetUser.setPendingDeviceId(null);
            targetUser.setMobileVerificationOtp(null);
            targetUser.setMobileVerificationOtpExpiresAt(null);
            targetUser.setFailedLoginAttempts(0);
            targetUser.setAccountLockedUntil(null);
            
            userRepository.save(targetUser);
            return ResponseEntity.ok(Map.of("message", "Device binding approved successfully. User can now login."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/{id}/manual-device-id")
    @Transactional
    public ResponseEntity<?> manualDeviceBinding(@PathVariable Long id, @RequestBody Map<String, String> payload, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User targetUser = userRepository.findById(id).orElseThrow();

            if (!targetUser.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }

            String deviceId = payload.get("deviceId");
            if (deviceId == null || deviceId.trim().isEmpty()) {
                targetUser.setRegisteredDeviceId(null);
            } else {
                targetUser.setRegisteredDeviceId(deviceId.trim());
            }
            targetUser.setPendingDeviceId(null);
            targetUser.setMobileVerificationOtp(null);
            targetUser.setMobileVerificationOtpExpiresAt(null);
            
            userRepository.save(targetUser);
            return ResponseEntity.ok(Map.of("message", "Device ID configured manually."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    private Map<String, Object> mapUserForFrontend(User u) {
        Map<String, Object> m = new HashMap<>();
        m.put("id", u.getId());
        m.put("name", u.getName());
        m.put("email", u.getEmail());
        m.put("phoneNumber", u.getPhoneNumber() != null ? u.getPhoneNumber() : "");
        m.put("role", u.getRole().name());
        m.put("isActive", u.isEnabled());
        m.put("registeredDeviceId", u.getRegisteredDeviceId());
        m.put("pendingDeviceId", u.getPendingDeviceId());
        m.put("mobileVerificationOtp", u.getMobileVerificationOtp());
        m.put("mobileVerificationOtpExpiresAt", u.getMobileVerificationOtpExpiresAt() != null ? u.getMobileVerificationOtpExpiresAt().toString() : null);
        m.put("maxCashHoldingLimit", u.getMaxCashHoldingLimit());
        m.put("dailyCollectionLimit", u.getDailyCollectionLimit());
        m.put("commissionRate", u.getCommissionRate());
        m.put("baseSalary", u.getBaseSalary());
        m.put("panNumber", u.getPanNumber() != null ? u.getPanNumber() : "");
        m.put("aadhaarNumber", u.getAadhaarNumber() != null ? u.getAadhaarNumber() : "");
        m.put("bankName", u.getBankName() != null ? u.getBankName() : "");
        m.put("bankAccountNumber", u.getBankAccountNumber() != null ? u.getBankAccountNumber() : "");
        m.put("bankIfscCode", u.getBankIfscCode() != null ? u.getBankIfscCode() : "");
        m.put("dateOfBirth", u.getDateOfBirth() != null ? u.getDateOfBirth().toString() : null);
        m.put("dateOfJoining", u.getDateOfJoining() != null ? u.getDateOfJoining().toString() : null);
        if (u.getBranch() != null) {
            m.put("branch", Map.of(
                "id", u.getBranch().getId(),
                "name", u.getBranch().getName()
            ));
        } else {
            m.put("branch", null);
        }
        return m;
    }
}