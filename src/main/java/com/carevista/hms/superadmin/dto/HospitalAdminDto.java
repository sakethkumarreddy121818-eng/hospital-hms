package com.carevista.hms.superadmin.dto;

import com.carevista.hms.common.enums.TenantStatus;
import com.carevista.hms.common.enums.UserStatus;

import java.time.LocalDateTime;

public class HospitalAdminDto {
    private Long id;
    private String tenantCode;
    private String hospitalName;
    private String officeStatus;
    private boolean hasLaboratory;
    private boolean hasPharmacy;
    private int opLimit;
    private int opCurrentUsage;
    private int opRemaining;
    private double opUsagePercentage;
    private String opLimitStatus;
    private String currentMonthName;
    private int monthlyOpLimit;
    private int currentMonthUsage;
    private int remainingThisMonth;
    private boolean limitExceeded;
    private TenantStatus status;
    private String phone;
    private String email;
    private String address;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Admin Details
    private Long adminId;
    private String adminName;
    private String adminEmail;
    private String adminPhone;
    private UserStatus adminStatus;
    private LocalDateTime adminLastLogin;
    private long employeeCount;

    public HospitalAdminDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenantCode() { return tenantCode; }
    public void setTenantCode(String tenantCode) { this.tenantCode = tenantCode; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getOfficeStatus() { return officeStatus; }
    public void setOfficeStatus(String officeStatus) { this.officeStatus = officeStatus; }

    public boolean isHasLaboratory() { return hasLaboratory; }
    public void setHasLaboratory(boolean hasLaboratory) { this.hasLaboratory = hasLaboratory; }

    public boolean isHasPharmacy() { return hasPharmacy; }
    public void setHasPharmacy(boolean hasPharmacy) { this.hasPharmacy = hasPharmacy; }

    public int getOpLimit() { return opLimit; }
    public void setOpLimit(int opLimit) { this.opLimit = opLimit; }

    public int getOpCurrentUsage() { return opCurrentUsage; }
    public void setOpCurrentUsage(int opCurrentUsage) { this.opCurrentUsage = opCurrentUsage; }

    public int getOpRemaining() { return opRemaining; }
    public void setOpRemaining(int opRemaining) { this.opRemaining = opRemaining; }

    public double getOpUsagePercentage() { return opUsagePercentage; }
    public void setOpUsagePercentage(double opUsagePercentage) { this.opUsagePercentage = opUsagePercentage; }

    public String getOpLimitStatus() { return opLimitStatus; }
    public void setOpLimitStatus(String opLimitStatus) { this.opLimitStatus = opLimitStatus; }

    public TenantStatus getStatus() { return status; }
    public void setStatus(TenantStatus status) { this.status = status; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public Long getAdminId() { return adminId; }
    public void setAdminId(Long adminId) { this.adminId = adminId; }

    public String getAdminName() { return adminName; }
    public void setAdminName(String adminName) { this.adminName = adminName; }

    public String getAdminEmail() { return adminEmail; }
    public void setAdminEmail(String adminEmail) { this.adminEmail = adminEmail; }

    public String getAdminPhone() { return adminPhone; }
    public void setAdminPhone(String adminPhone) { this.adminPhone = adminPhone; }

    public UserStatus getAdminStatus() { return adminStatus; }
    public void setAdminStatus(UserStatus adminStatus) { this.adminStatus = adminStatus; }

    public LocalDateTime getAdminLastLogin() { return adminLastLogin; }
    public void setAdminLastLogin(LocalDateTime adminLastLogin) { this.adminLastLogin = adminLastLogin; }

    public long getEmployeeCount() { return employeeCount; }
    public void setEmployeeCount(long employeeCount) { this.employeeCount = employeeCount; }

    public String getCurrentMonthName() { return currentMonthName; }
    public void setCurrentMonthName(String currentMonthName) { this.currentMonthName = currentMonthName; }

    public int getMonthlyOpLimit() { return monthlyOpLimit; }
    public void setMonthlyOpLimit(int monthlyOpLimit) { this.monthlyOpLimit = monthlyOpLimit; }

    public int getCurrentMonthUsage() { return currentMonthUsage; }
    public void setCurrentMonthUsage(int currentMonthUsage) { this.currentMonthUsage = currentMonthUsage; }

    public int getRemainingThisMonth() { return remainingThisMonth; }
    public void setRemainingThisMonth(int remainingThisMonth) { this.remainingThisMonth = remainingThisMonth; }

    public boolean isLimitExceeded() { return limitExceeded; }
    public void setLimitExceeded(boolean limitExceeded) { this.limitExceeded = limitExceeded; }
}
