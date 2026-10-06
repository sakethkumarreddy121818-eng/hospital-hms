package com.carevista.hms.op.entity;

import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "op_registrations", indexes = {
    @Index(name = "idx_op_tenant", columnList = "tenant_id"),
    @Index(name = "idx_op_date", columnList = "visit_date"),
    @Index(name = "idx_op_number", columnList = "op_id")
})
public class OpRegistration {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "op_id", nullable = false, length = 50)
    private String opId;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "doctor_name", nullable = false, length = 100)
    private String doctorName;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "consultation_fee", precision = 10, scale = 2)
    private BigDecimal consultationFee = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "REGISTERED";

    @Column(name = "visit_date", nullable = false)
    private LocalDate visitDate = LocalDate.now();

    @Column(name = "registration_time", length = 30)
    private String registrationTime;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod = "CASH";

    @Column(name = "payment_status", length = 50)
    private String paymentStatus = "PAID";

    @Column(name = "paid_amount", precision = 10, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "balance_amount", precision = 10, scale = 2)
    private BigDecimal balanceAmount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public OpRegistration() {}

    public OpRegistration(Tenant tenant, String opId, Patient patient, String doctorName, String department, BigDecimal consultationFee, LocalDate visitDate) {
        this(tenant, opId, patient, doctorName, department, consultationFee, visitDate, null, "CASH", "PAID");
    }

    public OpRegistration(Tenant tenant, String opId, Patient patient, String doctorName, String department, BigDecimal consultationFee, LocalDate visitDate, String registrationTime, String paymentMethod, String paymentStatus) {
        this.tenant = tenant;
        this.opId = opId;
        this.patient = patient;
        this.doctorName = doctorName;
        this.department = department;
        this.consultationFee = consultationFee != null ? consultationFee : BigDecimal.ZERO;
        this.visitDate = visitDate != null ? visitDate : LocalDate.now();
        this.registrationTime = registrationTime;
        this.paymentMethod = paymentMethod != null ? paymentMethod : "CASH";
        this.paymentStatus = paymentStatus != null ? paymentStatus : "PAID";
        this.status = "REGISTERED";
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }

    public String getRegistrationTime() { return registrationTime; }
    public void setRegistrationTime(String registrationTime) { this.registrationTime = registrationTime; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getPaidAmount() {
        if (paidAmount != null) return paidAmount;
        if ("PAID".equalsIgnoreCase(paymentStatus)) {
            return consultationFee != null ? consultationFee : BigDecimal.ZERO;
        }
        return BigDecimal.ZERO;
    }

    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
    }

    public BigDecimal getBalanceAmount() {
        if (balanceAmount != null) return balanceAmount;
        BigDecimal fee = consultationFee != null ? consultationFee : BigDecimal.ZERO;
        return fee.subtract(getPaidAmount()).max(BigDecimal.ZERO);
    }

    public void setBalanceAmount(BigDecimal balanceAmount) {
        this.balanceAmount = balanceAmount;
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
