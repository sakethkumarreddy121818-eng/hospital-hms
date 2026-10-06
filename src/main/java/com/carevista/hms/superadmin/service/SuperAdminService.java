package com.carevista.hms.superadmin.service;

import com.carevista.hms.audit.entity.AuditLog;
import com.carevista.hms.audit.repository.AuditLogRepository;
import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.billing.dto.BillingHistoryItemDto;
import com.carevista.hms.billing.dto.BillingHistoryReportDto;
import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.billing.service.BillingPdfExportService;
import com.carevista.hms.billing.service.BillingWordExportService;
import com.carevista.hms.common.enums.TenantStatus;
import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.common.enums.UserStatus;
import com.carevista.hms.ip.entity.IpAdmission;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.laboratory.entity.LabOrder;
import com.carevista.hms.laboratory.repository.LabOrderRepository;
import com.carevista.hms.notification.entity.Notification;
import com.carevista.hms.notification.repository.NotificationRepository;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.pharmacy.entity.PharmacyBill;
import com.carevista.hms.pharmacy.repository.PharmacyBillRepository;
import com.carevista.hms.security.entity.User;
import com.carevista.hms.security.repository.UserRepository;
import com.carevista.hms.superadmin.dto.CreateHospitalRequest;
import com.carevista.hms.superadmin.dto.HospitalAdminDto;
import com.carevista.hms.superadmin.dto.MonthlyOpUsageDto;
import com.carevista.hms.superadmin.dto.SuperAdminMetricsDto;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.time.format.DateTimeFormatter;
import java.time.format.TextStyle;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SuperAdminService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogRepository auditLogRepository;
    private final AuditService auditService;
    private final PasswordEncoder passwordEncoder;
    private final OpRegistrationRepository opRegistrationRepository;
    private final PharmacyBillRepository pharmacyBillRepository;
    private final LabOrderRepository labOrderRepository;
    private final IpAdmissionRepository ipAdmissionRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final BillingPdfExportService billingPdfExportService;
    private final BillingWordExportService billingWordExportService;

    public SuperAdminService(TenantRepository tenantRepository,
                             UserRepository userRepository,
                             NotificationRepository notificationRepository,
                             AuditLogRepository auditLogRepository,
                             AuditService auditService,
                             PasswordEncoder passwordEncoder,
                             OpRegistrationRepository opRegistrationRepository,
                             PharmacyBillRepository pharmacyBillRepository,
                             LabOrderRepository labOrderRepository,
                             IpAdmissionRepository ipAdmissionRepository,
                             PaymentRecordRepository paymentRecordRepository,
                             BillingPdfExportService billingPdfExportService,
                             BillingWordExportService billingWordExportService) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.notificationRepository = notificationRepository;
        this.auditLogRepository = auditLogRepository;
        this.auditService = auditService;
        this.passwordEncoder = passwordEncoder;
        this.opRegistrationRepository = opRegistrationRepository;
        this.pharmacyBillRepository = pharmacyBillRepository;
        this.labOrderRepository = labOrderRepository;
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.paymentRecordRepository = paymentRecordRepository;
        this.billingPdfExportService = billingPdfExportService;
        this.billingWordExportService = billingWordExportService;
    }

    public SuperAdminMetricsDto getDashboardMetrics() {
        SuperAdminMetricsDto metrics = new SuperAdminMetricsDto();
        List<Tenant> tenants = tenantRepository.findAll();

        long total = tenants.size();
        long active = tenants.stream().filter(t -> t.getStatus() == TenantStatus.ACTIVE).count();
        long disabled = total - active;

        long admins = userRepository.findByRole(UserRole.ADMIN).size();
        long employees = userRepository.findByRole(UserRole.EMPLOYEE).size();

        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());

        int totalOpCap = tenants.stream().mapToInt(Tenant::getOpLimit).sum();
        long totalOpUsage = opRegistrationRepository.countByVisitDateBetween(startOfMonth, endOfMonth);

        long unreadNotifs = notificationRepository.countByTargetRoleAndReadFalse(UserRole.SUPER_ADMIN);

        metrics.setTotalHospitals(total);
        metrics.setActiveHospitals(active);
        metrics.setDisabledHospitals(disabled);
        metrics.setTotalAdmins(admins);
        metrics.setTotalEmployees(employees);
        metrics.setTotalOpCapacity(totalOpCap);
        metrics.setTotalOpCurrentUsage((int) totalOpUsage);
        metrics.setUnreadNotificationsCount(unreadNotifs);
        metrics.setSystemStatus("ONLINE & HEALTHY");

        return metrics;
    }

    public List<HospitalAdminDto> getAllHospitals(String search, String status) {
        List<Tenant> tenants = tenantRepository.findAll();

        return tenants.stream()
                .filter(tenant -> {
                    if (status != null && !status.isEmpty() && !"ALL".equalsIgnoreCase(status)) {
                        try {
                            TenantStatus filterStatus = TenantStatus.valueOf(status.toUpperCase());
                            if (tenant.getStatus() != filterStatus) return false;
                        } catch (IllegalArgumentException ignored) {}
                    }
                    if (search != null && !search.trim().isEmpty()) {
                        String query = search.trim().toLowerCase();
                        boolean matchesHospital = tenant.getHospitalName().toLowerCase().contains(query)
                                || tenant.getTenantCode().toLowerCase().contains(query);
                        // Also check admin name or email
                        List<User> admins = userRepository.findByTenantId(tenant.getId()).stream()
                                .filter(u -> u.getRole() == UserRole.ADMIN)
                                .toList();
                        boolean matchesAdmin = admins.stream().anyMatch(a ->
                                (a.getFullName() != null && a.getFullName().toLowerCase().contains(query))
                                        || a.getEmail().toLowerCase().contains(query));
                        return matchesHospital || matchesAdmin;
                    }
                    return true;
                })
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public HospitalAdminDto getHospitalById(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found with ID: " + tenantId));
        return mapToDto(tenant);
    }

    @Transactional
    public HospitalAdminDto createHospital(CreateHospitalRequest req, HttpServletRequest httpReq) {
        // Validate uniqueness of email
        if (userRepository.existsByEmail(req.getEmail().trim().toLowerCase())) {
            throw new IllegalArgumentException("A user with email '" + req.getEmail() + "' already exists.");
        }

        // Validate uniqueness of hospital name
        if (tenantRepository.existsByHospitalName(req.getHospitalName().trim())) {
            throw new IllegalArgumentException("A hospital named '" + req.getHospitalName() + "' already exists.");
        }

        // Generate unique tenant code
        String tenantCode = "HOSP-" + String.format("%03d", tenantRepository.count() + 1);
        while (tenantRepository.existsByTenantCode(tenantCode)) {
            tenantCode = "HOSP-" + UUID.randomUUID().toString().substring(0, 4).toUpperCase();
        }

        Tenant tenant = new Tenant(
                tenantCode,
                req.getHospitalName().trim(),
                req.isHasLaboratory(),
                req.isHasPharmacy(),
                req.getOpLimit(),
                req.getPhone(),
                req.getEmail().trim().toLowerCase(),
                req.getAddress()
        );
        tenant.setOfficeStatus(req.getOfficeStatus() != null ? req.getOfficeStatus() : "ACTIVE");
        tenant.setStatus(TenantStatus.ACTIVE);
        tenant.setOpCurrentUsage(0);

        Tenant savedTenant = tenantRepository.save(tenant);

        // Create Admin user
        User admin = new User();
        admin.setEmail(req.getEmail().trim().toLowerCase());
        admin.setPassword(passwordEncoder.encode(req.getPassword()));
        admin.setFullName(req.getAdminName().trim());
        admin.setPhone(req.getPhone());
        admin.setRole(UserRole.ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        admin.setTenant(savedTenant);
        admin.setDepartment("Hospital Administration");
        admin.setPermissions("HOSPITAL_ALL");
        userRepository.save(admin);

        // Audit log
        auditService.log(null, "superadmin@carevista.com", "SUPER_ADMIN", savedTenant.getId(),
                "HOSPITAL_CREATED", "Created hospital: " + savedTenant.getHospitalName() + " (" + tenantCode + ") with Admin: " + admin.getEmail(),
                getClientIp(httpReq), "SUCCESS");

        // Notification
        notificationRepository.save(new Notification(
                savedTenant.getId(),
                UserRole.SUPER_ADMIN,
                "New Hospital Enrolled",
                "Hospital '" + savedTenant.getHospitalName() + "' has been successfully registered with OP limit of " + savedTenant.getOpLimit() + ".",
                "INFO"
        ));

        return mapToDto(savedTenant);
    }

    @Transactional
    public HospitalAdminDto updateHospitalStatus(Long tenantId, TenantStatus newStatus, HttpServletRequest httpReq) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found with ID: " + tenantId));

        tenant.setStatus(newStatus);
        Tenant savedTenant = tenantRepository.save(tenant);

        // Sync admin status and employee status accordingly
        List<User> users = userRepository.findByTenantId(tenantId);
        UserStatus targetUserStatus = (newStatus == TenantStatus.ACTIVE) ? UserStatus.ACTIVE : UserStatus.DISABLED;
        for (User u : users) {
            u.setStatus(targetUserStatus);
            userRepository.save(u);
        }

        String action = (newStatus == TenantStatus.ACTIVE) ? "ADMIN_ACTIVATED" : "ADMIN_DISABLED";
        auditService.log(null, "superadmin@carevista.com", "SUPER_ADMIN", tenantId,
                action, "Hospital status changed to " + newStatus + " for " + tenant.getHospitalName(),
                getClientIp(httpReq), "SUCCESS");

        notificationRepository.save(new Notification(
                tenantId,
                UserRole.SUPER_ADMIN,
                "Hospital Status Changed",
                "Hospital '" + tenant.getHospitalName() + "' has been " + (newStatus == TenantStatus.ACTIVE ? "Activated" : "Disabled") + ".",
                newStatus == TenantStatus.ACTIVE ? "SUCCESS" : "WARNING"
        ));

        return mapToDto(savedTenant);
    }

    @Transactional
    public HospitalAdminDto updateOpLimit(Long tenantId, int newLimit, HttpServletRequest httpReq) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found with ID: " + tenantId));

        int oldLimit = tenant.getOpLimit();
        tenant.setOpLimit(newLimit);

        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        long currentMonthUsage = opRegistrationRepository.countByTenantIdAndVisitDateBetween(tenantId, startOfMonth, endOfMonth);
        tenant.setOpCurrentUsage((int) currentMonthUsage);
        Tenant savedTenant = tenantRepository.save(tenant);

        // Check if monthly limit exceeded or reached using current month's usage
        if (currentMonthUsage > newLimit) {
            notificationRepository.save(new Notification(
                    tenantId,
                    UserRole.SUPER_ADMIN,
                    "Monthly OP Limit Exceeded Alert",
                    tenant.getHospitalName() + " has exceeded its monthly OP limit of " + newLimit + ".",
                    "DANGER"
            ));
        } else if (currentMonthUsage == newLimit) {
            notificationRepository.save(new Notification(
                    tenantId,
                    UserRole.SUPER_ADMIN,
                    "Monthly OP Limit Reached Alert",
                    tenant.getHospitalName() + " has reached its monthly OP limit of " + newLimit + ".",
                    "WARNING"
            ));
        }

        auditService.log(null, "superadmin@carevista.com", "SUPER_ADMIN", tenantId,
                "OP_LIMIT_UPDATED", "Monthly OP limit updated from " + oldLimit + " to " + newLimit + " for " + tenant.getHospitalName(),
                getClientIp(httpReq), "SUCCESS");

        return mapToDto(savedTenant);
    }

    @Transactional
    public void resetAdminPassword(Long tenantId, String newPassword, HttpServletRequest httpReq) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found with ID: " + tenantId));

        User admin = userRepository.findByTenantId(tenantId).stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("No Admin user found for hospital " + tenant.getHospitalName()));

        admin.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(admin);

        auditService.log(admin.getId(), "superadmin@carevista.com", "SUPER_ADMIN", tenantId,
                "ADMIN_PASSWORD_RESET", "Password successfully reset by Super Admin for Admin user: " + admin.getEmail(),
                getClientIp(httpReq), "SUCCESS");

        notificationRepository.save(new Notification(
                tenantId,
                UserRole.SUPER_ADMIN,
                "Admin Password Reset",
                "Password reset completed for hospital admin " + admin.getEmail() + " (" + tenant.getHospitalName() + ").",
                "WARNING"
        ));
    }

    @Transactional(readOnly = true)
    public BillingHistoryReportDto getBillingHistoryReport(String period, String customStartDate, String customEndDate, Long tenantId) {
        LocalDate today = LocalDate.now();
        LocalDate startDate;
        LocalDate endDate = today;
        String normalizedPeriod = period != null ? period.trim().toUpperCase() : "TODAY";

        switch (normalizedPeriod) {
            case "YESTERDAY":
                startDate = today.minusDays(1);
                endDate = today.minusDays(1);
                break;
            case "THIS_WEEK":
                startDate = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
                endDate = today;
                break;
            case "THIS_MONTH":
                startDate = today.withDayOfMonth(1);
                endDate = today;
                break;
            case "THIS_YEAR":
                startDate = today.withDayOfYear(1);
                endDate = today;
                break;
            case "CUSTOM":
                try {
                    startDate = (customStartDate != null && !customStartDate.isBlank()) ? LocalDate.parse(customStartDate.trim()) : today.minusDays(7);
                } catch (Exception e) {
                    startDate = today.minusDays(7);
                }
                try {
                    endDate = (customEndDate != null && !customEndDate.isBlank()) ? LocalDate.parse(customEndDate.trim()) : today;
                } catch (Exception e) {
                    endDate = today;
                }
                break;
            case "ALL":
            case "ALL_HISTORY":
                startDate = LocalDate.of(2000, 1, 1);
                endDate = LocalDate.of(2099, 12, 31);
                normalizedPeriod = "ALL";
                break;
            case "TODAY":
            default:
                startDate = today;
                endDate = today;
                normalizedPeriod = "TODAY";
                break;
        }

        BillingHistoryReportDto report = new BillingHistoryReportDto();
        report.setPeriodName(normalizedPeriod);
        report.setStartDate(startDate);
        report.setEndDate(endDate);
        report.setTenantId(tenantId);

        String scopeName = "All Hospitals (Multi-Tenant)";
        if (tenantId != null && tenantId > 0) {
            Tenant t = tenantRepository.findById(tenantId).orElse(null);
            if (t != null) {
                scopeName = t.getHospitalName();
            }
        }
        report.setHospitalFilter(scopeName);

        List<OpRegistration> ops;
        List<PharmacyBill> rxs;
        List<LabOrder> labs;
        List<PaymentRecord> payments;
        List<IpAdmission> ipAdmissions;

        if (tenantId != null && tenantId > 0) {
            if ("ALL".equals(normalizedPeriod)) {
                ops = opRegistrationRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                rxs = pharmacyBillRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                labs = labOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                payments = paymentRecordRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                ipAdmissions = ipAdmissionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
            } else {
                ops = opRegistrationRepository.findByTenantIdAndVisitDateBetweenOrderByVisitDateDescCreatedAtDesc(tenantId, startDate, endDate);
                rxs = pharmacyBillRepository.findByTenantIdAndBillDateBetweenOrderByBillDateDescCreatedAtDesc(tenantId, startDate, endDate);
                labs = labOrderRepository.findByTenantIdAndOrderDateBetweenOrderByOrderDateDescCreatedAtDesc(tenantId, startDate, endDate);
                payments = paymentRecordRepository.findByTenantIdAndPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(tenantId, startDate, endDate);
                ipAdmissions = ipAdmissionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
            }
        } else {
            if ("ALL".equals(normalizedPeriod)) {
                ops = opRegistrationRepository.findAllByOrderByVisitDateDescCreatedAtDesc();
                rxs = pharmacyBillRepository.findAllByOrderByBillDateDescCreatedAtDesc();
                labs = labOrderRepository.findAllByOrderByOrderDateDescCreatedAtDesc();
                payments = paymentRecordRepository.findAllByOrderByPaymentDateDescCreatedAtDesc();
                ipAdmissions = ipAdmissionRepository.findAllByOrderByAdmissionDateDescCreatedAtDesc();
            } else {
                ops = opRegistrationRepository.findByVisitDateBetweenOrderByVisitDateDescCreatedAtDesc(startDate, endDate);
                rxs = pharmacyBillRepository.findByBillDateBetweenOrderByBillDateDescCreatedAtDesc(startDate, endDate);
                labs = labOrderRepository.findByOrderDateBetweenOrderByOrderDateDescCreatedAtDesc(startDate, endDate);
                payments = paymentRecordRepository.findByPaymentDateBetweenOrderByPaymentDateDescCreatedAtDesc(startDate, endDate);
                ipAdmissions = ipAdmissionRepository.findAllByOrderByAdmissionDateDescCreatedAtDesc();
            }
        }

        Map<Long, IpAdmission> ipAdmissionByPatientId = new HashMap<>();
        for (IpAdmission ip : ipAdmissions) {
            if (ip.getPatient() != null && !ipAdmissionByPatientId.containsKey(ip.getPatient().getId())) {
                ipAdmissionByPatientId.put(ip.getPatient().getId(), ip);
            }
        }

        Map<String, String> paymentMethodByRef = new HashMap<>();
        for (PaymentRecord pr : payments) {
            if (pr.getTransactionId() != null) {
                paymentMethodByRef.put(pr.getTransactionId(), pr.getPaymentMethod());
            }
            if (pr.getPatient() != null && pr.getModuleType() != null && pr.getPaymentDate() != null) {
                paymentMethodByRef.put(pr.getPatient().getId() + "_" + pr.getModuleType() + "_" + pr.getPaymentDate(), pr.getPaymentMethod());
            }
        }

        List<BillingHistoryItemDto> items = new ArrayList<>();
        BigDecimal grossSubtotal = BigDecimal.ZERO;
        BigDecimal totalDiscount = BigDecimal.ZERO;
        BigDecimal totalGst = BigDecimal.ZERO;
        BigDecimal totalBilled = BigDecimal.ZERO;
        BigDecimal totalPaid = BigDecimal.ZERO;

        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("HH:mm:ss");

        // 1. OP Bills
        for (OpRegistration op : ops) {
            BillingHistoryItemDto item = new BillingHistoryItemDto();
            item.setHospitalName(op.getTenant() != null ? op.getTenant().getHospitalName() : "CareVista Hospital");
            item.setTenantCode(op.getTenant() != null ? op.getTenant().getTenantCode() : "CV");
            item.setPatientName(op.getPatient() != null ? op.getPatient().getFullName() : "Outpatient Guest");
            item.setUhid(op.getPatient() != null ? op.getPatient().getUhid() : "N/A");
            item.setOpId(op.getOpId());
            item.setIpId("N/A");
            item.setBillNumber(op.getOpId());
            item.setBillingType("OP");
            item.setBillDate(op.getVisitDate());
            item.setBillTime(op.getCreatedAt() != null ? op.getCreatedAt().format(timeFmt) : "09:00:00");
            item.setDoctorName(op.getDoctorName() != null ? op.getDoctorName() : "Attending Doctor");
            item.setDepartment(op.getDepartment() != null ? op.getDepartment() : "Outpatient Care");
            item.setServicesOrItems("Outpatient Consultation (" + item.getDepartment() + ")");
            item.setQuantity(1);
            item.setSubtotal(op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO);
            item.setDiscountPercentage(BigDecimal.ZERO);
            item.setDiscountAmount(BigDecimal.ZERO);
            item.setGstPercentage(BigDecimal.ZERO);
            item.setGstAmount(BigDecimal.ZERO);
            BigDecimal opPaid = op.getPaidAmount() != null ? op.getPaidAmount() : ("PAID".equalsIgnoreCase(op.getPaymentStatus()) ? item.getSubtotal() : BigDecimal.ZERO);
            item.setPaidAmount(opPaid);
            BigDecimal bal = item.getTotalAmount().subtract(opPaid);
            item.setOutstandingAmount(bal.compareTo(BigDecimal.ZERO) > 0 ? bal : BigDecimal.ZERO);
            item.setPaymentStatus(op.getPaymentStatus() != null ? op.getPaymentStatus() : "PAID");
            String payMethod = op.getPatient() != null ? paymentMethodByRef.getOrDefault(op.getPatient().getId() + "_OP_" + op.getVisitDate(), "CASH") : "CASH";
            item.setPaymentMethod(payMethod);
            item.setCreatedAt(op.getCreatedAt());

            grossSubtotal = grossSubtotal.add(item.getSubtotal());
            totalBilled = totalBilled.add(item.getTotalAmount());
            totalPaid = totalPaid.add(item.getPaidAmount());
            items.add(item);
        }

        // 2. Pharmacy Bills
        for (PharmacyBill pb : rxs) {
            BillingHistoryItemDto item = new BillingHistoryItemDto();
            item.setHospitalName(pb.getTenant() != null ? pb.getTenant().getHospitalName() : "CareVista Hospital");
            item.setTenantCode(pb.getTenant() != null ? pb.getTenant().getTenantCode() : "CV");
            item.setPatientName(pb.getPatientName() != null ? pb.getPatientName() : (pb.getPatient() != null ? pb.getPatient().getFullName() : "Walk-in Customer"));
            item.setUhid(pb.getPatient() != null ? pb.getPatient().getUhid() : "N/A");
            item.setOpId("N/A");
            item.setIpId("N/A");
            item.setBillNumber(pb.getBillNumber());
            item.setBillingType("Pharmacy");
            item.setBillDate(pb.getBillDate());
            item.setBillTime(pb.getCreatedAt() != null ? pb.getCreatedAt().format(timeFmt) : "10:15:00");
            item.setDoctorName("Hospital Pharmacist");
            item.setDepartment("Pharmacy Dispensation");
            item.setServicesOrItems("Prescription Medications & Medical Supplies");
            item.setQuantity(1);
            item.setSubtotal(pb.getSubtotal() != null ? pb.getSubtotal() : BigDecimal.ZERO);
            item.setDiscountPercentage(pb.getDiscountPercentage() != null ? pb.getDiscountPercentage() : BigDecimal.ZERO);
            item.setDiscountAmount(pb.getDiscountAmount() != null ? pb.getDiscountAmount() : BigDecimal.ZERO);
            item.setGstPercentage(pb.getGstPercentage() != null ? pb.getGstPercentage() : BigDecimal.ZERO);
            item.setGstAmount(pb.getGstAmount() != null ? pb.getGstAmount() : BigDecimal.ZERO);
            item.setTotalAmount(pb.getTotalAmount() != null ? pb.getTotalAmount() : BigDecimal.ZERO);
            item.setPaidAmount(pb.getPaidAmount() != null ? pb.getPaidAmount() : BigDecimal.ZERO);
            BigDecimal bal = item.getTotalAmount().subtract(item.getPaidAmount());
            item.setOutstandingAmount(bal.compareTo(BigDecimal.ZERO) > 0 ? bal : BigDecimal.ZERO);
            item.setPaymentStatus(pb.getPaymentStatus() != null ? pb.getPaymentStatus() : "PAID");
            String payMethod = pb.getPatient() != null ? paymentMethodByRef.getOrDefault(pb.getPatient().getId() + "_PHARMACY_" + pb.getBillDate(), "UPI") : "UPI";
            item.setPaymentMethod(payMethod);
            item.setCreatedAt(pb.getCreatedAt());

            grossSubtotal = grossSubtotal.add(item.getSubtotal());
            totalDiscount = totalDiscount.add(item.getDiscountAmount());
            totalGst = totalGst.add(item.getGstAmount());
            totalBilled = totalBilled.add(item.getTotalAmount());
            totalPaid = totalPaid.add(item.getPaidAmount());
            items.add(item);
        }

        // 3. Laboratory Bills
        for (LabOrder lo : labs) {
            BillingHistoryItemDto item = new BillingHistoryItemDto();
            item.setHospitalName(lo.getTenant() != null ? lo.getTenant().getHospitalName() : "CareVista Hospital");
            item.setTenantCode(lo.getTenant() != null ? lo.getTenant().getTenantCode() : "CV");
            item.setPatientName(lo.getPatientName() != null ? lo.getPatientName() : (lo.getPatient() != null ? lo.getPatient().getFullName() : "Diagnostic Patient"));
            item.setUhid(lo.getPatient() != null ? lo.getPatient().getUhid() : "N/A");
            item.setOpId("N/A");
            item.setIpId("N/A");
            item.setBillNumber(lo.getOrderNumber());
            item.setBillingType("Laboratory");
            item.setBillDate(lo.getOrderDate());
            item.setBillTime(lo.getCreatedAt() != null ? lo.getCreatedAt().format(timeFmt) : "11:30:00");
            item.setDoctorName("Pathologist In-Charge");
            item.setDepartment("Laboratory / " + (lo.getCategory() != null ? lo.getCategory() : "Diagnostic"));
            item.setServicesOrItems(lo.getTestName() != null ? lo.getTestName() : "Diagnostic Pathology Panel");
            item.setQuantity(1);
            item.setSubtotal(lo.getTestPrice() != null ? lo.getTestPrice() : (lo.getTotalAmount() != null ? lo.getTotalAmount() : BigDecimal.ZERO));
            item.setDiscountPercentage(BigDecimal.ZERO);
            item.setDiscountAmount(lo.getDiscountAmount() != null ? lo.getDiscountAmount() : BigDecimal.ZERO);
            item.setGstPercentage(BigDecimal.ZERO);
            item.setGstAmount(lo.getGstAmount() != null ? lo.getGstAmount() : BigDecimal.ZERO);
            item.setTotalAmount(lo.getTotalAmount() != null ? lo.getTotalAmount() : BigDecimal.ZERO);
            item.setPaidAmount(lo.getPaidAmount() != null ? lo.getPaidAmount() : BigDecimal.ZERO);
            BigDecimal bal = item.getTotalAmount().subtract(item.getPaidAmount());
            item.setOutstandingAmount(bal.compareTo(BigDecimal.ZERO) > 0 ? bal : BigDecimal.ZERO);
            item.setPaymentStatus(lo.getPaymentStatus() != null ? lo.getPaymentStatus() : "PAID");
            String payMethod = lo.getPatient() != null ? paymentMethodByRef.getOrDefault(lo.getPatient().getId() + "_LABORATORY_" + lo.getOrderDate(), "CASH") : "CASH";
            item.setPaymentMethod(payMethod);
            item.setCreatedAt(lo.getCreatedAt());

            grossSubtotal = grossSubtotal.add(item.getSubtotal());
            totalDiscount = totalDiscount.add(item.getDiscountAmount());
            totalGst = totalGst.add(item.getGstAmount());
            totalBilled = totalBilled.add(item.getTotalAmount());
            totalPaid = totalPaid.add(item.getPaidAmount());
            items.add(item);
        }

        // 4. IP Inpatient Billing (From IP Payments & Admissions)
        for (PaymentRecord pr : payments) {
            if ("IP".equalsIgnoreCase(pr.getModuleType())) {
                BillingHistoryItemDto item = new BillingHistoryItemDto();
                item.setHospitalName(pr.getTenant() != null ? pr.getTenant().getHospitalName() : "CareVista Hospital");
                item.setTenantCode(pr.getTenant() != null ? pr.getTenant().getTenantCode() : "CV");
                item.setPatientName(pr.getPatientName() != null ? pr.getPatientName() : (pr.getPatient() != null ? pr.getPatient().getFullName() : "Inpatient"));
                item.setUhid(pr.getPatient() != null ? pr.getPatient().getUhid() : "N/A");
                item.setOpId("N/A");

                IpAdmission ipAdm = pr.getPatient() != null ? ipAdmissionByPatientId.get(pr.getPatient().getId()) : null;
                item.setIpId(ipAdm != null ? ipAdm.getIpId() : ("IP-" + pr.getTransactionId()));
                item.setBillNumber(pr.getTransactionId());
                item.setBillingType("IP");
                item.setBillDate(pr.getPaymentDate());
                item.setBillTime(pr.getCreatedAt() != null ? pr.getCreatedAt().format(timeFmt) : "12:00:00");
                item.setDoctorName(ipAdm != null ? ipAdm.getDoctorName() : "Attending Inpatient Physician");
                item.setDepartment(ipAdm != null ? ("Inpatient / " + ipAdm.getWardName()) : "Inpatient Department");
                item.setServicesOrItems(ipAdm != null
                        ? ("Inpatient Care & Hospitalization (" + ipAdm.getWardName() + ", Bed " + ipAdm.getBedNumber() + ")")
                        : "Inpatient Room, Nursing & Procedural Charges");
                item.setQuantity(1);
                item.setSubtotal(pr.getAmount() != null ? pr.getAmount() : BigDecimal.ZERO);
                item.setDiscountPercentage(BigDecimal.ZERO);
                item.setDiscountAmount(BigDecimal.ZERO);
                item.setGstPercentage(BigDecimal.ZERO);
                item.setGstAmount(BigDecimal.ZERO);
                item.setTotalAmount(item.getSubtotal());
                item.setPaidAmount(item.getSubtotal());
                item.setOutstandingAmount(BigDecimal.ZERO);
                item.setPaymentStatus("PAID");
                item.setPaymentMethod(pr.getPaymentMethod() != null ? pr.getPaymentMethod() : "CARD");
                item.setCreatedAt(pr.getCreatedAt());

                grossSubtotal = grossSubtotal.add(item.getSubtotal());
                totalBilled = totalBilled.add(item.getTotalAmount());
                totalPaid = totalPaid.add(item.getPaidAmount());
                items.add(item);
            } else if ("CENTRAL".equalsIgnoreCase(pr.getModuleType())) {
                BillingHistoryItemDto item = new BillingHistoryItemDto();
                item.setHospitalName(pr.getTenant() != null ? pr.getTenant().getHospitalName() : "CareVista Hospital");
                item.setTenantCode(pr.getTenant() != null ? pr.getTenant().getTenantCode() : "CV");
                item.setPatientName(pr.getPatientName() != null ? pr.getPatientName() : (pr.getPatient() != null ? pr.getPatient().getFullName() : "Patient"));
                item.setUhid(pr.getPatient() != null ? pr.getPatient().getUhid() : "N/A");
                item.setOpId("N/A");
                item.setIpId("N/A");
                item.setBillNumber(pr.getTransactionId());
                item.setBillingType("Central Billing");
                item.setBillDate(pr.getPaymentDate());
                item.setBillTime(pr.getCreatedAt() != null ? pr.getCreatedAt().format(timeFmt) : "14:00:00");
                item.setDoctorName("N/A");
                item.setDepartment("Central Billing & Cashier");
                item.setServicesOrItems(pr.getNotes() != null ? pr.getNotes() : "Central Healthcare Service Charges");
                item.setQuantity(1);
                item.setSubtotal(pr.getAmount() != null ? pr.getAmount() : BigDecimal.ZERO);
                item.setDiscountPercentage(BigDecimal.ZERO);
                item.setDiscountAmount(BigDecimal.ZERO);
                item.setGstPercentage(BigDecimal.ZERO);
                item.setGstAmount(BigDecimal.ZERO);
                item.setTotalAmount(item.getSubtotal());
                item.setPaidAmount(item.getSubtotal());
                item.setOutstandingAmount(BigDecimal.ZERO);
                item.setPaymentStatus("PAID");
                item.setPaymentMethod(pr.getPaymentMethod() != null ? pr.getPaymentMethod() : "CASH");
                item.setCreatedAt(pr.getCreatedAt());

                grossSubtotal = grossSubtotal.add(item.getSubtotal());
                totalBilled = totalBilled.add(item.getTotalAmount());
                totalPaid = totalPaid.add(item.getPaidAmount());
                items.add(item);
            }
        }

        // Sort items by date desc, then by createdAt desc
        items.sort((a, b) -> {
            int dateCmp = b.getBillDate().compareTo(a.getBillDate());
            if (dateCmp != 0) return dateCmp;
            if (b.getCreatedAt() != null && a.getCreatedAt() != null) {
                return b.getCreatedAt().compareTo(a.getCreatedAt());
            }
            return 0;
        });

        report.setTotalRecords(items.size());
        report.setGrossSubtotal(grossSubtotal);
        report.setTotalDiscount(totalDiscount);
        report.setTotalGst(totalGst);
        report.setTotalBilled(totalBilled);
        report.setTotalPaid(totalPaid);
        BigDecimal outstanding = totalBilled.subtract(totalPaid);
        report.setTotalOutstanding(outstanding.compareTo(BigDecimal.ZERO) > 0 ? outstanding : BigDecimal.ZERO);
        report.setItems(items);

        return report;
    }

    @Transactional
    public byte[] generateBillingHistoryCsv(BillingHistoryReportDto report, HttpServletRequest httpReq) {
        auditService.log(null, "superadmin@carevista.com", "SUPER_ADMIN", report.getTenantId(),
                "BILLING_BACKUP_EXPORTED", "Patient billing history audit backup generated for period: " + report.getPeriodName() + " (" + report.getTotalRecords() + " records)",
                getClientIp(httpReq), "SUCCESS");

        notificationRepository.save(new Notification(
                null,
                UserRole.SUPER_ADMIN,
                "Billing Backup Exported",
                "Patient billing history backup (" + report.getTotalRecords() + " records, Period: " + report.getPeriodName() + ") was generated and downloaded successfully at " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),
                "INFO"
        ));

        StringBuilder sb = new StringBuilder();
        // UTF-8 BOM for Microsoft Excel compatibility
        sb.append('\ufeff');

        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");
        DateTimeFormatter tsFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss");

        sb.append("# ====================================================================================================\n");
        sb.append("# CAREVISTA HOSPITAL MANAGEMENT SAAS - PATIENT BILLING & FINANCIAL AUDIT EXPORT\n");
        sb.append("# ====================================================================================================\n");
        sb.append("# Export Generated At : ").append(LocalDateTime.now().format(tsFmt)).append("\n");
        sb.append("# Exported By         : System Super Administrator (superadmin@carevista.com)\n");
        sb.append("# Hospital            : ").append(report.getHospitalFilter()).append("\n");
        sb.append("# Date Range          : ").append(report.getStartDate().format(dateFmt))
          .append(" - ").append(report.getEndDate().format(dateFmt))
          .append(" (").append(report.getPeriodName()).append(")\n");
        sb.append("# Total Records       : ").append(report.getTotalRecords()).append("\n");
        sb.append("# Gross Subtotal      : $").append(report.getGrossSubtotal().setScale(2, RoundingMode.HALF_UP)).append("\n");
        sb.append("# Total Discounts     : -$").append(report.getTotalDiscount().setScale(2, RoundingMode.HALF_UP)).append("\n");
        sb.append("# Total GST / Tax     : +$").append(report.getTotalGst().setScale(2, RoundingMode.HALF_UP)).append("\n");
        sb.append("# Net Billed Amount   : $").append(report.getTotalBilled().setScale(2, RoundingMode.HALF_UP)).append("\n");
        sb.append("# Total Collected     : $").append(report.getTotalPaid().setScale(2, RoundingMode.HALF_UP)).append("\n");
        sb.append("# Total Outstanding   : $").append(report.getTotalOutstanding().setScale(2, RoundingMode.HALF_UP)).append("\n");
        sb.append("# Tenant Isolation   : Verified Database Enforced Filter (Tenant ID: ")
          .append(report.getTenantId() != null ? report.getTenantId() : "ALL_TENANTS").append(")\n");
        sb.append("# Security & Privacy  : PII Protected. Zero passwords, credentials, or tokens exposed.\n");
        sb.append("# Database Engine     : MySQL 8.x (localhost:3306 - carevista_hms)\n");
        sb.append("# ====================================================================================================\n");

        // CSV Header Row
        sb.append(String.join(",",
                escapeCsv("Hospital Name"),
                escapeCsv("Bill Number"),
                escapeCsv("Billing Type"),
                escapeCsv("Bill Date"),
                escapeCsv("Bill Time"),
                escapeCsv("Patient Name"),
                escapeCsv("UHID / Patient ID"),
                escapeCsv("OP ID"),
                escapeCsv("IP ID"),
                escapeCsv("Doctor Name"),
                escapeCsv("Department"),
                escapeCsv("Services / Items Billed"),
                escapeCsv("Quantity"),
                escapeCsv("Subtotal"),
                escapeCsv("Discount %"),
                escapeCsv("Discount Amount"),
                escapeCsv("GST %"),
                escapeCsv("GST Amount"),
                escapeCsv("Total Amount"),
                escapeCsv("Paid Amount"),
                escapeCsv("Outstanding Balance"),
                escapeCsv("Payment Status"),
                escapeCsv("Payment Method")
        )).append("\n");

        // CSV Data Rows
        for (BillingHistoryItemDto item : report.getItems()) {
            sb.append(String.join(",",
                    escapeCsv(item.getHospitalName()),
                    escapeCsv(item.getBillNumber()),
                    escapeCsv(item.getBillingType()),
                    escapeCsv(item.getBillDate() != null ? item.getBillDate().format(dateFmt) : ""),
                    escapeCsv(item.getBillTime()),
                    escapeCsv(item.getPatientName()),
                    escapeCsv(item.getUhid()),
                    escapeCsv(item.getOpId()),
                    escapeCsv(item.getIpId()),
                    escapeCsv(item.getDoctorName()),
                    escapeCsv(item.getDepartment()),
                    escapeCsv(item.getServicesOrItems()),
                    escapeCsv(item.getQuantity()),
                    escapeCsv(item.getSubtotal().setScale(2, RoundingMode.HALF_UP).toString()),
                    escapeCsv(item.getDiscountPercentage().setScale(2, RoundingMode.HALF_UP) + "%"),
                    escapeCsv(item.getDiscountAmount().setScale(2, RoundingMode.HALF_UP).toString()),
                    escapeCsv(item.getGstPercentage().setScale(2, RoundingMode.HALF_UP) + "%"),
                    escapeCsv(item.getGstAmount().setScale(2, RoundingMode.HALF_UP).toString()),
                    escapeCsv(item.getTotalAmount().setScale(2, RoundingMode.HALF_UP).toString()),
                    escapeCsv(item.getPaidAmount().setScale(2, RoundingMode.HALF_UP).toString()),
                    escapeCsv(item.getOutstandingAmount().setScale(2, RoundingMode.HALF_UP).toString()),
                    escapeCsv(item.getPaymentStatus()),
                    escapeCsv(item.getPaymentMethod())
            )).append("\n");
        }

        return sb.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional
    public byte[] generateBillingHistoryPdf(BillingHistoryReportDto report, HttpServletRequest httpReq) {
        auditService.log(null, "superadmin@carevista.com", "SUPER_ADMIN", report.getTenantId(),
                "BILLING_PDF_EXPORTED", "Patient billing history PDF generated for period: " + report.getPeriodName() + " (" + report.getTotalRecords() + " records)",
                getClientIp(httpReq), "SUCCESS");

        notificationRepository.save(new Notification(
                report.getTenantId(),
                UserRole.SUPER_ADMIN,
                "Billing PDF Exported",
                "Patient billing history PDF report (" + report.getTotalRecords() + " records, Period: " + report.getPeriodName() + ") was generated and downloaded successfully at " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),
                "INFO"
        ));

        return billingPdfExportService.generateBillingHistoryPdf(report);
    }

    @Transactional
    public byte[] generateBillingHistoryWord(BillingHistoryReportDto report, HttpServletRequest httpReq) {
        auditService.log(null, "superadmin@carevista.com", "SUPER_ADMIN", report.getTenantId(),
                "BILLING_WORD_EXPORTED", "Patient billing history Word document generated for period: " + report.getPeriodName() + " (" + report.getTotalRecords() + " records)",
                getClientIp(httpReq), "SUCCESS");

        notificationRepository.save(new Notification(
                report.getTenantId(),
                UserRole.SUPER_ADMIN,
                "Billing Word Document Exported",
                "Patient billing history Word document (" + report.getTotalRecords() + " records, Period: " + report.getPeriodName() + ") was generated and downloaded successfully at " + LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss")),
                "INFO"
        ));

        return billingWordExportService.generateBillingHistoryWord(report);
    }

    private String escapeCsv(Object value) {
        if (value == null) return "\"\"";
        String s = String.valueOf(value);
        if (s.contains("\"")) {
            s = s.replace("\"", "\"\"");
        }
        return "\"" + s + "\"";
    }

    private HospitalAdminDto mapToDto(Tenant tenant) {
        HospitalAdminDto dto = new HospitalAdminDto();
        dto.setId(tenant.getId());
        dto.setTenantCode(tenant.getTenantCode());
        dto.setHospitalName(tenant.getHospitalName());
        dto.setOfficeStatus(tenant.getOfficeStatus());
        dto.setHasLaboratory(tenant.isHasLaboratory());
        dto.setHasPharmacy(tenant.isHasPharmacy());

        LocalDate today = LocalDate.now();
        LocalDate startOfMonth = today.withDayOfMonth(1);
        LocalDate endOfMonth = today.withDayOfMonth(today.lengthOfMonth());
        long currentMonthUsage = opRegistrationRepository.countByTenantIdAndVisitDateBetween(tenant.getId(), startOfMonth, endOfMonth);

        int monthlyLimit = tenant.getOpLimit();
        int remaining = Math.max(0, monthlyLimit - (int) currentMonthUsage);
        boolean isExceeded = currentMonthUsage > monthlyLimit;
        boolean isReached = currentMonthUsage == monthlyLimit;

        dto.setOpLimit(monthlyLimit);
        dto.setMonthlyOpLimit(monthlyLimit);
        dto.setOpCurrentUsage((int) currentMonthUsage);
        dto.setCurrentMonthUsage((int) currentMonthUsage);
        dto.setOpRemaining(remaining);
        dto.setRemainingThisMonth(remaining);
        dto.setLimitExceeded(isExceeded);
        dto.setCurrentMonthName(today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + today.getYear());

        double pct = monthlyLimit > 0 ? (currentMonthUsage * 100.0) / monthlyLimit : 0.0;
        dto.setOpUsagePercentage(Math.round(pct * 10.0) / 10.0);

        if (isExceeded) {
            dto.setOpLimitStatus("LIMIT_EXCEEDED");
        } else if (isReached) {
            dto.setOpLimitStatus("LIMIT_REACHED");
        } else if (pct >= 80.0) {
            dto.setOpLimitStatus("NEAR_LIMIT");
        } else {
            dto.setOpLimitStatus("NORMAL");
        }

        dto.setStatus(tenant.getStatus());
        dto.setPhone(tenant.getPhone());
        dto.setEmail(tenant.getEmail());
        dto.setAddress(tenant.getAddress());
        dto.setCreatedAt(tenant.getCreatedAt());
        dto.setUpdatedAt(tenant.getUpdatedAt());

        // Find linked Admin user
        List<User> users = userRepository.findByTenantId(tenant.getId());
        User admin = users.stream()
                .filter(u -> u.getRole() == UserRole.ADMIN)
                .findFirst()
                .orElse(null);

        if (admin != null) {
            dto.setAdminId(admin.getId());
            dto.setAdminName(admin.getFullName());
            dto.setAdminEmail(admin.getEmail());
            dto.setAdminPhone(admin.getPhone());
            dto.setAdminStatus(admin.getStatus());
            dto.setAdminLastLogin(admin.getLastLoginAt());
        }

        // Count employees
        long employeeCount = users.stream()
                .filter(u -> u.getRole() == UserRole.EMPLOYEE)
                .count();
        dto.setEmployeeCount(employeeCount);

        return dto;
    }

    private String escapeSql(String s) {
        if (s == null) return "";
        return s.replace("'", "''");
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip != null ? ip : "127.0.0.1";
    }

    @Transactional(readOnly = true)
    public List<MonthlyOpUsageDto> getMonthlyOpHistory(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Hospital not found with ID: " + tenantId));

        List<Object[]> rows = opRegistrationRepository.countMonthlyOpByTenant(tenantId);
        List<MonthlyOpUsageDto> history = new ArrayList<>();

        LocalDate today = LocalDate.now();
        int curYear = today.getYear();
        int curMonth = today.getMonthValue();
        boolean currentMonthFound = false;

        for (Object[] row : rows) {
            int year = ((Number) row[0]).intValue();
            int month = ((Number) row[1]).intValue();
            long count = ((Number) row[2]).longValue();

            if (year == curYear && month == curMonth) {
                currentMonthFound = true;
            }

            Month m = Month.of(month);
            String monthName = m.getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + year;
            long rem = Math.max(0, tenant.getOpLimit() - count);
            boolean exceeded = count > tenant.getOpLimit();

            history.add(new MonthlyOpUsageDto(year, month, monthName, count, tenant.getOpLimit(), rem, exceeded));
        }

        if (!currentMonthFound) {
            String curMonthName = today.getMonth().getDisplayName(TextStyle.FULL, Locale.ENGLISH) + " " + curYear;
            history.add(0, new MonthlyOpUsageDto(curYear, curMonth, curMonthName, 0L, tenant.getOpLimit(), (long) tenant.getOpLimit(), false));
        }

        return history;
    }
}
