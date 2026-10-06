package com.carevista.hms.laboratory.dto;

import com.carevista.hms.laboratory.entity.LabOrder;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class LabOrderDto {
    private Long id;
    private String orderNumber;
    private Long patientId;
    private String patientName;
    private String uhid;
    private String phone;
    private String opId;
    private String ipId;
    private Integer age;
    private String gender;
    private String doctorName;
    private String department;
    private String testName;
    private String category;
    private BigDecimal testPrice;
    private BigDecimal subtotal;
    private BigDecimal discountPercentage;
    private BigDecimal discountAmount;
    private BigDecimal netAmount;
    private String gstNumber;
    private BigDecimal gstPercentage;
    private BigDecimal gstAmount;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private String paymentMethod;
    private String paymentStatus;
    private String orderStatus;
    private LocalDate orderDate;
    private LocalDateTime completedAt;
    private String completedBy;
    private String technicianName;
    private String notes;
    private LocalDateTime createdAt;
    private List<LabOrderItemDto> items = new ArrayList<>();

    public LabOrderDto() {}

    public LabOrderDto(LabOrder order) {
        if (order != null) {
            this.id = order.getId();
            this.orderNumber = order.getOrderNumber();
            if (order.getPatient() != null) {
                this.patientId = order.getPatient().getId();
            }
            this.patientName = order.getPatientName();
            this.uhid = order.getUhid() != null ? order.getUhid() : (order.getPatient() != null ? order.getPatient().getUhid() : "N/A");
            this.phone = order.getPhone() != null ? order.getPhone() : (order.getPatient() != null ? order.getPatient().getPhone() : "");
            this.opId = order.getOpId();
            this.ipId = order.getIpId();
            this.age = order.getAge() != null ? order.getAge() : (order.getPatient() != null ? order.getPatient().getAge() : null);
            this.gender = order.getGender() != null ? order.getGender() : (order.getPatient() != null ? order.getPatient().getGender() : null);
            this.doctorName = order.getDoctorName();
            this.department = order.getDepartment();
            this.testName = order.getTestName();
            this.category = order.getCategory();
            this.testPrice = order.getTestPrice();
            this.subtotal = order.getSubtotal() != null ? order.getSubtotal() : order.getTestPrice();
            this.discountPercentage = order.getDiscountPercentage() != null ? order.getDiscountPercentage() : BigDecimal.ZERO;
            this.discountAmount = order.getDiscountAmount() != null ? order.getDiscountAmount() : BigDecimal.ZERO;
            this.netAmount = order.getNetAmount() != null ? order.getNetAmount() : (this.subtotal.subtract(this.discountAmount));
            this.gstNumber = order.getGstNumber();
            this.gstPercentage = order.getGstPercentage() != null ? order.getGstPercentage() : BigDecimal.ZERO;
            this.gstAmount = order.getGstAmount() != null ? order.getGstAmount() : BigDecimal.ZERO;
            this.totalAmount = order.getTotalAmount();
            this.paidAmount = order.getPaidAmount();
            this.balanceAmount = order.getBalanceAmount() != null ? order.getBalanceAmount() : order.getTotalAmount().subtract(order.getPaidAmount()).max(BigDecimal.ZERO);
            this.paymentMethod = order.getPaymentMethod();
            this.paymentStatus = order.getPaymentStatus();
            this.orderStatus = order.getOrderStatus();
            this.orderDate = order.getOrderDate();
            this.completedAt = order.getCompletedAt();
            this.completedBy = order.getCompletedBy();
            this.technicianName = order.getTechnicianName();
            this.notes = order.getNotes();
            this.createdAt = order.getCreatedAt();
            try {
                if (order.getItems() != null) {
                    this.items = order.getItems().stream().map(LabOrderItemDto::new).collect(Collectors.toList());
                }
            } catch (Exception e) {
                this.items = new ArrayList<>();
            }
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String orderNumber) { this.orderNumber = orderNumber; }

    public Long getPatientId() { return patientId; }
    public void setPatientId(Long patientId) { this.patientId = patientId; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getTestPrice() { return testPrice; }
    public void setTestPrice(BigDecimal testPrice) { this.testPrice = testPrice; }

    public BigDecimal getSubtotal() { return subtotal; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(BigDecimal discountPercentage) { this.discountPercentage = discountPercentage; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }

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

    public String getOrderStatus() { return orderStatus; }
    public void setOrderStatus(String orderStatus) { this.orderStatus = orderStatus; }

    public LocalDate getOrderDate() { return orderDate; }
    public void setOrderDate(LocalDate orderDate) { this.orderDate = orderDate; }

    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }

    public String getCompletedBy() { return completedBy; }
    public void setCompletedBy(String completedBy) { this.completedBy = completedBy; }

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public BigDecimal getFinalTotal() { return totalAmount; }
    public void setFinalTotal(BigDecimal finalTotal) { this.totalAmount = finalTotal; }

    public String getOrderTime() {
        return createdAt != null ? createdAt.toLocalTime().toString().substring(0, 5) : "";
    }

    public String getCompletionTime() {
        return completedAt != null ? completedAt.toLocalTime().toString().substring(0, 5) : null;
    }

    public List<LabOrderItemDto> getItems() { return items; }
    public void setItems(List<LabOrderItemDto> items) { this.items = items; }
}
