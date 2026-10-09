package com.carevista.hms.pharmacy.repository;

import com.carevista.hms.pharmacy.entity.PharmacyBatch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacyBatchRepository extends JpaRepository<PharmacyBatch, Long> {

    List<PharmacyBatch> findByTenantIdAndMedicineIdAndIsDeletedFalseOrderByExpiryDateAsc(Long tenantId, Long medicineId);

    List<PharmacyBatch> findByTenantIdAndMedicineIdOrderByExpiryDateAsc(Long tenantId, Long medicineId);

    List<PharmacyBatch> findByTenantIdAndMedicineId(Long tenantId, Long medicineId);

    Optional<PharmacyBatch> findByTenantIdAndId(Long tenantId, Long id);

    Optional<PharmacyBatch> findFirstByTenantIdAndMedicineIdAndBatchNumber(Long tenantId, Long medicineId, String batchNumber);

    List<PharmacyBatch> findByTenantIdAndBatchNumberContainingIgnoreCaseAndIsDeletedFalse(Long tenantId, String batchNumber);

    @Query("SELECT b FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.isDeleted = false AND " +
           "b.expiryDate < :today ORDER BY b.expiryDate ASC")
    List<PharmacyBatch> findExpiredBatches(@Param("tenantId") Long tenantId, @Param("today") LocalDate today);

    @Query("SELECT b FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.isDeleted = false AND " +
           "b.expiryDate >= :today AND b.expiryDate <= :targetDate ORDER BY b.expiryDate ASC")
    List<PharmacyBatch> findExpiringSoonBatches(@Param("tenantId") Long tenantId,
                                                @Param("today") LocalDate today,
                                                @Param("targetDate") LocalDate targetDate);

    @Query("SELECT b FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.isDeleted = false AND " +
           "b.quantity <= 0 ORDER BY b.medicine.name ASC")
    List<PharmacyBatch> findOutOfStockBatches(@Param("tenantId") Long tenantId);

    @Query("SELECT COUNT(b) FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.isDeleted = false AND b.expiryDate < :today")
    long countExpiredBatches(@Param("tenantId") Long tenantId, @Param("today") LocalDate today);

    @Query("SELECT COUNT(b) FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.isDeleted = false AND " +
           "b.expiryDate >= :today AND b.expiryDate <= :targetDate")
    long countExpiringSoonBatches(@Param("tenantId") Long tenantId,
                                  @Param("today") LocalDate today,
                                  @Param("targetDate") LocalDate targetDate);

    @Query("SELECT COUNT(b) FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.isDeleted = false AND b.quantity <= 0")
    long countOutOfStockBatches(@Param("tenantId") Long tenantId);

    @Query("SELECT COALESCE(SUM(b.quantity), 0) FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.medicine.id = :medicineId AND b.isDeleted = false")
    Integer sumQuantityByMedicineId(@Param("tenantId") Long tenantId, @Param("medicineId") Long medicineId);

    @Query("SELECT COALESCE(SUM(b.quantity), 0) FROM PharmacyBatch b WHERE b.tenant.id = :tenantId AND b.isDeleted = false")
    Long sumTotalStockQuantity(@Param("tenantId") Long tenantId);

    long countByTenantIdAndIsDeletedFalse(Long tenantId);
}
