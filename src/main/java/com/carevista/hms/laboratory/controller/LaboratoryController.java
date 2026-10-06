package com.carevista.hms.laboratory.controller;

import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.laboratory.dto.*;
import com.carevista.hms.laboratory.service.LaboratoryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/laboratory")
public class LaboratoryController {

    private final LaboratoryService laboratoryService;

    public LaboratoryController(LaboratoryService laboratoryService) {
        this.laboratoryService = laboratoryService;
    }

    @GetMapping("/patients/search")
    public ResponseEntity<ApiResponse<List<LabPatientSearchDto>>> searchPatients(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<LabPatientSearchDto> results = laboratoryService.searchPatientsForLab(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/tests")
    public ResponseEntity<ApiResponse<List<LabTestDto>>> getLabTests(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<LabTestDto> tests = laboratoryService.getLabTests(tenantId);
        return ResponseEntity.ok(ApiResponse.success(tests));
    }

    @PostMapping("/tests")
    public ResponseEntity<ApiResponse<LabTestDto>> createLabTest(
            @Valid @RequestBody LabTestDto dto,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            LabTestDto saved = laboratoryService.createLabTest(tenantId, dto);
            return ResponseEntity.ok(ApiResponse.success("Laboratory test added to catalog.", saved));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    @PostMapping("/orders")
    public ResponseEntity<ApiResponse<LabOrderDto>> createLabOrder(
            @Valid @RequestBody CreateLabOrderRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getUserId(httpRequest);
        String userEmail = getUserEmail(httpRequest);
        String ipAddr = httpRequest.getRemoteAddr();

        try {
            LabOrderDto order = laboratoryService.createLabOrder(tenantId, userId, userEmail, ipAddr, request);
            return ResponseEntity.ok(ApiResponse.success("Laboratory order created successfully.", order));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    @GetMapping("/orders")
    public ResponseEntity<ApiResponse<List<LabOrderDto>>> getLabOrders(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<LabOrderDto> orders = laboratoryService.getLabOrders(tenantId, status, q);
        return ResponseEntity.ok(ApiResponse.success(orders));
    }

    @GetMapping("/orders/{id}")
    public ResponseEntity<ApiResponse<LabOrderDto>> getLabOrderDetails(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            LabOrderDto order = laboratoryService.getLabOrderById(tenantId, id);
            return ResponseEntity.ok(ApiResponse.success(order));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    @PutMapping("/orders/{id}/results")
    public ResponseEntity<ApiResponse<LabOrderDto>> updateLabResults(
            @PathVariable Long id,
            @RequestBody UpdateLabResultsRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getUserId(httpRequest);
        String userEmail = getUserEmail(httpRequest);
        String ipAddr = httpRequest.getRemoteAddr();

        try {
            LabOrderDto updated = laboratoryService.updateLabResults(tenantId, id, userId, userEmail, ipAddr, request);
            return ResponseEntity.ok(ApiResponse.success("Laboratory results saved successfully.", updated));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    @PostMapping("/orders/{id}/complete")
    public ResponseEntity<ApiResponse<LabOrderDto>> completeLabOrder(
            @PathVariable Long id,
            @RequestBody(required = false) CompleteLabOrderRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        Long userId = getUserId(httpRequest);
        String userEmail = getUserEmail(httpRequest);
        String ipAddr = httpRequest.getRemoteAddr();

        try {
            LabOrderDto completed = laboratoryService.completeLabOrder(tenantId, id, userId, userEmail, ipAddr, request);
            return ResponseEntity.ok(ApiResponse.success("Laboratory order marked as completed.", completed));
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

    private Long getUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_ID") != null) {
            return (Long) session.getAttribute("USER_ID");
        }
        return null;
    }

    private String getUserEmail(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_EMAIL") != null) {
            return (String) session.getAttribute("USER_EMAIL");
        }
        return "system";
    }
}
