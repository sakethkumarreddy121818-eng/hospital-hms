package com.carevista.hms.pharmacy.repository;

import com.carevista.hms.pharmacy.entity.PharmacySupplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PharmacySupplierRepository extends JpaRepository<PharmacySupplier, Long> {

    List<PharmacySupplier> findByTenantIdOrderByNameAsc(Long tenantId);

    Optional<PharmacySupplier> findByTenantIdAndId(Long tenantId, Long id);

    Optional<PharmacySupplier> findFirstByTenantIdAndNameIgnoreCase(Long tenantId, String name);

    @Query("SELECT s FROM PharmacySupplier s WHERE s.tenant.id = :tenantId AND (" +
           "LOWER(s.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(s.agencyName) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "s.contactNumber LIKE CONCAT('%', :query, '%')" +
           ") ORDER BY s.name ASC")
    List<PharmacySupplier> searchSuppliers(@Param("tenantId") Long tenantId, @Param("query") String query);

    long countByTenantId(Long tenantId);
}
