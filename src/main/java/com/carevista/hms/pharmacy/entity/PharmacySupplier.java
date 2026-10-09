package com.carevista.hms.pharmacy.entity;

import com.carevista.hms.tenant.entity.Tenant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pharmacy_suppliers", indexes = {
    @Index(name = "idx_supplier_tenant", columnList = "tenant_id"),
    @Index(name = "idx_supplier_name", columnList = "name")
})
public class PharmacySupplier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "agency_name", length = 150)
    private String agencyName;

    @Column(name = "contact_number", length = 50)
    private String contactNumber;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "gst_number", length = 50)
    private String gstNumber;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public PharmacySupplier() {}

    public PharmacySupplier(Tenant tenant, String name, String agencyName, String contactNumber, String email, String address, String gstNumber) {
        this.tenant = tenant;
        this.name = name;
        this.agencyName = agencyName;
        this.contactNumber = contactNumber;
        this.email = email;
        this.address = address;
        this.gstNumber = gstNumber;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

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
