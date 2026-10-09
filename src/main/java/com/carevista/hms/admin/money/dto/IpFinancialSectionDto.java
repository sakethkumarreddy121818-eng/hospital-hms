package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class IpFinancialSectionDto {

    private long totalAdmissions = 0;
    private BigDecimal totalBilledAmount = BigDecimal.ZERO;
    private BigDecimal totalCollections = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;
    private BigDecimal totalRoomCharges = BigDecimal.ZERO;
    private BigDecimal totalBedCharges = BigDecimal.ZERO;
    private BigDecimal totalOtherCharges = BigDecimal.ZERO;
    private BigDecimal totalDiscounts = BigDecimal.ZERO;
    private BigDecimal totalGst = BigDecimal.ZERO;
    private List<IpFinancialRecordDto> records = new ArrayList<>();

    public IpFinancialSectionDto() {}

    public long getTotalAdmissions() { return totalAdmissions; }
    public void setTotalAdmissions(long totalAdmissions) { this.totalAdmissions = totalAdmissions; }

    public BigDecimal getTotalBilledAmount() { return totalBilledAmount; }
    public void setTotalBilledAmount(BigDecimal totalBilledAmount) { this.totalBilledAmount = totalBilledAmount; }

    public BigDecimal getTotalCollections() { return totalCollections; }
    public void setTotalCollections(BigDecimal totalCollections) { this.totalCollections = totalCollections; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public BigDecimal getTotalRoomCharges() { return totalRoomCharges; }
    public void setTotalRoomCharges(BigDecimal totalRoomCharges) { this.totalRoomCharges = totalRoomCharges; }

    public BigDecimal getTotalBedCharges() { return totalBedCharges; }
    public void setTotalBedCharges(BigDecimal totalBedCharges) { this.totalBedCharges = totalBedCharges; }

    public BigDecimal getTotalOtherCharges() { return totalOtherCharges; }
    public void setTotalOtherCharges(BigDecimal totalOtherCharges) { this.totalOtherCharges = totalOtherCharges; }

    public BigDecimal getTotalDiscounts() { return totalDiscounts; }
    public void setTotalDiscounts(BigDecimal totalDiscounts) { this.totalDiscounts = totalDiscounts; }

    public BigDecimal getTotalGst() { return totalGst; }
    public void setTotalGst(BigDecimal totalGst) { this.totalGst = totalGst; }

    public List<IpFinancialRecordDto> getRecords() { return records; }
    public void setRecords(List<IpFinancialRecordDto> records) { this.records = records; }
}
