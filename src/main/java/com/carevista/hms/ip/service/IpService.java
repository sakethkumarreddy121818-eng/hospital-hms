package com.carevista.hms.ip.service;

import com.carevista.hms.audit.entity.AuditLog;
import com.carevista.hms.audit.repository.AuditLogRepository;
import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.ip.dto.*;
import com.carevista.hms.ip.entity.Bed;
import com.carevista.hms.ip.entity.IpAdmission;
import com.carevista.hms.ip.entity.Room;
import com.carevista.hms.ip.repository.BedRepository;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.ip.repository.RoomRepository;
import com.carevista.hms.op.dto.PatientSearchDto;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class IpService {

    private final IpAdmissionRepository ipAdmissionRepository;
    private final RoomRepository roomRepository;
    private final BedRepository bedRepository;
    private final PatientRepository patientRepository;
    private final OpRegistrationRepository opRegistrationRepository;
    private final TenantRepository tenantRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final AuditLogRepository auditLogRepository;
    private final com.carevista.hms.doctor.repository.DoctorRepository doctorRepository;

    public IpService(IpAdmissionRepository ipAdmissionRepository,
                     RoomRepository roomRepository,
                     BedRepository bedRepository,
                     PatientRepository patientRepository,
                     OpRegistrationRepository opRegistrationRepository,
                     TenantRepository tenantRepository,
                     PaymentRecordRepository paymentRecordRepository,
                     AuditLogRepository auditLogRepository,
                     com.carevista.hms.doctor.repository.DoctorRepository doctorRepository) {
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.roomRepository = roomRepository;
        this.bedRepository = bedRepository;
        this.patientRepository = patientRepository;
        this.opRegistrationRepository = opRegistrationRepository;
        this.tenantRepository = tenantRepository;
        this.paymentRecordRepository = paymentRecordRepository;
        this.auditLogRepository = auditLogRepository;
        this.doctorRepository = doctorRepository;
    }

    // =========================================================================
    // 1. SUMMARY & OVERVIEW
    // =========================================================================
    @Transactional(readOnly = true)
    public RoomBedSummaryDto getRoomBedSummary(Long tenantId) {
        if (tenantId == null) return new RoomBedSummaryDto();

        long totalRooms = roomRepository.countByTenantId(tenantId);
        long totalBeds = bedRepository.countByTenantId(tenantId);
        long occupiedBeds = bedRepository.countByTenantIdAndStatusIgnoreCase(tenantId, "OCCUPIED");
        long availableBeds = bedRepository.countByTenantIdAndStatusIgnoreCase(tenantId, "AVAILABLE");
        long reservedBeds = bedRepository.countByTenantIdAndStatusIgnoreCase(tenantId, "RESERVED");
        long maintenanceBeds = bedRepository.countByTenantIdAndStatusIgnoreCase(tenantId, "MAINTENANCE");

        return new RoomBedSummaryDto(totalRooms, totalBeds, occupiedBeds, availableBeds, reservedBeds, maintenanceBeds);
    }

    // =========================================================================
    // 2. ROOMS & BEDS
    // =========================================================================
    @Transactional(readOnly = true)
    public List<RoomDto> getAllRooms(Long tenantId, String typeFilter, String statusFilter) {
        if (tenantId == null) return Collections.emptyList();

        List<Room> rooms = roomRepository.searchRooms(tenantId, typeFilter, statusFilter);
        List<RoomDto> res = new ArrayList<>();

        for (Room room : rooms) {
            List<Bed> beds = bedRepository.findByTenantIdAndRoomIdOrderByBedNumberAsc(tenantId, room.getId());
            List<BedDto> bedDtos = beds.stream().map(BedDto::fromEntity).collect(Collectors.toList());
            res.add(RoomDto.fromEntity(room, bedDtos));
        }

        return res;
    }

    @Transactional(readOnly = true)
    public List<BedDto> getAvailableBedsForRoom(Long tenantId, Long roomId) {
        if (tenantId == null || roomId == null) return Collections.emptyList();
        List<Bed> beds = bedRepository.findByTenantIdAndRoomIdAndStatusIgnoreCaseOrderByBedNumberAsc(tenantId, roomId, "AVAILABLE");
        return beds.stream().map(BedDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional
    public RoomDto createRoomWithBeds(Long tenantId, CreateRoomRequest req, Long userId, String userEmail, String ipAddress) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital tenant not found"));

        // Check if room number already exists
        if (roomRepository.findFirstByTenantIdAndRoomNumberIgnoreCase(tenantId, req.getRoomNumber().trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Room " + req.getRoomNumber() + " already exists in this hospital.");
        }

        Room room = new Room(
                tenant,
                req.getRoomNumber().trim(),
                req.getRoomType().trim().toUpperCase(),
                req.getFloor(),
                req.getDailyPrice(),
                "ACTIVE",
                req.getNotes()
        );
        room = roomRepository.save(room);

        // Auto-create initial beds
        int numBeds = Math.max(1, req.getNumberOfBeds());
        BigDecimal bedPrice = (req.getBedPrice() != null && req.getBedPrice().compareTo(BigDecimal.ZERO) > 0)
                ? req.getBedPrice()
                : BigDecimal.ZERO;

        List<BedDto> bedDtos = new ArrayList<>();
        char bedLetter = 'A';
        for (int i = 1; i <= numBeds; i++) {
            String bedNum = (numBeds > 1)
                    ? "Bed " + room.getRoomNumber() + "-" + bedLetter
                    : "Bed " + room.getRoomNumber();
            Bed bed = new Bed(tenant, room, bedNum, bedPrice, "AVAILABLE", "Standard configured bed");
            bed = bedRepository.save(bed);
            bedDtos.add(BedDto.fromEntity(bed));
            bedLetter++;
        }

        // Audit Log
        auditLogRepository.save(new AuditLog(
                userId, userEmail, "ADMIN", tenantId,
                "ROOM_CREATED",
                "Created Room " + room.getRoomNumber() + " (" + room.getRoomType() + ") with " + numBeds + " beds",
                ipAddress, "SUCCESS"
        ));

        return RoomDto.fromEntity(room, bedDtos);
    }

    @Transactional
    public BedDto updateBedStatus(Long tenantId, Long bedId, String newStatus, Long userId, String userEmail, String ipAddress) {
        Bed bed = bedRepository.findFirstByTenantIdAndId(tenantId, bedId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Bed not found"));

        String statusUpper = newStatus != null ? newStatus.trim().toUpperCase() : "AVAILABLE";
        if ("OCCUPIED".equalsIgnoreCase(statusUpper) && bed.getCurrentAdmission() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot manually mark bed as OCCUPIED without active patient admission.");
        }

        String oldStatus = bed.getStatus();
        bed.setStatus(statusUpper);
        if ("AVAILABLE".equalsIgnoreCase(statusUpper)) {
            bed.setCurrentAdmission(null);
        }
        bed = bedRepository.save(bed);

        // Audit Log
        auditLogRepository.save(new AuditLog(
                userId, userEmail, "ADMIN", tenantId,
                "BED_STATUS_CHANGED",
                "Bed " + bed.getBedNumber() + " status changed from " + oldStatus + " to " + statusUpper,
                ipAddress, "SUCCESS"
        ));

        return BedDto.fromEntity(bed);
    }

    // =========================================================================
    // 3. IP ADMISSION WORKFLOW
    // =========================================================================
    @Transactional
    public IpAdmissionDto createAdmission(Long tenantId, CreateIpAdmissionRequest req, Long userId, String userEmail, String ipAddress) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Hospital tenant not found"));

        // 1. Verify Bed is strictly AVAILABLE (Prevent double-booking)
        Bed bed = bedRepository.findFirstByTenantIdAndId(tenantId, req.getBedId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Selected bed not found"));

        if (!"AVAILABLE".equalsIgnoreCase(bed.getStatus()) || bed.getCurrentAdmission() != null) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Bed is no longer available. Please refresh and select another bed.");
        }

        // 1b. Verify Doctor Availability (Strictly AVAILABLE only)
        if (req.getDoctorName() != null && !req.getDoctorName().trim().isEmpty()) {
            doctorRepository.findFirstByTenantIdAndNameIgnoreCase(tenantId, req.getDoctorName().trim())
                    .ifPresent(doc -> {
                        if (!"AVAILABLE".equalsIgnoreCase(doc.getStatus())) {
                            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                    "Selected doctor '" + doc.getName() + "' is currently unavailable (Status: " +
                                    doc.getStatus().replace('_', ' ') + "). Only AVAILABLE doctors can be assigned for new IP admission.");
                        }
                    });
        }

        Room room = roomRepository.findFirstByTenantIdAndId(tenantId, req.getRoomId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Selected room not found"));

        // 2. Resolve or create Patient record
        Patient patient = null;
        if (req.getExistingUhid() != null && !req.getExistingUhid().trim().isEmpty()) {
            patient = patientRepository.findByTenantIdAndUhid(tenantId, req.getExistingUhid().trim())
                    .orElse(null);
        }

        if (patient == null) {
            // Check by phone number to prevent duplicates
            Optional<Patient> phoneMatch = patientRepository.findFirstByTenantIdAndPhone(tenantId, req.getPhone().trim());
            if (phoneMatch.isPresent()) {
                patient = phoneMatch.get();
                // Update basic demographic info if missing
                if (req.getEmail() != null && patient.getEmail() == null) patient.setEmail(req.getEmail().trim());
                if (req.getAddress() != null && patient.getAddress() == null) patient.setAddress(req.getAddress().trim());
            } else {
                // Create new Patient with auto UHID
                String uhid = generateUniqueUhid(tenantId);
                patient = new Patient(
                        tenant,
                        uhid,
                        req.getPatientName().trim(),
                        req.getPhone().trim(),
                        req.getAge(),
                        req.getGender().trim(),
                        req.getAddress() != null ? req.getAddress().trim() : "Not Provided"
                );
                patient.setEmail(req.getEmail() != null ? req.getEmail().trim() : null);
                patient = patientRepository.save(patient);
            }
        }

        // 3. Generate unique IP ID
        String ipId = generateUniqueIpId(tenantId);

        // 4. Create IpAdmission record
        String admissionTime = LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a"));
        IpAdmission admission = new IpAdmission(
                tenant,
                ipId,
                patient,
                req.getDoctorName().trim(),
                req.getDepartment() != null ? req.getDepartment().trim() : "General Medicine",
                room.getRoomType(),
                room,
                room.getRoomNumber(),
                bed,
                bed.getBedNumber(),
                LocalDate.now(),
                admissionTime
        );

        admission.setOpId(req.getOpId() != null ? req.getOpId().trim() : null);
        admission.setReasonForAdmission(req.getReasonForAdmission() != null && !req.getReasonForAdmission().trim().isEmpty() ? req.getReasonForAdmission().trim() : null);
        admission.setDiagnosis(req.getDiagnosis() != null ? req.getDiagnosis().trim() : null);
        admission.setAdmissionNotes(req.getAdmissionNotes() != null ? req.getAdmissionNotes().trim() : null);
        admission.setRoomPrice(room.getDailyPrice());
        admission.setBedPrice(bed.getDailyPrice());

        BigDecimal dailyTotal = (room.getDailyPrice() != null ? room.getDailyPrice() : BigDecimal.ZERO)
                .add(bed.getDailyPrice() != null ? bed.getDailyPrice() : BigDecimal.ZERO);
        BigDecimal deposit = req.getDepositAmount() != null ? req.getDepositAmount() : BigDecimal.ZERO;
        BigDecimal tot = dailyTotal.compareTo(BigDecimal.ZERO) > 0 ? dailyTotal : deposit;

        admission.setDepositAmount(deposit);
        admission.setTotalCharges(tot);
        admission.setPaidAmount(deposit);
        BigDecimal bal = tot.subtract(deposit).max(BigDecimal.ZERO);
        admission.setBalanceAmount(bal);
        admission.setPaymentMethod(req.getPaymentMethod() != null ? req.getPaymentMethod().toUpperCase() : "CASH");

        String computedStatus;
        if (bal.compareTo(BigDecimal.ZERO) == 0 && tot.compareTo(BigDecimal.ZERO) > 0) {
            computedStatus = "PAID";
        } else if (deposit.compareTo(BigDecimal.ZERO) > 0) {
            computedStatus = "PARTIALLY PAID";
        } else {
            computedStatus = "UNPAID";
        }
        admission.setPaymentStatus(computedStatus);

        admission = ipAdmissionRepository.save(admission);

        // 5. Update Bed to OCCUPIED and assign admission
        bed.setStatus("OCCUPIED");
        bed.setCurrentAdmission(admission);
        bedRepository.save(bed);

        // 6. Record Payment if deposit received
        if (deposit.compareTo(BigDecimal.ZERO) > 0) {
            String txnId = "TXN-" + ipId;
            PaymentRecord paymentRecord = new PaymentRecord(
                    tenant,
                    txnId,
                    patient,
                    patient.getFullName(),
                    "IP",
                    deposit,
                    admission.getPaymentMethod(),
                    LocalDate.now()
            );
            paymentRecord.setBillId(admission.getId());
            paymentRecord.setBillNumber(ipId);
            paymentRecord.setInvoiceNumber(ipId);
            paymentRecord.setUhid(patient.getUhid());
            paymentRecord.setIpId(ipId);
            paymentRecord.setOpId(admission.getOpId());
            paymentRecord.setTotalPaid(deposit);
            paymentRecord.setRemainingBalance(admission.getBalanceAmount());
            paymentRecord.setPaymentStatus(admission.getPaymentStatus());
            paymentRecord.setPaymentTime(admissionTime);
            paymentRecord.setNotes("IP Admission Initial Deposit - " + ipId + " (Room " + room.getRoomNumber() + ", " + bed.getBedNumber() + ")");
            paymentRecordRepository.save(paymentRecord);
        }

        // 7. Audit Log
        auditLogRepository.save(new AuditLog(
                userId, userEmail, "ADMIN", tenantId,
                "IP_ADMISSION",
                "Admitted patient " + patient.getFullName() + " (" + patient.getUhid() + ") with " + ipId +
                " in Room " + room.getRoomNumber() + " (" + bed.getBedNumber() + ") under Dr. " + req.getDoctorName(),
                ipAddress, "SUCCESS"
        ));

        return IpAdmissionDto.fromEntity(admission);
    }

    // =========================================================================
    // 4. DISCHARGE WORKFLOW
    // =========================================================================
    @Transactional
    public IpAdmissionDto dischargePatient(Long tenantId, Long admissionId, DischargeIpRequest req, Long userId, String userEmail, String ipAddress) {
        IpAdmission admission = ipAdmissionRepository.findFirstByTenantIdAndId(tenantId, admissionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "IP Admission record not found"));

        if ("DISCHARGED".equalsIgnoreCase(admission.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patient is already discharged.");
        }

        admission.setStatus("DISCHARGED");
        admission.setDischargeDate(LocalDate.now());
        admission.setDischargeTime(LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a")));
        if (req != null && req.getDischargeNotes() != null) {
            admission.setDischargeNotes(req.getDischargeNotes().trim());
        }

        // Record any final settlement charges
        if (req != null && req.getAdditionalCharges() != null && req.getAdditionalCharges().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal prevCharges = admission.getTotalCharges() != null ? admission.getTotalCharges() : BigDecimal.ZERO;
            admission.setTotalCharges(prevCharges.add(req.getAdditionalCharges()));

            String txnId = "TXN-DISCHARGE-" + admission.getIpId();
            PaymentRecord dischargePayment = new PaymentRecord(
                    admission.getTenant(),
                    txnId,
                    admission.getPatient(),
                    admission.getPatient().getFullName(),
                    "IP",
                    req.getAdditionalCharges(),
                    req.getFinalPaymentMethod() != null ? req.getFinalPaymentMethod().toUpperCase() : "CASH",
                    LocalDate.now()
            );
            dischargePayment.setBillId(admission.getId());
            dischargePayment.setBillNumber(admission.getIpId());
            dischargePayment.setInvoiceNumber(admission.getIpId());
            dischargePayment.setUhid(admission.getPatient() != null ? admission.getPatient().getUhid() : null);
            dischargePayment.setIpId(admission.getIpId());
            dischargePayment.setOpId(admission.getOpId());
            dischargePayment.setTotalPaid(admission.getPaidAmount() != null ? admission.getPaidAmount().add(req.getAdditionalCharges()) : req.getAdditionalCharges());
            dischargePayment.setRemainingBalance(BigDecimal.ZERO);
            dischargePayment.setPaymentStatus("PAID");
            dischargePayment.setPaymentTime(admission.getDischargeTime());
            dischargePayment.setNotes("IP Discharge Final Settlement - " + admission.getIpId());
            paymentRecordRepository.save(dischargePayment);
        }

        admission = ipAdmissionRepository.save(admission);

        // Release the assigned bed back to AVAILABLE
        if (admission.getBed() != null) {
            Bed bed = admission.getBed();
            bed.setStatus("AVAILABLE");
            bed.setCurrentAdmission(null);
            bedRepository.save(bed);
        } else if (admission.getBedNumber() != null) {
            // Fallback lookup by bedNumber
            bedRepository.findFirstByTenantIdAndBedNumberIgnoreCase(tenantId, admission.getBedNumber())
                    .ifPresent(b -> {
                        b.setStatus("AVAILABLE");
                        b.setCurrentAdmission(null);
                        bedRepository.save(b);
                    });
        }

        // Audit Log
        auditLogRepository.save(new AuditLog(
                userId, userEmail, "ADMIN", tenantId,
                "IP_DISCHARGE",
                "Discharged patient " + admission.getPatient().getFullName() + " (" + admission.getIpId() +
                ") and released Bed " + admission.getBedNumber(),
                ipAddress, "SUCCESS"
        ));

        return IpAdmissionDto.fromEntity(admission);
    }

    // =========================================================================
    // 5. INPATIENTS & HISTORY QUERIES
    // =========================================================================
    @Transactional(readOnly = true)
    public List<IpAdmissionDto> getCurrentInpatients(Long tenantId, String search) {
        if (tenantId == null) return Collections.emptyList();
        String q = (search != null) ? search.trim() : "";
        List<IpAdmission> list;
        if (q.isEmpty()) {
            list = ipAdmissionRepository.findByTenantIdAndStatusIgnoreCaseOrderByCreatedAtDesc(tenantId, "ADMITTED");
        } else {
            list = ipAdmissionRepository.searchIpAdmissionsByStatus(tenantId, "ADMITTED", q);
        }
        return list.stream().map(IpAdmissionDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<IpAdmissionDto> getIpHistory(Long tenantId, String search) {
        if (tenantId == null) return Collections.emptyList();
        String q = (search != null) ? search.trim() : "";
        List<IpAdmission> list;
        if (q.isEmpty()) {
            list = ipAdmissionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        } else {
            list = ipAdmissionRepository.searchIpAdmissions(tenantId, q);
        }
        return list.stream().map(IpAdmissionDto::fromEntity).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public IpAdmissionDto getIpDetails(Long tenantId, Long id) {
        IpAdmission admission = ipAdmissionRepository.findFirstByTenantIdAndId(tenantId, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "IP record not found"));
        return IpAdmissionDto.fromEntity(admission);
    }

    // =========================================================================
    // 6. PATIENT SEARCH FOR IP ADMISSION (Auto-Fill)
    // =========================================================================
    @Transactional(readOnly = true)
    public List<PatientSearchDto> searchPatientsForIp(Long tenantId, String query) {
        if (tenantId == null || query == null || query.trim().length() < 2) {
            return Collections.emptyList();
        }
        String cleanQuery = query.trim();
        Map<Long, PatientSearchDto> resultMap = new LinkedHashMap<>();

        // If query looks like OP ID
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

        // If query looks like IP ID
        if (cleanQuery.toUpperCase().startsWith("IP")) {
            ipAdmissionRepository.findFirstByTenantIdAndIpId(tenantId, cleanQuery.toUpperCase())
                    .ifPresent(ip -> {
                        Patient p = ip.getPatient();
                        if (p != null && !resultMap.containsKey(p.getId())) {
                            PatientSearchDto dto = PatientSearchDto.fromEntity(p);
                            dto.setLastOpId(ip.getOpId());
                            resultMap.put(p.getId(), dto);
                        }
                    });
        }

        // Search by Name, UHID, or Phone
        List<Patient> patients = patientRepository.searchPatients(tenantId, cleanQuery);
        for (Patient p : patients) {
            if (!resultMap.containsKey(p.getId())) {
                PatientSearchDto dto = PatientSearchDto.fromEntity(p);
                List<OpRegistration> recentOps = opRegistrationRepository.findByTenantIdAndPatientUhidOrderByCreatedAtDesc(tenantId, p.getUhid());
                if (!recentOps.isEmpty()) {
                    dto.setLastOpId(recentOps.get(0).getOpId());
                }
                resultMap.put(p.getId(), dto);
            }
        }

        return new ArrayList<>(resultMap.values());
    }

    // =========================================================================
    // 7. HELPER ID GENERATORS
    // =========================================================================
    private synchronized String generateUniqueIpId(Long tenantId) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String prefix = "IP-" + dateStr + "-";
        long todayCount = ipAdmissionRepository.countByTenantIdAndAdmissionDate(tenantId, LocalDate.now());
        int seq = (int) todayCount + 1;
        String candidate = prefix + String.format("%04d", seq);

        while (ipAdmissionRepository.existsByIpId(candidate)) {
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
