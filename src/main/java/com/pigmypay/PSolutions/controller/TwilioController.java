package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import com.pigmypay.PSolutions.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
@RequestMapping("/api/twilio")
public class TwilioController {

    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private NotificationService notificationService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        throw new RuntimeException("Missing or invalid Authorization header");
    }

    @GetMapping("/status")
    public ResponseEntity<?> getTwilioStatus(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String userEmail = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(userEmail).orElseThrow();
            if (!"ADMIN".equals(user.getRole().name())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }
            Map<String, Object> status = new HashMap<>();
            status.put("configured", notificationService.isTwilioEnabled());
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/test")
    public ResponseEntity<?> sendTestMessage(
            @RequestParam String phoneNumber,
            @RequestParam String message,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String userEmail = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(userEmail).orElseThrow();
            if (!"ADMIN".equals(user.getRole().name())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }
            boolean success = notificationService.sendTestWhatsApp(phoneNumber, message);
            if (success) {
                return ResponseEntity.ok("Test WhatsApp message dispatched successfully via Twilio!");
            } else {
                return ResponseEntity.badRequest().body("Failed to dispatch message. Twilio may not be initialized or configured properly.");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}
