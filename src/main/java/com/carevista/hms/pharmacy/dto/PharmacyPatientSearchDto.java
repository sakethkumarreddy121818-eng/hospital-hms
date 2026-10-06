package com.carevista.hms.pharmacy.dto;

public class PharmacyPatientSearchDto {

    private Long id;
    private String fullName;
    private String uhid;
    private String phone;
    private Integer age;
    private String gender;
    private String address;
    private String email;
    private String lastOpId;
    private String activeIpId;
    private String doctorName;
    private String department;

    public PharmacyPatientSearchDto() {}

    public PharmacyPatientSearchDto(Long id, String fullName, String uhid, String phone, Integer age,
                                   String gender, String address, String email, String lastOpId,
                                   String activeIpId, String doctorName, String department) {
        this.id = id;
        this.fullName = fullName;
        this.uhid = uhid;
        this.phone = phone;
        this.age = age;
        this.gender = gender;
        this.address = address;
        this.email = email;
        this.lastOpId = lastOpId;
        this.activeIpId = activeIpId;
        this.doctorName = doctorName;
        this.department = department;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getUhid() { return uhid; }
    public void setUhid(String uhid) { this.uhid = uhid; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getLastOpId() { return lastOpId; }
    public void setLastOpId(String lastOpId) { this.lastOpId = lastOpId; }

    public String getActiveIpId() { return activeIpId; }
    public void setActiveIpId(String activeIpId) { this.activeIpId = activeIpId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
}
