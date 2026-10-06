package com.carevista.hms.tenant.repository;

import com.carevista.hms.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TenantRepository extends JpaRepository<Tenant, Long> {
    Optional<Tenant> findByTenantCode(String tenantCode);
    boolean existsByTenantCode(String tenantCode);
    boolean existsByHospitalName(String hospitalName);
}
