package com.carevista.hms.pharmacy.controller;

import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.pharmacy.dto.*;
import com.carevista.hms.pharmacy.service.PharmacyService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/pharmacy")
public class PharmacyController {

    private final PharmacyService pharmacyService;

    public PharmacyController(PharmacyService pharmacyService) {
        this.pharmacyService = pharmacyService;
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PharmacySummaryDto>> getSummary(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        PharmacySummaryDto summary = pharmacyService.getSummary(tenantId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping({"/patients/search", "/search-patients"})
    public ResponseEntity<ApiResponse<List<PharmacyPatientSearchDto>>> searchPatients(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PharmacyPatientSearchDto> results = pharmacyService.searchPatientsForPharmacy(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    @GetMapping("/medicines")
    public ResponseEntity<ApiResponse<List<MedicineDto>>> searchMedicines(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<MedicineDto> list = pharmacyService.searchMedicines(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/medicines/{id}")
    public ResponseEntity<ApiResponse<MedicineDto>> getMedicineById(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        return pharmacyService.searchMedicines(tenantId, "")
                .stream()
                .filter(m -> m.getId().equals(id))
                .findFirst()
                .map(m -> ResponseEntity.ok(ApiResponse.success(m)))
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/medicines/create")
    public ResponseEntity<ApiResponse<MedicineDto>> createMedicine(
            @Valid @RequestBody CreateMedicineRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            MedicineDto created = pharmacyService.createMedicine(
                    tenantId, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Medicine added to inventory successfully.", created));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @GetMapping("/medicines/next-code")
    public ResponseEntity<ApiResponse<String>> getNextMedicineCode(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        String nextCode = pharmacyService.getNextMedicineCode(tenantId);
        return ResponseEntity.ok(ApiResponse.success(nextCode));
    }

    @GetMapping("/suppliers")
    public ResponseEntity<ApiResponse<List<String>>> getSuppliers(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<String> suppliers = pharmacyService.getDistinctSuppliers(tenantId);
        return ResponseEntity.ok(ApiResponse.success(suppliers));
    }

    @PostMapping("/bills/create")
    public ResponseEntity<ApiResponse<PharmacyBillDto>> generateBill(
            @Valid @RequestBody CreatePharmacyBillRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            PharmacyBillDto generated = pharmacyService.generateBill(
                    tenantId, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Pharmacy bill generated successfully.", generated));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @GetMapping({"/bills/history", "/bills/search"})
    public ResponseEntity<ApiResponse<List<PharmacyBillDto>>> getBillHistory(
            @RequestParam(required = false, defaultValue = "") String search,
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        String searchTerm = !q.isEmpty() ? q : search;
        List<PharmacyBillDto> history = pharmacyService.getBillHistory(tenantId, searchTerm);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/bills/{id}")
    public ResponseEntity<ApiResponse<PharmacyBillDto>> getBillDetails(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            PharmacyBillDto details = pharmacyService.getBillDetails(tenantId, id);
            return ResponseEntity.ok(ApiResponse.success(details));
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
