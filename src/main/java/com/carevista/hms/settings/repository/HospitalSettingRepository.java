package com.carevista.hms.settings.repository;

import com.carevista.hms.settings.entity.HospitalSetting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HospitalSettingRepository extends JpaRepository<HospitalSetting, Long> {
    Optional<HospitalSetting> findByTenantId(Long tenantId);
    boolean existsByTenantId(Long tenantId);
}
