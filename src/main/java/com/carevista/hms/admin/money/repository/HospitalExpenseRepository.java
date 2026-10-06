package com.carevista.hms.admin.money.repository;

import com.carevista.hms.admin.money.entity.HospitalExpense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface HospitalExpenseRepository extends JpaRepository<HospitalExpense, Long> {

    List<HospitalExpense> findByTenantIdOrderByExpenseDateDescCreatedAtDesc(Long tenantId);

    List<HospitalExpense> findByTenantIdAndExpenseDateBetweenOrderByExpenseDateDescCreatedAtDesc(Long tenantId, LocalDate startDate, LocalDate endDate);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM HospitalExpense e WHERE e.tenant.id = :tenantId AND e.status != 'CANCELLED'")
    BigDecimal sumTotalByTenantId(@Param("tenantId") Long tenantId);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM HospitalExpense e WHERE e.tenant.id = :tenantId AND e.expenseDate = :date AND e.status != 'CANCELLED'")
    BigDecimal sumTotalByTenantIdAndDate(@Param("tenantId") Long tenantId, @Param("date") LocalDate date);

    @Query("SELECT COALESCE(SUM(e.amount), 0) FROM HospitalExpense e WHERE e.tenant.id = :tenantId AND e.expenseDate BETWEEN :startDate AND :endDate AND e.status != 'CANCELLED'")
    BigDecimal sumTotalByTenantIdAndDateBetween(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT e.category, COALESCE(SUM(e.amount), 0), COUNT(e) FROM HospitalExpense e WHERE e.tenant.id = :tenantId AND e.status != 'CANCELLED' GROUP BY e.category")
    List<Object[]> sumByCategory(@Param("tenantId") Long tenantId);

    @Query("SELECT e.category, COALESCE(SUM(e.amount), 0), COUNT(e) FROM HospitalExpense e WHERE e.tenant.id = :tenantId AND e.expenseDate BETWEEN :startDate AND :endDate AND e.status != 'CANCELLED' GROUP BY e.category")
    List<Object[]> sumByCategoryAndDateBetween(@Param("tenantId") Long tenantId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    long countByTenantId(Long tenantId);
}
