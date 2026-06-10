package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.service.AuthService;
import com.pigmypay.PSolutions.service.NotificationService;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin
public class AuthController {

    @Autowired private UserRepository userRepository;
    @Autowired private AuthService authService;
    @Autowired private JwtService jwtService;
    @Autowired private NotificationService notificationService;
    @Autowired private PasswordEncoder passwordEncoder;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        try {
            String email = credentials.get("email");
            String password = credentials.get("password");
            String deviceId = credentials.get("deviceId");

            // 1. Authenticate credentials first (resets lockout, throws if invalid)
            String token = authService.login(email, password);

            User user = userRepository.findByEmail(email).orElseThrow();

            // 2. DEVICE BINDING FOR AGENTS
            if (user.getRole() == Role.AGENT) {
                if (deviceId == null || deviceId.isEmpty()) {
                    return ResponseEntity.status(400).body(Map.of("error", "Device ID is required for agent terminal login."));
                }

                String boundDevice = user.getRegisteredDeviceId();
                if (boundDevice == null || !boundDevice.equals(deviceId)) {
                    // Generate a 6-digit verification OTP
                    String otp = String.format("%06d", new Random().nextInt(999999));
                    user.setMobileVerificationOtp(otp);
                    user.setMobileVerificationOtpExpiresAt(LocalDateTime.now().plusMinutes(5));
                    user.setPendingDeviceId(deviceId); // Store the device ID requesting binding
                    userRepository.save(user);

                    // Send the verification code to the registered phone
                    notificationService.sendOTP(user.getPhoneNumber(), otp);

                    String phone = user.getPhoneNumber();
                    String mask = phone.length() > 4 ? "******" + phone.substring(phone.length() - 4) : "****";
                    
                    return ResponseEntity.ok(Map.of(
                            "verificationRequired", true,
                            "phoneMask", mask,
                            "reason", boundDevice == null ? "NEW_DEVICE" : "DEVICE_MISMATCH"
                    ));
                }
            }

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
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/verify-and-bind")
    public ResponseEntity<?> verifyAndBind(@RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            String otp = payload.get("otp");
            String deviceId = payload.get("deviceId");

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new SecurityException("User not found"));

            if (user.getMobileVerificationOtp() == null || !user.getMobileVerificationOtp().equals(otp)) {
                return ResponseEntity.status(400).body(Map.of("error", "Invalid verification code."));
            }

            if (user.getMobileVerificationOtpExpiresAt() == null || LocalDateTime.now().isAfter(user.getMobileVerificationOtpExpiresAt())) {
                return ResponseEntity.status(400).body(Map.of("error", "Verification code has expired."));
            }

            // Bind device ID & clear OTP
            user.setRegisteredDeviceId(deviceId);
            user.setMobileVerificationOtp(null);
            user.setMobileVerificationOtpExpiresAt(null);
            userRepository.save(user);

            // Generate authentication token
            String token = jwtService.generateToken(user);

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
            return ResponseEntity.status(401).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new SecurityException("User not found with registered email."));

            String otp = String.format("%06d", new Random().nextInt(999999));
            user.setPasswordResetOtp(otp);
            user.setPasswordResetOtpExpiresAt(LocalDateTime.now().plusMinutes(10));
            userRepository.save(user);

            notificationService.sendOTP(user.getPhoneNumber(), otp);

            String phone = user.getPhoneNumber();
            String mask = phone.length() > 4 ? "******" + phone.substring(phone.length() - 4) : "****";

            return ResponseEntity.ok(Map.of("message", "Reset code dispatched successfully.", "phoneMask", mask));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> payload) {
        try {
            String email = payload.get("email");
            String otp = payload.get("otp");
            String newPassword = payload.get("newPassword");

            if (newPassword == null || newPassword.length() < 6) {
                return ResponseEntity.status(400).body(Map.of("error", "Password must be at least 6 characters."));
            }

            User user = userRepository.findByEmail(email)
                    .orElseThrow(() -> new SecurityException("User not found"));

            if (user.getPasswordResetOtp() == null || !user.getPasswordResetOtp().equals(otp)) {
                return ResponseEntity.status(400).body(Map.of("error", "Invalid reset code."));
            }

            if (user.getPasswordResetOtpExpiresAt() == null || LocalDateTime.now().isAfter(user.getPasswordResetOtpExpiresAt())) {
                return ResponseEntity.status(400).body(Map.of("error", "Reset code has expired."));
            }

            // Update password & clear OTP & lockouts
            user.setPassword(passwordEncoder.encode(newPassword));
            user.setPasswordResetOtp(null);
            user.setPasswordResetOtpExpiresAt(null);
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now login with your new credentials."));
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of("error", e.getMessage()));
        }
    }
}