package com.pigmypay.PSolutions;

import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.model.Tenant;
import com.pigmypay.PSolutions.model.User;
import com.pigmypay.PSolutions.repository.TenantRepository;
import com.pigmypay.PSolutions.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.security.crypto.password.PasswordEncoder;

@SpringBootApplication
@EnableScheduling
@EnableAsync
public class PSolutionsApplication {

	public static void main(String[] args) {
		SpringApplication.run(PSolutionsApplication.class, args);
	}

	@Bean
	CommandLineRunner initDatabase(UserRepository userRepository,
								   TenantRepository tenantRepository,
								   PasswordEncoder passwordEncoder) {
		return args -> {

			// 1. Create the Master Tenant (HQ) if it doesn't exist
			Tenant hqTenant;
			var existingTenant = tenantRepository.findAll();
			if (existingTenant.isEmpty()) {
				hqTenant = new Tenant();
				hqTenant.setCompanyName("PigmyPay System HQ");
				hqTenant.setPlan("ENTERPRISE");

				// 🚨 SATELLITE FIX: Initialize default mapping to prevent DB constraint crashes
				hqTenant.setCsvMappingConfig("{\"hqCustomerId\": 0, \"accountNumber\": 1, \"name\": 2, \"hqLoanId\": 3, \"expectedDailyEmi\": 4}");

				hqTenant = tenantRepository.save(hqTenant);
				System.out.println("✅ MASTER TENANT CREATED");
			} else {
				hqTenant = existingTenant.get(0);
			}

			// 2. Create the SYSTEM_ADMIN (God Mode) if it doesn't exist
			if (userRepository.findByEmail("patil.shreyansh.18@gmail.com").isEmpty()) {
				User superAdmin = new User();
				superAdmin.setName("System Owner");
				superAdmin.setEmail("patil.shreyansh.18@gmail.com");
				superAdmin.setPassword(passwordEncoder.encode("Snp@1817"));
				superAdmin.setRole(Role.SYSTEM_ADMIN);
				superAdmin.setPhoneNumber("9999999999");
				superAdmin.setTenant(hqTenant);

				// 🚨 SECURITY FIX: Initialize active status to pass the JwtFilter
				superAdmin.setIsActive(true);
				superAdmin.setFailedLoginAttempts(0);

				userRepository.save(superAdmin);
				System.out.println("✅ SYSTEM ADMIN CREATED (Login: patil.shreyansh.18@gmail.com / Snp@1817)");
			}
		};
	}
}