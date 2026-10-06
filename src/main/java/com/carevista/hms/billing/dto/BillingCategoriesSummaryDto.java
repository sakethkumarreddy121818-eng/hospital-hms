package com.carevista.hms.billing.dto;

import java.math.BigDecimal;

public class BillingCategoriesSummaryDto {
    private CategoryStat op = new CategoryStat();
    private CategoryStat ip = new CategoryStat();
    private CategoryStat pharmacy = new CategoryStat();
    private CategoryStat laboratory = new CategoryStat();
    private CategoryStat central = new CategoryStat();

    public static class CategoryStat {
        private long count;
        private BigDecimal billed = BigDecimal.ZERO;
        private BigDecimal paid = BigDecimal.ZERO;
        private BigDecimal balance = BigDecimal.ZERO;

        public CategoryStat() {}

        public CategoryStat(long count, BigDecimal billed, BigDecimal paid, BigDecimal balance) {
            this.count = count;
            this.billed = billed != null ? billed : BigDecimal.ZERO;
            this.paid = paid != null ? paid : BigDecimal.ZERO;
            this.balance = balance != null ? balance : BigDecimal.ZERO;
        }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }
        public BigDecimal getBilled() { return billed; }
        public void setBilled(BigDecimal billed) { this.billed = billed; }
        public BigDecimal getPaid() { return paid; }
        public void setPaid(BigDecimal paid) { this.paid = paid; }
        public BigDecimal getBalance() { return balance; }
        public void setBalance(BigDecimal balance) { this.balance = balance; }
    }

    public CategoryStat getOp() { return op; }
    public void setOp(CategoryStat op) { this.op = op; }
    public CategoryStat getIp() { return ip; }
    public void setIp(CategoryStat ip) { this.ip = ip; }
    public CategoryStat getPharmacy() { return pharmacy; }
    public void setPharmacy(CategoryStat pharmacy) { this.pharmacy = pharmacy; }
    public CategoryStat getLaboratory() { return laboratory; }
    public void setLaboratory(CategoryStat laboratory) { this.laboratory = laboratory; }
    public CategoryStat getCentral() { return central; }
    public void setCentral(CategoryStat central) { this.central = central; }
}
