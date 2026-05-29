package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;

@Service
public class UserService {

    @Autowired private UserRepository userRepository;
    @Autowired private AuditLogService auditLogService;

    /**
     * RBI COMPLIANCE: Updates the maximum cash an agent is allowed to carry.
     * Triggers an immediate Audit Log for financial accountability.
     */
    @Transactional
    public User updateAgentCashLimit(User adminUser, Long targetAgentId, BigDecimal newLimit) {
        User agent = userRepository.findById(targetAgentId)
                .orElseThrow(() -> new RuntimeException("Agent not found"));

        // Security Wall
        if (!agent.getTenant().getId().equals(adminUser.getTenant().getId())) {
            throw new SecurityException("Cannot modify users outside your company.");
        }

        BigDecimal oldLimit = agent.getMaxCashHoldingLimit();
        agent.setMaxCashHoldingLimit(newLimit);
        User savedAgent = userRepository.save(agent);

        // Invisible CCTV Camera Logging
        auditLogService.logSecurityAction(
                adminUser, "UPDATE_CASH_LIMIT", "USER", agent.getId(),
                "Old Limit: " + oldLimit, "New Limit: " + newLimit
        );

        return savedAgent;
    }

    /**
     * THE TERMINATION PROTOCOL: Instantly locks out an employee.
     */
    @Transactional
    public void terminateEmployee(User adminUser, Long targetUserId) {
        User employee = userRepository.findById(targetUserId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!employee.getTenant().getId().equals(adminUser.getTenant().getId())) {
            throw new SecurityException("Cannot modify users outside your company.");
        }

        employee.setIsActive(false);
        employee.setRegisteredDeviceId(null); // Wipe their device connection
        userRepository.save(employee);

        auditLogService.logSecurityAction(
                adminUser, "TERMINATE_EMPLOYEE", "USER", employee.getId(),
                "Status: ACTIVE", "Status: TERMINATED"
        );
    }

    /**
     * DEVICE BINDING: Binds an agent to a specific phone on their first login.
     */
    @Transactional
    public void registerMobileDevice(Long userId, String deviceId) {
        User user = userRepository.findById(userId).orElseThrow();

        // If they already have a device, and it doesn't match the new one, block them!
        if (user.getRegisteredDeviceId() != null && !user.getRegisteredDeviceId().equals(deviceId)) {
            throw new SecurityException("ACCOUNT LOCKED: Login attempted from an unauthorized device.");
        }

        if (user.getRegisteredDeviceId() == null) {
            user.setRegisteredDeviceId(deviceId);
            userRepository.save(user);
        }
    }
}