package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;

public class RevenueSourcesDto {

    private SourceStat op;
    private SourceStat ip;
    private SourceStat pharmacy;
    private SourceStat laboratory;
    private SourceStat doctors;
    private SourceStat other;

    private BigDecimal totalBilled = BigDecimal.ZERO;
    private BigDecimal totalCollected = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;

    public RevenueSourcesDto() {}

    public static class SourceStat {
        private String name;
        private BigDecimal billed = BigDecimal.ZERO;
        private BigDecimal collected = BigDecimal.ZERO;
        private BigDecimal outstanding = BigDecimal.ZERO;
        private long count = 0;
        private double percentage = 0.0;

        public SourceStat() {}

        public SourceStat(String name, BigDecimal billed, BigDecimal collected, BigDecimal outstanding, long count, double percentage) {
            this.name = name;
            this.billed = billed != null ? billed : BigDecimal.ZERO;
            this.collected = collected != null ? collected : BigDecimal.ZERO;
            this.outstanding = outstanding != null ? outstanding : BigDecimal.ZERO;
            this.count = count;
            this.percentage = percentage;
        }

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }

        public BigDecimal getBilled() { return billed; }
        public void setBilled(BigDecimal billed) { this.billed = billed; }

        public BigDecimal getCollected() { return collected; }
        public void setCollected(BigDecimal collected) { this.collected = collected; }

        public BigDecimal getOutstanding() { return outstanding; }
        public void setOutstanding(BigDecimal outstanding) { this.outstanding = outstanding; }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }

        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
    }

    public SourceStat getOp() { return op; }
    public void setOp(SourceStat op) { this.op = op; }

    public SourceStat getIp() { return ip; }
    public void setIp(SourceStat ip) { this.ip = ip; }

    public SourceStat getPharmacy() { return pharmacy; }
    public void setPharmacy(SourceStat pharmacy) { this.pharmacy = pharmacy; }

    public SourceStat getLaboratory() { return laboratory; }
    public void setLaboratory(SourceStat laboratory) { this.laboratory = laboratory; }

    public SourceStat getDoctors() { return doctors; }
    public void setDoctors(SourceStat doctors) { this.doctors = doctors; }

    public SourceStat getOther() { return other; }
    public void setOther(SourceStat other) { this.other = other; }

    public BigDecimal getTotalBilled() { return totalBilled; }
    public void setTotalBilled(BigDecimal totalBilled) { this.totalBilled = totalBilled; }

    public BigDecimal getTotalCollected() { return totalCollected; }
    public void setTotalCollected(BigDecimal totalCollected) { this.totalCollected = totalCollected; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }
}
