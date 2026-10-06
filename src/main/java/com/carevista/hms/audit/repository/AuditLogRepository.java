package com.carevista.hms.audit.repository;

import com.carevista.hms.audit.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
    List<AuditLog> findTop50ByOrderByTimestampDesc();
    List<AuditLog> findTop500ByOrderByTimestampDesc();
    List<AuditLog> findByTenantIdOrderByTimestampDesc(Long tenantId);
}
