package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.PharmacyBill;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class PharmacyBillDto {

    private Long id;
    private String billNumber;
    private String billDate;
    private String billTime;
    private String patientName;
    private String uhid;
    private String phone;
    private Integer age;
    private String gender;
    private String opId;
    private String ipId;
    private String doctorName;
    private String department;

    private BigDecimal subtotal;
    private BigDecimal discountPercentage;
    private BigDecimal discountAmount;
    private String gstNumber;
    private BigDecimal gstPercentage;
    private BigDecimal gstAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private String paymentMethod;
    private String paymentStatus;
    private String notes;
    private String hospitalName;

    public BigDecimal getFinalTotal() {
        return totalAmount;
    }

    public void setFinalTotal(BigDecimal finalTotal) {
        this.totalAmount = finalTotal;
    }

    private List<PharmacyBillItemDto> items = new ArrayList<>();

    public PharmacyBillDto() {}

    public static PharmacyBillDto fromEntity(PharmacyBill b) {
        if (b == null) return null;
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        PharmacyBillDto dto = new PharmacyBillDto();
        dto.setId(b.getId());
        dto.setBillNumber(b.getBillNumber());
        dto.setBillDate(b.getBillDate() != null ? b.getBillDate().format(dateFmt) : "");
        dto.setBillTime(b.getBillTime());
        dto.setPatientName(b.getPatientName());
        dto.setUhid(b.getUhid());
        dto.setPhone(b.getPhone());

        if (b.getPatient() != null) {
            if (dto.getUhid() == null) dto.setUhid(b.getPatient().getUhid());
            if (dto.getPhone() == null) dto.setPhone(b.getPatient().getPhone());
            dto.setAge(b.getPatient().getAge());
            dto.setGender(b.getPatient().getGender());
        }

        dto.setOpId(b.getOpId());
        dto.setIpId(b.getIpId());
        dto.setDoctorName(b.getDoctorName());
        dto.setDepartment(b.getDepartment());

        dto.setSubtotal(b.getSubtotal());
        dto.setDiscountPercentage(b.getDiscountPercentage());
        dto.setDiscountAmount(b.getDiscountAmount());
        dto.setGstNumber(b.getGstNumber());
        dto.setGstPercentage(b.getGstPercentage());
        dto.setGstAmount(b.getGstAmount());
        dto.setTotalAmount(b.getTotalAmount());
        dto.setPaidAmount(b.getPaidAmount());
        dto.setBalanceAmount(b.getBalanceAmount());
        dto.setPaymentMethod(b.getPaymentMethod());
        dto.setPaymentStatus(b.getPaymentStatus());
        dto.setNotes(b.getNotes());

        if (b.getTenant() != null) {
            try {
                dto.setHospitalName(b.getTenant().getHospitalName());
            } catch (Exception ignored) {}
        }

        if (b.getItems() != null) {
            dto.setItems(b.getItems().stream()
                    .map(PharmacyBillItemDto::fromEntity)
                    .collect(Collectors.toList()));
        }

        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getBillNumber() { return billNumber; }
    public void setBillNumber(String billNumber) { this.billNumber = billNumber; }

    public String getBillDate() { return billDate; }
    public void setBillDate(String billDate) { this.billDate = billDate; }

    public String getBillTime() { return billTime; }
    public void setBillTime(String billTime) { this.billTime = billTime; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(BigDecimal discountPercentage) { this.discountPercentage = discountPercentage; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }

    public BigDecimal getGstPercentage() { return gstPercentage; }
    public void setGstPercentage(BigDecimal gstPercentage) { this.gstPercentage = gstPercentage; }

    public BigDecimal getGstAmount() { return gstAmount; }
    public void setGstAmount(BigDecimal gstAmount) { this.gstAmount = gstAmount; }

    public BigDecimal getTotalAmount() { return totalAmount; }
    public void setTotalAmount(BigDecimal totalAmount) { this.totalAmount = totalAmount; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getBalanceAmount() { return balanceAmount; }
    public void setBalanceAmount(BigDecimal balanceAmount) { this.balanceAmount = balanceAmount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public List<PharmacyBillItemDto> getItems() { return items; }
    public void setItems(List<PharmacyBillItemDto> items) { this.items = items; }
}
