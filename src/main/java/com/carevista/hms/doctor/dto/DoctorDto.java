package com.carevista.hms.doctor.dto;

import com.carevista.hms.doctor.entity.Doctor;
import java.math.BigDecimal;

public class DoctorDto {
    private Long id;
    private String name;
    private String department;
    private String specialization;
    private BigDecimal consultationFee;
    private String status;
    private String roomNumber;
    private String phone;

    public DoctorDto() {}

    public static DoctorDto fromEntity(Doctor d) {
        DoctorDto dto = new DoctorDto();
        dto.setId(d.getId());
        dto.setName(d.getName());
        dto.setDepartment(d.getDepartment());
        dto.setSpecialization(d.getSpecialization());
        dto.setConsultationFee(d.getConsultationFee());
        dto.setStatus(d.getStatus());
        dto.setRoomNumber(d.getRoomNumber());
        dto.setPhone(d.getPhone());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getSpecialization() { return specialization; }
    public void setSpecialization(String specialization) { this.specialization = specialization; }

    public BigDecimal getConsultationFee() { return consultationFee; }
    public void setConsultationFee(BigDecimal consultationFee) { this.consultationFee = consultationFee; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }
}
