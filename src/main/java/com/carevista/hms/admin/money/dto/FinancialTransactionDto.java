package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;

public class FinancialTransactionDto {

    private String id;
    private String type; // REVENUE, EXPENSE
    private String category;
    private String source; // OP, IP, PHARMACY, LABORATORY, CENTRAL, PHARMACY_PURCHASE, OPERATIONAL
    private String referenceNumber;
    private String patientName;
    private String supplierName;
    private String doctorName;
    private String date;
    private String time;
    private BigDecimal amount = BigDecimal.ZERO;
    private String paymentStatus; // PAID, PARTIALLY PAID, UNPAID
    private String paymentMethod; // CASH, CARD, UPI, BANK_TRANSFER, CHEQUE

    public FinancialTransactionDto() {}

    public FinancialTransactionDto(String id, String type, String category, String source,
                                   String referenceNumber, String patientName, String supplierName,
                                   String doctorName, String date, String time, BigDecimal amount,
                                   String paymentStatus, String paymentMethod) {
        this.id = id;
        this.type = type;
        this.category = category;
        this.source = source;
        this.referenceNumber = referenceNumber;
        this.patientName = patientName;
        this.supplierName = supplierName;
        this.doctorName = doctorName;
        this.date = date;
        this.time = time;
        this.amount = amount != null ? amount : BigDecimal.ZERO;
        this.paymentStatus = paymentStatus != null ? paymentStatus : "PAID";
        this.paymentMethod = paymentMethod != null ? paymentMethod : "CASH";
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }

    public String getReferenceNumber() { return referenceNumber; }
    public void setReferenceNumber(String referenceNumber) { this.referenceNumber = referenceNumber; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDate() { return date; }
    public void setDate(String date) { this.date = date; }

    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
}
