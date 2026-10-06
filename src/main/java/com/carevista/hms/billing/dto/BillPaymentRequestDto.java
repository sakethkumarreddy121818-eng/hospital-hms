package com.carevista.hms.billing.dto;

import java.math.BigDecimal;

public class BillPaymentRequestDto {

    private String moduleType; // OP, IP, PHARMACY, LABORATORY, CENTRAL / MAIN
    private Long billId;
    private String billNumber;
    private BigDecimal paymentAmount;
    private String paymentMethod = "CASH";
    private String notes;

    public BillPaymentRequestDto() {}

    public BillPaymentRequestDto(String moduleType, Long billId, String billNumber, BigDecimal paymentAmount, String paymentMethod, String notes) {
        this.moduleType = moduleType;
        this.billId = billId;
        this.billNumber = billNumber;
        this.paymentAmount = paymentAmount;
        this.paymentMethod = paymentMethod;
        this.notes = notes;
    }

    public String getModuleType() {
        return moduleType;
    }

    public void setModuleType(String moduleType) {
        this.moduleType = moduleType;
    }

    public Long getBillId() {
        return billId;
    }

    public void setBillId(Long billId) {
        this.billId = billId;
    }

    public String getBillNumber() {
        return billNumber;
    }

    public void setBillNumber(String billNumber) {
        this.billNumber = billNumber;
    }

    public BigDecimal getPaymentAmount() {
        return paymentAmount;
    }

    public void setPaymentAmount(BigDecimal paymentAmount) {
        this.paymentAmount = paymentAmount;
    }

    public String getPaymentMethod() {
        return paymentMethod;
    }

    public void setPaymentMethod(String paymentMethod) {
        this.paymentMethod = paymentMethod;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }
}
