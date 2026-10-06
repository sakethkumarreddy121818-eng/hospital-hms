package com.carevista.hms.laboratory.repository;

import com.carevista.hms.laboratory.entity.LabOrder;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface LabOrderRepository extends JpaRepository<LabOrder, Long> {
    List<LabOrder> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<LabOrder> findByTenantIdAndOrderStatusOrderByCreatedAtDesc(Long tenantId, String orderStatus);
    List<LabOrder> findByTenantIdAndOrderDateOrderByCreatedAtDesc(Long tenantId, LocalDate orderDate);
    List<LabOrder> findByTenantIdAndPatientIdOrderByCreatedAtDesc(Long tenantId, Long patientId);
    List<LabOrder> findByTenantIdAndUhidOrderByCreatedAtDesc(Long tenantId, String uhid);
    Optional<LabOrder> findByTenantIdAndId(Long tenantId, Long id);
    Optional<LabOrder> findByTenantIdAndOrderNumber(Long tenantId, String orderNumber);

    long countByTenantIdAndOrderDate(Long tenantId, LocalDate orderDate);
    long countByTenantIdAndOrderDateAndOrderStatus(Long tenantId, LocalDate orderDate, String orderStatus);
    long countByTenantId(Long tenantId);

    @Query("SELECT COALESCE(SUM(l.totalAmount), 0) FROM LabOrder l WHERE l.tenant.id = :tenantId AND l.orderDate = :orderDate")
    BigDecimal sumTotalByTenantIdAndOrderDate(@Param("tenantId") Long tenantId, @Param("orderDate") LocalDate orderDate);

    @Query("SELECT l.orderDate, COUNT(l), COALESCE(SUM(l.totalAmount), 0) FROM LabOrder l WHERE l.tenant.id = :tenantId AND l.orderDate >= :startDate GROUP BY l.orderDate ORDER BY l.orderDate ASC")
    List<Object[]> sumDailyLabSince(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate);

    @Query("SELECT l FROM LabOrder l WHERE l.tenant.id = :tenantId AND (" +
           "LOWER(l.orderNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.patientName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.uhid) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.opId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.ipId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.phone) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.testName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY l.createdAt DESC")
    List<LabOrder> searchLabOrders(@Param("tenantId") Long tenantId, @Param("query") String query);

    @Query("SELECT l FROM LabOrder l WHERE l.tenant.id = :tenantId AND l.orderStatus = :status AND (" +
           "LOWER(l.orderNumber) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.patientName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.uhid) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.opId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.ipId) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.phone) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(l.testName) LIKE LOWER(CONCAT('%', :query, '%'))) " +
           "ORDER BY l.createdAt DESC")
    List<LabOrder> searchLabOrdersWithStatus(@Param("tenantId") Long tenantId, @Param("query") String query, @Param("status") String status);

    List<LabOrder> findByOrderDateBetweenOrderByOrderDateDescCreatedAtDesc(LocalDate startDate, LocalDate endDate);
    List<LabOrder> findByTenantIdAndOrderDateBetweenOrderByOrderDateDescCreatedAtDesc(Long tenantId, LocalDate startDate, LocalDate endDate);
    List<LabOrder> findAllByOrderByOrderDateDescCreatedAtDesc();
}
