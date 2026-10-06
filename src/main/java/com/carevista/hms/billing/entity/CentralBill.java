package com.carevista.hms.billing.entity;

import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "central_bills", indexes = {
    @Index(name = "idx_cb_tenant", columnList = "tenant_id"),
    @Index(name = "idx_cb_date", columnList = "bill_date")
})
public class CentralBill {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "bill_number", nullable = false, length = 50, unique = true)
    private String billNumber;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "patient_id")
    private Patient patient;

    @Column(name = "subtotal", precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_pct", precision = 5, scale = 2)
    private BigDecimal discountPct = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "gst_pct", precision = 5, scale = 2)
    private BigDecimal gstPct = BigDecimal.ZERO;

    @Column(name = "gst_amount", precision = 12, scale = 2)
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(name = "net_amount", precision = 12, scale = 2)
    private BigDecimal netAmount = BigDecimal.ZERO;

    @Column(name = "final_total", precision = 12, scale = 2)
    private BigDecimal finalTotal = BigDecimal.ZERO;

    @Column(name = "amount_paid", precision = 12, scale = 2)
    private BigDecimal amountPaid = BigDecimal.ZERO;

    @Column(name = "balance", precision = 12, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "invoice_number", length = 50)
    private String invoiceNumber;

    @Column(name = "gst_number", length = 50)
    private String gstNumber;

    @Column(name = "patient_name", length = 150)
    private String patientName;

    @Column(name = "uhid", length = 50)
    private String uhid;

    @Column(name = "op_id", length = 50)
    private String opId;

    @Column(name = "ip_id", length = 50)
    private String ipId;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "doctor_name", length = 150)
    private String doctorName;

    @Column(name = "department", length = 100)
    private String department;

    @Column(name = "payment_method", length = 30)
    private String paymentMethod;

    @Column(name = "payment_status", length = 30)
    private String paymentStatus;

    @Column(name = "bill_date", nullable = false)
    private LocalDate billDate = LocalDate.now();

    @Column(name = "bill_time", length = 30)
    private String billTime;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @Column(name = "consolidated_notes", length = 500)
    private String consolidatedNotes;

    @OneToMany(mappedBy = "centralBill", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.EAGER)
    private List<CentralBillItem> items = new ArrayList<>();

    public List<CentralBillItem> getItems() { return items; }
    public void setItems(List<CentralBillItem> items) { this.items = items; }
    
    public void addItem(CentralBillItem item) {
        items.add(item);
        item.setCentralBill(this);
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }
    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }
    public Patient getPatient() { return patient; }
    public void setPatient(Patient patient) { this.patient = patient; }
    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }
    public BigDecimal getDiscountPct() { return discountPct; }
    public void setDiscountPct(BigDecimal discountPct) { this.discountPct = discountPct; }
    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }
    public BigDecimal getGstPct() { return gstPct; }
    public void setGstPct(BigDecimal gstPct) { this.gstPct = gstPct; }
    public BigDecimal getGstAmount() { return gstAmount; }
    public void setGstAmount(BigDecimal gstAmount) { this.gstAmount = gstAmount; }
    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }
    public BigDecimal getFinalTotal() { return finalTotal; }
    public void setFinalTotal(BigDecimal finalTotal) { this.finalTotal = finalTotal; }
    public BigDecimal getAmountPaid() { return amountPaid; }
    public void setAmountPaid(BigDecimal amountPaid) { this.amountPaid = amountPaid; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal balance) { this.balance = balance; }
    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }
    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    public LocalDate getBillDate() { return billDate; }
    public void setBillDate(LocalDate billDate) { this.billDate = billDate; }
    public String getInvoiceNumber() { return invoiceNumber; }
    public void setInvoiceNumber(String invoiceNumber) { this.invoiceNumber = invoiceNumber; }
    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }
    public String getBillTime() { return billTime; }
    public void setBillTime(String billTime) { this.billTime = billTime; }
    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }
    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }
    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }
    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }
    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }
    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getConsolidatedNotes() { return consolidatedNotes; }
    public void setConsolidatedNotes(String consolidatedNotes) { this.consolidatedNotes = consolidatedNotes; }

    @com.fasterxml.jackson.annotation.JsonProperty("patientId")
    public Long fetchPatientId() {
        return patient != null ? patient.getId() : null;
    }

    @Transient
    private List<com.carevista.hms.op.entity.OpRegistration> opRecords = new ArrayList<>();

    @Transient
    private List<com.carevista.hms.ip.entity.IpAdmission> ipRecords = new ArrayList<>();

    @Transient
    private List<com.carevista.hms.pharmacy.dto.PharmacyBillDto> pharmacyBills = new ArrayList<>();

    @Transient
    private List<com.carevista.hms.laboratory.dto.LabOrderDto> labOrders = new ArrayList<>();

    public List<com.carevista.hms.op.entity.OpRegistration> getOpRecords() { return opRecords; }
    public void setOpRecords(List<com.carevista.hms.op.entity.OpRegistration> opRecords) { this.opRecords = opRecords != null ? opRecords : new ArrayList<>(); }

    public List<com.carevista.hms.ip.entity.IpAdmission> getIpRecords() { return ipRecords; }
    public void setIpRecords(List<com.carevista.hms.ip.entity.IpAdmission> ipRecords) { this.ipRecords = ipRecords != null ? ipRecords : new ArrayList<>(); }

    public List<com.carevista.hms.pharmacy.dto.PharmacyBillDto> getPharmacyBills() { return pharmacyBills; }
    public void setPharmacyBills(List<com.carevista.hms.pharmacy.dto.PharmacyBillDto> pharmacyBills) { this.pharmacyBills = pharmacyBills != null ? pharmacyBills : new ArrayList<>(); }

    public List<com.carevista.hms.laboratory.dto.LabOrderDto> getLabOrders() { return labOrders; }
    public void setLabOrders(List<com.carevista.hms.laboratory.dto.LabOrderDto> labOrders) { this.labOrders = labOrders != null ? labOrders : new ArrayList<>(); }
}

