package com.carevista.hms.tenant.entity;

import com.carevista.hms.common.enums.TenantStatus;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tenants")
@com.fasterxml.jackson.annotation.JsonIgnoreProperties({"hibernateLazyInitializer", "handler"})
public class Tenant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_code", unique = true, nullable = false, length = 50)
    private String tenantCode;

    @Column(name = "hospital_name", nullable = false, length = 150)
    private String hospitalName;

    @Column(name = "office_status", nullable = false, length = 30)
    private String officeStatus = "ACTIVE";

    @Column(name = "has_laboratory", nullable = false)
    private boolean hasLaboratory = false;

    @Column(name = "has_pharmacy", nullable = false)
    private boolean hasPharmacy = false;

    @Column(name = "op_limit", nullable = false)
    private int opLimit = 100;

    @Column(name = "op_current_usage", nullable = false)
    private int opCurrentUsage = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    private TenantStatus status = TenantStatus.ACTIVE;

    @Column(name = "phone", length = 30)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public Tenant() {}

    public Tenant(String tenantCode, String hospitalName, boolean hasLaboratory, boolean hasPharmacy, int opLimit, String phone, String email, String address) {
        this.tenantCode = tenantCode;
        this.hospitalName = hospitalName;
        this.hasLaboratory = hasLaboratory;
        this.hasPharmacy = hasPharmacy;
        this.opLimit = opLimit;
        this.phone = phone;
        this.email = email;
        this.address = address;
        this.officeStatus = "ACTIVE";
        this.status = TenantStatus.ACTIVE;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTenantCode() { return tenantCode; }
    public void setTenantCode(String tenantCode) { this.tenantCode = tenantCode; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getOfficeStatus() { return officeStatus; }
    public void setOfficeStatus(String officeStatus) { this.officeStatus = officeStatus; }

    public boolean isHasLaboratory() { return hasLaboratory; }
    public void setHasLaboratory(boolean hasLaboratory) { this.hasLaboratory = hasLaboratory; }

    public boolean isHasPharmacy() { return hasPharmacy; }
    public void setHasPharmacy(boolean hasPharmacy) { this.hasPharmacy = hasPharmacy; }

    public int getOpLimit() { return opLimit; }
    public void setOpLimit(int opLimit) { this.opLimit = opLimit; }

    public int getOpCurrentUsage() { return opCurrentUsage; }
    public void setOpCurrentUsage(int opCurrentUsage) { this.opCurrentUsage = opCurrentUsage; }

    public TenantStatus getStatus() { return status; }
    public void setStatus(TenantStatus status) { this.status = status; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
