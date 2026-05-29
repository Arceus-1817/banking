package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.LoanRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin
@RequestMapping("/api/loans")
public class LoanController {

    @Autowired private LoanRepository loanRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) return authHeader.substring(7);
        throw new RuntimeException("Missing Authorization header");
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<?> getCustomerLoans(@PathVariable Long customerId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            List<Loan> loans = loanRepository.findByCustomerId(customerId);

            // SATELLITE FIX: Clean DTO mapping
            List<Map<String, Object>> safeLoans = loans.stream()
                    .filter(l -> l.getCustomer().getTenant().getId().equals(tokenTenantId))
                    .map(l -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", l.getId());
                        map.put("hqLoanId", l.getHqLoanId());
                        map.put("totalAmountDue", l.getTotalAmountDue());
                        map.put("expectedMonthlyEmi", l.getExpectedMonthlyEmi());
                        map.put("amountPaidLocally", l.getAmountPaidLocally());
                        map.put("status", l.getStatus());
                        return map;
                    }).collect(Collectors.toList());

            return ResponseEntity.ok(safeLoans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching loans: " + e.getMessage());
        }
    }

    /**
     * LOCAL TESTING ONLY: Simulates a Loan Originating in the System
     */
    @PostMapping("/issue/{customerId}")
    public ResponseEntity<?> requestLoan(
            @PathVariable Long customerId,
            @RequestBody Map<String, Object> payload,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);

            Customer customer = customerRepository.findById(customerId).orElseThrow();

            if (!customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            // SATELLITE FIX: Since we deleted the complex math fields, we just set the targets
            Loan newLoan = new Loan();
            newLoan.setCustomer(customer);

            // Generate a random mock ID for local testing
            newLoan.setHqLoanId("L-" + System.currentTimeMillis());

            BigDecimal principal = new BigDecimal(payload.get("principalAmount").toString());
            newLoan.setTotalAmountDue(principal);

            // Just a rough estimate for local testing (Divide by 100 days)
            newLoan.setExpectedMonthlyEmi(principal.divide(BigDecimal.valueOf(100), 0, java.math.RoundingMode.CEILING));

            newLoan.setStatus("PENDING_APPROVAL");
            newLoan.setAmountPaidLocally(BigDecimal.ZERO);

            loanRepository.save(newLoan);
            return ResponseEntity.ok(Map.of("message", "Loan issued locally for collection."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error requesting loan: " + e.getMessage());
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingLoans(@RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));

            // SATELLITE FIX: Using direct DB Query instead of fetching all RAM
            List<Loan> pendingLoans = loanRepository.findByCustomerTenantIdAndStatus(tokenTenantId, "PENDING_APPROVAL");

            List<Map<String, Object>> safeLoans = pendingLoans.stream().map(l -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", l.getId());
                map.put("customerName", l.getCustomer().getName());
                map.put("totalAmountDue", l.getTotalAmountDue());
                map.put("expectedMonthlyEmi", l.getExpectedMonthlyEmi());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(safeLoans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/approve/{loanId}")
    public ResponseEntity<?> approveLoan(@PathVariable Long loanId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User admin = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            if (!admin.getRole().name().equals("ADMIN") && !admin.getRole().name().equals("SYSTEM_ADMIN")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only ADMIN can approve loans.");
            }

            Loan loan = loanRepository.findById(loanId).orElseThrow(() -> new RuntimeException("Loan not found"));

            if (!loan.getCustomer().getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            if (!loan.getStatus().equals("PENDING_APPROVAL")) {
                return ResponseEntity.badRequest().body("Loan is not in a pending state.");
            }

            loan.setStatus("ACTIVE");
            loanRepository.save(loan);

            return ResponseEntity.ok(Map.of("message", "Loan approved and sent to agent's daily route!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error approving loan: " + e.getMessage());
        }
    }
}