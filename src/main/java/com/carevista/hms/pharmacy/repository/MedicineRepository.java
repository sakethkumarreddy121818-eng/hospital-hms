package com.carevista.hms.pharmacy.repository;

import com.carevista.hms.pharmacy.entity.Medicine;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MedicineRepository extends JpaRepository<Medicine, Long> {

    List<Medicine> findByTenantIdOrderByNameAsc(Long tenantId);

    List<Medicine> findByTenantIdAndStockQuantityGreaterThanOrderByNameAsc(Long tenantId, Integer minStock);

    Optional<Medicine> findByTenantIdAndId(Long tenantId, Long id);

    Optional<Medicine> findFirstByTenantIdAndMedicineCode(Long tenantId, String medicineCode);

    boolean existsByTenantIdAndMedicineCode(Long tenantId, String medicineCode);

    Optional<Medicine> findFirstByTenantIdAndMedicineCodeAndBatchNumber(Long tenantId, String medicineCode, String batchNumber);

    @Query("SELECT DISTINCT m.supplier FROM Medicine m WHERE m.tenant.id = :tenantId AND m.supplier IS NOT NULL AND TRIM(m.supplier) != '' ORDER BY m.supplier ASC")
    List<String> findDistinctSuppliers(@Param("tenantId") Long tenantId);

    @Query("SELECT m FROM Medicine m WHERE m.tenant.id = :tenantId AND (" +
           "LOWER(m.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.genericName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.medicineCode) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(m.batchNumber) LIKE LOWER(CONCAT('%', :query, '%'))" +
           ") ORDER BY " +
           "CASE " +
           "  WHEN LOWER(m.name) LIKE LOWER(CONCAT(:query, '%')) THEN 1 " +
           "  WHEN LOWER(m.medicineCode) LIKE LOWER(CONCAT(:query, '%')) THEN 2 " +
           "  WHEN LOWER(m.batchNumber) LIKE LOWER(CONCAT(:query, '%')) THEN 3 " +
           "  WHEN LOWER(m.genericName) LIKE LOWER(CONCAT(:query, '%')) THEN 4 " +
           "  WHEN LOWER(m.name) LIKE LOWER(CONCAT('% ', :query, '%')) THEN 5 " +
           "  ELSE 6 END ASC, " +
           "m.name ASC")
    List<Medicine> searchMedicines(@Param("tenantId") Long tenantId, @Param("query") String query);

    @Query("SELECT COUNT(m) FROM Medicine m WHERE m.tenant.id = :tenantId AND m.stockQuantity <= m.reorderLevel")
    long countLowStockMedicines(@Param("tenantId") Long tenantId);

    long countByTenantId(Long tenantId);
}
