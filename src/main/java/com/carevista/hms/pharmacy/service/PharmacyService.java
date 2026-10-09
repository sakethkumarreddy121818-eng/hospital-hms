package com.carevista.hms.pharmacy.service;

import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.doctor.entity.Doctor;
import com.carevista.hms.doctor.repository.DoctorRepository;
import com.carevista.hms.ip.entity.IpAdmission;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.patient.repository.PatientRepository;
import com.carevista.hms.pharmacy.dto.*;
import com.carevista.hms.pharmacy.entity.*;
import com.carevista.hms.pharmacy.repository.*;
import com.carevista.hms.settings.entity.HospitalSetting;
import com.carevista.hms.settings.repository.HospitalSettingRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.springframework.data.domain.PageRequest;
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
public class PharmacyService {

    private final PharmacyBillRepository pharmacyBillRepository;
    private final PharmacyBillItemRepository pharmacyBillItemRepository;
    private final MedicineRepository medicineRepository;
    private final PharmacyBatchRepository pharmacyBatchRepository;
    private final PharmacySupplierRepository pharmacySupplierRepository;
    private final PharmacyStockMovementRepository pharmacyStockMovementRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final OpRegistrationRepository opRegistrationRepository;
    private final IpAdmissionRepository ipAdmissionRepository;
    private final HospitalSettingRepository hospitalSettingRepository;
    private final AuditService auditService;

    public PharmacyService(PharmacyBillRepository pharmacyBillRepository,
                           PharmacyBillItemRepository pharmacyBillItemRepository,
                           MedicineRepository medicineRepository,
                           PharmacyBatchRepository pharmacyBatchRepository,
                           PharmacySupplierRepository pharmacySupplierRepository,
                           PharmacyStockMovementRepository pharmacyStockMovementRepository,
                           PatientRepository patientRepository,
                           DoctorRepository doctorRepository,
                           TenantRepository tenantRepository,
                           PaymentRecordRepository paymentRecordRepository,
                           OpRegistrationRepository opRegistrationRepository,
                           IpAdmissionRepository ipAdmissionRepository,
                           HospitalSettingRepository hospitalSettingRepository,
                           AuditService auditService) {
        this.pharmacyBillRepository = pharmacyBillRepository;
        this.pharmacyBillItemRepository = pharmacyBillItemRepository;
        this.medicineRepository = medicineRepository;
        this.pharmacyBatchRepository = pharmacyBatchRepository;
        this.pharmacySupplierRepository = pharmacySupplierRepository;
        this.pharmacyStockMovementRepository = pharmacyStockMovementRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.tenantRepository = tenantRepository;
        this.paymentRecordRepository = paymentRecordRepository;
        this.opRegistrationRepository = opRegistrationRepository;
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.hospitalSettingRepository = hospitalSettingRepository;
        this.auditService = auditService;
    }

    // ====================================================================
    // 0. AUTO-MIGRATION / BATCH SYNCHRONIZATION
    // ====================================================================
    @Transactional
    public void ensureBatchesForTenant(Long tenantId) {
        List<Medicine> medicines = medicineRepository.findByTenantIdAndIsDeletedFalseOrderByNameAsc(tenantId);
        for (Medicine med : medicines) {
            List<PharmacyBatch> batches = pharmacyBatchRepository.findByTenantIdAndMedicineId(tenantId, med.getId());
            if (batches.isEmpty()) {
                String batchNum = med.getBatchNumber();
                if (batchNum == null || batchNum.trim().isEmpty()) {
                    batchNum = "BATCH-" + med.getMedicineCode();
                }
                LocalDate exp = med.getExpiryDate() != null ? med.getExpiryDate() : LocalDate.now().plusMonths(12);
                int qty = med.getStockQuantity() != null ? med.getStockQuantity() : 0;
                BigDecimal cost = med.getCostPrice() != null ? med.getCostPrice() : BigDecimal.ZERO;

                PharmacyBatch initialBatch = new PharmacyBatch(
                        med.getTenant(), med, batchNum, exp, qty, cost, 3
                );
                initialBatch.setMrp(med.getUnitPrice());
                initialBatch.setSupplierName(med.getSupplier());
                pharmacyBatchRepository.save(initialBatch);

                // Ensure movement record
                PharmacyStockMovement sm = new PharmacyStockMovement(
                        med.getTenant(), med, initialBatch, batchNum,
                        qty, qty, "Opening Batch Migration", "System Auto-Init"
                );
                pharmacyStockMovementRepository.save(sm);
            } else {
                // Ensure parent stockQuantity is synchronized with sum of batch quantities
                Integer sumQty = pharmacyBatchRepository.sumQuantityByMedicineId(tenantId, med.getId());
                int total = sumQty != null ? sumQty : 0;
                if (!Objects.equals(med.getStockQuantity(), total)) {
                    med.setStockQuantity(total);
                    medicineRepository.save(med);
                }
            }
        }
    }

    // ====================================================================
    // 1. DASHBOARD SUMMARY & ALERTS
    // ====================================================================
    @Transactional
    public PharmacySummaryDto getSummary(Long tenantId) {
        ensureBatchesForTenant(tenantId);

        LocalDate today = LocalDate.now();
        LocalDate targetSoon = today.plusDays(90);

        long todayBills = pharmacyBillRepository.countByTenantIdAndBillDate(tenantId, today);
        BigDecimal todayRevenue = pharmacyBillRepository.sumTotalByTenantIdAndBillDate(tenantId, today);
        if (todayRevenue == null) todayRevenue = BigDecimal.ZERO;

        long totalMedicines = medicineRepository.countByTenantIdAndIsDeletedFalse(tenantId);
        Long totalStockUnits = pharmacyBatchRepository.sumTotalStockQuantity(tenantId);
        long availableStock = totalStockUnits != null ? totalStockUnits : 0;

        long lowStockCount = medicineRepository.countLowStockMedicines(tenantId);
        long outOfStockCount = pharmacyBatchRepository.countOutOfStockBatches(tenantId);
        long expiringSoonCount = pharmacyBatchRepository.countExpiringSoonBatches(tenantId, today, targetSoon);
        long expiredCount = pharmacyBatchRepository.countExpiredBatches(tenantId, today);
        long totalBatches = pharmacyBatchRepository.countByTenantIdAndIsDeletedFalse(tenantId);

        return new PharmacySummaryDto(
                todayBills, todayRevenue, totalMedicines, availableStock,
                lowStockCount, outOfStockCount, expiringSoonCount, expiredCount, totalBatches
        );
    }

