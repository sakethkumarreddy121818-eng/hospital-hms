package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class DoctorFinancialSectionDto {

    private long totalDoctors = 0;
    private long totalConsultations = 0;
    private long totalAdmissions = 0;
    private BigDecimal totalBilledAmount = BigDecimal.ZERO;
    private BigDecimal totalCollections = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;
    private List<DoctorRevenueDto> doctors = new ArrayList<>();

    public DoctorFinancialSectionDto() {}

    public long getTotalDoctors() { return totalDoctors; }
    public void setTotalDoctors(long totalDoctors) { this.totalDoctors = totalDoctors; }

    public long getTotalConsultations() { return totalConsultations; }
    public void setTotalConsultations(long totalConsultations) { this.totalConsultations = totalConsultations; }

    public long getTotalAdmissions() { return totalAdmissions; }
    public void setTotalAdmissions(long totalAdmissions) { this.totalAdmissions = totalAdmissions; }

    public BigDecimal getTotalBilledAmount() { return totalBilledAmount; }
    public void setTotalBilledAmount(BigDecimal totalBilledAmount) { this.totalBilledAmount = totalBilledAmount; }

    public BigDecimal getTotalCollections() { return totalCollections; }
    public void setTotalCollections(BigDecimal totalCollections) { this.totalCollections = totalCollections; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public List<DoctorRevenueDto> getDoctors() { return doctors; }
    public void setDoctors(List<DoctorRevenueDto> doctors) { this.doctors = doctors; }
}
