package com.carevista.hms.admin.controller;

import com.carevista.hms.admin.dto.AdminDashboardSummaryDto;
import com.carevista.hms.admin.dto.GraphDataDto;
import com.carevista.hms.admin.service.AdminDashboardService;
import com.carevista.hms.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

@RestController
@RequestMapping("/api/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    public AdminDashboardController(AdminDashboardService adminDashboardService) {
        this.adminDashboardService = adminDashboardService;
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<AdminDashboardSummaryDto>> getDashboardSummary(
            @RequestParam(required = false) String date,
            HttpServletRequest request) {

        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session"));
        }

        LocalDate targetDate = parseDate(date);
        AdminDashboardSummaryDto summary = adminDashboardService.getDashboardSummary(tenantId, targetDate);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/graphs")
    public ResponseEntity<ApiResponse<GraphDataDto>> getGraphData(
            @RequestParam(defaultValue = "ONE_WEEK") String period,
            @RequestParam(defaultValue = "COLLECTION") String metric,
            HttpServletRequest request) {

        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session"));
        }

        GraphDataDto graph = adminDashboardService.getGraphData(tenantId, period, metric);
        return ResponseEntity.ok(ApiResponse.success(graph));
    }

    private Long getAuthenticatedTenantId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("TENANT_ID") != null) {
            return (Long) session.getAttribute("TENANT_ID");
        }
        return null;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) {
            return LocalDate.now();
        }
        dateStr = dateStr.trim();
        try {
            if (dateStr.contains("/")) {
                return LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            } else if (dateStr.contains("-")) {
                return LocalDate.parse(dateStr);
            }
        } catch (Exception ignored) {}
        return LocalDate.now();
    }
}
