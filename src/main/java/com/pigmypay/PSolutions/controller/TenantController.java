package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import com.pigmypay.PSolutions.model.Role;
import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin
@RequestMapping("/api/tenants")
public class TenantController {

    @Autowired
    private EntityManager entityManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // Only YOU (SYSTEM_ADMIN) should be able to call this!
    @PostMapping("/onboard")
    @Transactional
    public ResponseEntity<?> onboardNewCompany(@RequestBody Map<String, String> request) {
        try {
            String companyName = request.get("companyName");
            String adminName = request.get("adminName");
            String adminEmail = request.get("adminEmail");
            String adminPassword = request.get("adminPassword");

            // 1. Create the new Company (Tenant)
            Tenant newTenant = new Tenant();
            newTenant.setCompanyName(companyName);
            entityManager.persist(newTenant);

            // 2. Create the Head Office Admin for this specific company
            User companyAdmin = new User();
            companyAdmin.setName(adminName);
            companyAdmin.setEmail(adminEmail);
            companyAdmin.setPassword(passwordEncoder.encode(adminPassword));
            companyAdmin.setRole(Role.ADMIN); // They are the admin of THEIR company
            companyAdmin.setTenant(newTenant);

            userRepository.save(companyAdmin);

            return ResponseEntity.ok(Map.of(
                    "message", "Company successfully onboarded!",
                    "tenantId", newTenant.getId(),
                    "adminEmail", adminEmail
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to onboard company: " + e.getMessage());
        }
    }

    // Get a list of all your clients
    @GetMapping("/all")
    public ResponseEntity<?> getAllTenants() {
        // In a real app, ensure ONLY SYSTEM_ADMIN can hit this
        List<Tenant> tenants = entityManager.createQuery("SELECT t FROM Tenant t", Tenant.class).getResultList();
        return ResponseEntity.ok(tenants);
    }
}