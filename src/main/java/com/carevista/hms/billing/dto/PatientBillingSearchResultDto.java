package com.carevista.hms.billing.dto;

public class PatientBillingSearchResultDto {
    private Long id;
    private String fullName;
    private String uhid;
    private String phone;
    private String gender;
    private Integer age;
    private String latestOpId;
    private String latestIpId;
    private String doctorName;
    private String department;

    private String existingInvoiceNumber;

    public PatientBillingSearchResultDto() {}

    public PatientBillingSearchResultDto(Long id, String fullName, String uhid, String phone, String gender, Integer age, String latestOpId, String latestIpId, String doctorName, String department) {
        this.id = id;
        this.fullName = fullName;
        this.uhid = uhid;
        this.phone = phone;
        this.gender = gender;
        this.age = age;
        this.latestOpId = latestOpId;
        this.latestIpId = latestIpId;
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

    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }

    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }

    public String getLatestOpId() { return latestOpId; }
    public void setLatestOpId(String latestOpId) { this.latestOpId = latestOpId; }

    public String getLatestIpId() { return latestIpId; }
    public void setLatestIpId(String latestIpId) { this.latestIpId = latestIpId; }

    public String getDoctorName() { return doctorName; }
    public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getExistingInvoiceNumber() { return existingInvoiceNumber; }
    public void setExistingInvoiceNumber(String existingInvoiceNumber) { this.existingInvoiceNumber = existingInvoiceNumber; }
}