    @Transactional(readOnly = true)
    public List<DashboardDrillDownItemDto> getDashboardDetails(Long tenantId, String category, String query) {
        LocalDate today = LocalDate.now();
        LocalDate targetSoon = today.plusDays(90);
        List<DashboardDrillDownItemDto> items = new ArrayList<>();
        String q = query != null ? query.trim().toLowerCase() : "";

        if ("out-of-stock".equalsIgnoreCase(category)) {
            List<PharmacyBatch> batches = pharmacyBatchRepository.findOutOfStockBatches(tenantId);
            for (PharmacyBatch b : batches) {
                Medicine m = b.getMedicine();
                if (m.getIsDeleted()) continue;
                if (!matchesFilter(m, b, q)) continue;

                DashboardDrillDownItemDto dto = buildDrillDownDto(m, b, "Out of Stock", "out-of-stock");
                items.add(dto);
            }
        } else if ("low-stock".equalsIgnoreCase(category)) {
            List<Medicine> meds = medicineRepository.findLowStockMedicinesList(tenantId);
            for (Medicine m : meds) {
                if (!matchesFilter(m, null, q)) continue;
                DashboardDrillDownItemDto dto = new DashboardDrillDownItemDto();
                dto.setMedicineId(m.getId());
                dto.setMedicineCode(m.getMedicineCode());
                dto.setName(m.getName());
                dto.setGenericName(m.getGenericName());
                dto.setStrength(m.getDosageStrength());
                dto.setManufacturer(m.getManufacturer());
                dto.setPlacement(m.getRackLocation());
                dto.setCategory(m.getCategory());
                dto.setBatchNumber(m.getBatchNumber() != null ? m.getBatchNumber() : "-");
                dto.setExpiryDate(m.getExpiryDate());
                dto.setCurrentQuantity(m.getStockQuantity());
                dto.setReorderLevel(m.getReorderLevel());
                dto.setUnitPrice(m.getUnitPrice());
                dto.setStatusText("Stock Below Threshold (" + m.getStockQuantity() + " / " + m.getReorderLevel() + ")");
                dto.setAlertCategory("low-stock");
                items.add(dto);
            }
        } else if ("expiring-soon".equalsIgnoreCase(category)) {
            List<PharmacyBatch> batches = pharmacyBatchRepository.findExpiringSoonBatches(tenantId, today, targetSoon);
            for (PharmacyBatch b : batches) {
                Medicine m = b.getMedicine();
                if (m.getIsDeleted()) continue;
                if (!matchesFilter(m, b, q)) continue;

                DashboardDrillDownItemDto dto = buildDrillDownDto(m, b, "Expiring Soon (" + b.getExpiryDate() + ")", "expiring-soon");
                items.add(dto);
            }
        } else if ("expired".equalsIgnoreCase(category)) {
            List<PharmacyBatch> batches = pharmacyBatchRepository.findExpiredBatches(tenantId, today);
            for (PharmacyBatch b : batches) {
                Medicine m = b.getMedicine();
                if (m.getIsDeleted()) continue;
                if (!matchesFilter(m, b, q)) continue;

                DashboardDrillDownItemDto dto = buildDrillDownDto(m, b, "Expired on " + b.getExpiryDate(), "expired");
                items.add(dto);
            }
        }
        return items;
    }

    private boolean matchesFilter(Medicine m, PharmacyBatch b, String q) {
        if (q.isEmpty()) return true;
        if (m.getName() != null && m.getName().toLowerCase().contains(q)) return true;
        if (m.getGenericName() != null && m.getGenericName().toLowerCase().contains(q)) return true;
        if (m.getMedicineCode() != null && m.getMedicineCode().toLowerCase().contains(q)) return true;
        if (m.getRackLocation() != null && m.getRackLocation().toLowerCase().contains(q)) return true;
        if (b != null && b.getBatchNumber() != null && b.getBatchNumber().toLowerCase().contains(q)) return true;
        return false;
    }

    private DashboardDrillDownItemDto buildDrillDownDto(Medicine m, PharmacyBatch b, String status, String category) {
        DashboardDrillDownItemDto dto = new DashboardDrillDownItemDto();
        dto.setBatchId(b.getId());
        dto.setMedicineId(m.getId());
        dto.setMedicineCode(m.getMedicineCode());
        dto.setName(m.getName());
        dto.setGenericName(m.getGenericName());
        dto.setStrength(m.getDosageStrength());
        dto.setManufacturer(m.getManufacturer());
        dto.setPlacement(m.getRackLocation());
        dto.setCategory(m.getCategory());
        dto.setBatchNumber(b.getBatchNumber());
        dto.setExpiryDate(b.getExpiryDate());
        dto.setCurrentQuantity(b.getQuantity());
        dto.setReorderLevel(m.getReorderLevel());
        dto.setUnitPrice(m.getUnitPrice());
        dto.setStatusText(status);
        dto.setAlertCategory(category);
        return dto;
    }

