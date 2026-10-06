package com.carevista.hms.op.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public class CreateOpRegistrationRequest {

    @NotBlank(message = "Patient name is required.")
    private String patientName;

    @NotNull(message = "Patient age is required.")
    @Min(value = 0, message = "Age cannot be negative.")
    private Integer age;

    @NotBlank(message = "Patient gender is required.")
    private String gender;

    @NotBlank(message = "Patient phone number is required.")
    private String phone;

    private String email;

    private String address;

    private String existingUhid;

    @NotBlank(message = "Please select a doctor.")
    private String doctorName;

    @NotBlank(message = "Department is required.")
    private String department;

    private BigDecimal consultationFee;

    private String paymentMethod = "CASH";

    private String paymentStatus;

    private BigDecimal paidAmount;

    private String notes;

    public CreateOpRegistrationRequest() {}

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getExistingUhid() { return existingUhid; }
    public void setExistingUhid(String existingUhid) { this.existingUhid = existingUhid; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
