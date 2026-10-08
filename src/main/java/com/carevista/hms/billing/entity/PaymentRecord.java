package com.carevista.hms.billing.entity;

import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "payment_records", indexes = {
    @Index(name = "idx_pay_tenant", columnList = "tenant_id"),
    @Index(name = "idx_pay_date", columnList = "payment_date"),
    @Index(name = "idx_pay_module", columnList = "module_type")
})
public class PaymentRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "transaction_id", nullable = false, length = 50)
    private String transactionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(name = "patient_name", length = 150)
    private String patientName;

    @Column(name = "module_type", nullable = false, length = 30)
    private String moduleType; // OP, IP, PHARMACY, LABORATORY, CENTRAL

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod = "CASH"; // CASH, CARD, UPI, BANK_TRANSFER, INSURANCE

    @Column(name = "payment_date", nullable = false)
    private LocalDate paymentDate = LocalDate.now();

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "bill_id")
    private Long billId;

    @Column(name = "bill_number", length = 100)
    private String billNumber;

    @Column(name = "invoice_number", length = 100)
    private String invoiceNumber;

    @Column(name = "uhid", length = 50)
    private String uhid;

    @Column(name = "op_id", length = 50)
    private String opId;

    @Column(name = "ip_id", length = 50)
    private String ipId;

    @Column(name = "total_paid", precision = 12, scale = 2)
    private BigDecimal totalPaid;

    @Column(name = "remaining_balance", precision = 12, scale = 2)
    private BigDecimal remainingBalance;

    @Column(name = "payment_status", length = 50)
    private String paymentStatus;

    @Column(name = "payment_time", length = 30)
    private String paymentTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public PaymentRecord() {}

    public PaymentRecord(Tenant tenant, String transactionId, Patient patient, String patientName, String moduleType, BigDecimal amount, String paymentMethod, LocalDate paymentDate) {
        this.tenant = tenant;
        this.transactionId = transactionId;
        this.patient = patient;
        this.patientName = patientName;
        this.moduleType = moduleType;
        this.amount = amount != null ? amount : BigDecimal.ZERO;
        this.paymentMethod = paymentMethod != null ? paymentMethod : "CASH";
        this.paymentDate = paymentDate != null ? paymentDate : LocalDate.now();
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getModuleType() { return moduleType; }
    public void setModuleType(String moduleType) { this.moduleType = moduleType; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public LocalDate getPaymentDate() { return paymentDate; }
    public void setPaymentDate(LocalDate paymentDate) { this.paymentDate = paymentDate; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public Long getBillId() { return billId; }
    public void setBillId(Long billId) { this.billId = billId; }

    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }

    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }

    public BigDecimal getTotalPaid() { return totalPaid; }
    public void setTotalPaid(BigDecimal totalPaid) { this.totalPaid = totalPaid; }

    public BigDecimal getRemainingBalance() { return remainingBalance; }
    public void setRemainingBalance(BigDecimal remainingBalance) { this.remainingBalance = remainingBalance; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getPaymentTime() { return paymentTime; }
    public void setPaymentTime(String paymentTime) { this.paymentTime = paymentTime; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
