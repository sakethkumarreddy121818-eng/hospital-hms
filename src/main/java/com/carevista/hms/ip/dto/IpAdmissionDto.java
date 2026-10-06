package com.carevista.hms.ip.dto;

import com.carevista.hms.ip.entity.IpAdmission;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class IpAdmissionDto {

    private Long id;
    private String ipId;
    private String uhid;
    private String opId;
    private String patientName;
    private Integer age;
    private String gender;
    private String phone;
    private String email;
    private String address;

    private String doctorName;
    private String department;
    private String wardName;

    private Long roomId;
    private String roomNumber;
    private String roomType;

    private Long bedId;
    private String bedNumber;

    private String reasonForAdmission;
    private String diagnosis;
    private String admissionNotes;
    private String dischargeNotes;

    private String status;
    private String admissionDate;
    private String admissionTime;
    private String dischargeDate;
    private String dischargeTime;

    private BigDecimal roomPrice;
    private BigDecimal bedPrice;
    private BigDecimal depositAmount;
    private BigDecimal totalCharges;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private String paymentMethod;
    private String paymentStatus;

    public IpAdmissionDto() {}

    public static IpAdmissionDto fromEntity(IpAdmission ip) {
        if (ip == null) return null;
        DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        IpAdmissionDto dto = new IpAdmissionDto();
        dto.setId(ip.getId());
        dto.setIpId(ip.getIpId());
        dto.setOpId(ip.getOpId());

        if (ip.getPatient() != null) {
            dto.setUhid(ip.getPatient().getUhid());
            dto.setPatientName(ip.getPatient().getFullName());
            dto.setAge(ip.getPatient().getAge());
            dto.setGender(ip.getPatient().getGender());
            dto.setPhone(ip.getPatient().getPhone());
            dto.setEmail(ip.getPatient().getEmail());
            dto.setAddress(ip.getPatient().getAddress());
        }

        dto.setDoctorName(ip.getDoctorName());
        dto.setDepartment(ip.getDepartment());
        dto.setWardName(ip.getWardName());

        if (ip.getRoom() != null) {
            dto.setRoomId(ip.getRoom().getId());
            dto.setRoomNumber(ip.getRoom().getRoomNumber());
            dto.setRoomType(ip.getRoom().getRoomType());
        } else {
            dto.setRoomNumber(ip.getRoomNumber());
        }

        if (ip.getBed() != null) {
            dto.setBedId(ip.getBed().getId());
            dto.setBedNumber(ip.getBed().getBedNumber());
        } else {
            dto.setBedNumber(ip.getBedNumber());
        }

        dto.setReasonForAdmission(ip.getReasonForAdmission());
        dto.setDiagnosis(ip.getDiagnosis());
        dto.setAdmissionNotes(ip.getAdmissionNotes());
        dto.setDischargeNotes(ip.getDischargeNotes());

        dto.setStatus(ip.getStatus());
        dto.setAdmissionDate(ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(dateFmt) : "");
        dto.setAdmissionTime(ip.getAdmissionTime());
        dto.setDischargeDate(ip.getDischargeDate() != null ? ip.getDischargeDate().format(dateFmt) : null);
        dto.setDischargeTime(ip.getDischargeTime());

        dto.setRoomPrice(ip.getRoomPrice());
        dto.setBedPrice(ip.getBedPrice());
        dto.setDepositAmount(ip.getDepositAmount());
        dto.setTotalCharges(ip.getTotalCharges());
        dto.setPaidAmount(ip.getPaidAmount());
        dto.setBalanceAmount(ip.getBalanceAmount());
        dto.setPaymentMethod(ip.getPaymentMethod());
        dto.setPaymentStatus(ip.getPaymentStatus());

        return dto;
    }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getBalanceAmount() { return balanceAmount; }
    public void setBalanceAmount(BigDecimal balanceAmount) { this.balanceAmount = balanceAmount; }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

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

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getWardName() { return wardName; }
    public void setWardName(String wardName) { this.wardName = wardName; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public Long getBedId() { return bedId; }
    public void setBedId(Long bedId) { this.bedId = bedId; }

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

    public String getAdmissionDate() { return admissionDate; }
    public void setAdmissionDate(String admissionDate) { this.admissionDate = admissionDate; }

    public String getAdmissionTime() { return admissionTime; }
    public void setAdmissionTime(String admissionTime) { this.admissionTime = admissionTime; }

    public String getDischargeDate() { return dischargeDate; }
    public void setDischargeDate(String dischargeDate) { this.dischargeDate = dischargeDate; }

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
}
