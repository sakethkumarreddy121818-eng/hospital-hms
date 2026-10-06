package com.carevista.hms.settings.controller;

import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.doctor.dto.DoctorDto;
import com.carevista.hms.security.dto.UserDto;
import com.carevista.hms.settings.dto.DoctorRequestDto;
import com.carevista.hms.settings.dto.HospitalSettingDto;
import com.carevista.hms.settings.dto.StaffRequestDto;
import com.carevista.hms.settings.service.HospitalSettingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/admin/settings", "/api/settings"})
public class SettingsController {

    private final HospitalSettingService settingService;

    public SettingsController(HospitalSettingService settingService) {
        this.settingService = settingService;
    }

    // ==========================================
    // 1. HOSPITAL SETTINGS
    // ==========================================

    @GetMapping
    public ResponseEntity<ApiResponse<HospitalSettingDto>> getSettings(HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            HospitalSettingDto dto = settingService.getSettings(tenantId);
            return ResponseEntity.ok(ApiResponse.success(dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping
    public ResponseEntity<ApiResponse<HospitalSettingDto>> updateSettings(
            @RequestBody HospitalSettingDto dto,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            HospitalSettingDto updated = settingService.updateSettings(tenantId, dto, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Settings updated successfully.", updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Failed to update settings: " + e.getMessage()));
        }
    }

    // ==========================================
    // 2. DOCTOR MANAGEMENT
    // ==========================================

    @GetMapping("/doctors")
    public ResponseEntity<ApiResponse<List<DoctorDto>>> getDoctors(HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<DoctorDto> doctors = settingService.getDoctors(tenantId);
        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    @PutMapping("/doctors/{id}/status")
    public ResponseEntity<ApiResponse<DoctorDto>> updateDoctorStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        String status = body.getOrDefault("status", "AVAILABLE");
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            DoctorDto dto = settingService.updateDoctorStatus(tenantId, id, status, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Doctor availability updated to " + dto.getStatus(), dto));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/doctors")
    public ResponseEntity<ApiResponse<DoctorDto>> createDoctor(
            @RequestBody DoctorRequestDto req,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            DoctorDto created = settingService.createOrUpdateDoctor(tenantId, null, req, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Doctor added successfully.", created));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/doctors/{id}")
    public ResponseEntity<ApiResponse<DoctorDto>> updateDoctor(
            @PathVariable Long id,
            @RequestBody DoctorRequestDto req,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            DoctorDto updated = settingService.createOrUpdateDoctor(tenantId, id, req, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Doctor updated successfully.", updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ==========================================
    // 3. STAFF / EMPLOYEE MANAGEMENT
    // ==========================================

    @GetMapping("/staff")
    public ResponseEntity<ApiResponse<List<UserDto>>> getStaff(HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<UserDto> staff = settingService.getStaff(tenantId);
        return ResponseEntity.ok(ApiResponse.success(staff));
    }

    @PutMapping("/staff/{id}/status")
    public ResponseEntity<ApiResponse<UserDto>> updateStaffStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        String status = body.getOrDefault("status", "ACTIVE");
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            UserDto updated = settingService.updateStaffStatus(tenantId, id, status, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Staff status updated to " + updated.getStatus(), updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PostMapping("/staff")
    public ResponseEntity<ApiResponse<UserDto>> createStaff(
            @RequestBody StaffRequestDto req,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            UserDto created = settingService.createStaff(tenantId, req, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Staff member created successfully.", created));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping("/staff/{id}")
    public ResponseEntity<ApiResponse<UserDto>> updateStaff(
            @PathVariable Long id,
            @RequestBody StaffRequestDto req,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            UserDto updated = settingService.updateStaffDetails(tenantId, id, req, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Staff member updated successfully.", updated));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    @PutMapping({"/staff/{id}/reset-password", "/staff/{id}/password-reset"})
    public ResponseEntity<ApiResponse<String>> resetStaffPassword(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        String newPassword = body.getOrDefault("newPassword", body.getOrDefault("password", "Employee@123"));
        Long userId = getAuthenticatedUserId(request);
        String email = getAuthenticatedUserEmail(request);
        String ip = getClientIp(request);

        try {
            settingService.resetStaffPassword(tenantId, id, newPassword, userId, email, ip);
            return ResponseEntity.ok(ApiResponse.success("Password reset successfully."));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        }
    }

    // ==========================================
    // 4. AUDIT LOGS
    // ==========================================

    @GetMapping({"/audit-logs", "/audit"})
    public ResponseEntity<ApiResponse<List<com.carevista.hms.audit.entity.AuditLog>>> getAuditLogs(HttpServletRequest request) {
        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<com.carevista.hms.audit.entity.AuditLog> logs = settingService.getTenantAuditLogs(tenantId);
        return ResponseEntity.ok(ApiResponse.success(logs));
    }


    // ==========================================
    // HELPERS
    // ==========================================

    private Long getAuthenticatedTenantId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("TENANT_ID") != null) {
            return (Long) session.getAttribute("TENANT_ID");
        }
        return null;
    }

    private Long getAuthenticatedUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_ID") != null) {
            return (Long) session.getAttribute("USER_ID");
        }
        return null;
    }

    private String getAuthenticatedUserEmail(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_EMAIL") != null) {
            return (String) session.getAttribute("USER_EMAIL");
        }
        return "admin@system";
    }

    private String getClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        return xf != null ? xf.split(",")[0] : request.getRemoteAddr();
    }
}
