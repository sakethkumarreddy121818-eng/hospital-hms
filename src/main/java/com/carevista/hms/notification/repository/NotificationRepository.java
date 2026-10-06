package com.carevista.hms.notification.repository;

import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByTargetRoleOrderByCreatedAtDesc(UserRole targetRole);
    List<Notification> findByTenantIdOrderByCreatedAtDesc(Long tenantId);
    List<Notification> findTop20ByOrderByCreatedAtDesc();
    long countByTargetRoleAndReadFalse(UserRole targetRole);
    long countByTenantIdAndReadFalse(Long tenantId);
}
