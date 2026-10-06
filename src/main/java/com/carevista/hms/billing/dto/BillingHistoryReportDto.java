package com.carevista.hms.billing.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public class BillingHistoryReportDto {

    private String periodName; // TODAY, YESTERDAY, THIS_WEEK, THIS_MONTH, THIS_YEAR, CUSTOM, ALL
    private LocalDate startDate;
    private LocalDate endDate;
    private String hospitalFilter; // "All Hospitals (Multi-Tenant)" or specific hospital
    private Long tenantId;
    private int totalRecords = 0;
    private BigDecimal grossSubtotal = BigDecimal.ZERO;
    private BigDecimal totalDiscount = BigDecimal.ZERO;
    private BigDecimal totalGst = BigDecimal.ZERO;
    private BigDecimal totalBilled = BigDecimal.ZERO;
    private BigDecimal totalPaid = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;
    private List<BillingHistoryItemDto> items = new ArrayList<>();

    public BillingHistoryReportDto() {}

    public String getPeriodName() { return periodName; }
    public void setPeriodName(String periodName) { this.periodName = periodName; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public String getHospitalFilter() { return hospitalFilter; }
    public void setHospitalFilter(String hospitalFilter) { this.hospitalFilter = hospitalFilter; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public int getTotalRecords() { return totalRecords; }
    public void setTotalRecords(int totalRecords) { this.totalRecords = totalRecords; }

    public BigDecimal getGrossSubtotal() { return grossSubtotal; }
    public void setGrossSubtotal(BigDecimal grossSubtotal) { this.grossSubtotal = grossSubtotal; }

    public BigDecimal getTotalDiscount() { return totalDiscount; }
    public void setTotalDiscount(BigDecimal totalDiscount) { this.totalDiscount = totalDiscount; }

    public BigDecimal getTotalGst() { return totalGst; }
    public void setTotalGst(BigDecimal totalGst) { this.totalGst = totalGst; }

    public BigDecimal getTotalBilled() { return totalBilled; }
    public void setTotalBilled(BigDecimal totalBilled) { this.totalBilled = totalBilled; }

    public BigDecimal getTotalPaid() { return totalPaid; }
    public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public List<BillingHistoryItemDto> getItems() { return items; }
    public void setItems(List<BillingHistoryItemDto> items) { this.items = items; }
}
