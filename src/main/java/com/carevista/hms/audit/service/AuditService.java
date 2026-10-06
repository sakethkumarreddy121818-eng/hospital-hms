package com.carevista.hms.audit.service;

import com.carevista.hms.audit.entity.AuditLog;
import com.carevista.hms.audit.repository.AuditLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuditService {

    private final AuditLogRepository auditLogRepository;

    public AuditService(AuditLogRepository auditLogRepository) {
        this.auditLogRepository = auditLogRepository;
    }

    @Transactional
    public void log(Long userId, String email, String role, Long tenantId, String action, String details, String ipAddress, String status) {
        try {
            AuditLog log = new AuditLog(userId, email, role, tenantId, action, details, ipAddress, status);
            auditLogRepository.save(log);
        } catch (Exception e) {
            // Avoid failing business operations due to audit logging failure
        }
    }
}
