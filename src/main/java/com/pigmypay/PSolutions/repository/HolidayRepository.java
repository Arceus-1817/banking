package com.pigmypay.PSolutions.repository;

import com.pigmypay.PSolutions.model.Holiday;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface HolidayRepository extends JpaRepository<Holiday, Long> {
    List<Holiday> findByTenantId(Long tenantId);

    // THE BRAIN: Ultra-fast boolean check. "Is today a holiday for this company?"
    boolean existsByHolidayDateAndTenantId(LocalDate holidayDate, Long tenantId);
}