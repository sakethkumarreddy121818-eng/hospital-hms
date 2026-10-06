package com.carevista.hms.billing.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class BillingConsolidatedDto {
    private Long patientId;
    private String patientName;
    private String uhid;
    private String opId;
    private String ipId;
    private String phone;
    private Integer age;
    private String gender;
    private String doctorName;
    private String department;
    private String existingInvoiceNumber;
    private String existingBillNumber;
    private Long existingBillId;
    private BigDecimal existingFinalTotal;
    private BigDecimal existingAmountPaid;
    private BigDecimal existingBalance;
    private String existingPaymentStatus;
    private String existingPaymentMethod;

    private List<ChargeDto> opCharges = new ArrayList<>();
    private BigDecimal opSubtotal = BigDecimal.ZERO;

    private List<ChargeDto> ipCharges = new ArrayList<>();
    private BigDecimal ipSubtotal = BigDecimal.ZERO;

    private List<ChargeDto> pharmacyCharges = new ArrayList<>();
    private BigDecimal pharmacySubtotal = BigDecimal.ZERO;

    private List<ChargeDto> labCharges = new ArrayList<>();
    private BigDecimal labSubtotal = BigDecimal.ZERO;

    private BigDecimal overallSubtotal = BigDecimal.ZERO;

    // Getters and Setters
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

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getExistingInvoiceNumber() { return existingInvoiceNumber; }
    public void setExistingInvoiceNumber(String existingInvoiceNumber) { this.existingInvoiceNumber = existingInvoiceNumber; }

    public String getExistingBillNumber() { return existingBillNumber; }
    public void setExistingBillNumber(String existingBillNumber) { this.existingBillNumber = existingBillNumber; }

    public Long getExistingBillId() { return existingBillId; }
    public void setExistingBillId(Long existingBillId) { this.existingBillId = existingBillId; }

    public BigDecimal getExistingFinalTotal() { return existingFinalTotal; }
    public void setExistingFinalTotal(BigDecimal existingFinalTotal) { this.existingFinalTotal = existingFinalTotal; }

    public BigDecimal getExistingAmountPaid() { return existingAmountPaid; }
    public void setExistingAmountPaid(BigDecimal existingAmountPaid) { this.existingAmountPaid = existingAmountPaid; }

    public BigDecimal getExistingBalance() { return existingBalance; }
    public void setExistingBalance(BigDecimal existingBalance) { this.existingBalance = existingBalance; }

    public String getExistingPaymentStatus() { return existingPaymentStatus; }
    public void setExistingPaymentStatus(String existingPaymentStatus) { this.existingPaymentStatus = existingPaymentStatus; }

    public String getExistingPaymentMethod() { return existingPaymentMethod; }
    public void setExistingPaymentMethod(String existingPaymentMethod) { this.existingPaymentMethod = existingPaymentMethod; }

    public List<ChargeDto> getOpCharges() { return opCharges; }
    public void setOpCharges(List<ChargeDto> opCharges) { this.opCharges = opCharges; }

    public BigDecimal getOpSubtotal() { return opSubtotal; }
    public void setOpSubtotal(BigDecimal opSubtotal) { this.opSubtotal = opSubtotal; }

    public List<ChargeDto> getIpCharges() { return ipCharges; }
    public void setIpCharges(List<ChargeDto> ipCharges) { this.ipCharges = ipCharges; }

    public BigDecimal getIpSubtotal() { return ipSubtotal; }
    public void setIpSubtotal(BigDecimal ipSubtotal) { this.ipSubtotal = ipSubtotal; }

    public List<ChargeDto> getPharmacyCharges() { return pharmacyCharges; }
    public void setPharmacyCharges(List<ChargeDto> pharmacyCharges) { this.pharmacyCharges = pharmacyCharges; }

    public BigDecimal getPharmacySubtotal() { return pharmacySubtotal; }
    public void setPharmacySubtotal(BigDecimal pharmacySubtotal) { this.pharmacySubtotal = pharmacySubtotal; }

    public List<ChargeDto> getLabCharges() { return labCharges; }
    public void setLabCharges(List<ChargeDto> labCharges) { this.labCharges = labCharges; }

    public BigDecimal getLabSubtotal() { return labSubtotal; }
    public void setLabSubtotal(BigDecimal labSubtotal) { this.labSubtotal = labSubtotal; }

    public BigDecimal getOverallSubtotal() { return overallSubtotal; }
    public void setOverallSubtotal(BigDecimal overallSubtotal) { this.overallSubtotal = overallSubtotal; }

    public static class ChargeDto {
        private String sourceId;
        private String category; // OP, IP, PHARMACY, LABORATORY
        private String description;
        private BigDecimal amount = BigDecimal.ZERO;
        private String date;
        private String time;
        private String status;
        private String paymentMethod;
        private String doctorName;
        private String department;

        public ChargeDto() {}

        public ChargeDto(String sourceId, String category, String description, BigDecimal amount, String date, String time, String status, String paymentMethod, String doctorName, String department) {
            this.sourceId = sourceId;
            this.category = category;
            this.description = description;
            this.amount = amount != null ? amount : BigDecimal.ZERO;
            this.date = date;
            this.time = time;
            this.status = status;
            this.paymentMethod = paymentMethod;
            this.doctorName = doctorName;
            this.department = department;
        }

        // Backward compatibility constructor
        public ChargeDto(String sourceId, String description, BigDecimal amount, String date) {
            this.sourceId = sourceId;
            this.description = description;
            this.amount = amount != null ? amount : BigDecimal.ZERO;
            this.date = date;
        }

        public String getSourceId() { return sourceId; }
        public void setSourceId(String sourceId) { this.sourceId = sourceId; }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }

        public String getTime() { return time; }
        public void setTime(String time) { this.time = time; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getPaymentMethod() { return paymentMethod; }
        public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

        public String getDoctorName() { return doctorName; }
        public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

        public String getDepartment() { return department; }
        public void setDepartment(String department) { this.department = department; }
    }
}
