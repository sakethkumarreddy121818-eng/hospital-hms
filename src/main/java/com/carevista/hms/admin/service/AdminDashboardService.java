package com.carevista.hms.admin.service;

import com.carevista.hms.admin.dto.AdminDashboardSummaryDto;
import com.carevista.hms.admin.dto.GraphDataDto;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.laboratory.repository.LabOrderRepository;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.pharmacy.repository.PharmacyBillRepository;
import com.carevista.hms.security.repository.UserRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class AdminDashboardService {

    private final TenantRepository tenantRepository;
    private final UserRepository userRepository;
    private final OpRegistrationRepository opRegistrationRepository;
    private final IpAdmissionRepository ipAdmissionRepository;
    private final PharmacyBillRepository pharmacyBillRepository;
    private final LabOrderRepository labOrderRepository;
    private final PaymentRecordRepository paymentRecordRepository;

    private static final DateTimeFormatter DD_MM_YYYY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public AdminDashboardService(TenantRepository tenantRepository,
                                 UserRepository userRepository,
                                 OpRegistrationRepository opRegistrationRepository,
                                 IpAdmissionRepository ipAdmissionRepository,
                                 PharmacyBillRepository pharmacyBillRepository,
                                 LabOrderRepository labOrderRepository,
                                 PaymentRecordRepository paymentRecordRepository) {
        this.tenantRepository = tenantRepository;
        this.userRepository = userRepository;
        this.opRegistrationRepository = opRegistrationRepository;
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.pharmacyBillRepository = pharmacyBillRepository;
        this.labOrderRepository = labOrderRepository;
        this.paymentRecordRepository = paymentRecordRepository;
    }

    public AdminDashboardSummaryDto getDashboardSummary(Long tenantId, LocalDate date) {
        if (date == null) {
            date = LocalDate.now();
        }

        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found with ID: " + tenantId));

        AdminDashboardSummaryDto dto = new AdminDashboardSummaryDto();
        dto.setSelectedDate(date.toString());
        dto.setFormattedDate(date.format(DD_MM_YYYY));
        dto.setHospitalName(tenant.getHospitalName());
        dto.setTenantCode(tenant.getTenantCode());
        dto.setOpLimit(tenant.getOpLimit());
        dto.setHasLaboratory(tenant.isHasLaboratory());
        dto.setHasPharmacy(tenant.isHasPharmacy());

        // 1. OP for that date
        long opCount = opRegistrationRepository.countByTenantIdAndVisitDate(tenantId, date);
        dto.setTodayOp(opCount);
        int remaining = Math.max(0, tenant.getOpLimit() - (int) opCount);
        dto.setOpRemaining(remaining);
        double opPct = tenant.getOpLimit() > 0 ? (opCount * 100.0) / tenant.getOpLimit() : 0.0;
        dto.setOpUsagePercentage(Math.round(opPct * 10.0) / 10.0);

        // 2. IP for that date
        long ipCount = ipAdmissionRepository.countByTenantIdAndAdmissionDate(tenantId, date);
        dto.setTodayIp(ipCount);

        // 3. Pharmacy for that date
        long pharmacyCount = pharmacyBillRepository.countByTenantIdAndBillDate(tenantId, date);
        BigDecimal pharmacyRev = pharmacyBillRepository.sumTotalByTenantIdAndBillDate(tenantId, date);
        dto.setTodayPharmacy(pharmacyCount);
        dto.setPharmacyRevenue(pharmacyRev != null ? pharmacyRev : BigDecimal.ZERO);

        // 4. Lab for that date
        long labCount = labOrderRepository.countByTenantIdAndOrderDate(tenantId, date);
        long labCompleted = labOrderRepository.countByTenantIdAndOrderDateAndOrderStatus(tenantId, date, "COMPLETED");
        BigDecimal labRev = labOrderRepository.sumTotalByTenantIdAndOrderDate(tenantId, date);
        dto.setTodayLab(labCount);
        dto.setTodayLabCompleted(labCompleted);
        dto.setLabRevenue(labRev != null ? labRev : BigDecimal.ZERO);

        // 5. Collection for that date
        BigDecimal dayCollection = paymentRecordRepository.sumAmountByTenantIdAndPaymentDate(tenantId, date);
        dto.setTodayCollection(dayCollection != null ? dayCollection : BigDecimal.ZERO);

        // Lifetime Collection
        BigDecimal lifeCollection = paymentRecordRepository.sumTotalLifetimeCollection(tenantId);
        dto.setLifetimeCollection(lifeCollection != null ? lifeCollection : BigDecimal.ZERO);

        // Staff count
        long staffCount = userRepository.countByTenantIdAndRole(tenantId, UserRole.EMPLOYEE);
        dto.setActiveEmployeesCount(staffCount);

        return dto;
    }

    public GraphDataDto getGraphData(Long tenantId, String period, String metric) {
        if (period == null || period.trim().isEmpty()) period = "ONE_WEEK";
        if (metric == null || metric.trim().isEmpty()) metric = "COLLECTION";

        period = period.toUpperCase();
        metric = metric.toUpperCase();

        LocalDate today = LocalDate.now();
        List<String> labels = new ArrayList<>();
        List<Double> values = new ArrayList<>();
        double total = 0.0;
        String unit = metric.equals("COLLECTION") || metric.equals("PHARMACY_REVENUE") || metric.equals("LAB_REVENUE") ? "₹" : "";

        if ("ONE_DAY".equals(period)) {
            // Hourly breakdown for today
            labels = Arrays.asList("08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00");
            double currentDailyTotal = getMetricValueForDate(tenantId, today, metric);
            // Distribute proportionally across business hours
            double[] distribution = {0.10, 0.25, 0.20, 0.15, 0.15, 0.10, 0.05};
            for (double weight : distribution) {
                double val = Math.round(currentDailyTotal * weight * 10.0) / 10.0;
                values.add(val);
                total += val;
            }
        } else if ("ONE_WEEK".equals(period)) {
            // Last 7 days
            LocalDate start = today.minusDays(6);
            for (int i = 0; i < 7; i++) {
                LocalDate d = start.plusDays(i);
                labels.add(d.format(DateTimeFormatter.ofPattern("EEE (dd/MM)")));
                double val = getMetricValueForDate(tenantId, d, metric);
                values.add(val);
                total += val;
            }
        } else if ("ONE_MONTH".equals(period)) {
            // 4 weekly blocks
            LocalDate start = today.minusDays(28);
            for (int w = 0; w < 4; w++) {
                LocalDate blockStart = start.plusDays(w * 7);
                LocalDate blockEnd = blockStart.plusDays(6);
                labels.add(blockStart.format(DateTimeFormatter.ofPattern("dd MMM")) + " - " + blockEnd.format(DateTimeFormatter.ofPattern("dd MMM")));
                double blockSum = 0;
                for (int d = 0; d < 7; d++) {
                    blockSum += getMetricValueForDate(tenantId, blockStart.plusDays(d), metric);
                }
                values.add(Math.round(blockSum * 10.0) / 10.0);
                total += blockSum;
            }
        } else if ("ONE_YEAR".equals(period)) {
            // Last 6 months
            for (int m = 5; m >= 0; m--) {
                LocalDate monthDate = today.minusMonths(m);
                labels.add(monthDate.format(DateTimeFormatter.ofPattern("MMM yyyy")));
                // Calculate monthly sum from database
                LocalDate firstDay = monthDate.withDayOfMonth(1);
                LocalDate lastDay = monthDate.withDayOfMonth(monthDate.lengthOfMonth());
                double monthSum = getMetricValueForRange(tenantId, firstDay, lastDay, metric);
                values.add(Math.round(monthSum * 10.0) / 10.0);
                total += monthSum;
            }
        } else { // LIFETIME
            // Annual aggregates
            int currentYear = today.getYear();
            for (int y = currentYear - 2; y <= currentYear; y++) {
                labels.add(String.valueOf(y));
                LocalDate firstDay = LocalDate.of(y, 1, 1);
                LocalDate lastDay = LocalDate.of(y, 12, 31);
                double yearSum = getMetricValueForRange(tenantId, firstDay, lastDay, metric);
                values.add(Math.round(yearSum * 10.0) / 10.0);
                total += yearSum;
            }
        }

        return new GraphDataDto(period, metric, labels, values, Math.round(total * 10.0) / 10.0, unit);
    }

    private double getMetricValueForDate(Long tenantId, LocalDate date, String metric) {
        return switch (metric) {
            case "OP" -> (double) opRegistrationRepository.countByTenantIdAndVisitDate(tenantId, date);
            case "IP" -> (double) ipAdmissionRepository.countByTenantIdAndAdmissionDate(tenantId, date);
            case "PHARMACY" -> (double) pharmacyBillRepository.countByTenantIdAndBillDate(tenantId, date);
            case "LAB" -> (double) labOrderRepository.countByTenantIdAndOrderDate(tenantId, date);
            case "COLLECTION" -> {
                BigDecimal sum = paymentRecordRepository.sumAmountByTenantIdAndPaymentDate(tenantId, date);
                yield sum != null ? sum.doubleValue() : 0.0;
            }
            default -> 0.0;
        };
    }

    private double getMetricValueForRange(Long tenantId, LocalDate start, LocalDate end, String metric) {
        double sum = 0.0;
        LocalDate cur = start;
        while (!cur.isAfter(end)) {
            sum += getMetricValueForDate(tenantId, cur, metric);
            cur = cur.plusDays(1);
        }
        return sum;
    }
}
