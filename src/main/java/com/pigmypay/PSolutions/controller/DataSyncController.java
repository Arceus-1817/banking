package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.DataSyncLog;
import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.repository.DataSyncLogRepository;
import com.pigmypay.PSolutions.repository.TenantRepository;
import com.pigmypay.PSolutions.security.JwtService;
import com.pigmypay.PSolutions.service.DataExportService;
import com.pigmypay.PSolutions.service.DataImportService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.util.List;

@RestController
@CrossOrigin
@RequestMapping("/api/sync")
public class DataSyncController {

    @Autowired private JwtService jwtService;
    @Autowired private TenantRepository tenantRepository;
    @Autowired private DataSyncLogRepository syncLogRepository;
    @Autowired private DataImportService dataImportService;
    @Autowired private DataExportService dataExportService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    @GetMapping("/logs")
    public ResponseEntity<?> getSyncLogs(@RequestHeader("Authorization") String authHeader) {
        try {
            Long tenantId = jwtService.extractTenantId(extractToken(authHeader));
            List<DataSyncLog> logs = syncLogRepository.findByTenantIdOrderBySyncDateDesc(tenantId);
            return ResponseEntity.ok(logs);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/import")
    public ResponseEntity<?> importManualDrop(
            @RequestParam("file") MultipartFile file,
            @RequestParam("agentId") Long agentId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            Long tenantId = jwtService.extractTenantId(extractToken(authHeader));
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new RuntimeException("Tenant not found"));

            // Ensure import directory exists
            File dir = new File("imports");
            if (!dir.exists()) dir.mkdirs();

            // Save the uploaded file locally
            File targetFile = new File("imports/hq_drop_manual_" + tenantId + "_" + System.currentTimeMillis() + ".csv");
            Files.copy(file.getInputStream(), targetFile.toPath(), StandardCopyOption.REPLACE_EXISTING);

            // Trigger import
            DataSyncLog log = dataImportService.importTenantBankDrop(tenant, targetFile, agentId);
            return ResponseEntity.ok(log);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/export")
    public ResponseEntity<?> exportManualDrop(@RequestHeader("Authorization") String authHeader) {
        try {
            Long tenantId = jwtService.extractTenantId(extractToken(authHeader));
            Tenant tenant = tenantRepository.findById(tenantId)
                    .orElseThrow(() -> new RuntimeException("Tenant not found"));

            File file = dataExportService.exportTenantCollections(tenant);
            Resource resource = new FileSystemResource(file);

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + file.getName() + "\"")
                    .contentType(MediaType.parseMediaType("text/csv"))
                    .body(resource);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
