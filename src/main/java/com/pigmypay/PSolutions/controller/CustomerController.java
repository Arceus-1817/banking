package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.model.Loan;
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
import org.springframework.transaction.annotation.Transactional;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private TransactionRepository transactionRepository;
    @Autowired private JwtService jwtService;
    @Autowired private RouteRepository routeRepository;
    @Autowired private AgentShiftRepository agentShiftRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private com.pigmypay.PSolutions.service.SystemMaintenanceService systemMaintenanceService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    // ── 1. GET ALL CUSTOMERS ──
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

            return ResponseEntity.ok(mapCustomersForFrontend(customers, tenantId));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ── 2. GET AGENT'S CUSTOMERS ──
    @GetMapping("/agent/{agentId}")
    public ResponseEntity<?> getCustomersForAgent(@PathVariable Long agentId, @RequestHeader("Authorization") String authHeader) {
        try {
            User tokenUser = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();
            if (!tokenUser.getId().equals(agentId)) return ResponseEntity.status(HttpStatus.FORBIDDEN).body("SECURITY VIOLATION");

            List<com.pigmypay.PSolutions.model.AgentShift> activeShifts = agentShiftRepository.findByAgentIdAndStatus(agentId, "ACTIVE");
            if (activeShifts.isEmpty()) return ResponseEntity.ok(List.of());

            List<Customer> routeCustomers = customerRepository.findByRouteIdOrderByRouteSequenceAsc(activeShifts.get(0).getRoute().getId());
            return ResponseEntity.ok(mapCustomersForFrontend(routeCustomers, tokenUser.getTenant().getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ── 3. MY BRANCH CUSTOMERS (Manager shorthand) ──
    @GetMapping("/my-branch")
    public ResponseEntity<?> getMyBranchCustomers(@RequestHeader("Authorization") String authHeader) {
        try {
            User manager = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();
            if (manager.getBranch() == null) return ResponseEntity.ok(List.of());
            List<Customer> customers = customerRepository.findByAssignedAgentBranchId(manager.getBranch().getId());
            return ResponseEntity.ok(mapCustomersForFrontend(customers, manager.getTenant().getId()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    // ── 4. ADD LOCAL CUSTOMER (DISABLED) ──
    @PostMapping
    public ResponseEntity<?> addNewCustomer(@RequestHeader("Authorization") String authHeader) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body("Manual client registration is disabled. Please use the Bank Integration sync portal to import customer data.");
    }

    // ── 5. UPDATE KYC (FIXED: endpoint now exists, uses correct fields) ──
    @PutMapping("/{customerId}/kyc")
    @Transactional
    public ResponseEntity<?> updateKyc(@PathVariable Long customerId, @RequestBody Map<String, String> payload,
                                       @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(customerId).orElseThrow();

            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            if (payload.containsKey("name")) customer.setName(payload.get("name"));
            if (payload.containsKey("phoneNumber")) customer.setPhoneNumber(payload.get("phoneNumber"));
            if (payload.containsKey("aadharNumber")) customer.setAadharNumber(payload.get("aadharNumber"));
            if (payload.containsKey("panNumber")) customer.setPanNumber(payload.get("panNumber"));
            if (payload.containsKey("residentialAddress")) customer.setResidentialAddress(payload.get("residentialAddress"));
            if (payload.containsKey("guarantorName")) customer.setGuarantorName(payload.get("guarantorName"));
            if (payload.containsKey("guarantorPhoneNumber")) customer.setGuarantorPhoneNumber(payload.get("guarantorPhoneNumber"));

            // Auto-update KYC status if key fields are provided
            if (customer.getAadharNumber() != null && !customer.getAadharNumber().isEmpty()
                    && customer.getPanNumber() != null && !customer.getPanNumber().isEmpty()) {
                customer.setKycStatus("VERIFIED");
            }

            return ResponseEntity.ok(customerRepository.save(customer));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── 6. UPDATE CONTACT INFO ──
    @PutMapping("/{customerId}/contact")
    @Transactional
    public ResponseEntity<?> updateContactInfo(@PathVariable Long customerId, @RequestBody Map<String, String> payload,
                                               @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(customerId).orElseThrow();

            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            if (payload.containsKey("phoneNumber")) customer.setPhoneNumber(payload.get("phoneNumber"));
            if (payload.containsKey("residentialAddress")) customer.setResidentialAddress(payload.get("residentialAddress"));

            return ResponseEntity.ok(customerRepository.save(customer));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ── 7. ROUTE SEQUENCE BULK UPDATE ──
    @PutMapping("/route/{routeId}/sequence")
    @Transactional
    public ResponseEntity<?> updateRouteSequence(@PathVariable Long routeId, @RequestBody List<Long> orderedCustomerIds,
                                                 @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            for (int i = 0; i < orderedCustomerIds.size(); i++) {
                Customer c = customerRepository.findById(orderedCustomerIds.get(i)).orElseThrow();
                if (!c.getTenant().getId().equals(tokenTenantId)) continue;
                c.setRouteSequence(i + 1);
                customerRepository.save(c);
            }
            return ResponseEntity.ok(Map.of("message", "Sequence saved successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Sequence update failed: " + e.getMessage());
        }
    }

    // ── 8. ROUTE ASSIGNMENT ──
    @PutMapping("/{customerId}/route/{routeId}")
    @Transactional
    public ResponseEntity<?> assignCustomerToRoute(@PathVariable Long customerId, @PathVariable Long routeId,
                                                   @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(customerId).orElseThrow();
            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }
            com.pigmypay.PSolutions.model.Route route = routeRepository.findById(routeId).orElseThrow();
            customer.setRoute(route);
            if (route.getAssignedAgent() != null) customer.setAssignedAgent(route.getAssignedAgent());
            customerRepository.save(customer);
            return ResponseEntity.ok("Customer successfully moved to route: " + route.getName());
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Routing failed: " + e.getMessage());
        }
    }

    // ── 9. REMOVE FROM ROUTE ──
    @PutMapping("/{customerId}/route/null")
    @Transactional
    public ResponseEntity<?> removeFromRoute(@PathVariable Long customerId,
                                             @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(customerId).orElseThrow();
            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }
            customer.setRoute(null);
            customer.setRouteSequence(0);
            // Preserving customer.assignedAgent for direct assignment continuity
            customerRepository.save(customer);
            return ResponseEntity.ok(Map.of("message", "Customer removed from route."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Route removal failed: " + e.getMessage());
        }
    }

    // ── 9.1 DIRECT AGENT ASSIGNMENT ──
    @PutMapping("/{customerId}/assign-agent/{agentId}")
    @Transactional
    public ResponseEntity<?> assignCustomerToAgent(@PathVariable Long customerId, @PathVariable Long agentId,
                                                   @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(customerId).orElseThrow();
            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }
            User agent = userRepository.findById(agentId).orElseThrow();
            if (!agent.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }
            customer.setAssignedAgent(agent);
            
            // Set routeSequence to next index in the agent's assigned customer list
            List<Customer> currentCustomers = customerRepository.findByAssignedAgentIdAndTenantId(agentId, tokenTenantId);
            customer.setRouteSequence(currentCustomers.size() + 1);
            
            customerRepository.save(customer);
            return ResponseEntity.ok(Map.of("message", "Customer successfully assigned to agent: " + agent.getName()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Assignment failed: " + e.getMessage());
        }
    }

    // ── 9.2 DIRECT AGENT UNASSIGNMENT ──
    @PutMapping("/{customerId}/assign-agent/null")
    @Transactional
    public ResponseEntity<?> unassignCustomerFromAgent(@PathVariable Long customerId,
                                                       @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(customerId).orElseThrow();
            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }
            customer.setAssignedAgent(null);
            customer.setRouteSequence(0);
            customer.setRoute(null); // Clear route assignment as well when agent is unassigned
            customerRepository.save(customer);
            return ResponseEntity.ok(Map.of("message", "Customer successfully unassigned from agent."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Unassignment failed: " + e.getMessage());
        }
    }

    // ── 9.3 AGENT CUSTOMER SEQUENCE BULK UPDATE ──
    @PutMapping("/agent/{agentId}/sequence")
    @Transactional
    public ResponseEntity<?> updateAgentCustomerSequence(@PathVariable Long agentId, @RequestBody List<Long> orderedCustomerIds,
                                                         @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            for (int i = 0; i < orderedCustomerIds.size(); i++) {
                Customer c = customerRepository.findById(orderedCustomerIds.get(i)).orElseThrow();
                if (!c.getTenant().getId().equals(tokenTenantId)) continue;
                if (c.getAssignedAgent() != null && c.getAssignedAgent().getId().equals(agentId)) {
                    c.setRouteSequence(i + 1);
                    customerRepository.save(c);
                }
            }
            return ResponseEntity.ok(Map.of("message", "Agent customer sequence saved successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Sequence update failed: " + e.getMessage());
        }
    }

    // ── 10. REQUEST ACCOUNT CLOSURE ──
    @PostMapping("/{id}/request-closure")
    @Transactional
    public ResponseEntity<?> requestAccountClosure(@PathVariable Long id, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(id).orElseThrow();
            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }
            if (customer.getStatus().equals("CLOSED") || customer.getStatus().equals("CLOSURE_REQUESTED")) {
                return ResponseEntity.badRequest().body("Account is already closed or pending closure.");
            }

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

    // ── HELPER: SERIALIZATION MAPPER (BATCH OPTIMIZED) ──
    private List<Map<String, Object>> mapCustomersForFrontend(List<Customer> customers, Long tenantId) {
        if (customers.isEmpty()) return List.of();

        List<Loan> activeLoans = loanRepository.findByCustomerTenantIdAndStatus(tenantId, "ACTIVE");
        Map<Long, Loan> activeLoansMap = activeLoans.stream()
                .collect(Collectors.toMap(l -> l.getCustomer().getId(), l -> l, (l1, l2) -> l1));

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
            if (c.getRoute() != null) {
                map.put("route", Map.of(
                        "id", c.getRoute().getId(),
                        "name", c.getRoute().getName()
                ));
            } else {
                map.put("route", null);
            }
            // FIXED: return assignedAgent as nested object for frontend compatibility
            if (c.getAssignedAgent() != null) {
                map.put("assignedAgent", Map.of(
                        "id", c.getAssignedAgent().getId(),
                        "name", c.getAssignedAgent().getName()
                ));
            } else {
                map.put("assignedAgent", null);
            }
            // FIXED: include KYC fields
            map.put("kycStatus", c.getKycStatus());
            map.put("aadharNumber", c.getAadharNumber());
            map.put("panNumber", c.getPanNumber());
            map.put("guarantorName", c.getGuarantorName());
            map.put("guarantorPhoneNumber", c.getGuarantorPhoneNumber());

            // Coordinates and Risk mapping
            map.put("latitude", c.getLatitude());
            map.put("longitude", c.getLongitude());
            map.put("riskStatus", c.getRiskStatus());

            // Active Loan integration (Pre-mapped from batch query)
            Loan l = activeLoansMap.get(c.getId());
            if (l != null) {
                map.put("activeLoan", Map.of(
                        "id", l.getId(),
                        "hqLoanId", l.getHqLoanId(),
                        "principalAmount", l.getPrincipalAmount(),
                        "totalAmountDue", l.getTotalAmountDue(),
                        "amountPaid", l.getAmountPaid(),
                        "outstandingLoan", l.getTotalAmountDue().subtract(l.getAmountPaid()),
                        "monthlyEmiAmount", l.getMonthlyEmiAmount()
                ));
            } else {
                map.put("activeLoan", null);
            }

            return map;
        }).collect(Collectors.toList());
    }

    @PutMapping("/{id}/coordinates")
    @Transactional
    public ResponseEntity<?> updateCustomerCoordinates(
            @PathVariable Long id,
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestHeader("Authorization") String authHeader) {
        try {
            Long tenantId = jwtService.extractTenantId(extractToken(authHeader));
            Customer customer = customerRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            if (!customer.getTenant().getId().equals(tenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            customer.setLatitude(latitude);
            customer.setLongitude(longitude);
            customerRepository.save(customer);

            Map<String, Object> res = new HashMap<>();
            res.put("id", customer.getId());
            res.put("latitude", customer.getLatitude());
            res.put("longitude", customer.getLongitude());
            return ResponseEntity.ok(res);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping("/recalculate-risk")
    @Transactional
    public ResponseEntity<?> recalculateRisk(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String userEmail = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(userEmail).orElseThrow();
            if (!"ADMIN".equals(user.getRole().name())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }
            systemMaintenanceService.recalculateAllCustomersRisk();
            return ResponseEntity.ok("Risk scores recalculated successfully!");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }
}