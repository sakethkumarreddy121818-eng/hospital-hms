package com.carevista.hms.ip.repository;

import com.carevista.hms.ip.entity.IpAdmission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface IpAdmissionRepository extends JpaRepository<IpAdmission, Long> {

    List<IpAdmission> findByTenantIdOrderByCreatedAtDesc(Long tenantId);

    List<IpAdmission> findByTenantIdAndStatusIgnoreCaseOrderByCreatedAtDesc(Long tenantId, String status);

    List<IpAdmission> findByTenantIdAndAdmissionDateOrderByCreatedAtDesc(Long tenantId, LocalDate admissionDate);
    List<IpAdmission> findByTenantIdAndPatientIdOrderByCreatedAtDesc(Long tenantId, Long patientId);
    List<IpAdmission> findByTenantIdAndPatientUhidOrderByCreatedAtDesc(Long tenantId, String uhid);

    Optional<IpAdmission> findFirstByTenantIdAndIpId(Long tenantId, String ipId);

    Optional<IpAdmission> findFirstByTenantIdAndId(Long tenantId, Long id);
    Optional<IpAdmission> findByIdAndTenantId(Long id, Long tenantId);

    boolean existsByIpId(String ipId);

    long countByTenantIdAndAdmissionDate(Long tenantId, LocalDate admissionDate);

    long countByTenantIdAndStatusIgnoreCase(Long tenantId, String status);

    long countByTenantId(Long tenantId);

    @Query("SELECT a.admissionDate, COUNT(a) FROM IpAdmission a WHERE a.tenant.id = :tenantId AND a.admissionDate >= :startDate GROUP BY a.admissionDate ORDER BY a.admissionDate ASC")
    List<Object[]> countDailyIpSince(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate);

    List<IpAdmission> findByAdmissionDateBetweenOrderByAdmissionDateDescCreatedAtDesc(LocalDate startDate, LocalDate endDate);

    List<IpAdmission> findByTenantIdAndAdmissionDateBetweenOrderByAdmissionDateDescCreatedAtDesc(Long tenantId, LocalDate startDate, LocalDate endDate);

    List<IpAdmission> findAllByOrderByAdmissionDateDescCreatedAtDesc();

    @Query("SELECT a FROM IpAdmission a WHERE a.tenant.id = :tenantId AND (" +
           "LOWER(a.patient.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.patient.uhid) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.patient.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.ipId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.doctorName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.roomNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.bedNumber) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ") ORDER BY a.createdAt DESC")
    List<IpAdmission> searchIpAdmissions(@Param("tenantId") Long tenantId, @Param("search") String search);

    @Query("SELECT a FROM IpAdmission a WHERE a.tenant.id = :tenantId AND LOWER(a.status) = LOWER(:status) AND (" +
           "LOWER(a.patient.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.patient.uhid) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.patient.phone) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.ipId) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.doctorName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.roomNumber) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(a.bedNumber) LIKE LOWER(CONCAT('%', :search, '%'))" +
           ") ORDER BY a.createdAt DESC")
    List<IpAdmission> searchIpAdmissionsByStatus(@Param("tenantId") Long tenantId, @Param("status") String status, @Param("search") String search);
}
