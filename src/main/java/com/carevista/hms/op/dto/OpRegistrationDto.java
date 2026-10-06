package com.carevista.hms.op.dto;

import com.carevista.hms.op.entity.OpRegistration;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class OpRegistrationDto {

    private Long id;
    private String opId;
    private String uhid;
    private String patientName;
    private Integer age;
    private String gender;
    private String email;
    private String phone;
    private String address;
    private String doctorName;
    private String department;
    private BigDecimal consultationFee;
    private String paymentMethod;
    private String paymentStatus;
    private String status;
    private String visitDate;
    private String registrationTime;
    private String createdAt;
    private String hospitalName;

    public OpRegistrationDto() {}

    public static OpRegistrationDto fromEntity(OpRegistration op) {
        OpRegistrationDto dto = new OpRegistrationDto();
        dto.setId(op.getId());
        dto.setOpId(op.getOpId());
        if (op.getPatient() != null) {
            dto.setUhid(op.getPatient().getUhid());
            dto.setPatientName(op.getPatient().getFullName());
            dto.setAge(op.getPatient().getAge());
            dto.setGender(op.getPatient().getGender());
            dto.setEmail(op.getPatient().getEmail());
            dto.setPhone(op.getPatient().getPhone());
            dto.setAddress(op.getPatient().getAddress());
        }
        dto.setDoctorName(op.getDoctorName());
        dto.setDepartment(op.getDepartment());
        dto.setConsultationFee(op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO);
        dto.setPaymentMethod(op.getPaymentMethod() != null ? op.getPaymentMethod() : "CASH");
        dto.setPaymentStatus(op.getPaymentStatus() != null ? op.getPaymentStatus() : "PAID");
        dto.setStatus(op.getStatus());
        dto.setVisitDate(op.getVisitDate() != null ? op.getVisitDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
        dto.setRegistrationTime(op.getRegistrationTime() != null ? op.getRegistrationTime() : "");
        if (op.getCreatedAt() != null) {
            dto.setCreatedAt(op.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a")));
        }
        if (op.getTenant() != null) {
            dto.setHospitalName(op.getTenant().getHospitalName());
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getPatientName() { return patientName; }
    public void setPatientName(String patientName) { this.patientName = patientName; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getVisitDate() { return visitDate; }
    public void setVisitDate(String visitDate) { this.visitDate = visitDate; }

    public String getRegistrationTime() { return registrationTime; }
    public void setRegistrationTime(String registrationTime) { this.registrationTime = registrationTime; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }
}
