package com.pigmypay.PSolutions.controller;

import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.model.Customer;
import com.pigmypay.PSolutions.model.Loan;
import com.pigmypay.PSolutions.model.Transaction;
import com.pigmypay.PSolutions.repository.UserRepository;
import com.pigmypay.PSolutions.repository.CustomerRepository;
import com.pigmypay.PSolutions.repository.LoanRepository;
import com.pigmypay.PSolutions.repository.TransactionRepository;
import com.pigmypay.PSolutions.security.JwtService;
import com.pigmypay.PSolutions.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.Map;
import java.util.List;

@RestController
@CrossOrigin
@Transactional(readOnly = true)
@RequestMapping("/api/twilio")
public class TwilioController {

    @Autowired private UserRepository userRepository;
    @Autowired private JwtService jwtService;
    @Autowired private NotificationService notificationService;
    @Autowired private CustomerRepository customerRepository;
    @Autowired private LoanRepository loanRepository;
    @Autowired private TransactionRepository transactionRepository;

    private String extractToken(String authHeader) {
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
        }
        throw new RuntimeException("Missing or invalid Authorization header");
    }

    @GetMapping("/status")
    public ResponseEntity<?> getTwilioStatus(@RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String userEmail = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(userEmail).orElseThrow();
            if (!"ADMIN".equals(user.getRole().name())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }
            Map<String, Object> status = new HashMap<>();
            status.put("configured", notificationService.isTwilioEnabled());
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    @PostMapping("/test")
    public ResponseEntity<?> sendTestMessage(
            @RequestParam String phoneNumber,
            @RequestParam String message,
            @RequestHeader("Authorization") String authHeader) {
        try {
            String token = extractToken(authHeader);
            String userEmail = jwtService.extractUsername(token);
            User user = userRepository.findByEmail(userEmail).orElseThrow();
            if (!"ADMIN".equals(user.getRole().name())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Access Denied");
            }
            boolean success = notificationService.sendTestWhatsApp(phoneNumber, message);
            if (success) {
                return ResponseEntity.ok("Test WhatsApp message dispatched successfully via Twilio!");
            } else {
                return ResponseEntity.badRequest().body("Failed to dispatch message. Twilio may not be initialized or configured properly.");
            }
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Error: " + e.getMessage());
        }
    }

    @PostMapping(value = "/webhook", produces = MediaType.APPLICATION_XML_VALUE)
    @ResponseBody
    public String handleTwilioWebhook(
            @RequestParam("From") String from,
            @RequestParam("Body") String body) {
        
        // 1. Clean the incoming phone number (format: whatsapp:+91XXXXXXXXXX)
        String cleanPhone = from.replace("whatsapp:", "").trim();
        if (cleanPhone.startsWith("+")) {
            cleanPhone = cleanPhone.substring(1);
        }
        
        // Standardize: extract the last 10 digits
        String last10 = cleanPhone.length() >= 10 
                ? cleanPhone.substring(cleanPhone.length() - 10) 
                : cleanPhone;
        
        List<Customer> customers = customerRepository.findByPhoneNumberContaining(last10);
        
        String command = (body != null) ? body.trim().toUpperCase() : "";
        StringBuilder reply = new StringBuilder();
        
        if (customers.isEmpty()) {
            reply.append("Welcome to PigmyPay!\n")
                 .append("We could not find any active customer account matching your phone number (*+")
                 .append(cleanPhone)
                 .append("*).\n")
                 .append("Please contact your branch to register this number.");
        } else {
            if ("BALANCE".equals(command)) {
                reply.append("📋 *PigmyPay Balance Summary*\n\n");
                for (Customer c : customers) {
                    reply.append("👤 *Name:* ").append(c.getName()).append("\n")
                         .append("🏦 *A/C:* ").append(c.getAccountNumber()).append("\n")
                         .append("💰 *Balance:* ₹").append(c.getCurrentBalance()).append("\n\n");
                }
            } else if ("STATEMENT".equals(command)) {
                reply.append("📋 *PigmyPay Mini-Statement*\n\n");
                for (Customer c : customers) {
                    reply.append("👤 *Client:* ").append(c.getName()).append(" (A/C: ").append(c.getAccountNumber()).append(")\n");
                    List<Transaction> txns = transactionRepository.findByCustomerIdOrderByTransactionDateDesc(c.getId());
                    if (txns.isEmpty()) {
                        reply.append("   _No recent transactions found._\n\n");
                    } else {
                        int limit = Math.min(3, txns.size());
                        for (int i = 0; i < limit; i++) {
                            Transaction t = txns.get(i);
                            String indicator = t.getIsReversed() ? "⚠️ [REVERSED] " : "🟢 ";
                            reply.append("  ").append(indicator).append(t.getTransactionDate().toLocalDate().toString())
                                 .append(": ₹").append(t.getAmount())
                                 .append(" (").append(t.getTransactionCategory().replace("_", " ")).append(")\n");
                        }
                        reply.append("\n");
                    }
                }
            } else if ("LOAN".equals(command)) {
                reply.append("📋 *PigmyPay Loan Details*\n\n");
                boolean foundLoan = false;
                for (Customer c : customers) {
                    List<Loan> loans = loanRepository.findByCustomerId(c.getId());
                    if (!loans.isEmpty()) {
                        foundLoan = true;
                        reply.append("👤 *Client:* ").append(c.getName()).append("\n");
                        for (Loan l : loans) {
                            reply.append("🏦 *Loan ID:* ").append(l.getHqLoanId()).append("\n")
                                 .append("  💸 *Principal:* ₹").append(l.getPrincipalAmount()).append("\n")
                                 .append("  📅 *EMI:* ₹").append(l.getMonthlyEmiAmount()).append("/mo\n")
                                 .append("  🎯 *Status:* ").append(l.getStatus()).append("\n\n");
                        }
                    }
                }
                if (!foundLoan) {
                    reply.append("No active loans found for your registered account(s).");
                }
            } else {
                reply.append("Welcome to *PigmyPay Self-Service Bot*!\n\n")
                     .append("Reply with one of the following commands:\n")
                     .append("👉 *BALANCE* : View account balances\n")
                     .append("👉 *STATEMENT* : Get last 3 transactions\n")
                     .append("👉 *LOAN* : Check your active loans");
            }
        }
        
        return "<Response><Message>" + reply.toString() + "</Message></Response>";
    }
}
