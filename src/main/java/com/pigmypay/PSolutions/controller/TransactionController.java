package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.dto.DepositRequest;
import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.LoanRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.security.JwtService;
import com.pigmypay.PSolutions.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired private TransactionRepository transactionRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private JwtService jwtService;
    @Autowired private NotificationService notificationService;

    // Helper: extracts the raw token string
    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        throw new RuntimeException("Missing or invalid Authorization header");
    }

    @GetMapping("/demand/{loanId}")
    public ResponseEntity<?> getTodaysDemand(@PathVariable Long loanId, @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);

            Loan loan = loanRepository.findById(loanId).orElseThrow(() -> new RuntimeException("Loan not found"));

            if (!loan.getCustomer().getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }

            BigDecimal totalDemand = loan.getMonthlyEmiAmount()
                    .add(loan.getArrearsBalance() != null ? loan.getArrearsBalance() : BigDecimal.ZERO)
                    .add(loan.getPenaltyCharges() != null ? loan.getPenaltyCharges() : BigDecimal.ZERO);

            Map<String, Object> response = new HashMap<>();
            response.put("loanId", loan.getId());
            response.put("dailyEmi", loan.getMonthlyEmiAmount());
            response.put("monthlyEmi", loan.getMonthlyEmiAmount());
            response.put("arrears", loan.getArrearsBalance());
            response.put("penalties", loan.getPenaltyCharges());
            response.put("totalDemandToday", totalDemand);
            response.put("totalDemandMonth", totalDemand);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/deposit")
    @Transactional
    public ResponseEntity<?> makeDeposit(
            @RequestBody DepositRequest request,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);
            String userEmail = jwtService.extractUsername(token);

            User agent = userRepository.findByEmail(userEmail).orElseThrow();
            Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();

            if (customer.getTenant() != null && !customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            boolean isSkip = request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) == 0;

            if (!isSkip) {
                validateAgentCashLimit(agent, request.getAmount());
                customer.setCurrentBalance(customer.getCurrentBalance().add(request.getAmount()));
                customerRepository.save(customer);
            }

            Transaction savedTransaction = new Transaction();
            savedTransaction.setCustomer(customer);
            savedTransaction.setAgent(agent);
            savedTransaction.setAmount(request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO);
            savedTransaction.setPaymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : "NONE");
            savedTransaction.setTransactionType("DEPOSIT");
            savedTransaction.setTransactionDate(LocalDateTime.now());
            savedTransaction.setTenant(agent.getTenant());

            if (request.getTransactionCategory() != null && !request.getTransactionCategory().isEmpty()) {
                savedTransaction.setTransactionCategory(request.getTransactionCategory());
            } else {
                savedTransaction.setTransactionCategory("SAVINGS_DEPOSIT");
            }

            savedTransaction.setSettlementStatus(isSkip ? "SETTLED" : "UNSETTLED");
            transactionRepository.save(savedTransaction);

            if (!isSkip) {
                notificationService.sendWhatsAppReceipt(savedTransaction);
            }

            return ResponseEntity.ok(Map.of(
                    "id", savedTransaction.getId(),
                    "amount", savedTransaction.getAmount(),
                    "transactionCategory", savedTransaction.getTransactionCategory(),
                    "paymentMode", savedTransaction.getPaymentMode(),
                    "transactionDate", savedTransaction.getTransactionDate()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/loan-emi")
    @Transactional
    public ResponseEntity<?> payLoanEmi(
            @RequestBody DepositRequest request,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);
            String userEmail = jwtService.extractUsername(token);

            User agent = userRepository.findByEmail(userEmail).orElseThrow();
            Customer customer = customerRepository.findById(request.getCustomerId()).orElseThrow();

            if (customer.getTenant() != null && !customer.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied.");
            }

            validateAgentCashLimit(agent, request.getAmount());

            List<Loan> activeLoans = loanRepository.findByCustomerIdAndStatus(customer.getId(), "ACTIVE");
            if (activeLoans.isEmpty()) {
                throw new RuntimeException("Customer has no active loans.");
            }

            Loan currentLoan = activeLoans.get(0);
            BigDecimal amountCollected = request.getAmount();

            currentLoan.setAmountPaid(currentLoan.getAmountPaid().add(amountCollected));

            if (amountCollected.compareTo(currentLoan.getMonthlyEmiAmount()) > 0) {
                BigDecimal extraMoney = amountCollected.subtract(currentLoan.getMonthlyEmiAmount());

                if (currentLoan.getArrearsBalance() != null && currentLoan.getArrearsBalance().compareTo(BigDecimal.ZERO) > 0) {
                    if (extraMoney.compareTo(currentLoan.getArrearsBalance()) >= 0) {
                        extraMoney = extraMoney.subtract(currentLoan.getArrearsBalance());
                        currentLoan.setArrearsBalance(BigDecimal.ZERO);
                    } else {
                        currentLoan.setArrearsBalance(currentLoan.getArrearsBalance().subtract(extraMoney));
                        extraMoney = BigDecimal.ZERO;
                    }
                }

                if (extraMoney.compareTo(BigDecimal.ZERO) > 0 && currentLoan.getPenaltyCharges() != null && currentLoan.getPenaltyCharges().compareTo(BigDecimal.ZERO) > 0) {
                    if (extraMoney.compareTo(currentLoan.getPenaltyCharges()) >= 0) {
                        currentLoan.setPenaltyCharges(BigDecimal.ZERO);
                    } else {
                        currentLoan.setPenaltyCharges(currentLoan.getPenaltyCharges().subtract(extraMoney));
                    }
                }
            }

            if (currentLoan.getAmountPaid().compareTo(currentLoan.getTotalAmountDue()) >= 0) {
                currentLoan.setStatus("CLOSED");
                currentLoan.setEndDate(LocalDate.now());
            }

            loanRepository.save(currentLoan);

            Transaction emiPayment = new Transaction();
            emiPayment.setCustomer(customer);
            emiPayment.setAgent(agent);
            emiPayment.setAmount(amountCollected);
            emiPayment.setPaymentMode(request.getPaymentMode() != null ? request.getPaymentMode() : "CASH");
            emiPayment.setTransactionType("DEPOSIT");
            emiPayment.setTransactionDate(LocalDateTime.now());
            emiPayment.setTenant(agent.getTenant());
            emiPayment.setTransactionCategory("LOAN_REPAYMENT");
            emiPayment.setSettlementStatus("UNSETTLED");
            emiPayment.setAssociatedLoan(currentLoan);

            transactionRepository.save(emiPayment);
            notificationService.sendWhatsAppReceipt(emiPayment);
            return ResponseEntity.ok(Map.of(
                    "id", emiPayment.getId(),
                    "amount", emiPayment.getAmount(),
                    "transactionCategory", emiPayment.getTransactionCategory(),
                    "paymentMode", emiPayment.getPaymentMode(),
                    "transactionDate", emiPayment.getTransactionDate()
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("EMI Payment failed: " + e.getMessage());
        }
    }

    // 🚨 FIXED: SERIALIZATION TRAP AVOIDED
    @GetMapping("/history/{customerId}")
    public ResponseEntity<?> getCustomerHistory(
            @PathVariable Long customerId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);

            Customer customer = customerRepository.findById(customerId)
                    .orElseThrow(() -> new RuntimeException("Customer not found"));

            if (customer.getTenant() != null && tokenTenantId != null) {
                if (!customer.getTenant().getId().equals(tokenTenantId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
                }
            }

            List<Transaction> history = transactionRepository.findByCustomerIdOrderByTransactionDateDesc(customerId);

            // Map strictly required fields to avoid Jackson looping issues
            List<Map<String, Object>> safeHistory = history.stream().map(t -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("amount", t.getAmount());
                map.put("transactionDate", t.getTransactionDate());
                map.put("paymentMode", t.getPaymentMode());
                map.put("transactionCategory", t.getTransactionCategory());
                map.put("agentName", t.getAgent() != null ? t.getAgent().getName() : "Unknown");
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(safeHistory);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error fetching history: " + e.getMessage());
        }
    }

    // 🚨 FIXED: REPLACED MEMORY-HEAVY findAll() WITH DIRECT REPOSITORY QUERIES
    @GetMapping("/recent/{tenantId}")
    public ResponseEntity<?> getRecentTransactionsForTenant(
            @PathVariable Long tenantId,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);
            String userEmail = jwtService.extractUsername(token);

            if (!tenantId.equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }

            User requestingUser = userRepository.findByEmail(userEmail).orElseThrow();
            String role = requestingUser.getRole().name();

            List<Transaction> recentTransactions;
            if (role.equals("MANAGER") && requestingUser.getBranch() != null) {
                recentTransactions = transactionRepository.findByAgentBranchIdAndTransactionDateAfter(
                        requestingUser.getBranch().getId(), LocalDateTime.now().minusDays(7));
            } else {
                recentTransactions = transactionRepository.findByTenantIdOrderByTransactionDateDesc(tenantId);
                if(recentTransactions.size() > 50) recentTransactions = recentTransactions.subList(0, 50);
            }

            List<Map<String, Object>> safeFeed = recentTransactions.stream().map(t -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("amount", t.getAmount());
                map.put("transactionDate", t.getTransactionDate());
                map.put("paymentMode", t.getPaymentMode());
                map.put("category", t.getTransactionCategory());
                map.put("customerName", t.getCustomer() != null ? t.getCustomer().getName() : "Unknown");
                map.put("agentName", t.getAgent() != null ? t.getAgent().getName() : "Unknown");
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(safeFeed);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @GetMapping("/my-history")
    public ResponseEntity<?> getMyRecentHistory(@RequestHeader("Authorization") String authHeader) {
        try {
            String email = jwtService.extractUsername(extractToken(authHeader));
            User agent = userRepository.findByEmail(email)
                    .orElseThrow(() -> new RuntimeException("Agent not found with email: " + email));

            // Use the new Safe Repository method
            List<Transaction> history = transactionRepository.findByAgentIdSafe(agent.getId());

            return ResponseEntity.ok(history.stream().map(t -> {
                Map<String, Object> m = new HashMap<>();
                m.put("id", t.getId());
                m.put("amount", t.getAmount());
                m.put("transactionDate", t.getTransactionDate());
                m.put("paymentMode", t.getPaymentMode());
                m.put("category", t.getTransactionCategory());
                m.put("customerName", t.getCustomer() != null ? t.getCustomer().getName() : "Unknown");
                return m;
            }).collect(Collectors.toList()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("History Error: " + e.getMessage());
        }
    }

    @GetMapping("/my-daily-ledger")
    public ResponseEntity<?> getMyDailyCloudLedger(@RequestHeader("Authorization") String authHeader) {
        try {
            User agent = userRepository.findByEmail(jwtService.extractUsername(extractToken(authHeader))).orElseThrow();

            Map<String, Object> cloudStats = new HashMap<>();
            cloudStats.put("cash", transactionRepository.calculateTodayTotal(agent.getId(), "CASH"));
            cloudStats.put("upi", transactionRepository.calculateTodayTotal(agent.getId(), "UPI"));
            cloudStats.put("skipped", transactionRepository.countTodaySkips(agent.getId()));

            return ResponseEntity.ok(cloudStats);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @GetMapping("/agent/{agentId}/performance")
    public ResponseEntity<?> getAgentPerformance(
            @PathVariable Long agentId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);
            String userEmail = jwtService.extractUsername(token);

            User requestingUser = userRepository.findByEmail(userEmail).orElseThrow();
            User targetAgent = userRepository.findById(agentId)
                    .orElseThrow(() -> new RuntimeException("Agent not found"));

            // 1. Tenant Isolation check
            if (!targetAgent.getTenant().getId().equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }

            // 2. Manager Branch Isolation check
            if ("MANAGER".equals(requestingUser.getRole().name())) {
                if (requestingUser.getBranch() == null || targetAgent.getBranch() == null ||
                        !requestingUser.getBranch().getId().equals(targetAgent.getBranch().getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
                }
            }

            // Fetch transactions for the agent
            List<Transaction> txns = transactionRepository.findByAgentIdSafe(agentId);

            // Filter by year and month if provided
            if (year != null && month != null) {
                txns = txns.stream().filter(t -> {
                    LocalDateTime dt = t.getTransactionDate();
                    return dt.getYear() == year && dt.getMonthValue() == month;
                }).collect(Collectors.toList());
            }

            List<Map<String, Object>> result = txns.stream().map(t -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("amount", t.getAmount());
                map.put("transactionDate", t.getTransactionDate());
                map.put("paymentMode", t.getPaymentMode());
                map.put("category", t.getTransactionCategory());
                map.put("isReversed", t.getIsReversed());
                map.put("customerName", t.getCustomer() != null ? t.getCustomer().getName() : "Unknown");
                map.put("customerAccountNumber", t.getCustomer() != null ? t.getCustomer().getAccountNumber() : "Unknown");
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching agent performance: " + e.getMessage());
        }
    }

    @GetMapping("/tenant/{tenantId}/performance")
    public ResponseEntity<?> getTenantPerformance(
            @PathVariable Long tenantId,
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            Long tokenTenantId = jwtService.extractTenantId(token);
            String userEmail = jwtService.extractUsername(token);

            User requestingUser = userRepository.findByEmail(userEmail).orElseThrow();

            // 1. Tenant Isolation check
            if (!tenantId.equals(tokenTenantId)) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }

            // Fetch transactions for the tenant
            List<Transaction> txns;
            if ("MANAGER".equals(requestingUser.getRole().name()) && requestingUser.getBranch() != null) {
                // If branch manager, restrict to their branch
                txns = transactionRepository.findByAgentBranchIdAndTransactionDateAfter(
                        requestingUser.getBranch().getId(), LocalDateTime.now().minusYears(1));
            } else {
                txns = transactionRepository.findByTenantIdOrderByTransactionDateDesc(tenantId);
            }

            // Filter by year and month if provided
            if (year != null && month != null) {
                txns = txns.stream().filter(t -> {
                    LocalDateTime dt = t.getTransactionDate();
                    return dt.getYear() == year && dt.getMonthValue() == month;
                }).collect(Collectors.toList());
            }

            List<Map<String, Object>> result = txns.stream().map(t -> {
                Map<String, Object> map = new HashMap<>();
                map.put("id", t.getId());
                map.put("amount", t.getAmount());
                map.put("transactionDate", t.getTransactionDate());
                map.put("paymentMode", t.getPaymentMode());
                map.put("category", t.getTransactionCategory());
                map.put("isReversed", t.getIsReversed());
                map.put("agentName", t.getAgent() != null ? t.getAgent().getName() : "Unknown");
                map.put("customerName", t.getCustomer() != null ? t.getCustomer().getName() : "Unknown");
                map.put("customerAccountNumber", t.getCustomer() != null ? t.getCustomer().getAccountNumber() : "Unknown");
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error fetching tenant performance: " + e.getMessage());
        }
    }

    private void validateAgentCashLimit(User agent, BigDecimal incomingAmount) {
        List<Transaction> unsettledCash = transactionRepository.findByAgentIdAndSettlementStatus(agent.getId(), "UNSETTLED");
        BigDecimal currentHolding = BigDecimal.ZERO;
        for (Transaction t : unsettledCash) {
            currentHolding = currentHolding.add(t.getAmount());
        }
        BigDecimal projectedHolding = currentHolding.add(incomingAmount);

        if (projectedHolding.compareTo(agent.getMaxCashHoldingLimit()) > 0) {
            throw new RuntimeException("CASH LIMIT EXCEEDED: You are holding ₹" + currentHolding +
                    ". Collecting this ₹" + incomingAmount + " exceeds your limit of ₹" +
                    agent.getMaxCashHoldingLimit() + ". Please return to the branch and settle cash immediately.");
        }
    }
}