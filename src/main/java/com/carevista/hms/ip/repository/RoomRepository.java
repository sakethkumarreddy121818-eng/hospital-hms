package com.carevista.hms.ip.repository;

import com.carevista.hms.ip.entity.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {

    List<Room> findByTenantIdOrderByRoomNumberAsc(Long tenantId);

    List<Room> findByTenantIdAndRoomTypeOrderByRoomNumberAsc(Long tenantId, String roomType);

    Optional<Room> findFirstByTenantIdAndRoomNumberIgnoreCase(Long tenantId, String roomNumber);

    Optional<Room> findFirstByTenantIdAndId(Long tenantId, Long id);

    long countByTenantId(Long tenantId);

    long countByTenantIdAndStatus(Long tenantId, String status);

    @Query("SELECT r FROM Room r WHERE r.tenant.id = :tenantId AND (:type IS NULL OR :type = '' OR LOWER(r.roomType) = LOWER(:type)) AND (:status IS NULL OR :status = '' OR LOWER(r.status) = LOWER(:status)) ORDER BY r.roomNumber ASC")
    List<Room> searchRooms(@Param("tenantId") Long tenantId, @Param("type") String type, @Param("status") String status);
}
