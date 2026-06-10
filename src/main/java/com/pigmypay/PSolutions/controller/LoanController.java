package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.LoanRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
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

            List<Map<String, Object>> safeLoans = loans.stream()
                    .filter(l -> l.getCustomer().getTenant().getId().equals(tokenTenantId))
                    .map(l -> {
                        Map<String, Object> map = new HashMap<>();
                        map.put("id", l.getId());
                        map.put("hqLoanId", l.getHqLoanId());
                        // FIXED: use correct field names from updated Loan model
                        map.put("principalAmount", l.getPrincipalAmount());
                        map.put("interestRate", l.getInterestRate());
                        map.put("totalAmountDue", l.getTotalAmountDue());
                        map.put("monthlyEmiAmount", l.getMonthlyEmiAmount());
                        map.put("expectedMonthlyEmi", l.getExpectedMonthlyEmi());
                        map.put("amountPaid", l.getAmountPaid());
                        map.put("amountPaidLocally", l.getAmountPaidLocally());
                        map.put("arrearsBalance", l.getArrearsBalance());
                        map.put("penaltyCharges", l.getPenaltyCharges());
                        map.put("status", l.getStatus());
                        map.put("endDate", l.getEndDate());
                        return map;
                    }).collect(Collectors.toList());

            return ResponseEntity.ok(safeLoans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching loans: " + e.getMessage());
        }
    }

    /**
     * LOCAL TESTING: Issue a new loan. Calculates principal, interest, total, and EMI.
     */
    @PostMapping("/issue/{customerId}")
    @Transactional
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

            BigDecimal principal = new BigDecimal(payload.get("principalAmount").toString());
            BigDecimal rate = payload.containsKey("interestRate")
                    ? new BigDecimal(payload.get("interestRate").toString())
                    : BigDecimal.TEN;
            Integer tenureMonths = payload.containsKey("tenureMonths")
                    ? Integer.parseInt(payload.get("tenureMonths").toString())
                    : 12;

            BigDecimal interest = principal.multiply(rate).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            BigDecimal total = principal.add(interest);
            // Divide over the tenure in months for standard monthly EMI collection
            BigDecimal emi = total.divide(BigDecimal.valueOf(tenureMonths), 0, RoundingMode.CEILING);

            Loan newLoan = new Loan();
            newLoan.setCustomer(customer);
            newLoan.setHqLoanId("L-" + System.currentTimeMillis());
            newLoan.setPrincipalAmount(principal);
            newLoan.setInterestRate(rate);
            newLoan.setTotalAmountDue(total);
            newLoan.setTenureMonths(tenureMonths);
            newLoan.setMonthlyEmiAmount(emi); // This also sets expectedMonthlyEmi via the setter
            newLoan.setStatus("PENDING_APPROVAL");
            newLoan.setAmountPaid(BigDecimal.ZERO);
            newLoan.setAmountPaidLocally(BigDecimal.ZERO);
            newLoan.setArrearsBalance(BigDecimal.ZERO);
            newLoan.setPenaltyCharges(BigDecimal.ZERO);

            loanRepository.save(newLoan);
            return ResponseEntity.ok(Map.of(
                    "message", "Loan requested. Awaiting admin approval.",
                    "principalAmount", principal,
                    "interestRate", rate,
                    "totalAmountDue", total,
                    "tenureMonths", tenureMonths,
                    "monthlyEmi", emi
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error requesting loan: " + e.getMessage());
        }
    }

    @GetMapping("/pending")
    public ResponseEntity<?> getPendingLoans(@RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            List<Loan> pendingLoans = loanRepository.findByCustomerTenantIdAndStatus(tokenTenantId, "PENDING_APPROVAL");

            List<Map<String, Object>> safeLoans = pendingLoans.stream().map(l -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", l.getId());
                map.put("customerName", l.getCustomer().getName());
                map.put("customerId", l.getCustomer().getId());
                map.put("principalAmount", l.getPrincipalAmount());
                map.put("interestRate", l.getInterestRate());
                map.put("totalAmountDue", l.getTotalAmountDue());
                map.put("monthlyEmiAmount", l.getMonthlyEmiAmount());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(safeLoans);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PutMapping("/approve/{loanId}")
    @Transactional
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

            return ResponseEntity.ok(Map.of("message", "Loan approved and activated!"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error approving loan: " + e.getMessage());
        }
    }

    @PutMapping("/reject/{loanId}")
    @Transactional
    public ResponseEntity<?> rejectLoan(@PathVariable Long loanId, @RequestHeader("Authorization") String authHeader) {
        try {
            Long tokenTenantId = jwtService.extractTenantId(extractToken(authHeader));
            User admin = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            if (admin.getRole() != Role.ADMIN && admin.getRole() != Role.SYSTEM_ADMIN) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Only ADMIN can reject loans.");
            }

            Loan loan = loanRepository.findById(loanId).orElseThrow();
            if (!loan.getCustomer().getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            loan.setStatus("REJECTED");
            loanRepository.save(loan);
            return ResponseEntity.ok(Map.of("message", "Loan application rejected."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error rejecting loan: " + e.getMessage());
        }
    }
}