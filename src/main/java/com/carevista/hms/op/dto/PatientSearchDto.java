package com.carevista.hms.op.dto;

import com.carevista.hms.patient.entity.Patient;

public class PatientSearchDto {
    private Long id;
    private String uhid;
    private String fullName;
    private String phone;
    private Integer age;
    private String gender;
    private String email;
    private String address;
    private String emergencyContact;
    private String lastOpId;

    public PatientSearchDto() {}

    public static PatientSearchDto fromEntity(Patient p) {
        PatientSearchDto dto = new PatientSearchDto();
        dto.setId(p.getId());
        dto.setUhid(p.getUhid());
        dto.setFullName(p.getFullName());
        dto.setPhone(p.getPhone());
        dto.setAge(p.getAge());
        dto.setGender(p.getGender());
        dto.setEmail(p.getEmail());
        dto.setAddress(p.getAddress());
        dto.setEmergencyContact(p.getEmergencyContact());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getLastOpId() { return lastOpId; }
    public void setLastOpId(String lastOpId) { this.lastOpId = lastOpId; }
}
