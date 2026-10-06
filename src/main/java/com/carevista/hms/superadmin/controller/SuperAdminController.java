package com.carevista.hms.superadmin.controller;

import com.carevista.hms.audit.entity.AuditLog;
import com.carevista.hms.audit.repository.AuditLogRepository;
import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.notification.entity.Notification;
import com.carevista.hms.notification.repository.NotificationRepository;
import com.carevista.hms.billing.dto.BillingHistoryReportDto;
import com.carevista.hms.superadmin.dto.*;
import com.carevista.hms.superadmin.service.SuperAdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/superadmin")
public class SuperAdminController {

    private final SuperAdminService superAdminService;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;

    public SuperAdminController(SuperAdminService superAdminService,
                                NotificationRepository notificationRepository,
                                AuditLogRepository auditLogRepository) {
        this.superAdminService = superAdminService;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @GetMapping("/metrics")
    public ResponseEntity<ApiResponse<SuperAdminMetricsDto>> getDashboardMetrics() {
        SuperAdminMetricsDto metrics = superAdminService.getDashboardMetrics();
        return ResponseEntity.ok(ApiResponse.success(metrics));
    }

    @GetMapping("/hospitals")
    public ResponseEntity<ApiResponse<List<HospitalAdminDto>>> getAllHospitals(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status) {
        List<HospitalAdminDto> hospitals = superAdminService.getAllHospitals(search, status);
        return ResponseEntity.ok(ApiResponse.success(hospitals));
    }

    @GetMapping("/hospitals/{id}")
    public ResponseEntity<ApiResponse<HospitalAdminDto>> getHospitalById(@PathVariable Long id) {
        HospitalAdminDto hospital = superAdminService.getHospitalById(id);
        return ResponseEntity.ok(ApiResponse.success(hospital));
    }

    @PostMapping("/hospitals")
    public ResponseEntity<ApiResponse<HospitalAdminDto>> createHospital(
            @Valid @RequestBody CreateHospitalRequest request,
            HttpServletRequest httpServletRequest) {
        HospitalAdminDto created = superAdminService.createHospital(request, httpServletRequest);
        return ResponseEntity.ok(ApiResponse.success("Hospital and Admin account registered successfully", created));
    }

    @PutMapping("/hospitals/{id}/status")
    public ResponseEntity<ApiResponse<HospitalAdminDto>> updateHospitalStatus(
            @PathVariable Long id,
            @Valid @RequestBody TenantStatusRequest request,
            HttpServletRequest httpServletRequest) {
        HospitalAdminDto updated = superAdminService.updateHospitalStatus(id, request.getStatus(), httpServletRequest);
        return ResponseEntity.ok(ApiResponse.success("Hospital status updated to " + request.getStatus(), updated));
    }

    @PutMapping("/hospitals/{id}/op-limit")
    public ResponseEntity<ApiResponse<HospitalAdminDto>> updateOpLimit(
            @PathVariable Long id,
            @Valid @RequestBody UpdateOpLimitRequest request,
            HttpServletRequest httpServletRequest) {
        HospitalAdminDto updated = superAdminService.updateOpLimit(id, request.getOpLimit(), httpServletRequest);
        return ResponseEntity.ok(ApiResponse.success("Monthly OP limit updated to " + request.getOpLimit(), updated));
    }

    @GetMapping("/hospitals/{id}/monthly-op-history")
    public ResponseEntity<ApiResponse<List<MonthlyOpUsageDto>>> getMonthlyOpHistory(@PathVariable Long id) {
        List<MonthlyOpUsageDto> history = superAdminService.getMonthlyOpHistory(id);
        return ResponseEntity.ok(ApiResponse.success("Monthly OP usage history retrieved successfully", history));
    }

    @PostMapping("/hospitals/{id}/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetAdminPassword(
            @PathVariable Long id,
            @Valid @RequestBody ResetPasswordRequest request,
            HttpServletRequest httpServletRequest) {
        superAdminService.resetAdminPassword(id, request.getNewPassword(), httpServletRequest);
        return ResponseEntity.ok(ApiResponse.success("Admin password reset successfully", null));
    }

    @GetMapping("/backup")
    public ResponseEntity<byte[]> downloadBackup(
            @RequestParam(name = "period", defaultValue = "TODAY") String period,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate,
            @RequestParam(name = "tenantId", required = false) Long tenantId,
            HttpServletRequest httpServletRequest) {
        BillingHistoryReportDto report = superAdminService.getBillingHistoryReport(period, startDate, endDate, tenantId);
        byte[] bytes = superAdminService.generateBillingHistoryCsv(report, httpServletRequest);

        String periodTag = report.getPeriodName().toLowerCase();
        String hospitalTag = "";
        if (report.getTenantId() != null && report.getHospitalFilter() != null) {
            String sanitized = report.getHospitalFilter().toLowerCase()
                    .replaceAll("[^a-z0-9]+", "_")
                    .replaceAll("^_+|_+$", "");
            if (!sanitized.isBlank()) {
                hospitalTag = "_" + sanitized;
            }
        }
        String filename = "carevista_billing_history" + hospitalTag + "_" + periodTag + "_" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss")) + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "text/csv; charset=UTF-8")
                .contentLength(bytes.length)
                .body(bytes);
    }

    @GetMapping("/billing-history/preview")
    public ResponseEntity<ApiResponse<BillingHistoryReportDto>> getBillingHistoryPreview(
            @RequestParam(name = "period", defaultValue = "TODAY") String period,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate,
            @RequestParam(name = "tenantId", required = false) Long tenantId) {
        BillingHistoryReportDto report = superAdminService.getBillingHistoryReport(period, startDate, endDate, tenantId);
        return ResponseEntity.ok(ApiResponse.success("Billing history retrieved successfully", report));
    }

    @GetMapping("/billing-history/export")
    public ResponseEntity<byte[]> exportBillingHistory(
            @RequestParam(name = "period", defaultValue = "TODAY") String period,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate,
            @RequestParam(name = "tenantId", required = false) Long tenantId,
            HttpServletRequest httpServletRequest) {
        return downloadBackup(period, startDate, endDate, tenantId, httpServletRequest);
    }

    @GetMapping({"/billing-history/export/pdf", "/backup/pdf"})
    public ResponseEntity<byte[]> exportBillingHistoryPdf(
            @RequestParam(name = "period", defaultValue = "TODAY") String period,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate,
            @RequestParam(name = "tenantId", required = false) Long tenantId,
            HttpServletRequest httpServletRequest) {
        BillingHistoryReportDto report = superAdminService.getBillingHistoryReport(period, startDate, endDate, tenantId);
        byte[] bytes = superAdminService.generateBillingHistoryPdf(report, httpServletRequest);
        String filename = generateDocumentFilename(report, "pdf");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "application/pdf")
                .contentLength(bytes.length)
                .body(bytes);
    }

