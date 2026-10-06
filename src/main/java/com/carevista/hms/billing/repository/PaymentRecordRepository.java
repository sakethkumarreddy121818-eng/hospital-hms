package com.carevista.hms.billing.repository;

import com.carevista.hms.billing.entity.PaymentRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, Long> {
    List<PaymentRecord> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<PaymentRecord> findByTenantIdAndPaymentDateOrderByCreatedAtDesc(Long tenantId, LocalDate paymentDate);
    long countByTenantIdAndPaymentDate(Long tenantId, LocalDate paymentDate);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentRecord p WHERE p.tenant.id = :tenantId AND p.paymentDate = :paymentDate")
    BigDecimal sumAmountByTenantIdAndPaymentDate(@Param("tenantId") Long tenantId, @Param("paymentDate") LocalDate paymentDate);

    @Query("SELECT p.paymentDate, COALESCE(SUM(p.amount), 0), COUNT(p) FROM PaymentRecord p WHERE p.tenant.id = :tenantId AND p.paymentDate >= :startDate GROUP BY p.paymentDate ORDER BY p.paymentDate ASC")
    List<Object[]> sumDailyCollectionSince(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM PaymentRecord p WHERE p.tenant.id = :tenantId")
    BigDecimal sumTotalLifetimeCollection(@Param("tenantId") Long tenantId);

    List<PaymentRecord> findByPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(LocalDate startDate, LocalDate endDate);
    List<PaymentRecord> findByTenantIdAndPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(Long tenantId, LocalDate startDate, LocalDate endDate);
    List<PaymentRecord> findAllByOrderByPaymentDateDescCreatedAtDesc();
}
