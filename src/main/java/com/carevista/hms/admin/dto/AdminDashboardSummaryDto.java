package com.carevista.hms.admin.dto;

import java.math.BigDecimal;

public class AdminDashboardSummaryDto {
    private String selectedDate;
    private String formattedDate;
    private String hospitalName;
    private String tenantCode;

    // 5 Main Summary Cards (Section 16 & 17)
    private long todayOp;
    private int opLimit;
    private int opRemaining;
    private double opUsagePercentage;

    private long todayIp;
    private long todayPharmacy;
    private BigDecimal pharmacyRevenue = BigDecimal.ZERO;

    private long todayLab;
    private long todayLabCompleted;
    private BigDecimal labRevenue = BigDecimal.ZERO;

    private BigDecimal todayCollection = BigDecimal.ZERO;
    private BigDecimal lifetimeCollection = BigDecimal.ZERO;

    private long activeEmployeesCount;
    private boolean hasLaboratory;
    private boolean hasPharmacy;

    public AdminDashboardSummaryDto() {}

    public String getSelectedDate() { return selectedDate; }
    public void setSelectedDate(String selectedDate) { this.selectedDate = selectedDate; }

    public String getFormattedDate() { return formattedDate; }
    public void setFormattedDate(String formattedDate) { this.formattedDate = formattedDate; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getTenantCode() { return tenantCode; }
    public void setTenantCode(String tenantCode) { this.tenantCode = tenantCode; }

    public long getTodayOp() { return todayOp; }
    public void setTodayOp(long todayOp) { this.todayOp = todayOp; }

    public int getOpLimit() { return opLimit; }
    public void setOpLimit(int opLimit) { this.opLimit = opLimit; }

    public int getOpRemaining() { return opRemaining; }
    public void setOpRemaining(int opRemaining) { this.opRemaining = opRemaining; }

    public double getOpUsagePercentage() { return opUsagePercentage; }
    public void setOpUsagePercentage(double opUsagePercentage) { this.opUsagePercentage = opUsagePercentage; }

    public long getTodayIp() { return todayIp; }
    public void setTodayIp(long todayIp) { this.todayIp = todayIp; }

    public long getTodayPharmacy() { return todayPharmacy; }
    public void setTodayPharmacy(long todayPharmacy) { this.todayPharmacy = todayPharmacy; }

    public BigDecimal getPharmacyRevenue() { return pharmacyRevenue; }
    public void setPharmacyRevenue(BigDecimal pharmacyRevenue) { this.pharmacyRevenue = pharmacyRevenue; }

    public long getTodayLab() { return todayLab; }
    public void setTodayLab(long todayLab) { this.todayLab = todayLab; }

    public long getTodayLabCompleted() { return todayLabCompleted; }
    public void setTodayLabCompleted(long todayLabCompleted) { this.todayLabCompleted = todayLabCompleted; }

    public BigDecimal getLabRevenue() { return labRevenue; }
    public void setLabRevenue(BigDecimal labRevenue) { this.labRevenue = labRevenue; }

    public BigDecimal getTodayCollection() { return todayCollection; }
    public void setTodayCollection(BigDecimal todayCollection) { this.todayCollection = todayCollection; }

    public BigDecimal getLifetimeCollection() { return lifetimeCollection; }
    public void setLifetimeCollection(BigDecimal lifetimeCollection) { this.lifetimeCollection = lifetimeCollection; }

    public long getActiveEmployeesCount() { return activeEmployeesCount; }
    public void setActiveEmployeesCount(long activeEmployeesCount) { this.activeEmployeesCount = activeEmployeesCount; }

    public boolean isHasLaboratory() { return hasLaboratory; }
    public void setHasLaboratory(boolean hasLaboratory) { this.hasLaboratory = hasLaboratory; }

    public boolean isHasPharmacy() { return hasPharmacy; }
    public void setHasPharmacy(boolean hasPharmacy) { this.hasPharmacy = hasPharmacy; }
}
