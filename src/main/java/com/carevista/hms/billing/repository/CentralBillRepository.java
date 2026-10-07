package com.carevista.hms.billing.repository;

import com.carevista.hms.billing.entity.CentralBill;
import com.carevista.hms.tenant.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface CentralBillRepository extends JpaRepository<CentralBill, Long> {
    List<CentralBill> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    Optional<CentralBill> findByTenantAndId(Tenant tenant, Long id);
    Optional<CentralBill> findByIdAndTenantId(Long id, Long tenantId);
    Optional<CentralBill> findByTenantAndBillNumber(Tenant tenant, String billNumber);
    @org.springframework.data.jpa.repository.Query("SELECT c FROM CentralBill c WHERE c.tenant = :tenant AND c.patient.id = :patientId ORDER BY c.createdAt DESC")
    List<CentralBill> findByTenantAndPatientIdOrderByCreatedAtDesc(@org.springframework.data.repository.query.Param("tenant") Tenant tenant, @org.springframework.data.repository.query.Param("patientId") Long patientId);
    @org.springframework.data.jpa.repository.Query("SELECT c FROM CentralBill c WHERE c.tenant.id = :tenantId AND c.patient.id = :patientId ORDER BY c.createdAt DESC")
    List<CentralBill> findByTenantIdAndPatientIdOrderByCreatedAtDesc(@org.springframework.data.repository.query.Param("tenantId") Long tenantId, @org.springframework.data.repository.query.Param("patientId") Long patientId);
    long countByTenantIdAndBillDate(Long tenantId, LocalDate billDate);
    boolean existsByBillNumber(String billNumber);
    boolean existsByInvoiceNumber(String invoiceNumber);
    Optional<CentralBill> findByTenantIdAndInvoiceNumber(Long tenantId, String invoiceNumber);
    Optional<CentralBill> findByTenantIdAndBillNumber(Long tenantId, String billNumber);
}
