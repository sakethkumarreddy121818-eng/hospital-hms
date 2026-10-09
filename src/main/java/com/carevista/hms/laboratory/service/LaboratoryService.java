package com.carevista.hms.laboratory.service;

import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.ip.entity.IpAdmission;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.laboratory.dto.*;
import com.carevista.hms.laboratory.entity.LabOrder;
import com.carevista.hms.laboratory.entity.LabOrderItem;
import com.carevista.hms.laboratory.entity.LabTest;
import com.carevista.hms.laboratory.repository.LabOrderItemRepository;
import com.carevista.hms.laboratory.repository.LabOrderRepository;
import com.carevista.hms.laboratory.repository.LabTestRepository;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.patient.repository.PatientRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class LaboratoryService {

    private final LabOrderRepository labOrderRepository;
    private final LabOrderItemRepository labOrderItemRepository;
    private final LabTestRepository labTestRepository;
    private final PatientRepository patientRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final OpRegistrationRepository opRegistrationRepository;
    private final IpAdmissionRepository ipAdmissionRepository;
    private final AuditService auditService;

    public LaboratoryService(LabOrderRepository labOrderRepository,
                             LabOrderItemRepository labOrderItemRepository,
                             LabTestRepository labTestRepository,
                             PatientRepository patientRepository,
                             TenantRepository tenantRepository,
                             PaymentRecordRepository paymentRecordRepository,
                             OpRegistrationRepository opRegistrationRepository,
                             IpAdmissionRepository ipAdmissionRepository,
                             AuditService auditService) {
        this.labOrderRepository = labOrderRepository;
        this.labOrderItemRepository = labOrderItemRepository;
        this.labTestRepository = labTestRepository;
        this.patientRepository = patientRepository;
        this.tenantRepository = tenantRepository;
        this.paymentRecordRepository = paymentRecordRepository;
        this.opRegistrationRepository = opRegistrationRepository;
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.auditService = auditService;
    }

    // ====================================================================
    // 1. PATIENT SEARCH FOR LAB (WITH OP / IP AUTO-FILL)
    // ====================================================================
    @Transactional(readOnly = true)
    public List<LabPatientSearchDto> searchPatientsForLab(Long tenantId, String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }
        String q = query.trim();

        List<Patient> patients = patientRepository.searchPatients(tenantId, q);
        Map<String, LabPatientSearchDto> resultMap = new LinkedHashMap<>();

        for (Patient p : patients) {
            LabPatientSearchDto dto = new LabPatientSearchDto(
                    p.getId(),
                    p.getFullName(),
                    p.getUhid(),
                    p.getPhone(),
                    p.getAge(),
                    p.getGender(),
                    p.getEmail(),
                    null, null, null, null
            );
            resultMap.put(p.getUhid(), dto);
        }

        // Enrich with OP records
        List<OpRegistration> ops = opRegistrationRepository.searchOpRegistrations(tenantId, q);
        for (OpRegistration op : ops) {
            if (op.getPatient() != null) {
                String uhid = op.getPatient().getUhid();
                LabPatientSearchDto dto = resultMap.get(uhid);
                if (dto == null) {
                    dto = new LabPatientSearchDto(
                            op.getPatient().getId(),
                            op.getPatient().getFullName(),
                            op.getPatient().getUhid(),
                            op.getPatient().getPhone(),
                            op.getPatient().getAge(),
                            op.getPatient().getGender(),
                            op.getPatient().getEmail(),
                            op.getOpId(),
                            null,
                            op.getDoctorName(),
                            op.getDepartment()
                    );
                    resultMap.put(uhid, dto);
                } else {
                    if (dto.getOpId() == null) dto.setOpId(op.getOpId());
                    if (dto.getDoctorName() == null) dto.setDoctorName(op.getDoctorName());
                    if (dto.getDepartment() == null) dto.setDepartment(op.getDepartment());
                }
            }
        }

        // Enrich with IP records
        List<IpAdmission> ips = ipAdmissionRepository.searchIpAdmissions(tenantId, q);
        for (IpAdmission ip : ips) {
            if (ip.getPatient() != null) {
                String uhid = ip.getPatient().getUhid();
                LabPatientSearchDto dto = resultMap.get(uhid);
                if (dto == null) {
                    dto = new LabPatientSearchDto(
                            ip.getPatient().getId(),
                            ip.getPatient().getFullName(),
                            ip.getPatient().getUhid(),
                            ip.getPatient().getPhone(),
                            ip.getPatient().getAge(),
                            ip.getPatient().getGender(),
                            ip.getPatient().getEmail(),
                            ip.getOpId(),
                            ip.getIpId(),
                            ip.getDoctorName(),
                            ip.getDepartment()
                    );
                    resultMap.put(uhid, dto);
                } else {
                    if (dto.getIpId() == null) dto.setIpId(ip.getIpId());
                    if (dto.getDoctorName() == null && ip.getDoctorName() != null) dto.setDoctorName(ip.getDoctorName());
                    if (dto.getDepartment() == null && ip.getDepartment() != null) dto.setDepartment(ip.getDepartment());
                }
            }
        }

        // Direct IP ID lookup fallback
        ipAdmissionRepository.findFirstByTenantIdAndIpId(tenantId, q).ifPresent(ip -> {
            if (ip.getPatient() != null) {
                String uhid = ip.getPatient().getUhid();
                if (!resultMap.containsKey(uhid)) {
                    resultMap.put(uhid, new LabPatientSearchDto(
                            ip.getPatient().getId(),
                            ip.getPatient().getFullName(),
                            ip.getPatient().getUhid(),
                            ip.getPatient().getPhone(),
                            ip.getPatient().getAge(),
                            ip.getPatient().getGender(),
                            ip.getPatient().getEmail(),
                            ip.getOpId(),
                            ip.getIpId(),
                            ip.getDoctorName(),
                            ip.getDepartment()
                    ));
                } else {
                    resultMap.get(uhid).setIpId(ip.getIpId());
                }
            }
        });

        return new ArrayList<>(resultMap.values());
    }

    // ====================================================================
    // 2. LAB TEST MASTER CATALOG
    // ====================================================================
    @Transactional
    public List<LabTestDto> getLabTests(Long tenantId) {
        List<LabTest> tests = labTestRepository.findByTenantIdAndStatusOrderByTestNameAsc(tenantId, "ACTIVE");
        if (tests.isEmpty()) {
            ensureDefaultLabTests(tenantId);
            tests = labTestRepository.findByTenantIdAndStatusOrderByTestNameAsc(tenantId, "ACTIVE");
        }
        return tests.stream().map(LabTestDto::new).collect(Collectors.toList());
    }

    @Transactional
    public void ensureDefaultLabTests(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantId));

        if (labTestRepository.countByTenantId(tenantId) > 0) {
            return;
        }

        List<LabTest> defaults = List.of(
                new LabTest(tenant, "TEST-CBC", "Complete Blood Count (CBC)", "Hematology", new BigDecimal("450.00"), "EDTA Whole Blood", "Various", "Hb: 13-17 g/dL, TLC: 4000-11000 /cumm, Platelets: 1.5-4.5 Lakhs", "2 Hours"),
                new LabTest(tenant, "TEST-FBS", "Blood Sugar - Fasting (FBS)", "Biochemistry", new BigDecimal("150.00"), "Fluoride Plasma", "mg/dL", "70 - 99 mg/dL (Normal)", "1 Hour"),
                new LabTest(tenant, "TEST-PPBS", "Blood Sugar - Post Prandial (PPBS)", "Biochemistry", new BigDecimal("150.00"), "Fluoride Plasma", "mg/dL", "< 140 mg/dL (Normal)", "1 Hour"),
                new LabTest(tenant, "TEST-LIPID", "Lipid Profile Diagnostic Panel", "Biochemistry", new BigDecimal("850.00"), "Serum (12h Fasting)", "mg/dL", "Cholesterol: <200, Triglycerides: <150, HDL: >40, LDL: <100", "4 Hours"),
                new LabTest(tenant, "TEST-LFT", "Liver Function Test (LFT Comprehensive)", "Biochemistry", new BigDecimal("750.00"), "Serum", "Various", "Bilirubin Total: 0.2-1.2 mg/dL, SGOT/AST: 5-40 U/L, SGPT/ALT: 7-56 U/L, Alk Phos: 44-147 U/L", "4 Hours"),
                new LabTest(tenant, "TEST-KFT", "Kidney Function Test (KFT / RFT)", "Biochemistry", new BigDecimal("700.00"), "Serum", "Various", "Blood Urea: 15-40 mg/dL, Serum Creatinine: 0.7-1.3 mg/dL, Uric Acid: 3.5-7.2 mg/dL", "4 Hours"),
                new LabTest(tenant, "TEST-THY", "Thyroid Profile (Total T3, T4, TSH)", "Endocrinology", new BigDecimal("650.00"), "Serum", "Various", "TSH: 0.35-4.94 uIU/mL, T3: 0.8-2.0 ng/mL, T4: 5.1-14.1 ug/dL", "6 Hours"),
                new LabTest(tenant, "TEST-HBA1C", "Glycated Hemoglobin (HbA1c)", "Hematology", new BigDecimal("550.00"), "EDTA Whole Blood", "%", "Non-diabetic: <5.7%, Prediabetes: 5.7-6.4%, Diabetic: >=6.5%", "2 Hours"),
                new LabTest(tenant, "TEST-URINE", "Routine & Microscopic Urine Analysis", "Clinical Pathology", new BigDecimal("200.00"), "Clean Catch Urine", "Visual/Microscopic", "Color: Pale Yellow, pH: 5.0-7.0, Protein: Nil, Sugar: Nil, Pus Cells: 1-2 /HPF", "1 Hour"),
                new LabTest(tenant, "TEST-ELEC", "Serum Electrolytes (Na+, K+, Cl-)", "Biochemistry", new BigDecimal("500.00"), "Serum", "mmol/L", "Sodium: 136-145, Potassium: 3.5-5.1, Chloride: 98-107", "2 Hours"),
                new LabTest(tenant, "TEST-CRP", "C-Reactive Protein (Quantitative CRP)", "Immunology", new BigDecimal("400.00"), "Serum", "mg/L", "< 5.0 mg/L", "2 Hours"),
                new LabTest(tenant, "TEST-VITD", "Vitamin D3 (25-Hydroxy)", "Endocrinology", new BigDecimal("1200.00"), "Serum", "ng/mL", "Deficient: <20, Insufficient: 20-29, Sufficient: 30-100", "24 Hours")
        );
        labTestRepository.saveAll(defaults);
    }

    @Transactional
    public LabTestDto createLabTest(Long tenantId, LabTestDto dto) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantId));

        if (dto.getTestName() == null || dto.getTestName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Test name is required.");
        }

        String code = dto.getTestCode();
        if (code == null || code.trim().isEmpty()) {
            code = "TEST-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        }

        LabTest test = new LabTest(
                tenant,
                code,
                dto.getTestName().trim(),
                dto.getCategory() != null ? dto.getCategory().trim() : "GENERAL",
                dto.getPrice() != null ? dto.getPrice() : BigDecimal.ZERO,
                dto.getSampleType(),
                dto.getUnit(),
                dto.getReferenceRange(),
                dto.getTurnaroundTime()
        );

        LabTest saved = labTestRepository.save(test);
        return new LabTestDto(saved);
    }

    // ====================================================================
    // 3. CREATE LAB ORDER & PAYMENT
    // ====================================================================
    @Transactional
    public LabOrderDto createLabOrder(Long tenantId, Long userId, String userEmail, String ipAddr, CreateLabOrderRequest req) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found: " + tenantId));

        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select at least one laboratory test.");
        }

        // Validate patient demographic input strictly
        String validName = com.carevista.hms.common.util.PatientValidationUtil.validatePatientName(req.getPatientName(), true);
        String validPhone = com.carevista.hms.common.util.PatientValidationUtil.validatePatientPhone(req.getPhone(), false);
        Integer validAge = com.carevista.hms.common.util.PatientValidationUtil.validatePatientAge(req.getAge(), false);

        // 1. Resolve Patient
        Patient patient = null;
        if (req.getPatientId() != null) {
            patient = patientRepository.findById(req.getPatientId()).orElse(null);
        }
        if (patient == null && req.getUhid() != null && !req.getUhid().trim().isEmpty()) {
            patient = patientRepository.findByTenantIdAndUhid(tenantId, req.getUhid().trim()).orElse(null);
        }

        String patientName = validName;
        if (patient != null && (patientName == null || patientName.trim().isEmpty())) {
            patientName = patient.getFullName();
        }

        String uhid = req.getUhid();
        if (uhid == null || uhid.trim().isEmpty()) {
            uhid = patient != null ? patient.getUhid() : "WALKIN-LAB-" + System.currentTimeMillis() % 100000;
        }

        // 2. Generate unique Lab Order Number (Format: LAB-YYYYMMDD-XXXX)
        String todayStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long nextSeq = labOrderRepository.countByTenantIdAndOrderDate(tenantId, LocalDate.now()) + 1;
        String orderNumber = String.format("LAB-%s-%04d", todayStr, nextSeq);

        while (labOrderRepository.findByTenantIdAndOrderNumber(tenantId, orderNumber).isPresent()) {
            nextSeq++;
            orderNumber = String.format("LAB-%s-%04d", todayStr, nextSeq);
        }

        // 3. Calculate Financials
        BigDecimal calculatedSubtotal = BigDecimal.ZERO;
        List<LabOrderItem> itemsToSave = new ArrayList<>();
        List<String> testNames = new ArrayList<>();
        String primaryCategory = "GENERAL";

        for (CreateLabOrderItemRequest itemReq : req.getItems()) {
            if (itemReq.getTestName() == null || itemReq.getTestName().trim().isEmpty()) {
                continue;
            }
            BigDecimal price = itemReq.getPrice() != null ? itemReq.getPrice() : BigDecimal.ZERO;
            calculatedSubtotal = calculatedSubtotal.add(price);
            testNames.add(itemReq.getTestName().trim());

            LabTest labTest = null;
            if (itemReq.getTestId() != null) {
                labTest = labTestRepository.findById(itemReq.getTestId()).orElse(null);
            }

            String sampleType = itemReq.getSampleType() != null ? itemReq.getSampleType() : (labTest != null ? labTest.getSampleType() : "Blood");
            String unit = labTest != null ? labTest.getUnit() : null;
            String refRange = labTest != null ? labTest.getReferenceRange() : null;
            String category = itemReq.getCategory() != null ? itemReq.getCategory() : (labTest != null ? labTest.getCategory() : "GENERAL");
            primaryCategory = category;

            LabOrderItem item = new LabOrderItem(
                    null,
                    labTest,
                    itemReq.getTestCode() != null ? itemReq.getTestCode() : (labTest != null ? labTest.getTestCode() : "TEST"),
                    itemReq.getTestName().trim(),
                    category,
                    sampleType,
                    price,
                    unit,
                    refRange
            );
            itemsToSave.add(item);
        }

        if (itemsToSave.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No valid test items provided.");
        }

        // Subtotal
        BigDecimal subtotal = calculatedSubtotal.setScale(2, RoundingMode.HALF_UP);

        // Discount
        BigDecimal discountPct = req.getDiscountPercentage() != null ? req.getDiscountPercentage() : BigDecimal.ZERO;
        BigDecimal discountAmt = subtotal.multiply(discountPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal netAmount = subtotal.subtract(discountAmt).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        // GST
        BigDecimal gstPct = req.getGstPercentage() != null ? req.getGstPercentage() : BigDecimal.ZERO;
        BigDecimal gstAmt = netAmount.multiply(gstPct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal finalTotal = netAmount.add(gstAmt).setScale(2, RoundingMode.HALF_UP);

        // Payment
        BigDecimal paidAmount = req.getPaidAmount() != null ? req.getPaidAmount() : BigDecimal.ZERO;
        if (paidAmount.compareTo(BigDecimal.ZERO) < 0) paidAmount = BigDecimal.ZERO;

        BigDecimal balanceAmount = finalTotal.subtract(paidAmount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP);

        String paymentStatus = "UNPAID";
        if (finalTotal.compareTo(BigDecimal.ZERO) == 0 || paidAmount.compareTo(finalTotal) >= 0) {
            paymentStatus = "PAID";
            balanceAmount = BigDecimal.ZERO;
        } else if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            paymentStatus = "PARTIALLY PAID";
        }

        String initialOrderStatus = "ORDERED";

        // 4. Build LabOrder Entity
        LabOrder order = new LabOrder();
        order.setTenant(tenant);
        order.setOrderNumber(orderNumber);
        order.setPatient(patient);
        order.setPatientName(patientName);
        order.setUhid(uhid);
        order.setPhone(req.getPhone() != null ? req.getPhone() : (patient != null ? patient.getPhone() : ""));
        order.setOpId(req.getOpId());
        order.setIpId(req.getIpId());
        order.setAge(req.getAge() != null ? req.getAge() : (patient != null ? patient.getAge() : null));
        order.setGender(req.getGender() != null ? req.getGender() : (patient != null ? patient.getGender() : null));
        order.setDoctorName(req.getDoctorName() != null ? req.getDoctorName() : "Duty Physician");
        order.setDepartment(req.getDepartment() != null ? req.getDepartment() : "Pathology");

        // Test name summary string for dashboards/tables
        String testSummary = String.join(", ", testNames);
        if (testSummary.length() > 250) testSummary = testSummary.substring(0, 247) + "...";
        order.setTestName(testSummary);
        order.setCategory(primaryCategory);

        order.setTestPrice(subtotal);
        order.setSubtotal(subtotal);
        order.setDiscountPercentage(discountPct);
        order.setDiscountAmount(discountAmt);
        order.setNetAmount(netAmount);
        order.setGstNumber(req.getGstNumber());
        order.setGstPercentage(gstPct);
        order.setGstAmount(gstAmt);
        order.setTotalAmount(finalTotal);
        order.setPaidAmount(paidAmount);
        order.setBalanceAmount(balanceAmount);
        order.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "CASH");
        order.setPaymentStatus(paymentStatus);
        order.setOrderStatus(initialOrderStatus);
        order.setOrderDate(LocalDate.now());
        order.setNotes(req.getNotes());
        order.setCreatedAt(LocalDateTime.now());

        // Add items
        for (LabOrderItem item : itemsToSave) {
            order.addItem(item);
        }

        LabOrder savedOrder = labOrderRepository.save(order);

        // 5. Save Central Billing / Payment Record if payment collected
        if (paidAmount.compareTo(BigDecimal.ZERO) > 0) {
            String orderTimeStr = java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("hh:mm a"));
            PaymentRecord paymentRecord = new PaymentRecord(
                    tenant,
                    orderNumber,
                    patient,
                    patientName,
                    "LABORATORY",
                    paidAmount,
                    order.getPaymentMethod(),
                    LocalDate.now()
            );
            paymentRecord.setBillId(order.getId());
            paymentRecord.setBillNumber(orderNumber);
            paymentRecord.setInvoiceNumber(orderNumber);
            paymentRecord.setUhid(patient != null ? patient.getUhid() : order.getUhid());
            paymentRecord.setOpId(order.getOpId());
            paymentRecord.setIpId(order.getIpId());
            paymentRecord.setTotalPaid(paidAmount);
            paymentRecord.setRemainingBalance(order.getBalanceAmount());
            paymentRecord.setPaymentStatus(order.getPaymentStatus());
            paymentRecord.setPaymentTime(orderTimeStr);
            paymentRecord.setNotes("Lab Order Collection: " + orderNumber + " (" + testSummary + ")");
            paymentRecordRepository.save(paymentRecord);
        }

        // 6. Audit Log
        auditService.log(
                userId, userEmail, "ADMIN", tenantId,
                "LAB_ORDER_CREATED",
                "Created Lab Order " + orderNumber + " for " + patientName +
                        " with " + itemsToSave.size() + " test(s). Total: ₹" + finalTotal + ", Paid: ₹" + paidAmount,
                ipAddr, "SUCCESS"
        );

        return new LabOrderDto(savedOrder);
    }

    // ====================================================================
    // 4. LAB ORDERS LISTING & SEARCH (PROCESSING & HISTORY)
    // ====================================================================
    @Transactional(readOnly = true)
    public List<LabOrderDto> getLabOrders(Long tenantId, String status, String search) {
        List<LabOrder> orders;

        boolean hasSearch = search != null && !search.trim().isEmpty();
        boolean hasStatus = status != null && !status.trim().isEmpty() && !status.equalsIgnoreCase("ALL");

        if (hasSearch && hasStatus) {
            orders = labOrderRepository.searchLabOrdersWithStatus(tenantId, search.trim(), status.trim().toUpperCase());
        } else if (hasSearch) {
            orders = labOrderRepository.searchLabOrders(tenantId, search.trim());
        } else if (hasStatus) {
            orders = labOrderRepository.findByTenantIdAndOrderStatusOrderByCreatedAtDesc(tenantId, status.trim().toUpperCase());
        } else {
            orders = labOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        }

        return orders.stream().map(LabOrderDto::new).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public LabOrderDto getLabOrderById(Long tenantId, Long orderId) {
        LabOrder order = labOrderRepository.findByTenantIdAndId(tenantId, orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lab Order not found: " + orderId));
        return new LabOrderDto(order);
    }

    // ====================================================================
    // 5. UPDATE LAB RESULTS & ENTER VALUES
    // ====================================================================
    @Transactional
    public LabOrderDto updateLabResults(Long tenantId, Long orderId, Long userId, String userEmail, String ipAddr, UpdateLabResultsRequest req) {
        LabOrder order = labOrderRepository.findByTenantIdAndId(tenantId, orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lab Order not found: " + orderId));

        if (req.getItemResults() != null && !req.getItemResults().isEmpty()) {
            Map<Long, LabOrderItem> itemMap = order.getItems().stream()
                    .collect(Collectors.toMap(LabOrderItem::getId, item -> item));

            for (UpdateLabItemResultDto resDto : req.getItemResults()) {
                LabOrderItem item = itemMap.get(resDto.getItemId());
                if (item != null) {
                    if (resDto.getResultValue() != null) {
                        item.setResultValue(resDto.getResultValue().trim());
                    }
                    if (resDto.getUnit() != null) {
                        item.setUnit(resDto.getUnit().trim());
                    }
                    if (resDto.getReferenceRange() != null) {
                        item.setReferenceRange(resDto.getReferenceRange().trim());
                    }
                    if (resDto.getResultNotes() != null) {
                        item.setResultNotes(resDto.getResultNotes().trim());
                    }
                    if (resDto.getTechnicianName() != null) {
                        item.setTechnicianName(resDto.getTechnicianName().trim());
                    }
                    item.setItemStatus(resDto.getItemStatus() != null ? resDto.getItemStatus() : "ENTERED");
                    item.setResultDate(LocalDateTime.now());
                }
            }
        }

        if (req.getTechnicianName() != null && !req.getTechnicianName().trim().isEmpty()) {
            order.setTechnicianName(req.getTechnicianName().trim());
        }
        if (req.getOrderNotes() != null) {
            order.setNotes(req.getOrderNotes());
        }

        // If currently ORDERED, bump to PROCESSING
        if ("ORDERED".equalsIgnoreCase(order.getOrderStatus()) || "SAMPLE COLLECTED".equalsIgnoreCase(order.getOrderStatus())) {
            order.setOrderStatus("PROCESSING");
        }

        // If markCompleted requested
        if (Boolean.TRUE.equals(req.getMarkCompleted())) {
            order.setOrderStatus("COMPLETED");
            order.setCompletedAt(LocalDateTime.now());
            order.setCompletedBy(userEmail);
            for (LabOrderItem item : order.getItems()) {
                item.setItemStatus("VERIFIED");
                item.setVerifiedBy(userEmail);
                item.setVerifiedAt(LocalDateTime.now());
            }
        }

        LabOrder saved = labOrderRepository.save(order);

        auditService.log(
                userId, userEmail, "ADMIN", tenantId,
                "LAB_RESULTS_UPDATED",
                "Updated test results for Lab Order " + order.getOrderNumber() +
                        (Boolean.TRUE.equals(req.getMarkCompleted()) ? " (Marked COMPLETED)" : ""),
                ipAddr, "SUCCESS"
        );

        return new LabOrderDto(saved);
    }

    // ====================================================================
    // 6. COMPLETE LAB ORDER (MARK AS COMPLETED)
    // ====================================================================
    @Transactional
    public LabOrderDto completeLabOrder(Long tenantId, Long orderId, Long userId, String userEmail, String ipAddr, CompleteLabOrderRequest req) {
        LabOrder order = labOrderRepository.findByTenantIdAndId(tenantId, orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lab Order not found: " + orderId));

        order.setOrderStatus("COMPLETED");
        order.setCompletedAt(LocalDateTime.now());
        order.setCompletedBy(userEmail);

        if (req != null) {
            if (req.getTechnicianName() != null && !req.getTechnicianName().trim().isEmpty()) {
                order.setTechnicianName(req.getTechnicianName().trim());
            }
            if (req.getNotes() != null && !req.getNotes().trim().isEmpty()) {
                order.setNotes(req.getNotes().trim());
            }
        }

        for (LabOrderItem item : order.getItems()) {
            item.setItemStatus("VERIFIED");
            item.setVerifiedBy(userEmail);
            item.setVerifiedAt(LocalDateTime.now());
        }

        LabOrder saved = labOrderRepository.save(order);

        auditService.log(
                userId, userEmail, "ADMIN", tenantId,
                "LAB_ORDER_COMPLETED",
                "Marked Lab Order " + order.getOrderNumber() + " as COMPLETED for patient " + order.getPatientName(),
                ipAddr, "SUCCESS"
        );

        return new LabOrderDto(saved);
    }
}
