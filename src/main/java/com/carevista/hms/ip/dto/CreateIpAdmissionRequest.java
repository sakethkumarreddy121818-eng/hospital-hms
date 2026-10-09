package com.carevista.hms.ip.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;

public class CreateIpAdmissionRequest {

    @NotBlank(message = "Patient name is required.")
    @Pattern(regexp = "^[a-zA-Z]+(\\s+[a-zA-Z]+)*$", message = "Patient name must contain alphabetic characters and spaces only.")
    private String patientName;

    @NotNull(message = "Age is required.")
    @Min(value = 0, message = "Age cannot be negative.")
    @Max(value = 150, message = "Age cannot exceed 3 digits (maximum 150).")
    private Integer age;

    @NotBlank(message = "Gender is required.")
    private String gender;

    @NotBlank(message = "Phone number is required.")
    @Pattern(regexp = "^\\d{10}$", message = "Patient phone number must be exactly 10 digits.")
    private String phone;

    private String email;
    private String address;
    private String existingUhid;
    private String opId;

    @NotBlank(message = "Attending doctor is required.")
    private String doctorName;

    @NotBlank(message = "Department is required.")
    private String department;

    private String reasonForAdmission;

    private String diagnosis;
    private String admissionNotes;

    @NotNull(message = "Room selection is required.")
    private Long roomId;

    @NotNull(message = "Bed selection is required.")
    private Long bedId;

    private BigDecimal depositAmount = BigDecimal.ZERO;
    private String paymentMethod = "CASH"; // CASH, CARD, UPI, BANK_TRANSFER, INSURANCE
    private String paymentStatus = "PAID"; // PAID, PARTIALLY_PAID, UNPAID

    public CreateIpAdmissionRequest() {}

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

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getReasonForAdmission() { return reasonForAdmission; }
    public void setReasonForAdmission(String reasonForAdmission) { this.reasonForAdmission = reasonForAdmission; }

    public String getDiagnosis() { return diagnosis; }
    public void setDiagnosis(String diagnosis) { this.diagnosis = diagnosis; }

    public String getAdmissionNotes() { return admissionNotes; }
    public void setAdmissionNotes(String admissionNotes) { this.admissionNotes = admissionNotes; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public Long getBedId() { return bedId; }
    public void setBedId(Long bedId) { this.bedId = bedId; }

    public BigDecimal getDepositAmount() { return depositAmount; }
    public void setDepositAmount(BigDecimal depositAmount) { this.depositAmount = depositAmount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
}
