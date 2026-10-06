package com.carevista.hms.patient.repository;

import com.carevista.hms.patient.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientRepository extends JpaRepository<Patient, Long> {
    List<Patient> findByTenantId(Long tenantId);
    Optional<Patient> findByTenantIdAndUhid(Long tenantId, String uhid);
    List<Patient> findByTenantIdAndPhone(Long tenantId, String phone);
    Optional<Patient> findFirstByTenantIdAndPhone(Long tenantId, String phone);
    List<Patient> findByTenantIdAndFullNameContainingIgnoreCase(Long tenantId, String name);
    long countByTenantId(Long tenantId);

    @Query("SELECT p FROM Patient p WHERE p.tenant.id = :tenantId AND (" +
           "LOWER(p.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(p.uhid) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "p.phone LIKE CONCAT('%', :query, '%')" +
           ") ORDER BY " +
           "CASE " +
           "  WHEN LOWER(p.fullName) LIKE LOWER(CONCAT(:query, '%')) THEN 1 " +
           "  WHEN LOWER(p.uhid) LIKE LOWER(CONCAT(:query, '%')) THEN 2 " +
           "  WHEN p.phone LIKE CONCAT(:query, '%') THEN 3 " +
           "  WHEN LOWER(p.fullName) LIKE LOWER(CONCAT('% ', :query, '%')) THEN 4 " +
           "  ELSE 5 END ASC, " +
           "p.fullName ASC, p.createdAt DESC")
    List<Patient> searchPatients(@Param("tenantId") Long tenantId, @Param("query") String query);
}
