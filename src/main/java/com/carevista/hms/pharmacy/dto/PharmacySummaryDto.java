package com.carevista.hms.pharmacy.dto;

import java.math.BigDecimal;

public class PharmacySummaryDto {

    private long todayBillsCount;
    private BigDecimal todayRevenue = BigDecimal.ZERO;
    private long totalMedicines;
    private long availableStock;
    private long lowStockCount;
    private long outOfStockCount;
    private long expiringSoonCount;
    private long expiredCount;
    private long totalBatchesCount;

    public PharmacySummaryDto() {}

    public PharmacySummaryDto(long todayBillsCount, BigDecimal todayRevenue, long totalMedicines, long lowStockCount) {
        this.todayBillsCount = todayBillsCount;
        this.todayRevenue = todayRevenue != null ? todayRevenue : BigDecimal.ZERO;
        this.totalMedicines = totalMedicines;
        this.lowStockCount = lowStockCount;
    }

    public PharmacySummaryDto(long todayBillsCount, BigDecimal todayRevenue, long totalMedicines, long availableStock,
                              long lowStockCount, long outOfStockCount, long expiringSoonCount, long expiredCount, long totalBatchesCount) {
        this.todayBillsCount = todayBillsCount;
        this.todayRevenue = todayRevenue != null ? todayRevenue : BigDecimal.ZERO;
        this.totalMedicines = totalMedicines;
        this.availableStock = availableStock;
        this.lowStockCount = lowStockCount;
        this.outOfStockCount = outOfStockCount;
        this.expiringSoonCount = expiringSoonCount;
        this.expiredCount = expiredCount;
        this.totalBatchesCount = totalBatchesCount;
    }

    public long getTodayBillsCount() { return todayBillsCount; }
    public void setTodayBillsCount(long todayBillsCount) { this.todayBillsCount = todayBillsCount; }

    public BigDecimal getTodayRevenue() { return todayRevenue; }
    public void setTodayRevenue(BigDecimal todayRevenue) { this.todayRevenue = todayRevenue; }

    public long getTotalMedicines() { return totalMedicines; }
    public void setTotalMedicines(long totalMedicines) { this.totalMedicines = totalMedicines; }

    public long getAvailableStock() { return availableStock; }
    public void setAvailableStock(long availableStock) { this.availableStock = availableStock; }

    public long getLowStockCount() { return lowStockCount; }
    public void setLowStockCount(long lowStockCount) { this.lowStockCount = lowStockCount; }

    public long getOutOfStockCount() { return outOfStockCount; }
    public void setOutOfStockCount(long outOfStockCount) { this.outOfStockCount = outOfStockCount; }
    public long getOutOfStockBatchesCount() { return outOfStockCount; }

    public long getExpiringSoonCount() { return expiringSoonCount; }
    public void setExpiringSoonCount(long expiringSoonCount) { this.expiringSoonCount = expiringSoonCount; }
    public long getExpiringSoonBatchesCount() { return expiringSoonCount; }

    public long getExpiredCount() { return expiredCount; }
    public void setExpiredCount(long expiredCount) { this.expiredCount = expiredCount; }
    public long getExpiredBatchesCount() { return expiredCount; }

    public long getTotalBatchesCount() { return totalBatchesCount; }
    public void setTotalBatchesCount(long totalBatchesCount) { this.totalBatchesCount = totalBatchesCount; }
}
