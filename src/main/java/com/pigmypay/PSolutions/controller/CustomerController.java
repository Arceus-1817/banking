package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.*;
import com.pigmypay.PSolutions.security.JwtService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@CrossOrigin
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private JwtService jwtService;
    @Autowired private RouteRepository routeRepository;
    @Autowired private AgentShiftRepository agentShiftRepository;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    // ── 1. GET ALL CUSTOMERS (Clean Mapping) ──
    @GetMapping("/tenant/{tenantId}")
    public ResponseEntity<?> getAllCustomersForTenant(@PathVariable Long tenantId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User requestingUser = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            if (!tenantId.equals(tokenTenantId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");

            List<Customer> customers;
            if (requestingUser.getRole() == Role.SYSTEM_ADMIN || requestingUser.getRole() == Role.ADMIN) {
                customers = customerRepository.findByTenantId(tenantId);
            } else if (requestingUser.getRole() == Role.MANAGER && requestingUser.getBranch() != null) {
                customers = customerRepository.findByAssignedAgentBranchId(requestingUser.getBranch().getId());
            } else {
                return ResponseEntity.status(403).body("Access Denied: Agents should use the mobile endpoint.");
            }

            return ResponseEntity.ok(mapCustomersForFrontend(customers));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ── 2. GET AGENT'S CUSTOMERS (For Mobile App) ──
    @GetMapping("/agent/{agentId}")
    public ResponseEntity<?> getCustomersForAgent(@PathVariable Long agentId, @RequestHeader("Authorization") String authHeader) {
        try {
            User tokenUser = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();
            if (!tokenUser.getId().equals(agentId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("SECURITY VIOLATION");

            List<com.pigmypay.PSolutions.model.AgentShift> activeShifts = agentShiftRepository.findByAgentIdAndStatus(agentId, "ACTIVE");
            if (activeShifts.isEmpty()) return ResponseEntity.ok(List.of());

            List<Customer> routeCustomers = customerRepository.findByRouteIdOrderByRouteSequenceAsc(activeShifts.get(0).getRoute().getId());
            return ResponseEntity.ok(mapCustomersForFrontend(routeCustomers));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ── 3. ADD LOCAL CUSTOMER (For Testing / Local Onboarding) ──
    @PostMapping
    public ResponseEntity<?> addNewCustomer(@RequestBody Customer newCustomer, @RequestHeader("Authorization") String authHeader) {
        try {
            User requestingUser = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            if (requestingUser.getRole() == Role.AGENT) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body("SECURITY VIOLATION: Agents cannot create customers. Direct them to the Branch Manager.");
            }

            newCustomer.setTenant(requestingUser.getTenant());
            newCustomer.setHqCustomerId(newCustomer.getAccountNumber()); // Fallback for local testing
            return ResponseEntity.ok(customerRepository.save(newCustomer));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── 4. ROUTE ASSIGNMENT ──
    @PutMapping("/{customerId}/route/{routeId}")
    public ResponseEntity<?> assignCustomerToRoute(@PathVariable Long customerId, @PathVariable Long routeId) {
        try {
            Customer customer = customerRepository.findById(customerId).orElseThrow();
            com.pigmypay.PSolutions.model.Route route = routeRepository.findById(routeId).orElseThrow();

            customer.setRoute(route);
            if (route.getAssignedAgent() != null) customer.setAssignedAgent(route.getAssignedAgent());

            customerRepository.save(customer);
            return ResponseEntity.ok("Customer successfully moved to route: " + route.getName());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Routing failed: " + e.getMessage());
        }
    }

    // ── 5. UPDATE CONTACT INFO (Replaces Dangerous KYC method) ──
    @PutMapping("/{customerId}/contact")
    public ResponseEntity<?> updateContactInfo(@PathVariable Long customerId, @RequestBody Map<String, String> payload) {
        try {
            Customer customer = customerRepository.findById(customerId).orElseThrow();

            if (payload.containsKey("phoneNumber")) customer.setPhoneNumber(payload.get("phoneNumber"));
            if (payload.containsKey("residentialAddress")) customer.setResidentialAddress(payload.get("residentialAddress"));

            return ResponseEntity.ok(customerRepository.save(customer));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── 6. REQUEST ACCOUNT CLOSURE (Replaces local penalty math) ──
    @PostMapping("/{id}/request-closure")
    public ResponseEntity<?> requestAccountClosure(@PathVariable Long id) {
        try {
            Customer customer = customerRepository.findById(id).orElseThrow();

            if (customer.getStatus().equals("CLOSED") || customer.getStatus().equals("CLOSURE_REQUESTED")) {
                return ResponseEntity.badRequest().body("Account is already closed or pending closure.");
            }

            // SATELLITE Strategy: Mark as requested. HQ will calculate the payout and drop it in the CSV.
            customer.setStatus("CLOSURE_REQUESTED");
            customerRepository.save(customer);

            Transaction requestTx = new Transaction();
            requestTx.setCustomer(customer);
            requestTx.setAgent(customer.getAssignedAgent());
            requestTx.setAmount(BigDecimal.ZERO);
            requestTx.setTransactionCategory("CLOSURE_REQUESTED");
            requestTx.setPaymentMode("NONE");
            requestTx.setTenant(customer.getTenant());
            requestTx.setSettlementStatus("SETTLED");
            transactionRepository.save(requestTx);

            return ResponseEntity.ok(Map.of("message", "Closure requested successfully. Waiting on HQ sync."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── HELPER: SERIALIZATION MAPPER ──
    private List<Map<String, Object>> mapCustomersForFrontend(List<Customer> customers) {
        return customers.stream().map(c -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", c.getId());
            map.put("name", c.getName());
            map.put("accountNumber", c.getAccountNumber());
            map.put("hqCustomerId", c.getHqCustomerId());
            map.put("phoneNumber", c.getPhoneNumber());
            map.put("residentialAddress", c.getResidentialAddress());
            map.put("currentBalance", c.getCurrentBalance());
            map.put("status", c.getStatus());
            map.put("routeSequence", c.getRouteSequence());
            map.put("routeName", c.getRoute() != null ? c.getRoute().getName() : "Unassigned");
            map.put("agentName", c.getAssignedAgent() != null ? c.getAssignedAgent().getName() : "Unassigned");
            return map;
        }).collect(Collectors.toList());
    }
}