    // ====================================================================
    // 2. MEDICINE MASTER MANAGEMENT
    // ====================================================================
    @Transactional
    public List<MedicineDto> searchMedicines(Long tenantId, String query) {
        ensureBatchesForTenant(tenantId);
        List<Medicine> list;
        if (query == null || query.trim().isEmpty()) {
            list = medicineRepository.findByTenantIdAndIsDeletedFalseOrderByNameAsc(tenantId);
        } else {
            list = medicineRepository.searchMedicines(tenantId, query.trim());
        }

        return list.stream().map(m -> {
            MedicineDto dto = MedicineDto.fromEntity(m);
            List<PharmacyBatch> batches = pharmacyBatchRepository.findByTenantIdAndMedicineIdAndIsDeletedFalseOrderByExpiryDateAsc(tenantId, m.getId());
            dto.setBatches(batches.stream().map(PharmacyBatchDto::fromEntity).collect(Collectors.toList()));
            dto.setBatchesCount(batches.size());
            return dto;
        }).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MedicineDto> searchByPlacement(Long tenantId, String location) {
        List<Medicine> list = medicineRepository.findByRackLocationContaining(tenantId, location != null ? location.trim() : "");
        return list.stream().map(MedicineDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public MedicineDto getMedicineById(Long tenantId, Long id) {
        Medicine m = medicineRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medicine not found"));
        MedicineDto dto = MedicineDto.fromEntity(m);
        List<PharmacyBatch> batches = pharmacyBatchRepository.findByTenantIdAndMedicineIdAndIsDeletedFalseOrderByExpiryDateAsc(tenantId, m.getId());
        dto.setBatches(batches.stream().map(PharmacyBatchDto::fromEntity).collect(Collectors.toList()));
        dto.setBatchesCount(batches.size());
        return dto;
    }

    @Transactional
    public MedicineDto createMedicine(Long tenantId, CreateMedicineRequest req,
                                      Long userId, String userEmail, String ipAddr) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found."));

        String name = req.getName().trim();
        String strength = req.getDosageStrength() != null ? req.getDosageStrength().trim() : "";
        String manufacturer = req.getManufacturer() != null ? req.getManufacturer().trim() : "";

        // Uniqueness tuple: (name, strength, manufacturer)
        Optional<Medicine> duplicateOpt = medicineRepository
                .findFirstByTenantIdAndNameIgnoreCaseAndDosageStrengthIgnoreCaseAndManufacturerIgnoreCase(tenantId, name, strength, manufacturer);

        Medicine m;
        if (duplicateOpt.isPresent()) {
            Medicine dup = duplicateOpt.get();
            if (dup.getIsDeleted()) {
                // Restore soft-deleted medicine
                m = dup;
                m.setIsDeleted(false);
                m.setStatus("ACTIVE");
            } else {
                throw new ResponseStatusException(HttpStatus.CONFLICT,
                        "A medicine with name '" + name + "', strength '" + strength + "', and manufacturer '" + manufacturer + "' already exists.");
            }
        } else {
            m = new Medicine();
            m.setTenant(tenant);
        }

        String code = req.getMedicineCode() != null && !req.getMedicineCode().trim().isEmpty()
                ? req.getMedicineCode().trim().toUpperCase() : generateMedicineCode(tenantId);
        m.setMedicineCode(code);
        m.setName(name);
        m.setGenericName(req.getGenericName() != null ? req.getGenericName().trim() : "");
        m.setCategory(req.getCategory() != null ? req.getCategory().trim() : "Tablet");
        m.setMedicineForm(req.getMedicineForm() != null ? req.getMedicineForm().trim() : m.getCategory());
        m.setDosageStrength(strength);
        m.setManufacturer(manufacturer);
        m.setSupplier(req.getSupplier() != null ? req.getSupplier().trim() : "");
        m.setSoldAs(req.getSoldAs() != null ? req.getSoldAs().trim() : ("Capsule".equalsIgnoreCase(m.getCategory()) ? "capsule" : "tablet"));
        m.setUnitsPerStrip(req.getUnitsPerStrip() != null ? req.getUnitsPerStrip() : 10);
        m.setPrescriptionRequired(req.getPrescriptionRequired() != null && req.getPrescriptionRequired());
        m.setHsnCode(req.getHsnCode() != null && !req.getHsnCode().trim().isEmpty() ? req.getHsnCode().trim() : "3004");
        m.setUnitPrice(req.getUnitPrice());
        m.setCostPrice(req.getCostPrice() != null ? req.getCostPrice() : BigDecimal.ZERO);
        m.setReorderLevel(req.getReorderLevel() != null ? req.getReorderLevel() : 10);
        m.setGstPercentage(req.getGstPercentage() != null ? req.getGstPercentage() : new BigDecimal("5.00"));
        m.setNotes(req.getNotes() != null ? req.getNotes().trim() : "");
        m.setRackLocation(req.getRackLocation() != null ? req.getRackLocation().trim() : (req.getPlacement() != null ? req.getPlacement().trim() : ""));
        m.setStatus("ACTIVE");
        m.setIsDeleted(false);
        m.setCreatedAt(LocalDateTime.now());
        m.setUpdatedAt(LocalDateTime.now());

        int openingQty = req.getStockQuantity() != null ? req.getStockQuantity() : 0;
        String batchNum = req.getBatchNumber() != null && !req.getBatchNumber().trim().isEmpty() ? req.getBatchNumber().trim() : "BATCH-" + code;
        LocalDate exp = req.getExpiryDate() != null ? req.getExpiryDate() : LocalDate.now().plusMonths(12);

        m.setBatchNumber(batchNum);
        m.setExpiryDate(exp);
        m.setStockQuantity(openingQty);

        m = medicineRepository.save(m);

        PharmacyBatch batch = new PharmacyBatch(
                tenant, m, batchNum, exp, openingQty, m.getCostPrice(), 3
        );
        batch.setMrp(m.getUnitPrice());
        batch.setSupplierName(m.getSupplier());
        pharmacyBatchRepository.save(batch);

        if (openingQty > 0) {
            PharmacyStockMovement sm = new PharmacyStockMovement(
                    tenant, m, batch, batchNum, openingQty, openingQty, "Opening Stock", userEmail
            );
            pharmacyStockMovementRepository.save(sm);
        }

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_MEDICINE_CREATE",
                "Created medicine: " + m.getName() + " (" + m.getMedicineCode() + ") with Batch: " + batchNum + ", Qty: " + openingQty,
                ipAddr, "SUCCESS");

        return getMedicineById(tenantId, m.getId());
    }

    @Transactional
    public MedicineDto updateMedicine(Long tenantId, Long id, CreateMedicineRequest req,
                                      Long userId, String userEmail, String ipAddr) {
        Medicine m = medicineRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medicine not found"));

        m.setName(req.getName().trim());
        if (req.getGenericName() != null) m.setGenericName(req.getGenericName().trim());
        if (req.getCategory() != null) m.setCategory(req.getCategory().trim());
        if (req.getMedicineForm() != null) m.setMedicineForm(req.getMedicineForm().trim());
        if (req.getDosageStrength() != null) m.setDosageStrength(req.getDosageStrength().trim());
        if (req.getManufacturer() != null) m.setManufacturer(req.getManufacturer().trim());
        if (req.getSupplier() != null) m.setSupplier(req.getSupplier().trim());
        if (req.getSoldAs() != null) m.setSoldAs(req.getSoldAs().trim());
        if (req.getUnitsPerStrip() != null) m.setUnitsPerStrip(req.getUnitsPerStrip());
        if (req.getPrescriptionRequired() != null) m.setPrescriptionRequired(req.getPrescriptionRequired());
        if (req.getHsnCode() != null) m.setHsnCode(req.getHsnCode().trim());
        if (req.getUnitPrice() != null) m.setUnitPrice(req.getUnitPrice());
        if (req.getCostPrice() != null) m.setCostPrice(req.getCostPrice());
        if (req.getReorderLevel() != null) m.setReorderLevel(req.getReorderLevel());
        if (req.getGstPercentage() != null) m.setGstPercentage(req.getGstPercentage());
        if (req.getNotes() != null) m.setNotes(req.getNotes().trim());
        if (req.getRackLocation() != null) m.setRackLocation(req.getRackLocation().trim());
        else if (req.getPlacement() != null) m.setRackLocation(req.getPlacement().trim());
        m.setUpdatedAt(LocalDateTime.now());

        m = medicineRepository.save(m);

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_MEDICINE_UPDATE",
                "Updated medicine: " + m.getName() + " (" + m.getMedicineCode() + ")", ipAddr, "SUCCESS");

        return getMedicineById(tenantId, m.getId());
    }

