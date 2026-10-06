package com.carevista.hms.superadmin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateHospitalRequest {

    @NotBlank(message = "Hospital name is required")
    @Size(max = 150, message = "Hospital name cannot exceed 150 characters")
    private String hospitalName;

    @NotBlank(message = "Admin full name is required")
    @Size(max = 100, message = "Admin name cannot exceed 100 characters")
    private String adminName;

    @NotBlank(message = "Admin email address is required")
    @Email(message = "Valid email address is required")
    private String email;

    @NotBlank(message = "Initial password is required")
    @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;

    private String phone;
    private String address;

    private String officeStatus = "ACTIVE";
    private boolean hasLaboratory = true;
    private boolean hasPharmacy = true;

    @Min(value = 1, message = "OP Limit must be at least 1")
    private int opLimit = 50;

    public CreateHospitalRequest() {}

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getAdminName() { return adminName; }
    public void setAdminName(String adminName) { this.adminName = adminName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getOfficeStatus() { return officeStatus; }
    public void setOfficeStatus(String officeStatus) { this.officeStatus = officeStatus; }

    public boolean isHasLaboratory() { return hasLaboratory; }
    public void setHasLaboratory(boolean hasLaboratory) { this.hasLaboratory = hasLaboratory; }

    public boolean isHasPharmacy() { return hasPharmacy; }
    public void setHasPharmacy(boolean hasPharmacy) { this.hasPharmacy = hasPharmacy; }

    public int getOpLimit() { return opLimit; }
    public void setOpLimit(int opLimit) { this.opLimit = opLimit; }
}
