package com.carevista.hms.pharmacy.dto;

import java.math.BigDecimal;

public class PharmacySummaryDto {

    private long todayBillsCount;
    private BigDecimal todayRevenue = BigDecimal.ZERO;
    private long totalMedicines;
    private long lowStockCount;

    public PharmacySummaryDto() {}

    public PharmacySummaryDto(long todayBillsCount, BigDecimal todayRevenue, long totalMedicines, long lowStockCount) {
        this.todayBillsCount = todayBillsCount;
        this.todayRevenue = todayRevenue != null ? todayRevenue : BigDecimal.ZERO;
        this.totalMedicines = totalMedicines;
        this.lowStockCount = lowStockCount;
    }

    public long getTodayBillsCount() { return todayBillsCount; }
    public void setTodayBillsCount(long todayBillsCount) { this.todayBillsCount = todayBillsCount; }

    public BigDecimal getTodayRevenue() { return todayRevenue; }
    public void setTodayRevenue(BigDecimal todayRevenue) { this.todayRevenue = todayRevenue; }

    public long getTotalMedicines() { return totalMedicines; }
    public void setTotalMedicines(long totalMedicines) { this.totalMedicines = totalMedicines; }

    public long getLowStockCount() { return lowStockCount; }
    public void setLowStockCount(long lowStockCount) { this.lowStockCount = lowStockCount; }
}
