package com.pigmypay.PSolutions.dto;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;

@Data
public class CreateUserRequest {
    private String name;
    private String email;
    private String password;
    private String phoneNumber;
    private String role; // "ADMIN", "MANAGER", or "AGENT"
    private Long branchId; // Can be null if they are an ADMIN
    
    // PAYROLL & IDENTITY
    private BigDecimal commissionRate;
    private BigDecimal baseSalary;
    private BigDecimal dailyCollectionLimit;
    private String panNumber;
    private String aadhaarNumber;
    private String bankName;
    private String bankAccountNumber;
    private String bankIfscCode;
    private LocalDate dateOfBirth;
    private LocalDate dateOfJoining;
}