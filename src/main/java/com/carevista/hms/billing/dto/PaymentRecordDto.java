package com.carevista.hms.billing.dto;

import com.carevista.hms.billing.entity.PaymentRecord;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class PaymentRecordDto {

    private Long id;
    private String transactionId;
    private Long patientId;
    private String patientName;
    private String uhid;
    private String opId;
    private String ipId;
    private String moduleType;
    private Long billId;
    private String billNumber;
    private String invoiceNumber;
    private BigDecimal amount;
    private BigDecimal totalPaid;
    private BigDecimal remainingBalance;
    private String paymentStatus;
    private String paymentMethod;
    private LocalDate paymentDate;
    private String paymentTime;
    private String notes;
    private LocalDateTime createdAt;
    private String createdAtFormatted;

    public PaymentRecordDto() {}

    public static PaymentRecordDto fromEntity(PaymentRecord pr) {
        if (pr == null) return null;
        PaymentRecordDto dto = new PaymentRecordDto();
        dto.setId(pr.getId());
        dto.setTransactionId(pr.getTransactionId());
        if (pr.getPatient() != null) {
            dto.setPatientId(pr.getPatient().getId());
            dto.setUhid(pr.getPatient().getUhid());
        }
        if (dto.getUhid() == null && pr.getUhid() != null) {
            dto.setUhid(pr.getUhid());
        }
        dto.setPatientName(pr.getPatientName() != null ? pr.getPatientName() : (pr.getPatient() != null ? pr.getPatient().getFullName() : "Patient"));
        dto.setOpId(pr.getOpId());
        dto.setIpId(pr.getIpId());
        dto.setModuleType(pr.getModuleType());
        dto.setBillId(pr.getBillId());
        dto.setBillNumber(pr.getBillNumber());
        dto.setInvoiceNumber(pr.getInvoiceNumber());
        dto.setAmount(pr.getAmount() != null ? pr.getAmount() : BigDecimal.ZERO);
        dto.setTotalPaid(pr.getTotalPaid() != null ? pr.getTotalPaid() : pr.getAmount());
        dto.setRemainingBalance(pr.getRemainingBalance() != null ? pr.getRemainingBalance() : BigDecimal.ZERO);
        dto.setPaymentStatus(pr.getPaymentStatus() != null ? pr.getPaymentStatus() : "PAID");
        dto.setPaymentMethod(pr.getPaymentMethod() != null ? pr.getPaymentMethod() : "CASH");
        dto.setPaymentDate(pr.getPaymentDate() != null ? pr.getPaymentDate() : LocalDate.now());
        dto.setPaymentTime(pr.getPaymentTime() != null ? pr.getPaymentTime() :
                (pr.getCreatedAt() != null ? pr.getCreatedAt().format(DateTimeFormatter.ofPattern("hh:mm a")) : ""));
        dto.setNotes(pr.getNotes());
        dto.setCreatedAt(pr.getCreatedAt());
        if (pr.getCreatedAt() != null) {
            dto.setCreatedAtFormatted(pr.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a")));
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }

    public String getModuleType() { return moduleType; }
    public void setModuleType(String moduleType) { this.moduleType = moduleType; }

    public Long getBillId() { return billId; }
    public void setBillId(Long billId) { this.billId = billId; }

    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getTotalPaid() { return totalPaid; }
    public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

    public BigDecimal getRemainingBalance() { return remainingBalance; }
    public void setRemainingBalance(BigDecimal remainingBalance) { this.remainingBalance = remainingBalance; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getPaymentTime() { return paymentTime; }
    public void setPaymentTime(String paymentTime) { this.paymentTime = paymentTime; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public String getCreatedAtFormatted() { return createdAtFormatted; }
    public void setCreatedAtFormatted(String createdAtFormatted) { this.createdAtFormatted = createdAtFormatted; }
}
