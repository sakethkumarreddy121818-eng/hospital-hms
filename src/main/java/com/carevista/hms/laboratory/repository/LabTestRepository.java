package com.carevista.hms.laboratory.repository;

import com.carevista.hms.laboratory.entity.LabTest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface LabTestRepository extends JpaRepository<LabTest, Long> {
    List<LabTest> findByTenantIdOrderByTestNameAsc(Long tenantId);
    List<LabTest> findByTenantIdAndStatusOrderByTestNameAsc(Long tenantId, String status);
    Optional<LabTest> findByTenantIdAndTestCode(Long tenantId, String testCode);
    long countByTenantId(Long tenantId);
}
