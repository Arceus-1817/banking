package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Role;
import com.pigmypay.PSolutions.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Auth Lookups
    Optional<User> findByEmail(String email);
    Optional<User> findByPhoneNumber(String phoneNumber);

    // 🚨 SATELLITE LOOKUP: If HQ sends an agent ID like "PGMY-1001" in the CSV
    Optional<User> findByAgentEmployeeIdAndTenantId(String employeeId, Long tenantId);

    // Security: Get all users in the company
    List<User> findByTenantId(Long tenantId);

    // Security: Admin View -> Get everyone EXCEPT the System Admin to prevent tampering
    List<User> findByTenantIdAndRoleNot(Long tenantId, Role role);

    // Security: Manager View -> Get only users assigned to their specific branch
    List<User> findByBranchId(Long branchId);
    List<User> findByBranchIdAndRoleNot(Long branchId, Role role);

    // Security: Find users who are currently locked out due to brute-force attempts
    List<User> findByTenantIdAndAccountLockedUntilAfter(Long tenantId, java.time.LocalDateTime currentTime);

    // Device Binding: Ensure no two agents register the exact same physical phone
    boolean existsByRegisteredDeviceId(String deviceId);
}