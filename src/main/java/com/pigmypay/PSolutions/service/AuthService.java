package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
public class AuthService {

    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private AuthenticationManager authenticationManager;

    public String login(String email, String rawPassword) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new SecurityException("Invalid credentials"));

        if (!user.getIsActive()) {
            throw new SecurityException("Account terminated. Contact your Branch Manager.");
        }

        if (user.getTenant() != null && !user.getTenant().getStatus().equals("ACTIVE")) {
            throw new SecurityException("Company account is currently suspended.");
        }

        // 🚨 BRUTE FORCE CHECK: Are they currently locked out?
        if (user.getAccountLockedUntil() != null && LocalDateTime.now().isBefore(user.getAccountLockedUntil())) {
            throw new SecurityException("Account locked due to too many failed attempts. Try again later.");
        }

        try {
            // Attempt to verify the password
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, rawPassword));

            // ✅ SUCCESS: Reset the failure counters
            user.setFailedLoginAttempts(0);
            user.setAccountLockedUntil(null);
            user.setLastLoginAt(LocalDateTime.now());
            userRepository.save(user);

            return jwtService.generateToken(user);

        } catch (BadCredentialsException e) {
            // ❌ FAILURE: Increment the brute-force counter
            int attempts = user.getFailedLoginAttempts() != null ? user.getFailedLoginAttempts() : 0;
            attempts += 1;
            user.setFailedLoginAttempts(attempts);

            if (attempts >= 5) {
                // Lock account for 15 minutes
                user.setAccountLockedUntil(LocalDateTime.now().plusMinutes(15));
                userRepository.save(user);
                throw new SecurityException("Account LOCKED for 15 minutes due to 5 failed login attempts.");
            }

            userRepository.save(user);
            throw new SecurityException("Invalid password. Attempt " + attempts + " of 5.");
        }
    }
}