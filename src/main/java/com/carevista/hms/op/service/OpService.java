package com.carevista.hms.op.service;

import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.doctor.dto.DoctorDto;
import com.carevista.hms.doctor.entity.Doctor;
import com.carevista.hms.doctor.repository.DoctorRepository;
import com.carevista.hms.op.dto.*;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.patient.repository.PatientRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class OpService {

    private static final Logger log = LoggerFactory.getLogger(OpService.class);

    private final OpRegistrationRepository opRegistrationRepository;
    private final PatientRepository patientRepository;
    private final DoctorRepository doctorRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRecordRepository paymentRecordRepository;

    public OpService(OpRegistrationRepository opRegistrationRepository,
                     PatientRepository patientRepository,
                     DoctorRepository doctorRepository,
                     TenantRepository tenantRepository,
                     PaymentRecordRepository paymentRecordRepository) {
        this.opRegistrationRepository = opRegistrationRepository;
        this.patientRepository = patientRepository;
        this.doctorRepository = doctorRepository;
        this.tenantRepository = tenantRepository;
        this.paymentRecordRepository = paymentRecordRepository;
    }

    @Transactional
    public OpRegistrationDto registerOp(CreateOpRegistrationRequest request, Long tenantId) {
        if (tenantId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Hospital/Tenant ID is required");
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital not found"));

        // 1. Check Monthly OP Limit
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        long currentMonthUsage = opRegistrationRepository.countByTenantIdAndVisitDateBetween(tenantId, startOfMonth, endOfMonth);

        if (tenant.getOpLimit() > 0 && currentMonthUsage >= tenant.getOpLimit()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Monthly OP limit reached (" + currentMonthUsage + " / " + tenant.getOpLimit() +
                    " patients). Cannot register new Outpatient until the limit is updated by Super Admin.");
        }

        // 2. Doctor Availability Validation (Strictly AVAILABLE only)
        if (request.getDoctorName() == null || request.getDoctorName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a doctor.");
        }

        Doctor doctor = doctorRepository.findFirstByTenantIdAndNameIgnoreCase(tenantId, request.getDoctorName().trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Selected doctor '" + request.getDoctorName() + "' was not found for this hospital."));

        if (!"AVAILABLE".equalsIgnoreCase(doctor.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Selected doctor '" + doctor.getName() + "' is currently unavailable (Status: " +
                    doctor.getStatus().replace('_', ' ') + "). Only AVAILABLE doctors can be assigned for new OP registration.");
        }

        // 3. Patient Identification & Duplicate Handling
        Patient patient = null;
        if (request.getExistingUhid() != null && !request.getExistingUhid().trim().isEmpty()) {
            patient = patientRepository.findByTenantIdAndUhid(tenantId, request.getExistingUhid().trim())
                    .orElse(null);
        }

        // Check if phone matches existing patient in this hospital
        if (patient == null && request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            List<Patient> byPhone = patientRepository.findByTenantIdAndPhone(tenantId, request.getPhone().trim());
            if (!byPhone.isEmpty()) {
                // If patient with matching phone found, use the first matching patient
                patient = byPhone.get(0);
            }
        }

        if (patient == null) {
            // Create new patient record with generated UHID
            String uhid = generateUniqueUhid(tenantId);
            patient = new Patient();
            patient.setTenant(tenant);
            patient.setUhid(uhid);
            patient.setFullName(request.getPatientName().trim());
            patient.setPhone(request.getPhone().trim());
            patient.setAge(request.getAge());
            patient.setGender(request.getGender().trim());
            patient.setEmail(request.getEmail() != null ? request.getEmail().trim() : null);
            patient.setAddress(request.getAddress() != null ? request.getAddress().trim() : null);
            patient = patientRepository.save(patient);
            log.info("Created new patient record with UHID: {} for hospital: {}", uhid, tenant.getHospitalName());
        } else {
            // Update existing patient's details if modified
            if (request.getEmail() != null && !request.getEmail().trim().isEmpty()) {
                patient.setEmail(request.getEmail().trim());
            }
            if (request.getAddress() != null && !request.getAddress().trim().isEmpty()) {
                patient.setAddress(request.getAddress().trim());
            }
            if (request.getAge() != null) {
                patient.setAge(request.getAge());
            }
            patient = patientRepository.save(patient);
        }

        // 4. Generate Unique OP ID (e.g. OP-20260929-0001)
        String opId = generateUniqueOpId(tenantId);

        // 5. Automatic Date & Time
        LocalDate visitDate = LocalDate.now();
        String regTime = LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"));

        BigDecimal fee = request.getConsultationFee() != null ? request.getConsultationFee() : doctor.getConsultationFee();
        if (fee == null) fee = BigDecimal.ZERO;
        String payMethod = (request.getPaymentMethod() != null && !request.getPaymentMethod().trim().isEmpty())
                ? request.getPaymentMethod().trim().toUpperCase() : "CASH";

        String status = (request.getPaymentStatus() != null && !request.getPaymentStatus().trim().isEmpty())
                ? request.getPaymentStatus().trim().toUpperCase() : "PAID";
        BigDecimal paid = request.getPaidAmount() != null ? request.getPaidAmount() :
                ("PAID".equalsIgnoreCase(status) ? fee : BigDecimal.ZERO);
        BigDecimal bal = fee.subtract(paid).max(BigDecimal.ZERO);

        // 6. Save OP Registration
        OpRegistration op = new OpRegistration(
                tenant,
                opId,
                patient,
                doctor.getName(),
                doctor.getDepartment(),
                fee,
                visitDate,
                regTime,
                payMethod,
                status
        );
        op.setPaidAmount(paid);
        op.setBalanceAmount(bal);
        OpRegistration savedOp = opRegistrationRepository.save(op);

        // 7. Save Real Payment Record in MySQL if paid > 0
        if (paid.compareTo(BigDecimal.ZERO) > 0) {
            String txId = "PAY-" + today.format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" +
                    String.format("%04d", (int)(Math.random() * 9000) + 1000);
            PaymentRecord paymentRecord = new PaymentRecord(
                    tenant,
                    txId,
                    patient,
                    patient.getFullName(),
                    "OP",
                    paid,
                    payMethod,
                    visitDate
            );
            paymentRecord.setNotes("OP Registration: " + opId + " | Doctor: " + doctor.getName());
            paymentRecordRepository.save(paymentRecord);
        }

        // 8. Update Tenant Monthly OP Current Usage
        tenant.setOpCurrentUsage((int) (currentMonthUsage + 1));
        tenantRepository.save(tenant);

        log.info("Registered OP {} for patient {} with doctor {} (Fee: {})", opId, patient.getFullName(), doctor.getName(), fee);

        return OpRegistrationDto.fromEntity(savedOp);
    }

    @Transactional(readOnly = true)
    public List<DoctorDto> getAvailableDoctors(Long tenantId) {
        if (tenantId == null) return Collections.emptyList();
        return doctorRepository.findByTenantIdAndStatusOrderByDepartmentAscNameAsc(tenantId, "AVAILABLE")
                .stream()
                .map(DoctorDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<DoctorDto> getAllDoctors(Long tenantId) {
        if (tenantId == null) return Collections.emptyList();
        return doctorRepository.findByTenantIdOrderByDepartmentAscNameAsc(tenantId)
                .stream()
                .map(DoctorDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<PatientSearchDto> searchPatients(Long tenantId, String query) {
        if (tenantId == null || query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }
        String cleanQuery = query.trim();
        Map<Long, PatientSearchDto> resultMap = new LinkedHashMap<>();

        // If query looks like an OP ID, check OP records
        if (cleanQuery.toUpperCase().startsWith("OP")) {
            List<Patient> opPatients = opRegistrationRepository.findPatientsByOpId(tenantId, cleanQuery);
            for (Patient p : opPatients) {
                if (p != null && !resultMap.containsKey(p.getId())) {
                    PatientSearchDto dto = PatientSearchDto.fromEntity(p);
                    dto.setLastOpId(cleanQuery.toUpperCase());
                    resultMap.put(p.getId(), dto);
                }
            }
        }

        // Search by name, UHID, or phone
        List<Patient> patients = patientRepository.searchPatients(tenantId, cleanQuery);
        for (Patient p : patients) {
            if (!resultMap.containsKey(p.getId())) {
                PatientSearchDto dto = PatientSearchDto.fromEntity(p);
                // Look up recent OP ID if any
                List<OpRegistration> recentOps = opRegistrationRepository.findByTenantIdAndPatientUhidOrderByCreatedAtDesc(tenantId, p.getUhid());
                if (!recentOps.isEmpty()) {
                    dto.setLastOpId(recentOps.get(0).getOpId());
                }
                resultMap.put(p.getId(), dto);
            }
        }

        return new ArrayList<>(resultMap.values());
    }

    @Transactional(readOnly = true)
    public List<OpRegistrationDto> getOpHistory(Long tenantId, String search) {
        if (tenantId == null) return Collections.emptyList();
        String q = (search != null) ? search.trim() : "";
        List<OpRegistration> ops = opRegistrationRepository.searchOpRegistrations(tenantId, q);
        return ops.stream().map(OpRegistrationDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OpRegistrationDto getOpDetails(Long tenantId, Long id) {
        OpRegistration op = opRegistrationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OP Registration record not found"));
        return OpRegistrationDto.fromEntity(op);
    }

    @Transactional(readOnly = true)
    public OpReceiptDto getOpReceipt(Long tenantId, Long id) {
        OpRegistration op = opRegistrationRepository.findByIdAndTenantId(id, tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "OP Registration record not found"));

        // Find doctor room number
        String roomNumber = "OPD Consultation Room";
        Optional<Doctor> docOpt = doctorRepository.findFirstByTenantIdAndNameIgnoreCase(tenantId, op.getDoctorName());
        if (docOpt.isPresent() && docOpt.get().getRoomNumber() != null) {
            roomNumber = docOpt.get().getRoomNumber();
        }

        String receiptNum = "REC-" + op.getOpId();
        return OpReceiptDto.fromOpRegistration(op, roomNumber, receiptNum);
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getMonthlyOpUsage(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital not found"));
        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        long currentUsage = opRegistrationRepository.countByTenantIdAndVisitDateBetween(tenantId, startOfMonth, endOfMonth);
        int limit = tenant.getOpLimit();
        long remaining = Math.max(0, limit - currentUsage);
        double percentUsed = limit > 0 ? Math.min(100.0, ((double) currentUsage / limit) * 100.0) : 0.0;

        Map<String, Object> res = new HashMap<>();
        res.put("tenantId", tenantId);
        res.put("hospitalName", tenant.getHospitalName());
        res.put("currentUsage", currentUsage);
        res.put("monthlyLimit", limit);
        res.put("remaining", remaining);
        res.put("isLimitReached", limit > 0 && currentUsage >= limit);
        res.put("isLimitExceeded", limit > 0 && currentUsage > limit);
        res.put("currentMonth", today.getMonth().getDisplayName(java.time.format.TextStyle.FULL, java.util.Locale.ENGLISH) + " " + today.getYear());
        res.put("percentageUsed", Math.round(percentUsed * 10.0) / 10.0);
        return res;
    }

    private synchronized String generateUniqueOpId(Long tenantId) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "OP-" + dateStr + "-";
        long todayCount = opRegistrationRepository.countByTenantIdAndVisitDate(tenantId, LocalDate.now());
        int seq = (int) todayCount + 1;
        String candidate = prefix + String.format("%04d", seq);

        while (opRegistrationRepository.existsByOpId(candidate)) {
            seq++;
            candidate = prefix + String.format("%04d", seq);
        }
        return candidate;
    }

    private synchronized String generateUniqueUhid(Long tenantId) {
        long count = patientRepository.countByTenantId(tenantId);
        int seq = (int) count + 1001;
        String candidate = "UHID-" + seq;
        while (patientRepository.findByTenantIdAndUhid(tenantId, candidate).isPresent()) {
            seq++;
            candidate = "UHID-" + seq;
        }
        return candidate;
    }
}
