package com.carevista.hms.admin.money.controller;

import com.carevista.hms.admin.money.dto.CreateExpenseRequest;
import com.carevista.hms.admin.money.dto.MoneyDashboardSummaryDto;
import com.carevista.hms.admin.money.entity.HospitalExpense;
import com.carevista.hms.admin.money.service.MoneyManagementService;
import com.carevista.hms.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.carevista.hms.security.entity.User;
import com.carevista.hms.security.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/admin/money")
@PreAuthorize("hasRole('ADMIN')")
public class MoneyManagementController {

    private final MoneyManagementService moneyManagementService;
    private final UserRepository userRepository;

    public MoneyManagementController(MoneyManagementService moneyManagementService, UserRepository userRepository) {
        this.moneyManagementService = moneyManagementService;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<ApiResponse<MoneyDashboardSummaryDto>> getDashboard(
            @RequestParam(required = false, defaultValue = "ONE_MONTH") String period,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            HttpServletRequest request) {

        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }

        MoneyDashboardSummaryDto summary = moneyManagementService.getMoneyDashboard(tenantId, period, startDate, endDate);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @PostMapping("/expenses")
    public ResponseEntity<ApiResponse<HospitalExpense>> createExpense(
            @Valid @RequestBody CreateExpenseRequest expenseRequest,
            HttpServletRequest request) {

        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }

        Long userId = getUserId(request);
        String userEmail = getUserEmail(request);
        String ipAddress = request.getRemoteAddr();

        HospitalExpense created = moneyManagementService.createExpense(tenantId, expenseRequest, userId, userEmail, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Hospital expense recorded successfully.", created));
    }

    @DeleteMapping("/expenses/{id}")
    public ResponseEntity<ApiResponse<String>> deleteExpense(
            @PathVariable Long id,
            HttpServletRequest request) {

        Long tenantId = getAuthenticatedTenantId(request);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }

        Long userId = getUserId(request);
        String userEmail = getUserEmail(request);
        String ipAddress = request.getRemoteAddr();

        moneyManagementService.deleteExpense(tenantId, id, userId, userEmail, ipAddress);
        return ResponseEntity.ok(ApiResponse.success("Expense cancelled successfully.", "DELETED"));
    }

    private Long getAuthenticatedTenantId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("TENANT_ID") != null) {
            return (Long) session.getAttribute("TENANT_ID");
        }
        if (request.getAttribute("TENANT_ID") != null) {
            return (Long) request.getAttribute("TENANT_ID");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
            User user = userRepository.findByEmail(auth.getName().trim().toLowerCase()).orElse(null);
            if (user != null && user.getTenant() != null) {
                Long tid = user.getTenant().getId();
                if (session != null) {
                    session.setAttribute("TENANT_ID", tid);
                }
                return tid;
            }
        }
        return null;
    }

    private Long getUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_ID") != null) {
            return (Long) session.getAttribute("USER_ID");
        }
        if (request.getAttribute("USER_ID") != null) {
            return (Long) request.getAttribute("USER_ID");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
            User user = userRepository.findByEmail(auth.getName().trim().toLowerCase()).orElse(null);
            if (user != null) {
                Long uid = user.getId();
                if (session != null) {
                    session.setAttribute("USER_ID", uid);
                }
                return uid;
            }
        }
        return null;
    }

    private String getUserEmail(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_EMAIL") != null) {
            return (String) session.getAttribute("USER_EMAIL");
        }
        if (request.getAttribute("USER_EMAIL") != null) {
            return (String) request.getAttribute("USER_EMAIL");
        }
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && auth.getName() != null && !"anonymousUser".equals(auth.getName())) {
            return auth.getName();
        }
        return "admin@system.local";
    }
}
