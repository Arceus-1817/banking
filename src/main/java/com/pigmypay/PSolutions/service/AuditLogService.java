package com.pigmypay.PSolutions.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.pigmypay.PSolutions.model.AuditLog;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.AuditLogRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {

    @Autowired
    private AuditLogRepository auditLogRepository;

    private final ObjectMapper mapper = new ObjectMapper();

    @Async // Runs in background so it doesn't slow down the main API response
    public void logSecurityAction(User actor, String actionType, String targetEntity, Long targetId, Object previousState, Object newState) {
        try {
            AuditLog log = new AuditLog();
            log.setTenant(actor.getTenant());
            log.setUser(actor);
            log.setActionType(actionType);
            log.setTargetEntity(targetEntity);
            log.setTargetEntityId(targetId);

            if (previousState != null) log.setPreviousState(mapper.writeValueAsString(previousState));
            if (newState != null) log.setNewState(mapper.writeValueAsString(newState));

            auditLogRepository.save(log);
            System.out.println("🛡️ AUDIT RECORDED: " + actor.getName() + " executed " + actionType);

        } catch (Exception e) {
            System.err.println("❌ Failed to write Audit Log: " + e.getMessage());
        }
    }
}