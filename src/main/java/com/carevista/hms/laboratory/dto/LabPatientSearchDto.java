package com.carevista.hms.laboratory.dto;

public class LabPatientSearchDto {
    private Long id;
    private String fullName;
    private String uhid;
    private String phone;
    private Integer age;
    private String gender;
    private String email;
    private String opId;
    private String ipId;
    private String doctorName;
    private String department;

    public LabPatientSearchDto() {}

    public LabPatientSearchDto(Long id, String fullName, String uhid, String phone, Integer age, String gender, String email, String opId, String ipId, String doctorName, String department) {
        this.id = id;
        this.fullName = fullName;
        this.uhid = uhid;
        this.phone = phone;
        this.age = age;
        this.gender = gender;
        this.email = email;
        this.opId = opId;
        this.ipId = ipId;
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

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getOpId() { return opId; }
    public void setOpId(String opId) { this.opId = opId; }

    public String getIpId() { return ipId; }
    public void setIpId(String ipId) { this.ipId = ipId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }
}
