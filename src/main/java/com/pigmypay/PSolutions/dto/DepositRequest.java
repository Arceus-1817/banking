package com.pigmypay.PSolutions.dto;
import lombok.Data;
import java.math.BigDecimal;

@Data
public class DepositRequest {
    private Long customerId;
    private BigDecimal amount;
    private String paymentMode; // "CASH", "UPI", "NONE"
    private String transactionCategory; // "SAVINGS_DEPOSIT", "SKIPPED_SHOP_CLOSED", etc.
}