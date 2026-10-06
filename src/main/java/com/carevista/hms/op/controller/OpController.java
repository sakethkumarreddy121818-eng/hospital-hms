package com.carevista.hms.op.controller;

import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.doctor.dto.DoctorDto;
import com.carevista.hms.op.dto.*;
import com.carevista.hms.op.service.OpService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/op")
public class OpController {

    private final OpService opService;

    public OpController(OpService opService) {
        this.opService = opService;
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<OpRegistrationDto>> registerOp(
            @Valid @RequestBody CreateOpRegistrationRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session. Please log in."));
        }

        try {
            OpRegistrationDto created = opService.registerOp(request, tenantId);
            return ResponseEntity.ok(ApiResponse.success("OP registration completed successfully.", created));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @GetMapping("/doctors")
    public ResponseEntity<ApiResponse<List<DoctorDto>>> getAvailableDoctors(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<DoctorDto> doctors = opService.getAvailableDoctors(tenantId);
        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    @GetMapping("/all-doctors")
    public ResponseEntity<ApiResponse<List<DoctorDto>>> getAllDoctors(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<DoctorDto> doctors = opService.getAllDoctors(tenantId);
        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    @GetMapping("/search-patients")
    public ResponseEntity<ApiResponse<List<PatientSearchDto>>> searchPatients(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PatientSearchDto> results = opService.searchPatients(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<OpRegistrationDto>>> getOpHistory(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<OpRegistrationDto> history = opService.getOpHistory(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/usage")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getMonthlyOpUsage(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Map<String, Object> usage = opService.getMonthlyOpUsage(tenantId);
        return ResponseEntity.ok(ApiResponse.success(usage));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<OpRegistrationDto>> getOpDetails(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            OpRegistrationDto details = opService.getOpDetails(tenantId, id);
            return ResponseEntity.ok(ApiResponse.success(details));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    @GetMapping("/{id}/receipt")
    public ResponseEntity<ApiResponse<OpReceiptDto>> getOpReceipt(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            OpReceiptDto receipt = opService.getOpReceipt(tenantId, id);
            return ResponseEntity.ok(ApiResponse.success(receipt));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    private Long getAuthenticatedTenantId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("TENANT_ID") != null) {
            return (Long) session.getAttribute("TENANT_ID");
        }
        return null;
    }
}