    @GetMapping({"/billing-history/export/word", "/billing-history/export/docx", "/backup/word", "/backup/docx"})
    public ResponseEntity<byte[]> exportBillingHistoryWord(
            @RequestParam(name = "period", defaultValue = "TODAY") String period,
            @RequestParam(name = "startDate", required = false) String startDate,
            @RequestParam(name = "endDate", required = false) String endDate,
            @RequestParam(name = "tenantId", required = false) Long tenantId,
            HttpServletRequest httpServletRequest) {
        BillingHistoryReportDto report = superAdminService.getBillingHistoryReport(period, startDate, endDate, tenantId);
        byte[] bytes = superAdminService.generateBillingHistoryWord(report, httpServletRequest);
        String filename = generateDocumentFilename(report, "docx");

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .header(HttpHeaders.CONTENT_TYPE, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
                .contentLength(bytes.length)
                .body(bytes);
    }

    private String generateDocumentFilename(BillingHistoryReportDto report, String extension) {
        String hospitalPrefix;
        if (report.getTenantId() != null && report.getHospitalFilter() != null 
                && !report.getHospitalFilter().toLowerCase().contains("all hospitals")) {
            hospitalPrefix = report.getHospitalFilter()
                    .replaceAll("[^a-zA-Z0-9]+", "_")
                    .replaceAll("^_+|_+$", "");
        } else {
            hospitalPrefix = "All_Hospitals";
        }
        String dateRange = report.getStartDate() + "_to_" + report.getEndDate();
        return hospitalPrefix + "_Billing_History_" + dateRange + "." + extension;
    }

    @GetMapping("/notifications")
    public ResponseEntity<ApiResponse<List<Notification>>> getNotifications() {
        List<Notification> notifications = notificationRepository.findByTargetRoleOrderByCreatedAtDesc(UserRole.SUPER_ADMIN);
        return ResponseEntity.ok(ApiResponse.success(notifications));
    }

    @PostMapping("/notifications/{id}/read")
    public ResponseEntity<ApiResponse<Void>> markNotificationRead(@PathVariable Long id) {
        notificationRepository.findById(id).ifPresent(n -> {
            n.setRead(true);
            notificationRepository.save(n);
        });
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }

    @PostMapping("/notifications/read-all")
    public ResponseEntity<ApiResponse<Void>> markAllNotificationsRead() {
        List<Notification> notifications = notificationRepository.findByTargetRoleOrderByCreatedAtDesc(UserRole.SUPER_ADMIN);
        for (Notification n : notifications) {
            n.setRead(true);
        }
        notificationRepository.saveAll(notifications);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<ApiResponse<List<AuditLog>>> getAuditLogs() {
        List<AuditLog> logs = auditLogRepository.findTop50ByOrderByTimestampDesc();
        return ResponseEntity.ok(ApiResponse.success(logs));
    }
}
