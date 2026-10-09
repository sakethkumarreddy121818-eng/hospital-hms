package com.carevista.hms.pharmacy.repository;

import com.carevista.hms.pharmacy.entity.PharmacyStockMovement;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PharmacyStockMovementRepository extends JpaRepository<PharmacyStockMovement, Long> {

    List<PharmacyStockMovement> findByTenantIdAndMedicineIdOrderByCreatedAtDesc(Long tenantId, Long medicineId);

    List<PharmacyStockMovement> findByTenantIdOrderByCreatedAtDesc(Long tenantId, Pageable pageable);

    List<PharmacyStockMovement> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
}
