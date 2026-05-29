package com.pigmypay.PSolutions.dto;
import lombok.Data;

@Data
public class CreateUserRequest {
    private String name;
    private String email;
    private String password;
    private String phoneNumber;
    private String role; // "ADMIN", "MANAGER", or "AGENT"
    private Long branchId; // Can be null if they are an ADMIN
}