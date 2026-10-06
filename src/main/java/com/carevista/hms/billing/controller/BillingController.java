package com.carevista.hms.billing.controller;

import com.carevista.hms.billing.dto.BillingCategoriesSummaryDto;
import com.carevista.hms.billing.dto.BillingConsolidatedDto;
import com.carevista.hms.billing.dto.BillPaymentRequestDto;
import com.carevista.hms.billing.dto.BillPaymentResponseDto;
import com.carevista.hms.billing.dto.CentralBillRequestDto;
import com.carevista.hms.billing.dto.PatientBillingSearchResultDto;
import com.carevista.hms.billing.entity.CentralBill;
import com.carevista.hms.billing.service.BillingPdfExportService;
import com.carevista.hms.billing.service.BillingService;
import com.carevista.hms.common.dto.ApiResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/billing")
public class BillingController {

    @Autowired
    private BillingService billingService;

    @Autowired
    private BillingPdfExportService billingPdfExportService;

    private Long getTenantId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("TENANT_ID") != null) {
            return (Long) session.getAttribute("TENANT_ID");
        }
        return null;
    }

    @GetMapping("/categories/summary")
    public ResponseEntity<?> getCategoriesSummary(HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        BillingCategoriesSummaryDto summary = billingService.getCategoriesSummary(tenantId);
        return ResponseEntity.ok(ApiResponse.success("Summary fetched successfully", summary));
    }

    @GetMapping("/patients/search")
    public ResponseEntity<?> searchPatients(@RequestParam(value = "q", required = false, defaultValue = "") String query, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        List<PatientBillingSearchResultDto> patients = billingService.searchPatientsForBilling(tenantId, query);
        return ResponseEntity.ok(ApiResponse.success("Patients fetched successfully", patients));
    }

    @GetMapping("/central/consolidated/{patientId}")
    public ResponseEntity<?> getConsolidatedCharges(@PathVariable Long patientId, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        BillingConsolidatedDto dto = billingService.getConsolidatedCharges(tenantId, patientId);
        return ResponseEntity.ok(ApiResponse.success("Consolidated charges fetched successfully", dto));
    }

    @PostMapping("/central/create")
    public ResponseEntity<?> createCentralBill(@RequestBody CentralBillRequestDto request, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        CentralBill bill = billingService.createCentralBill(tenantId, request);
        return ResponseEntity.ok(ApiResponse.success("Central bill created successfully", bill));
    }

    @GetMapping("/central/history")
    public ResponseEntity<?> getCentralBillHistory(HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        List<CentralBill> bills = billingService.getCentralBillHistory(tenantId);
        return ResponseEntity.ok(ApiResponse.success("History fetched successfully", bills));
    }

    @GetMapping("/central/{id}")
    public ResponseEntity<?> getCentralBill(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        CentralBill bill = billingService.getCentralBill(tenantId, id);
        return ResponseEntity.ok(ApiResponse.success("Bill fetched successfully", bill));
    }

    @GetMapping("/central/{id}/pdf")
    public ResponseEntity<?> downloadCentralBillPdf(@PathVariable Long id, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        CentralBill bill = billingService.getCentralBill(tenantId, id);
        byte[] pdfBytes = billingPdfExportService.generateCentralInvoicePdf(bill);

        String filename = "invoice-" + (bill.getInvoiceNumber() != null ? bill.getInvoiceNumber() : bill.getBillNumber()) + ".pdf";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.APPLICATION_PDF)
                .body(pdfBytes);
    }

    @GetMapping("/op/history")
    public ResponseEntity<?> getOpBillingHistory(HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("OP History fetched successfully", billingService.getOpBillingHistory(tenantId)));
    }

    @GetMapping("/ip/history")
    public ResponseEntity<?> getIpBillingHistory(HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("IP History fetched successfully", billingService.getIpBillingHistory(tenantId)));
    }

    @GetMapping("/pharmacy/history")
    public ResponseEntity<?> getPharmacyBillingHistory(HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("Pharmacy History fetched successfully", billingService.getPharmacyBillingHistory(tenantId)));
    }

    @GetMapping("/laboratory/history")
    public ResponseEntity<?> getLabBillingHistory(HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("Lab History fetched successfully", billingService.getLabBillingHistory(tenantId)));
    }

    @GetMapping("/op/patient/{patientId}")
    public ResponseEntity<?> getOpBillingByPatient(@PathVariable Long patientId, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("Patient OP records fetched successfully", billingService.getOpBillingByPatient(tenantId, patientId)));
    }

    @GetMapping("/ip/patient/{patientId}")
    public ResponseEntity<?> getIpBillingByPatient(@PathVariable Long patientId, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("Patient IP records fetched successfully", billingService.getIpBillingByPatient(tenantId, patientId)));
    }

    @GetMapping("/pharmacy/patient/{patientId}")
    public ResponseEntity<?> getPharmacyBillingByPatient(@PathVariable Long patientId, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("Patient Pharmacy records fetched successfully", billingService.getPharmacyBillingByPatient(tenantId, patientId)));
    }

    @GetMapping("/laboratory/patient/{patientId}")
    public ResponseEntity<?> getLabBillingByPatient(@PathVariable Long patientId, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));
        return ResponseEntity.ok(ApiResponse.success("Patient Laboratory records fetched successfully", billingService.getLabBillingByPatient(tenantId, patientId)));
    }

    @PostMapping("/payment")
    public ResponseEntity<?> processPayment(@RequestBody BillPaymentRequestDto request, HttpServletRequest httpRequest) {
        Long tenantId = getTenantId(httpRequest);
        if (tenantId == null) return ResponseEntity.status(403).body(ApiResponse.error("Tenant ID missing."));

        HttpSession session = httpRequest.getSession(false);
        String userEmail = (session != null && session.getAttribute("USER_EMAIL") != null)
                ? (String) session.getAttribute("USER_EMAIL") : "admin";
        String ipAddress = httpRequest.getRemoteAddr();

        try {
            BillPaymentResponseDto response = billingService.processPayment(tenantId, request, userEmail, ipAddress);
            return ResponseEntity.ok(ApiResponse.success("Payment recorded successfully", response));
        } catch (IllegalArgumentException | SecurityException e) {
            return ResponseEntity.badRequest().body(ApiResponse.error(e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(ApiResponse.error("Failed to process payment: " + e.getMessage()));
        }
    }
}