    @Transactional
    public void deleteMedicine(Long tenantId, Long id, Long userId, String userEmail, String ipAddr) {
        Medicine m = medicineRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medicine not found"));

        m.setIsDeleted(true);
        m.setStatus("DISCONTINUED");
        m.setUpdatedAt(LocalDateTime.now());
        medicineRepository.save(m);

        // Mark its batches inactive
        List<PharmacyBatch> batches = pharmacyBatchRepository.findByTenantIdAndMedicineId(tenantId, id);
        for (PharmacyBatch b : batches) {
            b.setIsDeleted(true);
            pharmacyBatchRepository.save(b);
        }

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_MEDICINE_DELETE",
                "Soft deleted medicine: " + m.getName() + " (" + m.getMedicineCode() + ") and archived its batches",
                ipAddr, "SUCCESS");
    }

    // ====================================================================
    // 3. BATCH ENGINE (FEIFO, BATCH-LEVEL QUANTITY & EXPIRY)
    // ====================================================================
    @Transactional(readOnly = true)
    public List<PharmacyBatchDto> getBatchesByMedicine(Long tenantId, Long medicineId) {
        List<PharmacyBatch> batches = pharmacyBatchRepository
                .findByTenantIdAndMedicineIdAndIsDeletedFalseOrderByExpiryDateAsc(tenantId, medicineId);
        return batches.stream().map(PharmacyBatchDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PharmacyBatchDto> searchBatches(Long tenantId, String query) {
        if (query == null || query.trim().isEmpty()) {
            return Collections.emptyList();
        }
        List<PharmacyBatch> batches = pharmacyBatchRepository
                .findByTenantIdAndBatchNumberContainingIgnoreCaseAndIsDeletedFalse(tenantId, query.trim());
        return batches.stream().map(PharmacyBatchDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public PharmacyBatchDto addBatch(Long tenantId, Long medicineId, CreateBatchRequest req,
                                     Long userId, String userEmail, String ipAddr) {
        Medicine m = medicineRepository.findByTenantIdAndId(tenantId, medicineId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medicine not found"));

        String batchNumber = req.getBatchNumber().trim();
        Optional<PharmacyBatch> existing = pharmacyBatchRepository
                .findFirstByTenantIdAndMedicineIdAndBatchNumber(tenantId, medicineId, batchNumber);
        if (existing.isPresent() && !existing.get().getIsDeleted()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Batch number '" + batchNumber + "' already exists for " + m.getName() + ". Please update the existing batch instead.");
        }

        if (req.getExpiryDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Expiry date is required.");
        }
        if (req.getExpiryDate().isBefore(LocalDate.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot add already expired batch (" + req.getExpiryDate() + ").");
        }

        int qty = req.getQuantity() != null && req.getQuantity() >= 0 ? req.getQuantity() : 0;
        BigDecimal cost = req.getCostPerUnit() != null ? req.getCostPerUnit() : m.getCostPrice();

        PharmacyBatch batch = new PharmacyBatch(
                m.getTenant(), m, batchNumber, req.getExpiryDate(), qty, cost,
                req.getReminderPeriodMonths() != null ? req.getReminderPeriodMonths() : 3
        );
        batch.setManufacturingDate(req.getManufacturingDate());
        batch.setMrp(req.getMrp() != null ? req.getMrp() : m.getUnitPrice());
        batch.setSupplierName(req.getSupplierName() != null ? req.getSupplierName().trim() : m.getSupplier());
        batch = pharmacyBatchRepository.save(batch);

        // Sync parent medicine total stock
        syncMedicineStock(tenantId, m);

        if (qty > 0) {
            PharmacyStockMovement sm = new PharmacyStockMovement(
                    m.getTenant(), m, batch, batchNumber, qty, m.getStockQuantity(),
                    "Manual Batch Creation", userEmail
            );
            pharmacyStockMovementRepository.save(sm);
        }

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_BATCH_CREATE",
                "Added batch " + batchNumber + " for " + m.getName() + ", Qty: " + qty + ", Exp: " + batch.getExpiryDate(),
                ipAddr, "SUCCESS");

        return PharmacyBatchDto.fromEntity(batch);
    }

    @Transactional
    public PharmacyBatchDto updateBatch(Long tenantId, Long batchId, CreateBatchRequest req,
                                        Long userId, String userEmail, String ipAddr) {
        PharmacyBatch b = pharmacyBatchRepository.findByTenantIdAndId(tenantId, batchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));

        Medicine m = b.getMedicine();
        int oldQty = b.getQuantity();

        if (req.getBatchNumber() != null && !req.getBatchNumber().trim().isEmpty()) {
            b.setBatchNumber(req.getBatchNumber().trim());
        }
        if (req.getExpiryDate() != null) {
            b.setExpiryDate(req.getExpiryDate());
        }
        if (req.getManufacturingDate() != null) {
            b.setManufacturingDate(req.getManufacturingDate());
        }
        if (req.getReminderPeriodMonths() != null) {
            b.setReminderPeriodMonths(req.getReminderPeriodMonths());
        }
        if (req.getQuantity() != null && req.getQuantity() >= 0) {
            b.setQuantity(req.getQuantity());
        }
        if (req.getCostPerUnit() != null) {
            b.setCostPerUnit(req.getCostPerUnit());
        }
        if (req.getMrp() != null) {
            b.setMrp(req.getMrp());
        }
        if (req.getSupplierName() != null) {
            b.setSupplierName(req.getSupplierName().trim());
        }
        b.calculateReminderDate();
        b = pharmacyBatchRepository.save(b);

        syncMedicineStock(tenantId, m);

        int delta = b.getQuantity() - oldQty;
        if (delta != 0) {
            PharmacyStockMovement sm = new PharmacyStockMovement(
                    m.getTenant(), m, b, b.getBatchNumber(), delta, m.getStockQuantity(),
                    "Batch Adjustment (Manual Edit)", userEmail
            );
            pharmacyStockMovementRepository.save(sm);
        }

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_BATCH_UPDATE",
                "Updated batch " + b.getBatchNumber() + " for " + m.getName() + ", New Qty: " + b.getQuantity(),
                ipAddr, "SUCCESS");

        return PharmacyBatchDto.fromEntity(b);
    }

    @Transactional
    public void deleteBatch(Long tenantId, Long batchId, String context,
                            Long userId, String userEmail, String ipAddr) {
        PharmacyBatch b = pharmacyBatchRepository.findByTenantIdAndId(tenantId, batchId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Batch not found"));

        Medicine m = b.getMedicine();
        int delQty = b.getQuantity();

        b.setIsDeleted(true);
        b.setQuantity(0);
        pharmacyBatchRepository.save(b);

        syncMedicineStock(tenantId, m);

        String reason = "Deleted Batch" + (context != null && !context.isEmpty() ? " (" + context + ")" : "");
        PharmacyStockMovement sm = new PharmacyStockMovement(
                m.getTenant(), m, b, b.getBatchNumber(), -delQty, m.getStockQuantity(), reason, userEmail
        );
        pharmacyStockMovementRepository.save(sm);

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_BATCH_DELETE",
                "Archived batch " + b.getBatchNumber() + " of " + m.getName() + " [Context: " + context + "]",
                ipAddr, "SUCCESS");
    }

    @Transactional
    public int deleteEmptyBatches(Long tenantId, Long medicineId,
                                  Long userId, String userEmail, String ipAddr) {
        List<PharmacyBatch> batches = pharmacyBatchRepository
                .findByTenantIdAndMedicineIdAndIsDeletedFalseOrderByExpiryDateAsc(tenantId, medicineId);

        int count = 0;
        for (PharmacyBatch b : batches) {
            if (b.getQuantity() <= 0) {
                b.setIsDeleted(true);
                pharmacyBatchRepository.save(b);
                count++;
            }
        }

        Medicine m = medicineRepository.findByTenantIdAndId(tenantId, medicineId).orElse(null);
        if (m != null) {
            syncMedicineStock(tenantId, m);
            auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_PURGE_EMPTY_BATCHES",
                    "Purged " + count + " empty batches for " + m.getName(), ipAddr, "SUCCESS");
        }
        return count;
    }

    private void syncMedicineStock(Long tenantId, Medicine m) {
        Integer sum = pharmacyBatchRepository.sumQuantityByMedicineId(tenantId, m.getId());
        m.setStockQuantity(sum != null ? sum : 0);
        medicineRepository.save(m);
    }

    // ====================================================================
    // 4. STOCK PROCUREMENT / RECEIPT
    // ====================================================================
    @Transactional
    public PharmacyBatchDto addStockReceipt(Long tenantId, StockReceiptRequest req,
                                            Long userId, String userEmail, String ipAddr) {
        Medicine m = medicineRepository.findByTenantIdAndId(tenantId, req.getMedicineId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Medicine not found"));

        int basicUnits = req.getQuantity();
        if ("strip".equalsIgnoreCase(req.getUnit())) {
            int unitsPerStrip = m.getUnitsPerStrip() != null ? m.getUnitsPerStrip() : 10;
            basicUnits = req.getQuantity() * unitsPerStrip;
        }

        PharmacyBatch batch;
        boolean isNew = false;

        if (req.getBatchId() != null) {
            // Existing batch replenishment
            batch = pharmacyBatchRepository.findByTenantIdAndId(tenantId, req.getBatchId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Specified batch not found"));
            batch.setQuantity(batch.getQuantity() + basicUnits);
            if (req.getCostPerUnit() != null) batch.setCostPerUnit(req.getCostPerUnit());
            if (req.getExpiryDate() != null) batch.setExpiryDate(req.getExpiryDate());
        } else if (req.getBatchNumber() != null && !req.getBatchNumber().trim().isEmpty()) {
            String bNum = req.getBatchNumber().trim();
            Optional<PharmacyBatch> existing = pharmacyBatchRepository
                    .findFirstByTenantIdAndMedicineIdAndBatchNumber(tenantId, m.getId(), bNum);
            if (existing.isPresent() && !existing.get().getIsDeleted()) {
                batch = existing.get();
                batch.setQuantity(batch.getQuantity() + basicUnits);
                if (req.getCostPerUnit() != null) batch.setCostPerUnit(req.getCostPerUnit());
                if (req.getExpiryDate() != null) batch.setExpiryDate(req.getExpiryDate());
            } else {
                isNew = true;
                LocalDate exp = req.getExpiryDate() != null ? req.getExpiryDate() : LocalDate.now().plusMonths(12);
                batch = new PharmacyBatch(
                        m.getTenant(), m, bNum, exp, basicUnits,
                        req.getCostPerUnit() != null ? req.getCostPerUnit() : m.getCostPrice(),
                        req.getReminderPeriodMonths() != null ? req.getReminderPeriodMonths() : 3
                );
                batch.setMrp(m.getUnitPrice());
                batch.setSupplierName(req.getSupplierName() != null ? req.getSupplierName().trim() : m.getSupplier());
            }
        } else {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Either batchId or batchNumber is required for stock receipt.");
        }

        batch.calculateReminderDate();
        batch = pharmacyBatchRepository.save(batch);

        syncMedicineStock(tenantId, m);

        String supplierInfo = req.getSupplierName() != null ? " from " + req.getSupplierName() : "";
        PharmacyStockMovement sm = new PharmacyStockMovement(
                m.getTenant(), m, batch, batch.getBatchNumber(), basicUnits, m.getStockQuantity(),
                "Purchase Receipt" + supplierInfo, userEmail
        );
        pharmacyStockMovementRepository.save(sm);

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_STOCK_RECEIPT",
                "Received " + basicUnits + " units into batch " + batch.getBatchNumber() + " for " + m.getName(),
                ipAddr, "SUCCESS");

        return PharmacyBatchDto.fromEntity(batch);
    }

    @Transactional(readOnly = true)
    public List<PharmacyStockMovementDto> getStockMovements(Long tenantId, Long medicineId, Integer limit) {
        int max = limit != null && limit > 0 ? limit : 50;
        List<PharmacyStockMovement> list;
        if (medicineId != null) {
            list = pharmacyStockMovementRepository.findByTenantIdAndMedicineIdOrderByCreatedAtDesc(tenantId, medicineId);
        } else {
            list = pharmacyStockMovementRepository.findByTenantIdOrderByCreatedAtDesc(tenantId, PageRequest.of(0, max));
        }
        return list.stream().map(PharmacyStockMovementDto::fromEntity).collect(Collectors.toList());
    }

    // ====================================================================
    // 5. SUPPLIERS DIRECTORY
    // ====================================================================
    @Transactional(readOnly = true)
    public List<PharmacySupplierDto> getAllSuppliers(Long tenantId, String search) {
        List<PharmacySupplier> suppliers;
        if (search == null || search.trim().isEmpty()) {
            suppliers = pharmacySupplierRepository.findByTenantIdOrderByNameAsc(tenantId);
        } else {
            suppliers = pharmacySupplierRepository.searchSuppliers(tenantId, search.trim());
        }
        return suppliers.stream().map(PharmacySupplierDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public PharmacySupplierDto createSupplier(Long tenantId, CreateSupplierRequest req,
                                              Long userId, String userEmail, String ipAddr) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found."));

        PharmacySupplier s = new PharmacySupplier(
                tenant, req.getName().trim(), req.getAgencyName(), req.getContactNumber(),
                req.getEmail(), req.getAddress(), req.getGstNumber()
        );
        s = pharmacySupplierRepository.save(s);

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_SUPPLIER_CREATE",
                "Created supplier: " + s.getName() + " (" + (s.getAgencyName() != null ? s.getAgencyName() : "") + ")",
                ipAddr, "SUCCESS");

        return PharmacySupplierDto.fromEntity(s);
    }

    @Transactional
    public PharmacySupplierDto updateSupplier(Long tenantId, Long id, CreateSupplierRequest req,
                                              Long userId, String userEmail, String ipAddr) {
        PharmacySupplier s = pharmacySupplierRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found."));

        s.setName(req.getName().trim());
        s.setAgencyName(req.getAgencyName());
        s.setContactNumber(req.getContactNumber());
        s.setEmail(req.getEmail());
        s.setAddress(req.getAddress());
        s.setGstNumber(req.getGstNumber());
        s = pharmacySupplierRepository.save(s);

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_SUPPLIER_UPDATE",
                "Updated supplier: " + s.getName(), ipAddr, "SUCCESS");

        return PharmacySupplierDto.fromEntity(s);
    }

    @Transactional
    public void deleteSupplier(Long tenantId, Long id, Long userId, String userEmail, String ipAddr) {
        PharmacySupplier s = pharmacySupplierRepository.findByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Supplier not found."));

        pharmacySupplierRepository.delete(s);
        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_SUPPLIER_DELETE",
                "Deleted supplier: " + s.getName(), ipAddr, "SUCCESS");
    }

    @Transactional(readOnly = true)
    public List<String> getDistinctSuppliers(Long tenantId) {
        List<String> list = medicineRepository.findDistinctSuppliers(tenantId);
        List<PharmacySupplier> custom = pharmacySupplierRepository.findByTenantIdOrderByNameAsc(tenantId);
        Set<String> set = new LinkedHashSet<>(list);
        for (PharmacySupplier s : custom) {
            set.add(s.getName());
            if (s.getAgencyName() != null && !s.getAgencyName().isEmpty()) {
                set.add(s.getAgencyName());
            }
        }
        return new ArrayList<>(set);
    }

    // ====================================================================
    // 6. PATIENT & DOCTOR INTEGRATION FOR PHARMACY
    // ====================================================================
    @Transactional(readOnly = true)
    public List<PharmacyPatientSearchDto> searchPatientsForPharmacy(Long tenantId, String query) {
        if (query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }
        String q = query.trim();

        List<Patient> patients = patientRepository.searchPatients(tenantId, q);
        Map<String, PharmacyPatientSearchDto> resultMap = new LinkedHashMap<>();

        for (Patient p : patients) {
            PharmacyPatientSearchDto dto = new PharmacyPatientSearchDto(
                    p.getId(), p.getFullName(), p.getUhid(), p.getPhone(),
                    p.getAge(), p.getGender(), p.getAddress(), p.getEmail(),
                    null, null, null, null
            );
            resultMap.put(p.getUhid(), dto);
        }

        List<OpRegistration> ops = opRegistrationRepository.searchOpRegistrations(tenantId, q);
        for (OpRegistration op : ops) {
            if (op.getPatient() != null) {
                String uhid = op.getPatient().getUhid();
                PharmacyPatientSearchDto dto = resultMap.get(uhid);
                if (dto == null) {
                    dto = new PharmacyPatientSearchDto(
                            op.getPatient().getId(), op.getPatient().getFullName(),
                            op.getPatient().getUhid(), op.getPatient().getPhone(),
                            op.getPatient().getAge(), op.getPatient().getGender(),
                            op.getPatient().getAddress(), op.getPatient().getEmail(),
                            op.getOpId(), null, op.getDoctorName(), op.getDepartment()
                    );
                    resultMap.put(uhid, dto);
                } else {
                    if (dto.getLastOpId() == null) dto.setLastOpId(op.getOpId());
                    if (dto.getDoctorName() == null) dto.setDoctorName(op.getDoctorName());
                    if (dto.getDepartment() == null) dto.setDepartment(op.getDepartment());
                }
            }
        }

        return new ArrayList<>(resultMap.values());
    }

    @Transactional(readOnly = true)
    public List<PharmacyBillDto> getPatientPurchaseHistory(Long tenantId, String query) {
        if (query == null || query.trim().isEmpty()) return Collections.emptyList();
        List<PharmacyBill> bills = pharmacyBillRepository.searchBills(tenantId, query.trim());
        return bills.stream().limit(5).map(PharmacyBillDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<com.carevista.hms.doctor.dto.DoctorDto> getDoctors(Long tenantId) {
        return doctorRepository.findByTenantIdAndStatus(tenantId, "AVAILABLE")
                .stream().map(com.carevista.hms.doctor.dto.DoctorDto::fromEntity).collect(Collectors.toList());
    }

    // ====================================================================
    // 7. SALES POS DISPENSING ENGINE & BILL GENERATION
    // ====================================================================
    @Transactional
    public PharmacyBillDto generateBill(Long tenantId, CreatePharmacyBillRequest req,
                                        Long userId, String userEmail, String ipAddr) {

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tenant not found."));

        // Validate patient demographic input strictly
        String validName = com.carevista.hms.common.util.PatientValidationUtil.validatePatientName(req.getPatientName(), true);
        String validPhone = com.carevista.hms.common.util.PatientValidationUtil.validatePatientPhone(req.getPhone(), false);

        if (req.getItems() == null || req.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one medicine is required to generate a bill.");
        }

        // 1. Resolve Patient
        Patient patient = null;
        if (req.getUhid() != null && !req.getUhid().trim().isEmpty()) {
            patient = patientRepository.findByTenantIdAndUhid(tenantId, req.getUhid().trim()).orElse(null);
        }
        if (patient == null && validPhone != null && !validPhone.isEmpty()) {
            patient = patientRepository.findFirstByTenantIdAndPhone(tenantId, validPhone).orElse(null);
        }
        if (patient == null) {
            String uhid = generateUniqueUhid(tenantId);
            patient = new Patient(
                    tenant, uhid, validName,
                    validPhone != null && !validPhone.isEmpty() ? validPhone : "N/A",
                    30, "Not Specified", "Outpatient Pharmacy Client"
            );
            patient = patientRepository.save(patient);
        }

        String billNumber = generateBillNumber(tenantId);

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
        bill.setGstNumber(req.getGstNumber() != null ? req.getGstNumber().trim() : "29ABCDE1234F1Z5");
        bill.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod() : "CASH");
        bill.setBillDate(LocalDate.now());
        bill.setBillTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("hh:mm a")));
        bill.setNotes(req.getNotes());
        bill.setCreatedAt(LocalDateTime.now());

        // 2. Process Items with Granular Batch Stock Deduction
        BigDecimal calculatedSubtotal = BigDecimal.ZERO;

        for (PharmacyBillItemRequest itemReq : req.getItems()) {
            Medicine med = null;
            PharmacyBatch batch = null;

            if (itemReq.getMedicineId() != null) {
                med = medicineRepository.findByTenantIdAndId(tenantId, itemReq.getMedicineId()).orElse(null);
            }
            if (med == null && itemReq.getMedicineCode() != null) {
                med = medicineRepository.findFirstByTenantIdAndMedicineCode(tenantId, itemReq.getMedicineCode()).orElse(null);
            }

            int reqQty = itemReq.getQuantity() != null ? itemReq.getQuantity() : 1;
            String unit = itemReq.getUnit() != null ? itemReq.getUnit() : "basic";
            int unitsPerStrip = (med != null && med.getUnitsPerStrip() != null) ? med.getUnitsPerStrip() : 10;
            int basicUnits = "strip".equalsIgnoreCase(unit) ? (reqQty * unitsPerStrip) : reqQty;

            if (med != null) {
                // Resolve Batch:
                if (itemReq.getBatchId() != null) {
                    batch = pharmacyBatchRepository.findByTenantIdAndId(tenantId, itemReq.getBatchId()).orElse(null);
                }
                if (batch == null && itemReq.getBatchNumber() != null) {
                    batch = pharmacyBatchRepository.findFirstByTenantIdAndMedicineIdAndBatchNumber(
                            tenantId, med.getId(), itemReq.getBatchNumber().trim()
                    ).orElse(null);
                }
                if (batch == null) {
                    // FEIFO auto-selection of first non-expired batch with available stock
                    List<PharmacyBatch> activeBatches = pharmacyBatchRepository
                            .findByTenantIdAndMedicineIdAndIsDeletedFalseOrderByExpiryDateAsc(tenantId, med.getId());
                    for (PharmacyBatch ab : activeBatches) {
                        if (!ab.isExpired() && ab.getQuantity() >= basicUnits) {
                            batch = ab;
                            break;
                        }
                    }
                    if (batch == null && !activeBatches.isEmpty()) {
                        batch = activeBatches.get(0);
                    }
                }

                if (batch != null) {
                    // Strict Expiry check
                    if (batch.isExpired()) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Cannot dispense expired batch: " + batch.getBatchNumber() + " for " + med.getName() + " (Expired on " + batch.getExpiryDate() + ").");
                    }

                    // Strict Stock check at batch level
                    if (batch.getQuantity() < basicUnits) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                "Insufficient stock for " + med.getName() + " in batch " + batch.getBatchNumber() +
                                ". Available: " + batch.getQuantity() + " units, Requested: " + basicUnits + " units.");
                    }

                    // Decrement batch stock
                    batch.setQuantity(batch.getQuantity() - basicUnits);
                    pharmacyBatchRepository.save(batch);

                    // Sync parent medicine total stock
                    syncMedicineStock(tenantId, med);

                    // Immutable stock movement ledger
                    PharmacyStockMovement sm = new PharmacyStockMovement(
                            tenant, med, batch, batch.getBatchNumber(), -basicUnits, med.getStockQuantity(),
                            "Sale: " + billNumber + " (" + unit + ": " + reqQty + ")", userEmail
                    );
                    pharmacyStockMovementRepository.save(sm);
                }

                BigDecimal linePrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : med.getUnitPrice();
                BigDecimal lineSubtotal = linePrice.multiply(BigDecimal.valueOf(reqQty));
                calculatedSubtotal = calculatedSubtotal.add(lineSubtotal);

                PharmacyBillItem billItem = new PharmacyBillItem();
                billItem.setBill(bill);
                billItem.setMedicine(med);
                billItem.setBatchId(batch != null ? batch.getId() : null);
                billItem.setMedicineCode(med.getMedicineCode());
                billItem.setMedicineName(itemReq.getMedicineName() != null ? itemReq.getMedicineName() : med.getName());
                billItem.setStrength(med.getDosageStrength());
                billItem.setManufacturer(med.getManufacturer());
                billItem.setBatchNumber(batch != null ? batch.getBatchNumber() : (itemReq.getBatchNumber() != null ? itemReq.getBatchNumber() : med.getBatchNumber()));
                billItem.setExpiryDate(batch != null ? batch.getExpiryDate() : med.getExpiryDate());
                billItem.setUnit(unit);
                billItem.setQuantity(reqQty);
                billItem.setBasicUnitQuantity(basicUnits);
                billItem.setUnitPrice(linePrice);
                billItem.setSubtotal(lineSubtotal);
                billItem.setTotalPrice(lineSubtotal);
                billItem.setGstPercentage(med.getGstPercentage() != null ? med.getGstPercentage() : BigDecimal.ZERO);
                billItem.setHsnCode(med.getHsnCode());
                billItem.setCostPerUnit(batch != null ? batch.getCostPerUnit() : med.getCostPrice());
                billItem.setHasPrescription(med.getPrescriptionRequired());

                bill.addItem(billItem);
            } else {
                // Freeform / ad-hoc item
                BigDecimal linePrice = itemReq.getUnitPrice() != null ? itemReq.getUnitPrice() : BigDecimal.ZERO;
                BigDecimal lineSubtotal = linePrice.multiply(BigDecimal.valueOf(reqQty));
                calculatedSubtotal = calculatedSubtotal.add(lineSubtotal);

                PharmacyBillItem billItem = new PharmacyBillItem();
                billItem.setBill(bill);
                billItem.setMedicine(null);
                billItem.setMedicineCode(itemReq.getMedicineCode() != null ? itemReq.getMedicineCode() : "RX-GEN");
                billItem.setMedicineName(itemReq.getMedicineName() != null ? itemReq.getMedicineName() : "Dispensed Medication");
                billItem.setBatchNumber(itemReq.getBatchNumber() != null ? itemReq.getBatchNumber() : "BATCH-GEN");
                billItem.setExpiryDate(LocalDate.now().plusYears(1));
                billItem.setUnit(unit);
                billItem.setQuantity(reqQty);
                billItem.setBasicUnitQuantity(basicUnits);
                billItem.setUnitPrice(linePrice);
                billItem.setSubtotal(lineSubtotal);
                billItem.setTotalPrice(lineSubtotal);
                bill.addItem(billItem);
            }
        }

        bill.setSubtotal(calculatedSubtotal);

        // 3. Discount Profile & Minimum Threshold Evaluation
        BigDecimal discountPct = req.getDiscountPercentage() != null ? req.getDiscountPercentage() : BigDecimal.ZERO;
        BigDecimal discountAmt = BigDecimal.ZERO;

        // Check if hospital settings define minimum discount threshold
        BigDecimal minThreshold = BigDecimal.ZERO;
        Optional<HospitalSetting> settingOpt = hospitalSettingRepository.findByTenantId(tenantId);
        if (settingOpt.isPresent()) {
            // Can be expanded if setting contains min threshold
        }

        if (calculatedSubtotal.compareTo(minThreshold) >= 0 && discountPct.compareTo(BigDecimal.ZERO) > 0) {
            discountAmt = req.getDiscountAmount() != null && req.getDiscountAmount().compareTo(BigDecimal.ZERO) > 0
                    ? req.getDiscountAmount()
                    : calculatedSubtotal.multiply(discountPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        } else {
            discountPct = BigDecimal.ZERO;
        }

        bill.setDiscountPercentage(discountPct);
        bill.setDiscountAmount(discountAmt);

        BigDecimal netTaxable = calculatedSubtotal.subtract(discountAmt);
        if (netTaxable.compareTo(BigDecimal.ZERO) < 0) netTaxable = BigDecimal.ZERO;

        // 4. Item-level GST & Taxable Calculation
        BigDecimal totalGst = BigDecimal.ZERO;
        for (PharmacyBillItem item : bill.getItems()) {
            BigDecimal itemDisc = item.getSubtotal().multiply(discountPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            item.setDiscountAmount(itemDisc);
            BigDecimal itemTaxable = item.getSubtotal().subtract(itemDisc);
            BigDecimal itemGst = itemTaxable.multiply(item.getGstPercentage() != null ? item.getGstPercentage() : BigDecimal.ZERO)
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            item.setGstAmount(itemGst);
            item.setTotalPrice(itemTaxable.add(itemGst));
            totalGst = totalGst.add(itemGst);
        }

        BigDecimal gstPct = req.getGstPercentage() != null ? req.getGstPercentage() : BigDecimal.ZERO;
        bill.setGstPercentage(gstPct);
        bill.setGstAmount(req.getGstAmount() != null && req.getGstAmount().compareTo(BigDecimal.ZERO) > 0 ? req.getGstAmount() : totalGst);

        BigDecimal grandTotal = netTaxable.add(bill.getGstAmount());
        bill.setTotalAmount(grandTotal);

        BigDecimal paid = req.getPaidAmount() != null ? req.getPaidAmount() : grandTotal;
        bill.setPaidAmount(paid);

        BigDecimal balance = grandTotal.subtract(paid);
        if (balance.compareTo(BigDecimal.ZERO) < 0) balance = BigDecimal.ZERO;
        bill.setBalanceAmount(balance);

        String pStatus = (balance.compareTo(BigDecimal.ZERO) == 0 && grandTotal.compareTo(BigDecimal.ZERO) > 0) ? "PAID" :
                (paid.compareTo(BigDecimal.ZERO) > 0 ? "PARTIALLY PAID" : "UNPAID");
        bill.setPaymentStatus(pStatus);

        bill = pharmacyBillRepository.save(bill);

        // 5. Payment Record & Money Management Integration
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            PaymentRecord paymentRecord = new PaymentRecord(
                    tenant, billNumber, patient, bill.getPatientName(),
                    "PHARMACY", paid, bill.getPaymentMethod(), LocalDate.now()
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

        auditService.log(userId, userEmail, "ADMIN", tenantId, "PHARMACY_SALE",
                "Dispensed pharmacy bill " + billNumber + " for " + bill.getPatientName() +
                        ". Total: ₹" + bill.getTotalAmount() + ", Paid: ₹" + bill.getPaidAmount(),
                ipAddr, "SUCCESS");

        return PharmacyBillDto.fromEntity(bill);
    }

    // ====================================================================
    // 8. SALES HISTORY & INVOICE DETAILS
    // ====================================================================
    @Transactional(readOnly = true)
    public PharmacyBillDto getBillDetails(Long tenantId, Long billId) {
        PharmacyBill bill = pharmacyBillRepository.findByTenantIdAndId(tenantId, billId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Pharmacy bill not found."));
        return PharmacyBillDto.fromEntity(bill);
    }

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
    // 9. HELPERS
    // ====================================================================
    public synchronized String getNextMedicineCode(Long tenantId) {
        return generateMedicineCode(tenantId);
    }

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
