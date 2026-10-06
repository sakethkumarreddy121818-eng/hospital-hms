package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;

public class DoctorRevenueDto {

    private Long id;
    private String doctorName;
    private String department;
    private String specialization;

    private long opCount = 0;
    private BigDecimal opRevenue = BigDecimal.ZERO;

    private long ipCount = 0;
    private BigDecimal ipRevenue = BigDecimal.ZERO;

    private long pharmacyCount = 0;
    private BigDecimal pharmacyRevenue = BigDecimal.ZERO;

    private long labCount = 0;
    private BigDecimal labRevenue = BigDecimal.ZERO;

    private BigDecimal totalRevenueBilled = BigDecimal.ZERO;
    private BigDecimal totalRevenueCollected = BigDecimal.ZERO;
    private BigDecimal outstanding = BigDecimal.ZERO;
    private double percentage = 0.0;

    public DoctorRevenueDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public long getOpCount() { return opCount; }
    public void setOpCount(long opCount) { this.opCount = opCount; }

    public BigDecimal getOpRevenue() { return opRevenue; }
    public void setOpRevenue(BigDecimal opRevenue) { this.opRevenue = opRevenue; }

    public long getIpCount() { return ipCount; }
    public void setIpCount(long ipCount) { this.ipCount = ipCount; }

    public BigDecimal getIpRevenue() { return ipRevenue; }
    public void setIpRevenue(BigDecimal ipRevenue) { this.ipRevenue = ipRevenue; }

    public long getPharmacyCount() { return pharmacyCount; }
    public void setPharmacyCount(long pharmacyCount) { this.pharmacyCount = pharmacyCount; }

    public BigDecimal getPharmacyRevenue() { return pharmacyRevenue; }
    public void setPharmacyRevenue(BigDecimal pharmacyRevenue) { this.pharmacyRevenue = pharmacyRevenue; }

    public long getLabCount() { return labCount; }
    public void setLabCount(long labCount) { this.labCount = labCount; }

    public BigDecimal getLabRevenue() { return labRevenue; }
    public void setLabRevenue(BigDecimal labRevenue) { this.labRevenue = labRevenue; }

    public BigDecimal getTotalRevenueBilled() { return totalRevenueBilled; }
    public void setTotalRevenueBilled(BigDecimal totalRevenueBilled) { this.totalRevenueBilled = totalRevenueBilled; }

    public BigDecimal getTotalRevenueCollected() { return totalRevenueCollected; }
    public void setTotalRevenueCollected(BigDecimal totalRevenueCollected) { this.totalRevenueCollected = totalRevenueCollected; }

    public BigDecimal getOutstanding() { return outstanding; }
    public void setOutstanding(BigDecimal outstanding) { this.outstanding = outstanding; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }
}
