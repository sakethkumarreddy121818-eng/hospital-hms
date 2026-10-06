package com.carevista.hms.op.dto;

import com.carevista.hms.op.entity.OpRegistration;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class OpReceiptDto {
    private String receiptNumber;
    private String appBrand = "CareVista Hospital Management SaaS";
    private String hospitalName;
    private String hospitalAddress;
    private String hospitalPhone;
    private String hospitalEmail;
    private String opId;
    private String uhid;
    private String patientName;
    private Integer age;
    private String gender;
    private String phone;
    private String address;
    private String doctorName;
    private String department;
    private String roomNumber;
    private BigDecimal consultationFee;
    private String paymentMethod;
    private String paymentStatus;
    private String visitDate;
    private String registrationTime;
    private String registeredAt;

    public OpReceiptDto() {}

    public static OpReceiptDto fromOpRegistration(OpRegistration op, String roomNumber, String receiptNum) {
        OpReceiptDto dto = new OpReceiptDto();
        dto.setReceiptNumber(receiptNum != null ? receiptNum : "REC-" + op.getOpId());
        dto.setOpId(op.getOpId());
        if (op.getPatient() != null) {
            dto.setUhid(op.getPatient().getUhid());
            dto.setPatientName(op.getPatient().getFullName());
            dto.setAge(op.getPatient().getAge());
            dto.setGender(op.getPatient().getGender());
            dto.setPhone(op.getPatient().getPhone());
            dto.setAddress(op.getPatient().getAddress());
        }
        if (op.getTenant() != null) {
            dto.setHospitalName(op.getTenant().getHospitalName());
            dto.setHospitalAddress(op.getTenant().getAddress());
            dto.setHospitalPhone(op.getTenant().getPhone());
            dto.setHospitalEmail(op.getTenant().getEmail());
        }
        dto.setDoctorName(op.getDoctorName());
        dto.setDepartment(op.getDepartment());
        dto.setRoomNumber(roomNumber != null ? roomNumber : "OPD Room");
        dto.setConsultationFee(op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO);
        dto.setPaymentMethod(op.getPaymentMethod() != null ? op.getPaymentMethod() : "CASH");
        dto.setPaymentStatus(op.getPaymentStatus() != null ? op.getPaymentStatus() : "PAID");
        dto.setVisitDate(op.getVisitDate() != null ? op.getVisitDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")) : "");
        dto.setRegistrationTime(op.getRegistrationTime() != null ? op.getRegistrationTime() : "");
        if (op.getCreatedAt() != null) {
            dto.setRegisteredAt(op.getCreatedAt().format(DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm a")));
        }
        return dto;
    }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public String getAppBrand() { return appBrand; }
    public void setAppBrand(String appBrand) { this.appBrand = appBrand; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getHospitalAddress() { return hospitalAddress; }
    public void setHospitalAddress(String hospitalAddress) { this.hospitalAddress = hospitalAddress; }

    public String getHospitalPhone() { return hospitalPhone; }
    public void setHospitalPhone(String hospitalPhone) { this.hospitalPhone = hospitalPhone; }

    public String getHospitalEmail() { return hospitalEmail; }
    public void setHospitalEmail(String hospitalEmail) { this.hospitalEmail = hospitalEmail; }

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

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getVisitDate() { return visitDate; }
    public void setVisitDate(String visitDate) { this.visitDate = visitDate; }

    public String getRegistrationTime() { return registrationTime; }
    public void setRegistrationTime(String registrationTime) { this.registrationTime = registrationTime; }

    public String getRegisteredAt() { return registeredAt; }
    public void setRegisteredAt(String registeredAt) { this.registeredAt = registeredAt; }
}
