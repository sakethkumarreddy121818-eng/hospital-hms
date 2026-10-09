package com.carevista.hms.pharmacy.controller;

import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.doctor.dto.DoctorDto;
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

    // ====================================================================
    // 1. DASHBOARD & ALERTS
    // ====================================================================
    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PharmacySummaryDto>> getSummary(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        PharmacySummaryDto summary = pharmacyService.getSummary(tenantId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/dashboard/details/{category}")
    public ResponseEntity<ApiResponse<List<DashboardDrillDownItemDto>>> getDashboardDetails(
            @PathVariable String category,
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<DashboardDrillDownItemDto> items = pharmacyService.getDashboardDetails(tenantId, category, q);
        return ResponseEntity.ok(ApiResponse.success(items));
    }

    // ====================================================================
    // 2. MEDICINES
    // ====================================================================
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
        try {
            MedicineDto med = pharmacyService.getMedicineById(tenantId, id);
            return ResponseEntity.ok(ApiResponse.success(med));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
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

    @PutMapping("/medicines/{id}")
    public ResponseEntity<ApiResponse<MedicineDto>> updateMedicine(
            @PathVariable Long id,
            @Valid @RequestBody CreateMedicineRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            MedicineDto updated = pharmacyService.updateMedicine(
                    tenantId, id, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Medicine updated successfully.", updated));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @DeleteMapping("/medicines/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteMedicine(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            pharmacyService.deleteMedicine(
                    tenantId, id,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Medicine and associated batches removed successfully.", null));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
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

    // ====================================================================
    // 3. BATCH MANAGEMENT
    // ====================================================================
    @GetMapping("/batches/medicine/{medicineId}")
    public ResponseEntity<ApiResponse<List<PharmacyBatchDto>>> getBatchesByMedicine(
            @PathVariable Long medicineId,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PharmacyBatchDto> batches = pharmacyService.getBatchesByMedicine(tenantId, medicineId);
        return ResponseEntity.ok(ApiResponse.success(batches));
    }

    @GetMapping("/batches/search")
    public ResponseEntity<ApiResponse<List<PharmacyBatchDto>>> searchBatches(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PharmacyBatchDto> batches = pharmacyService.searchBatches(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(batches));
    }

    @PostMapping("/batches/create")
    public ResponseEntity<ApiResponse<PharmacyBatchDto>> createBatch(
            @Valid @RequestBody CreateBatchRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        if (request.getMedicineId() == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Medicine ID is required."));
        }
        try {
            PharmacyBatchDto created = pharmacyService.addBatch(
                    tenantId, request.getMedicineId(), request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Batch added successfully.", created));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PutMapping("/batches/{id}")
    public ResponseEntity<ApiResponse<PharmacyBatchDto>> updateBatch(
            @PathVariable Long id,
            @Valid @RequestBody CreateBatchRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            PharmacyBatchDto updated = pharmacyService.updateBatch(
                    tenantId, id, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Batch updated successfully.", updated));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @DeleteMapping("/batches/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteBatch(
            @PathVariable Long id,
            @RequestParam(required = false, defaultValue = "Manual Deletion") String context,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            pharmacyService.deleteBatch(
                    tenantId, id, context,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Batch archived successfully.", null));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    @DeleteMapping("/batches/empty-batches/{medicineId}")
    public ResponseEntity<ApiResponse<Integer>> deleteEmptyBatches(
            @PathVariable Long medicineId,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            int purged = pharmacyService.deleteEmptyBatches(
                    tenantId, medicineId,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Purged " + purged + " empty batches.", purged));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    // ====================================================================
    // 4. STOCK PROCUREMENT & MOVEMENTS
    // ====================================================================
    @PostMapping("/stock/receipt")
    public ResponseEntity<ApiResponse<PharmacyBatchDto>> addStockReceipt(
            @Valid @RequestBody StockReceiptRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            PharmacyBatchDto batch = pharmacyService.addStockReceipt(
                    tenantId, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Stock receipt recorded successfully.", batch));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @GetMapping("/stock/movements")
    public ResponseEntity<ApiResponse<List<PharmacyStockMovementDto>>> getStockMovements(
            @RequestParam(required = false) Long medicineId,
            @RequestParam(required = false, defaultValue = "50") Integer limit,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PharmacyStockMovementDto> movements = pharmacyService.getStockMovements(tenantId, medicineId, limit);
        return ResponseEntity.ok(ApiResponse.success(movements));
    }

    // ====================================================================
    // 5. SUPPLIERS
    // ====================================================================
    @GetMapping({"/suppliers", "/suppliers/names"})
    public ResponseEntity<ApiResponse<List<String>>> getSuppliers(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<String> suppliers = pharmacyService.getDistinctSuppliers(tenantId);
        return ResponseEntity.ok(ApiResponse.success(suppliers));
    }

    @GetMapping("/suppliers/list")
    public ResponseEntity<ApiResponse<List<PharmacySupplierDto>>> getAllSuppliers(
            @RequestParam(required = false, defaultValue = "") String search,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PharmacySupplierDto> suppliers = pharmacyService.getAllSuppliers(tenantId, search);
        return ResponseEntity.ok(ApiResponse.success(suppliers));
    }

    @PostMapping("/suppliers/create")
    public ResponseEntity<ApiResponse<PharmacySupplierDto>> createSupplier(
            @Valid @RequestBody CreateSupplierRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            PharmacySupplierDto created = pharmacyService.createSupplier(
                    tenantId, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Supplier created successfully.", created));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PutMapping("/suppliers/{id}")
    public ResponseEntity<ApiResponse<PharmacySupplierDto>> updateSupplier(
            @PathVariable Long id,
            @Valid @RequestBody CreateSupplierRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            PharmacySupplierDto updated = pharmacyService.updateSupplier(
                    tenantId, id, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Supplier updated successfully.", updated));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @DeleteMapping("/suppliers/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteSupplier(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            pharmacyService.deleteSupplier(
                    tenantId, id,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Supplier deleted successfully.", null));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    // ====================================================================
    // 6. SALES WORKFLOW & INTEGRATION
    // ====================================================================
    @GetMapping("/sales/patient-history")
    public ResponseEntity<ApiResponse<List<PharmacyBillDto>>> getPatientPurchaseHistory(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PharmacyBillDto> history = pharmacyService.getPatientPurchaseHistory(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(history));
    }

    @GetMapping("/sales/doctors")
    public ResponseEntity<ApiResponse<List<DoctorDto>>> getDoctors(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<DoctorDto> doctors = pharmacyService.getDoctors(tenantId);
        return ResponseEntity.ok(ApiResponse.success(doctors));
    }

    // ====================================================================
    // 7. BILLS & TRANSACTIONS
    // ====================================================================
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
