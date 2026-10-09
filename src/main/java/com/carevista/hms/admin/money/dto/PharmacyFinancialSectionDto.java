package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class PharmacyFinancialSectionDto {

    private long totalBills = 0;
    private BigDecimal totalSales = BigDecimal.ZERO;
    private BigDecimal totalCollections = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;
    private BigDecimal totalDiscounts = BigDecimal.ZERO;
    private BigDecimal totalGst = BigDecimal.ZERO;
    private List<PharmacyFinancialRecordDto> records = new ArrayList<>();

    public PharmacyFinancialSectionDto() {}

    public long getTotalBills() { return totalBills; }
    public void setTotalBills(long totalBills) { this.totalBills = totalBills; }

    public BigDecimal getTotalSales() { return totalSales; }
    public void setTotalSales(BigDecimal totalSales) { this.totalSales = totalSales; }

    public BigDecimal getTotalCollections() { return totalCollections; }
    public void setTotalCollections(BigDecimal totalCollections) { this.totalCollections = totalCollections; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public BigDecimal getTotalDiscounts() { return totalDiscounts; }
    public void setTotalDiscounts(BigDecimal totalDiscounts) { this.totalDiscounts = totalDiscounts; }

    public BigDecimal getTotalGst() { return totalGst; }
    public void setTotalGst(BigDecimal totalGst) { this.totalGst = totalGst; }

    public List<PharmacyFinancialRecordDto> getRecords() { return records; }
    public void setRecords(List<PharmacyFinancialRecordDto> records) { this.records = records; }
}
