package com.carevista.hms.ip.repository;

import com.carevista.hms.ip.entity.Bed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BedRepository extends JpaRepository<Bed, Long> {

    List<Bed> findByTenantIdOrderByBedNumberAsc(Long tenantId);

    List<Bed> findByTenantIdAndRoomIdOrderByBedNumberAsc(Long tenantId, Long roomId);

    List<Bed> findByTenantIdAndRoomIdAndStatusIgnoreCaseOrderByBedNumberAsc(Long tenantId, Long roomId, String status);

    Optional<Bed> findFirstByTenantIdAndId(Long tenantId, Long id);

    Optional<Bed> findFirstByTenantIdAndBedNumberIgnoreCase(Long tenantId, String bedNumber);

    long countByTenantId(Long tenantId);

    long countByTenantIdAndStatusIgnoreCase(Long tenantId, String status);

    long countByTenantIdAndRoomId(Long tenantId, Long roomId);

    long countByTenantIdAndRoomIdAndStatusIgnoreCase(Long tenantId, Long roomId, String status);

    @Query("SELECT b FROM Bed b WHERE b.tenant.id = :tenantId AND (:roomId IS NULL OR b.room.id = :roomId) AND (:status IS NULL OR LOWER(b.status) = LOWER(:status)) ORDER BY b.bedNumber ASC")
    List<Bed> searchBeds(@Param("tenantId") Long tenantId, @Param("roomId") Long roomId, @Param("status") String status);
}
