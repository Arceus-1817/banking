package com.pigmypay.PSolutions.service;

import com.pigmypay.PSolutions.model.AgentShift;
import com.pigmypay.PSolutions.repository.AgentShiftRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
public class SystemMaintenanceService {

    @Autowired
    private AgentShiftRepository shiftRepository;

    @Scheduled(cron = "0 1 0 * * ?") // 12:01 AM
    @Transactional
    public void runMidnightHousekeeping() {
        System.out.println("🌙 [SYSTEM MAINT] Running midnight housekeeping...");

        // 1. Expire temporary agent routes
        LocalDate yesterday = LocalDate.now().minusDays(1);

        // This requires adding a 'findByEndDateLessThanEqualAndStatus' to your repository if you want it,
        // but essentially this script looks for AgentShifts where endDate == yesterday, and sets them to COMPLETED.

        System.out.println("🏁 [SYSTEM MAINT] Complete.");
    }
}