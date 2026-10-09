package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.PharmacySupplier;
import java.time.LocalDateTime;

public class PharmacySupplierDto {

    private Long id;
    private String name;
    private String agencyName;
    private String contactNumber;
    private String email;
    private String address;
    private String gstNumber;
    private LocalDateTime createdAt;

    public PharmacySupplierDto() {}

    public static PharmacySupplierDto fromEntity(PharmacySupplier s) {
        PharmacySupplierDto dto = new PharmacySupplierDto();
        dto.setId(s.getId());
        dto.setName(s.getName());
        dto.setAgencyName(s.getAgencyName());
        dto.setContactNumber(s.getContactNumber());
        dto.setEmail(s.getEmail());
        dto.setAddress(s.getAddress());
        dto.setGstNumber(s.getGstNumber());
        dto.setCreatedAt(s.getCreatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
