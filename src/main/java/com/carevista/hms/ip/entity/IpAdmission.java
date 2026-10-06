package com.carevista.hms.ip.entity;

import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "ip_admissions", indexes = {
    @Index(name = "idx_ip_tenant", columnList = "tenant_id"),
    @Index(name = "idx_ip_date", columnList = "admission_date"),
    @Index(name = "idx_ip_number", columnList = "ip_id"),
    @Index(name = "idx_ip_status", columnList = "status")
})
public class IpAdmission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "ip_id", nullable = false, length = 50)
    private String ipId; // e.g. IP-20260929-0001

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "patient_id", nullable = false)
    private Patient patient;

    @Column(name = "op_id", length = 50)
    private String opId; // Associated OPD ID if referred

    @Column(name = "doctor_name", nullable = false, length = 100)
    private String doctorName;

    @Column(name = "department", length = 80)
    private String department = "General Medicine";

    @Column(name = "ward_name", length = 50)
    private String wardName = "GENERAL WARD";

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "room_id")
    private Room room;

    @Column(name = "room_number", length = 30)
    private String roomNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "bed_id")
    private Bed bed;

    @Column(name = "bed_number", length = 30)
    private String bedNumber;

    @Column(name = "reason_for_admission", length = 500)
    private String reasonForAdmission;

    @Column(name = "diagnosis", length = 1000)
    private String diagnosis;

    @Column(name = "admission_notes", length = 1000)
    private String admissionNotes;

    @Column(name = "discharge_notes", length = 1000)
    private String dischargeNotes;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ADMITTED"; // ADMITTED, DISCHARGED

    @Column(name = "admission_date", nullable = false)
    private LocalDate admissionDate = LocalDate.now();

    @Column(name = "admission_time", length = 30)
    private String admissionTime; // e.g. "07:30 pm"

    @Column(name = "discharge_date")
    private LocalDate dischargeDate;

    @Column(name = "discharge_time", length = 30)
    private String dischargeTime;

    @Column(name = "room_price", precision = 10, scale = 2)
    private BigDecimal roomPrice = BigDecimal.ZERO;

    @Column(name = "bed_price", precision = 10, scale = 2)
    private BigDecimal bedPrice = BigDecimal.ZERO;

    @Column(name = "deposit_amount", precision = 10, scale = 2)
    private BigDecimal depositAmount = BigDecimal.ZERO;

    @Column(name = "total_charges", precision = 10, scale = 2)
    private BigDecimal totalCharges = BigDecimal.ZERO;

    @Column(name = "payment_method", length = 40)
    private String paymentMethod = "CASH"; // CASH, CARD, UPI, BANK_TRANSFER, INSURANCE

    @Column(name = "payment_status", length = 30)
    private String paymentStatus = "PAID"; // PAID, PARTIALLY PAID, UNPAID

    @Column(name = "paid_amount", precision = 10, scale = 2)
    private BigDecimal paidAmount;

    @Column(name = "balance_amount", precision = 10, scale = 2)
    private BigDecimal balanceAmount;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public IpAdmission() {}

    public IpAdmission(Tenant tenant, String ipId, Patient patient, String doctorName, String wardName, String roomNumber, String bedNumber, LocalDate admissionDate) {
        this.tenant = tenant;
        this.ipId = ipId;
        this.patient = patient;
        this.doctorName = doctorName;
        this.department = "General Medicine";
        this.wardName = wardName != null ? wardName : "GENERAL WARD";
        this.roomNumber = roomNumber;
        this.bedNumber = bedNumber;
        this.admissionDate = admissionDate != null ? admissionDate : LocalDate.now();
        this.admissionTime = "10:00 AM";
        this.status = "ADMITTED";
        this.createdAt = LocalDateTime.now();
    }

    public IpAdmission(Tenant tenant, String ipId, Patient patient, String doctorName, String department, String wardName, Room room, String roomNumber, Bed bed, String bedNumber, LocalDate admissionDate, String admissionTime) {
        this.tenant = tenant;
        this.ipId = ipId;
        this.patient = patient;
        this.doctorName = doctorName;
        this.department = department != null ? department : "General Medicine";
        this.wardName = wardName != null ? wardName : "GENERAL WARD";
        this.room = room;
        this.roomNumber = roomNumber;
        this.bed = bed;
        this.bedNumber = bedNumber;
        this.admissionDate = admissionDate != null ? admissionDate : LocalDate.now();
        this.admissionTime = admissionTime;
        this.status = "ADMITTED";
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }

    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getWardName() { return wardName; }
    public void setWardName(String wardName) { this.wardName = wardName; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public Bed getBed() { return bed; }
    public void setBed(Bed bed) { this.bed = bed; }

    public String getBedNumber() { return bedNumber; }
    public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }

    public String getReasonForAdmission() { return reasonForAdmission; }
    public void setReasonForAdmission(String reasonForAdmission) { this.reasonForAdmission = reasonForAdmission; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getAdmissionNotes() { return admissionNotes; }
    public void setAdmissionNotes(String admissionNotes) { this.admissionNotes = admissionNotes; }

    public String getDischargeNotes() { return dischargeNotes; }
    public void setDischargeNotes(String dischargeNotes) { this.dischargeNotes = dischargeNotes; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDate getAdmissionDate() { return admissionDate; }
    public void setAdmissionDate(LocalDate admissionDate) { this.admissionDate = admissionDate; }

    public String getAdmissionTime() { return admissionTime; }
    public void setAdmissionTime(String admissionTime) { this.admissionTime = admissionTime; }

    public LocalDate getDischargeDate() { return dischargeDate; }
    public void setDischargeDate(LocalDate dischargeDate) { this.dischargeDate = dischargeDate; }

    public String getDischargeTime() { return dischargeTime; }
    public void setDischargeTime(String dischargeTime) { this.dischargeTime = dischargeTime; }

    public BigDecimal getRoomPrice() { return roomPrice; }
    public void setRoomPrice(BigDecimal roomPrice) { this.roomPrice = roomPrice; }

    public BigDecimal getBedPrice() { return bedPrice; }
    public void setBedPrice(BigDecimal bedPrice) { this.bedPrice = bedPrice; }

    public BigDecimal getDepositAmount() { return depositAmount; }
    public void setDepositAmount(BigDecimal depositAmount) { this.depositAmount = depositAmount; }

    public BigDecimal getTotalCharges() { return totalCharges; }
    public void setTotalCharges(BigDecimal totalCharges) { this.totalCharges = totalCharges; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getPaidAmount() {
        if (paidAmount != null) return paidAmount;
        if ("PAID".equalsIgnoreCase(paymentStatus)) {
            return totalCharges != null && totalCharges.compareTo(BigDecimal.ZERO) > 0 ? totalCharges : (depositAmount != null ? depositAmount : BigDecimal.ZERO);
        }
        return depositAmount != null ? depositAmount : BigDecimal.ZERO;
    }

    public void setPaidAmount(BigDecimal paidAmount) {
        this.paidAmount = paidAmount;
        if (paidAmount != null) {
            this.depositAmount = paidAmount;
        }
    }

    public BigDecimal getBalanceAmount() {
        if (balanceAmount != null) return balanceAmount;
        BigDecimal tot = totalCharges != null && totalCharges.compareTo(BigDecimal.ZERO) > 0 ? totalCharges :
                (roomPrice != null ? roomPrice : BigDecimal.ZERO).add(bedPrice != null ? bedPrice : BigDecimal.ZERO);
        if (tot.compareTo(BigDecimal.ZERO) <= 0 && depositAmount != null) {
            tot = depositAmount;
        }
        return tot.subtract(getPaidAmount()).max(BigDecimal.ZERO);
    }

    public void setBalanceAmount(BigDecimal balanceAmount) {
        this.balanceAmount = balanceAmount;
    }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
