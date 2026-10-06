package com.carevista.hms.settings.service;

import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.common.enums.UserStatus;
import com.carevista.hms.doctor.dto.DoctorDto;
import com.carevista.hms.doctor.entity.Doctor;
import com.carevista.hms.doctor.repository.DoctorRepository;
import com.carevista.hms.security.dto.UserDto;
import com.carevista.hms.security.entity.User;
import com.carevista.hms.security.repository.UserRepository;
import com.carevista.hms.settings.dto.DoctorRequestDto;
import com.carevista.hms.settings.dto.HospitalSettingDto;
import com.carevista.hms.settings.dto.StaffRequestDto;
import com.carevista.hms.settings.entity.HospitalSetting;
import com.carevista.hms.settings.repository.HospitalSettingRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class HospitalSettingService {

    private final HospitalSettingRepository hospitalSettingRepository;
    private final TenantRepository tenantRepository;
    private final DoctorRepository doctorRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final com.carevista.hms.audit.repository.AuditLogRepository auditLogRepository;

    public HospitalSettingService(
            HospitalSettingRepository hospitalSettingRepository,
            TenantRepository tenantRepository,
            DoctorRepository doctorRepository,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            com.carevista.hms.audit.repository.AuditLogRepository auditLogRepository) {
        this.hospitalSettingRepository = hospitalSettingRepository;
        this.tenantRepository = tenantRepository;
        this.doctorRepository = doctorRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.auditLogRepository = auditLogRepository;
    }

    public List<com.carevista.hms.audit.entity.AuditLog> getTenantAuditLogs(Long tenantId) {
        return auditLogRepository.findByTenantIdOrderByTimestampDesc(tenantId);
    }

    // ==========================================
    // 1. HOSPITAL SETTINGS (Tenant Scoped)
    // ==========================================

    @Transactional
    public HospitalSettingDto getSettings(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found with ID: " + tenantId));

        HospitalSetting setting = hospitalSettingRepository.findByTenantId(tenant.getId())
                .orElseGet(() -> {
                    HospitalSetting newSetting = new HospitalSetting(tenant);
                    return hospitalSettingRepository.save(newSetting);
                });

        return HospitalSettingDto.fromEntity(setting);
    }

    @Transactional
    public HospitalSettingDto updateSettings(Long tenantId, HospitalSettingDto dto, Long userId, String email, String ip) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found with ID: " + tenantId));

        HospitalSetting setting = hospitalSettingRepository.findByTenantId(tenant.getId())
                .orElseGet(() -> new HospitalSetting(tenant));

        // Update Profile
        if (dto.getHospitalName() != null && !dto.getHospitalName().trim().isEmpty()) {
            setting.setHospitalName(dto.getHospitalName().trim());
            tenant.setHospitalName(dto.getHospitalName().trim());
        }
        if (dto.getPhone() != null) {
            setting.setPhone(dto.getPhone().trim());
            tenant.setPhone(dto.getPhone().trim());
        }
        if (dto.getEmail() != null) {
            setting.setEmail(dto.getEmail().trim());
            tenant.setEmail(dto.getEmail().trim());
        }
        if (dto.getAddress() != null) {
            setting.setAddress(dto.getAddress().trim());
            tenant.setAddress(dto.getAddress().trim());
        }
        if (dto.getEmergencyContact() != null) setting.setEmergencyContact(dto.getEmergencyContact().trim());
        if (dto.getAccreditationDetails() != null) setting.setAccreditationDetails(dto.getAccreditationDetails().trim());

        // Update Appearance / Colors
        if (dto.getPrimaryColor() != null && isValidHexColor(dto.getPrimaryColor())) {
            setting.setPrimaryColor(dto.getPrimaryColor().trim());
        }
        if (dto.getSecondaryColor() != null && isValidHexColor(dto.getSecondaryColor())) {
            setting.setSecondaryColor(dto.getSecondaryColor().trim());
        }
        if (dto.getAccentColor() != null && isValidHexColor(dto.getAccentColor())) {
            setting.setAccentColor(dto.getAccentColor().trim());
        }
        if (dto.getThemePreset() != null) setting.setThemePreset(dto.getThemePreset().trim());
        if (dto.getSidebarCollapsed() != null) setting.setSidebarCollapsed(dto.getSidebarCollapsed());

        // Update Billing
        if (dto.getGstNumber() != null) setting.setGstNumber(dto.getGstNumber().trim());
        if (dto.getDefaultGstPct() != null) setting.setDefaultGstPct(dto.getDefaultGstPct());
        if (dto.getInvoicePrefix() != null) setting.setInvoicePrefix(dto.getInvoicePrefix().trim());
        if (dto.getDefaultPaymentMethod() != null) setting.setDefaultPaymentMethod(dto.getDefaultPaymentMethod().trim());
        if (dto.getBillingTerms() != null) setting.setBillingTerms(dto.getBillingTerms().trim());

        // Update Pharmacy & Laboratory
        if (dto.getPharmacyReorderLevel() != null) setting.setPharmacyReorderLevel(dto.getPharmacyReorderLevel());
        if (dto.getPharmacyExpiryAlertDays() != null) setting.setPharmacyExpiryAlertDays(dto.getPharmacyExpiryAlertDays());
        if (dto.getPharmacyReturnNotice() != null) setting.setPharmacyReturnNotice(dto.getPharmacyReturnNotice().trim());
        if (dto.getLabTurnaroundHours() != null) setting.setLabTurnaroundHours(dto.getLabTurnaroundHours());
        if (dto.getLabCriticalAlert() != null) setting.setLabCriticalAlert(dto.getLabCriticalAlert().trim());

        // Update Notifications
        if (dto.getEmailNotifications() != null) setting.setEmailNotifications(dto.getEmailNotifications());
        if (dto.getLowStockAlerts() != null) setting.setLowStockAlerts(dto.getLowStockAlerts());
        if (dto.getPatientArrivalAlerts() != null) setting.setPatientArrivalAlerts(dto.getPatientArrivalAlerts());
        if (dto.getBillingAlerts() != null) setting.setBillingAlerts(dto.getBillingAlerts());

        // Update Security
        if (dto.getSessionTimeoutMinutes() != null) setting.setSessionTimeoutMinutes(dto.getSessionTimeoutMinutes());
        if (dto.getRequirePasswordChangeDays() != null) setting.setRequirePasswordChangeDays(dto.getRequirePasswordChangeDays());

        tenantRepository.save(tenant);
        HospitalSetting saved = hospitalSettingRepository.save(setting);

        auditService.log(userId, email, "ADMIN", tenantId, "SETTINGS_UPDATED",
                "Updated tenant configuration settings for " + tenant.getHospitalName(), ip, "SUCCESS");

        return HospitalSettingDto.fromEntity(saved);
    }

    private boolean isValidHexColor(String c) {
        return c != null && c.matches("^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$");
    }

    // ==========================================
    // 2. DOCTOR MANAGEMENT (Tenant Scoped)
    // ==========================================

    @Transactional(readOnly = true)
    public List<DoctorDto> getDoctors(Long tenantId) {
        if (tenantId == null) return Collections.emptyList();
        return doctorRepository.findByTenantIdOrderByDepartmentAscNameAsc(tenantId)
                .stream()
                .map(DoctorDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public DoctorDto updateDoctorStatus(Long tenantId, Long doctorId, String newStatus, Long userId, String email, String ip) {
        Doctor doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new RuntimeException("Doctor not found with ID: " + doctorId));

        if (!doctor.getTenant().getId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized: Doctor does not belong to this hospital tenant.");
        }

        String validStatus = "AVAILABLE";
        String normalized = newStatus != null ? newStatus.trim().toUpperCase() : "AVAILABLE";
        if (normalized.equals("ABSENT") || normalized.equals("BUSY") || normalized.equals("IN_SURGERY") || normalized.equals("AVAILABLE")) {
            validStatus = normalized;
        }

        doctor.setStatus(validStatus);
        Doctor saved = doctorRepository.save(doctor);

        auditService.log(userId, email, "ADMIN", tenantId, "DOCTOR_STATUS_CHANGED",
                "Doctor " + doctor.getName() + " availability changed to " + validStatus, ip, "SUCCESS");

        return DoctorDto.fromEntity(saved);
    }

    @Transactional
    public DoctorDto createOrUpdateDoctor(Long tenantId, Long doctorId, DoctorRequestDto req, Long userId, String email, String ip) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));

        Doctor doctor;
        boolean isNew = false;
        if (doctorId != null) {
            doctor = doctorRepository.findById(doctorId)
                    .orElseThrow(() -> new RuntimeException("Doctor not found"));
            if (!doctor.getTenant().getId().equals(tenantId)) {
                throw new RuntimeException("Unauthorized doctor tenant access");
            }
        } else {
            doctor = new Doctor();
            doctor.setTenant(tenant);
            isNew = true;
        }

        if (req.getName() != null && !req.getName().trim().isEmpty()) doctor.setName(req.getName().trim());
        if (req.getDepartment() != null && !req.getDepartment().trim().isEmpty()) doctor.setDepartment(req.getDepartment().trim());
        if (req.getSpecialization() != null) doctor.setSpecialization(req.getSpecialization().trim());
        if (req.getConsultationFee() != null && req.getConsultationFee().compareTo(BigDecimal.ZERO) >= 0) {
            doctor.setConsultationFee(req.getConsultationFee());
        }
        if (req.getStatus() != null) {
            String norm = req.getStatus().trim().toUpperCase();
            if (norm.equals("ABSENT") || norm.equals("BUSY") || norm.equals("IN_SURGERY") || norm.equals("AVAILABLE")) {
                doctor.setStatus(norm);
            }
        }
        if (req.getPhone() != null) doctor.setPhone(req.getPhone().trim());
        if (req.getEmail() != null) doctor.setEmail(req.getEmail().trim());
        if (req.getRoomNumber() != null) doctor.setRoomNumber(req.getRoomNumber().trim());
        if (req.getAvailableDays() != null) doctor.setAvailableDays(req.getAvailableDays().trim());

        Doctor saved = doctorRepository.save(doctor);

        auditService.log(userId, email, "ADMIN", tenantId, isNew ? "DOCTOR_CREATED" : "DOCTOR_UPDATED",
                (isNew ? "Created doctor: " : "Updated doctor: ") + saved.getName(), ip, "SUCCESS");

        return DoctorDto.fromEntity(saved);
    }

    // ==========================================
    // 3. STAFF / EMPLOYEE MANAGEMENT (Tenant Scoped)
    // ==========================================

    @Transactional(readOnly = true)
    public List<UserDto> getStaff(Long tenantId) {
        if (tenantId == null) return Collections.emptyList();
        return userRepository.findByTenantId(tenantId)
                .stream()
                .filter(u -> u.getRole() == UserRole.EMPLOYEE)
                .map(UserDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional
    public UserDto updateStaffStatus(Long tenantId, Long staffId, String newStatus, Long userId, String email, String ip) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff user not found"));

        if (staff.getTenant() == null || !staff.getTenant().getId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized: User does not belong to this hospital tenant.");
        }

        UserStatus status = "DISABLED".equalsIgnoreCase(newStatus) || "INACTIVE".equalsIgnoreCase(newStatus)
                ? UserStatus.DISABLED : UserStatus.ACTIVE;

        staff.setStatus(status);
        User saved = userRepository.save(staff);

        auditService.log(userId, email, "ADMIN", tenantId, "STAFF_STATUS_CHANGED",
                "Staff member " + staff.getFullName() + " status set to " + status, ip, "SUCCESS");

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto createStaff(Long tenantId, StaffRequestDto req, Long userId, String email, String ip) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new RuntimeException("Tenant not found"));

        String rawEmail = req.getEmail() != null ? req.getEmail().trim().toLowerCase() : "";
        if (rawEmail.isEmpty()) {
            throw new RuntimeException("Staff email is required.");
        }
        if (userRepository.existsByEmail(rawEmail)) {
            throw new RuntimeException("A user with email '" + rawEmail + "' already exists.");
        }

        String rawPass = req.getPassword() != null && !req.getPassword().trim().isEmpty() ? req.getPassword() : "Employee@123";

        User staff = new User();
        staff.setTenant(tenant);
        staff.setEmail(rawEmail);
        staff.setPassword(passwordEncoder.encode(rawPass));
        staff.setFullName(req.getFullName() != null ? req.getFullName().trim() : "Hospital Staff");
        staff.setPhone(req.getPhone() != null ? req.getPhone().trim() : "");
        staff.setDepartment(req.getDepartment() != null ? req.getDepartment().trim() : "Front Desk / Operations");
        staff.setRole(UserRole.EMPLOYEE);
        staff.setStatus("DISABLED".equalsIgnoreCase(req.getStatus()) ? UserStatus.DISABLED : UserStatus.ACTIVE);
        staff.setPermissions(req.getPermissions() != null && !req.getPermissions().trim().isEmpty()
                ? req.getPermissions().trim() : "OP_VIEW,OP_REGISTER,PATIENT_SEARCH,BILLING_VIEW");

        User saved = userRepository.save(staff);

        auditService.log(userId, email, "ADMIN", tenantId, "STAFF_CREATED",
                "Created new staff account for " + saved.getFullName() + " (" + saved.getEmail() + ")", ip, "SUCCESS");

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public UserDto updateStaffDetails(Long tenantId, Long staffId, StaffRequestDto req, Long userId, String email, String ip) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff user not found"));

        if (staff.getTenant() == null || !staff.getTenant().getId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized: Staff does not belong to this hospital tenant.");
        }

        if (req.getFullName() != null && !req.getFullName().trim().isEmpty()) {
            staff.setFullName(req.getFullName().trim());
        }
        if (req.getPhone() != null) staff.setPhone(req.getPhone().trim());
        if (req.getDepartment() != null && !req.getDepartment().trim().isEmpty()) {
            staff.setDepartment(req.getDepartment().trim());
        }
        if (req.getPermissions() != null) staff.setPermissions(req.getPermissions().trim());
        if (req.getStatus() != null) {
            staff.setStatus("DISABLED".equalsIgnoreCase(req.getStatus()) ? UserStatus.DISABLED : UserStatus.ACTIVE);
        }

        // Email change check
        if (req.getEmail() != null && !req.getEmail().trim().equalsIgnoreCase(staff.getEmail())) {
            String newEmail = req.getEmail().trim().toLowerCase();
            if (userRepository.existsByEmail(newEmail)) {
                throw new RuntimeException("Email '" + newEmail + "' is already in use by another user.");
            }
            staff.setEmail(newEmail);
        }

        User saved = userRepository.save(staff);

        auditService.log(userId, email, "ADMIN", tenantId, "STAFF_UPDATED",
                "Updated details for staff " + saved.getFullName(), ip, "SUCCESS");

        return UserDto.fromEntity(saved);
    }

    @Transactional
    public void resetStaffPassword(Long tenantId, Long staffId, String newPassword, Long userId, String email, String ip) {
        User staff = userRepository.findById(staffId)
                .orElseThrow(() -> new RuntimeException("Staff user not found"));

        if (staff.getTenant() == null || !staff.getTenant().getId().equals(tenantId)) {
            throw new RuntimeException("Unauthorized: Staff does not belong to this hospital tenant.");
        }

        String passToSet = newPassword != null && !newPassword.trim().isEmpty() ? newPassword.trim() : "Employee@123";
        staff.setPassword(passwordEncoder.encode(passToSet));
        userRepository.save(staff);

        auditService.log(userId, email, "ADMIN", tenantId, "STAFF_PASSWORD_RESET",
                "Password reset performed for staff " + staff.getFullName() + " (" + staff.getEmail() + ")", ip, "SUCCESS");
    }
}
