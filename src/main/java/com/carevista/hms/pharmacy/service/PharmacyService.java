package com.carevista.hms.pharmacy.service;

import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.ip.entity.IpAdmission;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.patient.repository.PatientRepository;
import com.carevista.hms.pharmacy.dto.*;
import com.carevista.hms.pharmacy.entity.Medicine;
import com.carevista.hms.pharmacy.entity.PharmacyBill;
import com.carevista.hms.pharmacy.entity.PharmacyBillItem;
import com.carevista.hms.pharmacy.repository.MedicineRepository;
import com.carevista.hms.pharmacy.repository.PharmacyBillItemRepository;
import com.carevista.hms.pharmacy.repository.PharmacyBillRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class PharmacyService {

    private final PharmacyBillRepository pharmacyBillRepository;
    private final PharmacyBillItemRepository pharmacyBillItemRepository;
    private final MedicineRepository medicineRepository;
    private final PatientRepository patientRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final OpRegistrationRepository opRegistrationRepository;
    private final IpAdmissionRepository ipAdmissionRepository;
    private final AuditService auditService;

    public PharmacyService(PharmacyBillRepository pharmacyBillRepository,
                           PharmacyBillItemRepository pharmacyBillItemRepository,
                           MedicineRepository medicineRepository,
                           PatientRepository patientRepository,
                           TenantRepository tenantRepository,
                           PaymentRecordRepository paymentRecordRepository,
                           OpRegistrationRepository opRegistrationRepository,
                           IpAdmissionRepository ipAdmissionRepository,
                           AuditService auditService) {
        this.pharmacyBillRepository = pharmacyBillRepository;
        this.pharmacyBillItemRepository = pharmacyBillItemRepository;
        this.medicineRepository = medicineRepository;
        this.patientRepository = patientRepository;
        this.tenantRepository = tenantRepository;
        this.paymentRecordRepository = paymentRecordRepository;
        this.opRegistrationRepository = opRegistrationRepository;
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.auditService = auditService;
    }

    // ====================================================================
    // 1. PATIENT SEARCH FOR PHARMACY (WITH AUTO-FILL METADATA)
    // ====================================================================
    @Transactional(readOnly = true)
    public List<PharmacyPatientSearchDto> searchPatientsForPharmacy(Long tenantId, String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }
        String q = query.trim();

        // 1. Search base patients
        List<Patient> patients = patientRepository.searchPatients(tenantId, q);
        Map<String, PharmacyPatientSearchDto> resultMap = new LinkedHashMap<>();

        for (Patient p : patients) {
            PharmacyPatientSearchDto dto = new PharmacyPatientSearchDto(
                    p.getId(),
                    p.getFullName(),
                    p.getUhid(),
                    p.getPhone(),
                    p.getAge(),
                    p.getGender(),
                    p.getAddress(),
                    p.getEmail(),
                    null, null, null, null
            );
            resultMap.put(p.getUhid(), dto);
        }

        // 2. Search OP registrations to enrich or discover OP ID
        List<OpRegistration> ops = opRegistrationRepository.searchOpRegistrations(tenantId, q);
        for (OpRegistration op : ops) {
            if (op.getPatient() != null) {
                String uhid = op.getPatient().getUhid();
                PharmacyPatientSearchDto dto = resultMap.get(uhid);
                if (dto == null) {
                    dto = new PharmacyPatientSearchDto(
                            op.getPatient().getId(),
                            op.getPatient().getFullName(),
                            op.getPatient().getUhid(),
                            op.getPatient().getPhone(),
                            op.getPatient().getAge(),
                            op.getPatient().getGender(),
                            op.getPatient().getAddress(),
                            op.getPatient().getEmail(),
                            op.getOpId(),
                            null,
                            op.getDoctorName(),
                            op.getDepartment()
                    );
                    resultMap.put(uhid, dto);
                } else {
                    if (dto.getLastOpId() == null) dto.setLastOpId(op.getOpId());
                    if (dto.getDoctorName() == null) dto.setDoctorName(op.getDoctorName());
                    if (dto.getDepartment() == null) dto.setDepartment(op.getDepartment());
                }
            }
        }

        // 3. Search IP admissions to enrich or discover IP ID
        List<IpAdmission> ips = ipAdmissionRepository.searchIpAdmissions(tenantId, q);
        for (IpAdmission ip : ips) {
            if (ip.getPatient() != null) {
                String uhid = ip.getPatient().getUhid();
                PharmacyPatientSearchDto dto = resultMap.get(uhid);
                if (dto == null) {
                    dto = new PharmacyPatientSearchDto(
                            ip.getPatient().getId(),
                            ip.getPatient().getFullName(),
                            ip.getPatient().getUhid(),
                            ip.getPatient().getPhone(),
                            ip.getPatient().getAge(),
                            ip.getPatient().getGender(),
                            ip.getPatient().getAddress(),
                            ip.getPatient().getEmail(),
                            ip.getOpId(),
                            ip.getIpId(),
                            ip.getDoctorName(),
                            ip.getDepartment()
                    );
                    resultMap.put(uhid, dto);
                } else {
                    if (dto.getActiveIpId() == null) dto.setActiveIpId(ip.getIpId());
                    if (dto.getDoctorName() == null) dto.setDoctorName(ip.getDoctorName());
                    if (dto.getDepartment() == null) dto.setDepartment(ip.getDepartment());
                }
            }
        }

        return new ArrayList<>(resultMap.values());
    }

    // ====================================================================
    // 2. MEDICINE MASTER & INVENTORY LOOKUP
    // ====================================================================
    @Transactional(readOnly = true)
    public List<MedicineDto> searchMedicines(Long tenantId, String query) {
        List<Medicine> list;
        if (query == null || query.trim().isEmpty()) {
            list = medicineRepository.findByTenantIdOrderByNameAsc(tenantId);
        } else if (query.trim().length() < 2) {
            return Collections.emptyList();
        } else {
            list = medicineRepository.searchMedicines(tenantId, query.trim());
        }
        return list.stream().map(MedicineDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MedicineDto> getAllMedicines(Long tenantId) {
        return medicineRepository.findByTenantIdOrderByNameAsc(tenantId)
                .stream()
                .map(MedicineDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public MedicineDto createMedicine(Long tenantId, CreateMedicineRequest req, Long userId, String userEmail, String ipAddr) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found."));

        // 1. Validate Medicine ID / Code
        String code = req.getMedicineCode() != null ? req.getMedicineCode().trim().toUpperCase() : "";
        if (code.isEmpty()) {
            code = generateMedicineCode(tenantId);
        }

        String batch = req.getBatchNumber() != null ? req.getBatchNumber().trim() : "";
        if (batch.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Batch number is required.");
        }

        // Duplicate checks
        Optional<Medicine> existingWithCode = medicineRepository.findFirstByTenantIdAndMedicineCode(tenantId, code);
        if (existingWithCode.isPresent()) {
            Medicine existing = existingWithCode.get();
            // If the same batch already exists for this medicine code
            if (medicineRepository.findFirstByTenantIdAndMedicineCodeAndBatchNumber(tenantId, code, batch).isPresent()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Medicine ID '" + code + "' with batch number '" + batch + "' already exists for this hospital.");
            }
            // If user is assigning the code to a completely different medicine name
            if (!existing.getName().trim().equalsIgnoreCase(req.getName().trim())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Medicine ID '" + code + "' is already assigned to '" + existing.getName() + "'. Please choose a unique Medicine ID.");
            }
        }

        // 2. Validate Expiry Date
        if (req.getExpiryDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expiry date is required.");
        }
        if (req.getExpiryDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Cannot add medicine with past expiry date (" + req.getExpiryDate() + "). Medicine is already expired.");
        }

        // 3. Validate Stock & Pricing
        if (req.getStockQuantity() == null || req.getStockQuantity() < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Opening stock quantity cannot be negative.");
        }
        if (req.getUnitPrice() == null || req.getUnitPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Selling price cannot be negative.");
        }
        if (req.getCostPrice() != null && req.getCostPrice().compareTo(BigDecimal.ZERO) < 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Purchase price cannot be negative.");
        }

        // 4. Create and persist
        Medicine m = new Medicine();
        m.setTenant(tenant);
        m.setMedicineCode(code);
        m.setName(req.getName().trim());
        m.setGenericName(req.getGenericName() != null ? req.getGenericName().trim() : "");
        m.setCategory(req.getCategory() != null ? req.getCategory().trim() : "Tablet");
        m.setMedicineForm(req.getMedicineForm() != null ? req.getMedicineForm().trim() : (req.getCategory() != null ? req.getCategory().trim() : "Tablet"));
        m.setDosageStrength(req.getDosageStrength() != null ? req.getDosageStrength().trim() : "");
        m.setManufacturer(req.getManufacturer() != null ? req.getManufacturer().trim() : "");
        m.setSupplier(req.getSupplier() != null ? req.getSupplier().trim() : "");
        m.setBatchNumber(batch);
        m.setPurchaseDate(req.getPurchaseDate() != null ? req.getPurchaseDate() : LocalDate.now());
        m.setExpiryDate(req.getExpiryDate());
        m.setCostPrice(req.getCostPrice() != null ? req.getCostPrice() : BigDecimal.ZERO);
        m.setUnitPrice(req.getUnitPrice());
        m.setStockQuantity(req.getStockQuantity());
        m.setReorderLevel(req.getReorderLevel() != null ? req.getReorderLevel() : 10);
        m.setGstPercentage(req.getGstPercentage() != null ? req.getGstPercentage() : new BigDecimal("5.00"));
        m.setNotes(req.getNotes() != null ? req.getNotes().trim() : "");
        m.setRackLocation(req.getRackLocation() != null ? req.getRackLocation().trim() : "");
        m.setStatus("ACTIVE");
        m.setCreatedAt(LocalDateTime.now());

        m = medicineRepository.save(m);

        auditService.log(
                userId, userEmail, "ADMIN", tenantId,
                "PHARMACY_MEDICINE_CONFIG",
                "Configured new medicine: " + m.getName() + " (" + m.getMedicineCode() + ") Batch: " + m.getBatchNumber() + ", Stock: " + m.getStockQuantity(),
                ipAddr, "SUCCESS"
        );

        return MedicineDto.fromEntity(m);
    }

    @Transactional(readOnly = true)
    public String getNextMedicineCode(Long tenantId) {
        return generateMedicineCode(tenantId);
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctSuppliers(Long tenantId) {
        return medicineRepository.findDistinctSuppliers(tenantId);
    }


    // ====================================================================
    // 3. PHARMACY BILL GENERATION & STOCK DEDUCTION
    // ====================================================================
    @Transactional
    public PharmacyBillDto generateBill(Long tenantId, CreatePharmacyBillRequest req,
                                        Long userId, String userEmail, String ipAddr) {

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found."));

        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one medicine is required to generate a bill.");
        }

        // 1. Resolve Patient
        Patient patient = null;
        if (req.getUhid() != null && !req.getUhid().trim().isEmpty()) {
            patient = patientRepository.findByTenantIdAndUhid(tenantId, req.getUhid().trim()).orElse(null);
        }

        if (patient == null && req.getPhone() != null && !req.getPhone().trim().isEmpty()) {
            patient = patientRepository.findFirstByTenantIdAndPhone(tenantId, req.getPhone().trim()).orElse(null);
        }

        if (patient == null) {
            String uhid = generateUniqueUhid(tenantId);
            patient = new Patient(
                    tenant,
                    uhid,
                    req.getPatientName().trim(),
                    req.getPhone() != null ? req.getPhone().trim() : "N/A",
                    30,
                    "Not Specified",
                    "Outpatient Pharmacy Client"
            );
            patient = patientRepository.save(patient);
        }

        // 2. Generate unique Bill Number
        String billNumber = generateBillNumber(tenantId);

        // 3. Create PharmacyBill
        PharmacyBill bill = new PharmacyBill();
        bill.setTenant(tenant);
        bill.setBillNumber(billNumber);
        bill.setPatient(patient);
        bill.setPatientName(req.getPatientName().trim());
        bill.setUhid(patient.getUhid());
        bill.setPhone(req.getPhone() != null ? req.getPhone().trim() : patient.getPhone());
        bill.setOpId(req.getOpId() != null ? req.getOpId().trim() : null);
        bill.setIpId(req.getIpId() != null ? req.getIpId().trim() : null);
        bill.setDoctorName(req.getDoctorName() != null ? req.getDoctorName().trim() : "Attending Physician");
        bill.setDepartment(req.getDepartment() != null ? req.getDepartment().trim() : "Pharmacy");
        bill.setGstNumber(req.getGstNumber() != null ? req.getGstNumber().trim() : "22AAAAA0000A1Z5");
        bill.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "CASH");
        bill.setBillDate(LocalDate.now());
        bill.setBillTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm a")));
        bill.setNotes(req.getNotes());
        bill.setCreatedAt(LocalDateTime.now());

        // 4. Validate Stock, Deduct from Real MySQL Inventory, and Build Items
        for (PharmacyBillItemRequest itemReq : req.getItems()) {
            Medicine med = null;
            if (itemReq.getMedicineId() != null) {
                med = medicineRepository.findByTenantIdAndId(tenantId, itemReq.getMedicineId()).orElse(null);
            }
            if (med == null && itemReq.getMedicineCode() != null) {
                med = medicineRepository.findFirstByTenantIdAndMedicineCode(tenantId, itemReq.getMedicineCode()).orElse(null);
            }

            if (med != null) {
                // Stock validation (Section 10)
                if (med.getStockQuantity() < itemReq.getQuantity()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Insufficient stock for " + med.getName() + ". Only " + med.getStockQuantity() + " units available.");
                }

                // Expiry validation (Section 26)
                if (med.isExpired()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Cannot dispense expired medicine: " + med.getName() + " (Batch: " + med.getBatchNumber() + ", Expired: " + med.getExpiryDate() + ").");
                }

                // Deduct stock in real MySQL inventory (Section 23)
                int newStock = med.getStockQuantity() - itemReq.getQuantity();
                med.setStockQuantity(newStock);
                medicineRepository.save(med);

                // Low stock alert check (Section 25)
                if (newStock <= med.getReorderLevel()) {
                    auditService.log(userId, userEmail, "SYSTEM", tenantId,
                            "PHARMACY_LOW_STOCK_ALERT",
                            "Medicine " + med.getName() + " reached reorder level. Remaining stock: " + newStock,
                            ipAddr, "WARNING");
                }

                BigDecimal linePrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : med.getUnitPrice();
                BigDecimal lineTotal = itemReq.getTotalPrice() != null ? itemReq.getTotalPrice()
                        : (itemReq.getAmount() != null ? itemReq.getAmount() : linePrice.multiply(BigDecimal.valueOf(itemReq.getQuantity())));

                PharmacyBillItem billItem = new PharmacyBillItem(
                        bill,
                        med,
                        med.getMedicineCode(),
                        itemReq.getMedicineName() != null ? itemReq.getMedicineName() : med.getName(),
                        itemReq.getBatchNumber() != null ? itemReq.getBatchNumber() : med.getBatchNumber(),
                        med.getExpiryDate(),
                        itemReq.getQuantity(),
                        linePrice,
                        lineTotal
                );
                bill.addItem(billItem);
            } else {
                // Freeform / ad-hoc medicine entry
                BigDecimal linePrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal lineTotal = itemReq.getTotalPrice() != null ? itemReq.getTotalPrice()
                        : (itemReq.getAmount() != null ? itemReq.getAmount() : linePrice.multiply(BigDecimal.valueOf(itemReq.getQuantity())));

                PharmacyBillItem billItem = new PharmacyBillItem(
                        bill,
                        null,
                        itemReq.getMedicineCode() != null ? itemReq.getMedicineCode() : "RX-GEN",
                        itemReq.getMedicineName() != null ? itemReq.getMedicineName() : "Dispensed Medicine",
                        itemReq.getBatchNumber() != null ? itemReq.getBatchNumber() : "BATCH-GEN",
                        LocalDate.now().plusYears(1),
                        itemReq.getQuantity(),
                        linePrice,
                        lineTotal
                );
                bill.addItem(billItem);
            }
        }

        // 5. Accurate Financial Calculations (Sections 11, 12, 13, 14, 15, 16)
        BigDecimal calculatedSubtotal = BigDecimal.ZERO;
        for (PharmacyBillItem item : bill.getItems()) {
            calculatedSubtotal = calculatedSubtotal.add(item.getTotalPrice());
        }
        bill.setSubtotal(calculatedSubtotal);

        BigDecimal discountPct = req.getDiscountPercentage() != null ? req.getDiscountPercentage() : BigDecimal.ZERO;
        BigDecimal discountAmt = req.getDiscountAmount() != null && req.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0
                ? req.getDiscountAmount()
                : calculatedSubtotal.multiply(discountPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        bill.setDiscountPercentage(discountPct);
        bill.setDiscountAmount(discountAmt);

        BigDecimal netAmount = calculatedSubtotal.subtract(discountAmt);
        if (netAmount.compareTo(BigDecimal.ZERO) < 0) netAmount = BigDecimal.ZERO;

        BigDecimal gstPct = req.getGstPercentage() != null ? req.getGstPercentage() : BigDecimal.ZERO;
        BigDecimal gstAmt = req.getGstAmount() != null && req.getGstAmount().compareTo(BigDecimal.ZERO) > 0
                ? req.getGstAmount()
                : netAmount.multiply(gstPct).divide(BigDecimal.valueOf(100), 2, java.math.RoundingMode.HALF_UP);
        bill.setGstPercentage(gstPct);
        bill.setGstAmount(gstAmt);

        BigDecimal finalTotal = netAmount.add(gstAmt);
        bill.setTotalAmount(finalTotal);

        BigDecimal paid = req.getPaidAmount() != null ? req.getPaidAmount() : finalTotal;
        bill.setPaidAmount(paid);

        BigDecimal balance = finalTotal.subtract(paid);
        if (balance.compareTo(BigDecimal.ZERO) < 0) balance = BigDecimal.ZERO;
        bill.setBalanceAmount(balance);

        String pStatus = (balance.compareTo(BigDecimal.ZERO) == 0 && finalTotal.compareTo(BigDecimal.ZERO) > 0) ? "PAID" :
                (paid.compareTo(BigDecimal.ZERO) > 0 ? "PARTIALLY PAID" : "UNPAID");
        bill.setPaymentStatus(pStatus);

        // 6. Save Bill & Items
        bill = pharmacyBillRepository.save(bill);

        // 7. Money Management Integration (Section 27)
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            PaymentRecord paymentRecord = new PaymentRecord(
                    tenant,
                    billNumber,
                    patient,
                    bill.getPatientName(),
                    "PHARMACY",
                    paid,
                    bill.getPaymentMethod(),
                    LocalDate.now()
            );
            paymentRecord.setBillId(bill.getId());
            paymentRecord.setBillNumber(billNumber);
            paymentRecord.setInvoiceNumber(billNumber);
            paymentRecord.setUhid(patient != null ? patient.getUhid() : bill.getUhid());
            paymentRecord.setOpId(bill.getOpId());
            paymentRecord.setIpId(bill.getIpId());
            paymentRecord.setTotalPaid(paid);
            paymentRecord.setRemainingBalance(balance);
            paymentRecord.setPaymentStatus(pStatus);
            paymentRecord.setPaymentTime(bill.getBillTime());
            paymentRecord.setNotes("Pharmacy Bill Settlement: " + billNumber);
            paymentRecordRepository.save(paymentRecord);
        }

        // 7. Audit Log
        auditService.log(
                userId, userEmail, "ADMIN", tenantId,
                "PHARMACY_SALE",
                "Generated pharmacy bill " + billNumber + " for " + bill.getPatientName() +
                        ". Total: ₹" + bill.getTotalAmount() + ", Paid: ₹" + bill.getPaidAmount(),
                ipAddr, "SUCCESS"
        );

        return PharmacyBillDto.fromEntity(bill);
    }

    // ====================================================================
    // 4. BILL DETAILS & PRINT INVOICE
    // ====================================================================
    @Transactional(readOnly = true)
    public PharmacyBillDto getBillDetails(Long tenantId, Long billId) {
        PharmacyBill bill = pharmacyBillRepository.findByTenantIdAndId(tenantId, billId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pharmacy bill not found."));
        return PharmacyBillDto.fromEntity(bill);
    }

    // ====================================================================
    // 5. SALES HISTORY
    // ====================================================================
    @Transactional(readOnly = true)
    public List<PharmacyBillDto> getBillHistory(Long tenantId, String search) {
        List<PharmacyBill> bills;
        if (search == null || search.trim().isEmpty()) {
            bills = pharmacyBillRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        } else {
            bills = pharmacyBillRepository.searchBills(tenantId, search.trim());
        }
        return bills.stream().map(PharmacyBillDto::fromEntity).collect(Collectors.toList());
    }

    // ====================================================================
    // 6. SUMMARY METRICS
    // ====================================================================
    @Transactional(readOnly = true)
    public PharmacySummaryDto getSummary(Long tenantId) {
        LocalDate today = LocalDate.now();
        long todayCount = pharmacyBillRepository.countByTenantIdAndBillDate(tenantId, today);
        BigDecimal todayRev = pharmacyBillRepository.sumTotalByTenantIdAndBillDate(tenantId, today);
        long totalMeds = medicineRepository.countByTenantId(tenantId);
        long lowStock = medicineRepository.countLowStockMedicines(tenantId);

        return new PharmacySummaryDto(todayCount, todayRev != null ? todayRev : BigDecimal.ZERO, totalMeds, lowStock);
    }

    // ====================================================================
    // INTERNAL HELPERS
    // ====================================================================
    private synchronized String generateBillNumber(Long tenantId) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = pharmacyBillRepository.countByTenantId(tenantId) + 1;
        String billNo = String.format("RX-%s-%04d", dateStr, count);

        while (pharmacyBillRepository.findFirstByTenantIdAndBillNumber(tenantId, billNo).isPresent()) {
            count++;
            billNo = String.format("RX-%s-%04d", dateStr, count);
        }
        return billNo;
    }

    private synchronized String generateMedicineCode(Long tenantId) {
        long count = medicineRepository.countByTenantId(tenantId) + 1001;
        String code = "MED-" + count;
        while (medicineRepository.findFirstByTenantIdAndMedicineCode(tenantId, code).isPresent()) {
            count++;
            code = "MED-" + count;
        }
        return code;
    }

    private synchronized String generateUniqueUhid(Long tenantId) {
        long count = patientRepository.countByTenantId(tenantId) + 1001;
        String candidate = "UHID-" + count;
        while (patientRepository.findByTenantIdAndUhid(tenantId, candidate).isPresent()) {
            count++;
            candidate = "UHID-" + count;
        }
        return candidate;
    }
}
