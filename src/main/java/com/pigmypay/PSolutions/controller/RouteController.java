package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.AgentShift;
import com.pigmypay.PSolutions.model.Branch;
import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Route;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.AgentShiftRepository;
import com.pigmypay.PSolutions.repository.BranchRepository;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.RouteRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
@RequestMapping("/api/routes")
public class RouteController {

    @Autowired private RouteRepository routeRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private AgentShiftRepository agentShiftRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private BranchRepository branchRepository;
    @Autowired private JwtService jwtService;
    @Autowired private com.pigmypay.PSolutions.repository.LoanRepository loanRepository;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    @GetMapping
    public ResponseEntity<?> getRoutes(@RequestHeader("Authorization") String authHeader) {
        User user = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();
        List<Route> routes = routeRepository.findByTenantId(user.getTenant().getId());
        
        return ResponseEntity.ok(routes.stream().map(r -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", r.getId());
            m.put("name", r.getName());
            m.put("description", r.getDescription());
            
            // Find active agent shift for this route
            List<AgentShift> shifts = agentShiftRepository.findByRouteIdAndStatus(r.getId(), "ACTIVE");
            if (!shifts.isEmpty()) {
                User agent = shifts.get(0).getAgent();
                m.put("assignedAgent", Map.of(
                    "id", agent.getId(),
                    "name", agent.getName()
                ));
            } else {
                m.put("assignedAgent", null);
            }
            return m;
        }).collect(Collectors.toList()));
    }

    @PostMapping("/create")
    @Transactional
    public ResponseEntity<?> createRoute(@RequestBody Map<String, Object> payload, @RequestHeader("Authorization") String authHeader) {
        try {
            User manager = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            Route route = new Route();
            route.setName(payload.get("routeName").toString());
            route.setTenant(manager.getTenant());

            if (manager.getBranch() != null) {
                route.setBranch(manager.getBranch());
            } else {
                List<Branch> allBranches = branchRepository.findByTenantId(manager.getTenant().getId());
                if (allBranches.isEmpty()) {
                    return ResponseEntity.badRequest().body("CRITICAL ERROR: You must create at least one Branch before creating a Route!");
                }
                route.setBranch(allBranches.get(0));
            }

            Route saved = routeRepository.save(route);
            return ResponseEntity.ok(Map.of(
                "id", saved.getId(),
                "routeName", saved.getName(),
                "description", saved.getDescription() != null ? saved.getDescription() : ""
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to save Route: " + e.getMessage());
        }
    }

    @PostMapping("/assign-customer")
    @Transactional
    public ResponseEntity<?> assignCustomer(@RequestBody Map<String, Object> payload) {
        Customer customer = customerRepository.findById(Long.valueOf(payload.get("customerId").toString())).orElseThrow();
        Route route = routeRepository.findById(Long.valueOf(payload.get("routeId").toString())).orElseThrow();
        customer.setRoute(route);
        customer.setRouteSequence(Integer.valueOf(payload.get("routeSequence").toString()));
        
        // Propagate agent
        User agent = route.getAssignedAgent();
        if (agent == null) {
            List<AgentShift> shifts = agentShiftRepository.findByRouteIdAndStatus(route.getId(), "ACTIVE");
            if (!shifts.isEmpty()) {
                agent = shifts.get(0).getAgent();
            }
        }
        if (agent != null) {
            customer.setAssignedAgent(agent);
        }
        
        customerRepository.save(customer);
        return ResponseEntity.ok(Map.of("message", "Customer assigned successfully"));
    }

    @PostMapping("/assign-shift")
    @Transactional
    public ResponseEntity<?> assignShift(@RequestBody Map<String, Object> payload) {
        User agent = userRepository.findById(Long.valueOf(payload.get("agentId").toString())).orElseThrow();
        Route route = routeRepository.findById(Long.valueOf(payload.get("routeId").toString())).orElseThrow();

        // Deactivate any existing active shifts for this agent first
        List<AgentShift> existingShifts = agentShiftRepository.findByAgentIdAndStatus(agent.getId(), "ACTIVE");
        for (AgentShift s : existingShifts) {
            s.setStatus("INACTIVE");
            agentShiftRepository.save(s);
        }

        // Deactivate any prior agent assigned to this route
        route.setAssignedAgent(agent);
        routeRepository.save(route);

        // Update all customers currently on this route to match the newly assigned agent
        List<Customer> routeCustomers = customerRepository.findByRouteIdOrderByRouteSequenceAsc(route.getId());
        for (Customer c : routeCustomers) {
            c.setAssignedAgent(agent);
            customerRepository.save(c);
        }

        AgentShift shift = new AgentShift();
        shift.setAgent(agent);
        shift.setRoute(route);
        shift.setStartDate(LocalDate.now());
        shift.setStatus("ACTIVE");
        shift.setTenant(agent.getTenant());
        AgentShift saved = agentShiftRepository.save(shift);
        return ResponseEntity.ok(Map.of(
            "id", saved.getId(),
            "status", saved.getStatus(),
            "startDate", saved.getStartDate().toString(),
            "routeId", saved.getRoute().getId(),
            "agentId", saved.getAgent().getId()
        ));
    }

    @GetMapping("/my-daily-route")
    public ResponseEntity<?> getMyDailyRoute(@RequestHeader("Authorization") String authHeader) {
        try {
            User agent = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            // Find ALL active shifts, ignoring date for debugging purposes
            List<AgentShift> activeShifts = agentShiftRepository.findByAgentIdAndStatus(agent.getId(), "ACTIVE");

            if (activeShifts.isEmpty()) return ResponseEntity.ok(List.of());

            // Get customers for the first route found
            List<Customer> routeCustomers = customerRepository.findByRouteIdOrderByRouteSequenceAsc(activeShifts.get(0).getRoute().getId());

            return ResponseEntity.ok(routeCustomers.stream().map(c -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", c.getId());
                m.put("name", c.getName());
                m.put("accountNumber", c.getAccountNumber());
                m.put("currentBalance", c.getCurrentBalance());
                m.put("riskStatus", c.getRiskStatus());
                m.put("latitude", c.getLatitude());
                m.put("longitude", c.getLongitude());
                m.put("phoneNumber", c.getPhoneNumber());
                m.put("residentialAddress", c.getResidentialAddress());
                
                // Safe Loan fetch
                var loans = loanRepository.findByCustomerIdAndStatus(c.getId(), "ACTIVE");
                BigDecimal outstanding = BigDecimal.ZERO;
                BigDecimal monthlyEmi = BigDecimal.ZERO;
                if (!loans.isEmpty()) {
                    var l = loans.get(0);
                    monthlyEmi = l.getExpectedMonthlyEmi();
                    outstanding = l.getTotalAmountDue().subtract(l.getAmountPaid());
                }
                m.put("activeMonthlyEmi", monthlyEmi);
                m.put("outstandingLoan", outstanding);
                return m;
            }).collect(Collectors.toList()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Route Error: " + e.getMessage());
        }
    }
}