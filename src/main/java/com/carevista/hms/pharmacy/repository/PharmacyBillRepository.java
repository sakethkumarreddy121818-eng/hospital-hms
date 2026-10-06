package com.carevista.hms.pharmacy.repository;

import com.carevista.hms.pharmacy.entity.PharmacyBill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacyBillRepository extends JpaRepository<PharmacyBill, Long> {
    List<PharmacyBill> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<PharmacyBill> findByTenantIdAndBillDateOrderByCreatedAtDesc(Long tenantId, LocalDate billDate);
    List<PharmacyBill> findByTenantIdAndPatientIdOrderByCreatedAtDesc(Long tenantId, Long patientId);
    List<PharmacyBill> findByTenantIdAndUhidOrderByCreatedAtDesc(Long tenantId, String uhid);
    Optional<PharmacyBill> findByTenantIdAndId(Long tenantId, Long id);
    Optional<PharmacyBill> findFirstByTenantIdAndBillNumber(Long tenantId, String billNumber);
    long countByTenantIdAndBillDate(Long tenantId, LocalDate billDate);
    long countByTenantId(Long tenantId);

    @Query("SELECT b FROM PharmacyBill b WHERE b.tenant.id = :tenantId AND (" +
           "LOWER(b.billNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.patientName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.uhid) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.opId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(b.ipId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "b.phone LIKE CONCAT('%', :query, '%')" +
           ") ORDER BY b.createdAt DESC")
    List<PharmacyBill> searchBills(@Param("tenantId") Long tenantId, @Param("query") String query);

    @Query("SELECT COALESCE(SUM(b.totalAmount), 0) FROM PharmacyBill b WHERE b.tenant.id = :tenantId AND b.billDate = :billDate")
    BigDecimal sumTotalByTenantIdAndBillDate(@Param("tenantId") Long tenantId, @Param("billDate") LocalDate billDate);

    @Query("SELECT b.billDate, COUNT(b), COALESCE(SUM(b.totalAmount), 0) FROM PharmacyBill b WHERE b.tenant.id = :tenantId AND b.billDate >= :startDate GROUP BY b.billDate ORDER BY b.billDate ASC")
    List<Object[]> sumDailyPharmacySince(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate);

    List<PharmacyBill> findByBillDateBetweenOrderByBillDateDescCreatedAtDesc(LocalDate startDate, LocalDate endDate);
    List<PharmacyBill> findByTenantIdAndBillDateBetweenOrderByBillDateDescCreatedAtDesc(Long tenantId, LocalDate startDate, LocalDate endDate);
    List<PharmacyBill> findAllByOrderByBillDateDescCreatedAtDesc();
}
