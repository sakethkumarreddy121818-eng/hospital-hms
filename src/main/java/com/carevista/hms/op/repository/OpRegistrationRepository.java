package com.carevista.hms.op.repository;

import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.patient.entity.Patient;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface OpRegistrationRepository extends JpaRepository<OpRegistration, Long> {
    List<OpRegistration> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<OpRegistration> findByTenantIdAndVisitDateOrderByCreatedAtDesc(Long tenantId, LocalDate visitDate);
    long countByTenantIdAndVisitDate(Long tenantId, LocalDate visitDate);
    long countByTenantId(Long tenantId);

    @Query("SELECT r.visitDate, COUNT(r) FROM OpRegistration r WHERE r.tenant.id = :tenantId AND r.visitDate >= :startDate GROUP BY r.visitDate ORDER BY r.visitDate ASC")
    List<Object[]> countDailyOpSince(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate);

    long countByTenantIdAndVisitDateBetween(Long tenantId, LocalDate startDate, LocalDate endDate);
    long countByVisitDateBetween(LocalDate startDate, LocalDate endDate);

    @Query("SELECT YEAR(r.visitDate), MONTH(r.visitDate), COUNT(r) FROM OpRegistration r WHERE r.tenant.id = :tenantId GROUP BY YEAR(r.visitDate), MONTH(r.visitDate) ORDER BY YEAR(r.visitDate) DESC, MONTH(r.visitDate) DESC")
    List<Object[]> countMonthlyOpByTenant(@Param("tenantId") Long tenantId);

    List<OpRegistration> findByVisitDateBetweenOrderByVisitDateDescCreatedAtDesc(LocalDate startDate, LocalDate endDate);
    List<OpRegistration> findByTenantIdAndVisitDateBetweenOrderByVisitDateDescCreatedAtDesc(Long tenantId, LocalDate startDate, LocalDate endDate);
    List<OpRegistration> findAllByOrderByVisitDateDescCreatedAtDesc();

    boolean existsByOpId(String opId);
    Optional<OpRegistration> findFirstByTenantIdAndOpId(Long tenantId, String opId);
    Optional<OpRegistration> findByIdAndTenantId(Long id, Long tenantId);
    List<OpRegistration> findByTenantIdAndPatientUhidOrderByCreatedAtDesc(Long tenantId, String uhid);
    List<OpRegistration> findByTenantIdAndPatientIdOrderByCreatedAtDesc(Long tenantId, Long patientId);

    @Query("SELECT r.patient FROM OpRegistration r WHERE r.tenant.id = :tenantId AND LOWER(r.opId) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<Patient> findPatientsByOpId(@Param("tenantId") Long tenantId, @Param("query") String query);

    @Query("SELECT r FROM OpRegistration r WHERE r.tenant.id = :tenantId AND (" +
           ":query IS NULL OR :query = '' OR " +
           "LOWER(r.opId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(r.patient.fullName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(r.patient.uhid) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "r.patient.phone LIKE CONCAT('%', :query, '%') OR " +
           "LOWER(r.doctorName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(r.department) LIKE LOWER(CONCAT('%', :query, '%'))" +
           ") ORDER BY r.createdAt DESC")
    List<OpRegistration> searchOpRegistrations(@Param("tenantId") Long tenantId, @Param("query") String query);
}
