package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class OpFinancialSectionDto {

    private long totalBills = 0;
    private BigDecimal totalBilledAmount = BigDecimal.ZERO;
    private BigDecimal totalCollections = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;
    private BigDecimal totalDiscounts = BigDecimal.ZERO;
    private BigDecimal totalGst = BigDecimal.ZERO;
    private List<OpFinancialRecordDto> records = new ArrayList<>();

    public OpFinancialSectionDto() {}

    public long getTotalBills() { return totalBills; }
    public void setTotalBills(long totalBills) { this.totalBills = totalBills; }

    public BigDecimal getTotalBilledAmount() { return totalBilledAmount; }
    public void setTotalBilledAmount(BigDecimal totalBilledAmount) { this.totalBilledAmount = totalBilledAmount; }

    public BigDecimal getTotalCollections() { return totalCollections; }
    public void setTotalCollections(BigDecimal totalCollections) { this.totalCollections = totalCollections; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public BigDecimal getTotalDiscounts() { return totalDiscounts; }
    public void setTotalDiscounts(BigDecimal totalDiscounts) { this.totalDiscounts = totalDiscounts; }

    public BigDecimal getTotalGst() { return totalGst; }
    public void setTotalGst(BigDecimal totalGst) { this.totalGst = totalGst; }

    public List<OpFinancialRecordDto> getRecords() { return records; }
    public void setRecords(List<OpFinancialRecordDto> records) { this.records = records; }
}
