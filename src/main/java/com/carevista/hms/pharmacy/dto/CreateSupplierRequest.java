package com.carevista.hms.pharmacy.dto;

import jakarta.validation.constraints.NotBlank;

public class CreateSupplierRequest {

    @NotBlank(message = "Supplier name is required")
    private String name;

    private String agencyName;
    private String contactNumber;
    private String email;
    private String address;
    private String gstNumber;

    public CreateSupplierRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getAgencyName() { return agencyName; }
    public void setAgencyName(String agencyName) { this.agencyName = agencyName; }

    public String getContactNumber() { return contactNumber; }
    public void setContactNumber(String contactNumber) { this.contactNumber = contactNumber; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }
}
