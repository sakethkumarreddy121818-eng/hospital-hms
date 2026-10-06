package com.carevista.hms.doctor.repository;

import com.carevista.hms.doctor.entity.Doctor;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DoctorRepository extends JpaRepository<Doctor, Long> {
    List<Doctor> findByTenantId(Long tenantId);
    List<Doctor> findByTenantIdAndStatus(Long tenantId, String status);
    List<Doctor> findByTenantIdOrderByDepartmentAscNameAsc(Long tenantId);
    List<Doctor> findByTenantIdAndStatusOrderByDepartmentAscNameAsc(Long tenantId, String status);
    Optional<Doctor> findFirstByTenantIdAndNameIgnoreCase(Long tenantId, String name);
    long countByTenantId(Long tenantId);
}
