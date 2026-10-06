package com.carevista.hms.laboratory.entity;

import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "lab_tests", indexes = {
    @Index(name = "idx_labtest_tenant", columnList = "tenant_id"),
    @Index(name = "idx_labtest_code", columnList = "test_code")
})
public class LabTest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "test_code", nullable = false, length = 50)
    private String testCode;

    @Column(name = "test_name", nullable = false, length = 150)
    private String testName;

    @Column(name = "category", nullable = false, length = 50)
    private String category = "GENERAL";

    @Column(name = "price", nullable = false, precision = 10, scale = 2)
    private BigDecimal price = BigDecimal.ZERO;

    @Column(name = "sample_type", length = 100)
    private String sampleType = "Blood";

    @Column(name = "unit", length = 50)
    private String unit;

    @Column(name = "reference_range", length = 255)
    private String referenceRange;

    @Column(name = "turnaround_time", length = 50)
    private String turnaroundTime = "24 Hours";

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public LabTest() {}

    public LabTest(Tenant tenant, String testCode, String testName, String category, BigDecimal price, String sampleType, String unit, String referenceRange, String turnaroundTime) {
        this.tenant = tenant;
        this.testCode = testCode;
        this.testName = testName;
        this.category = category;
        this.price = price != null ? price : BigDecimal.ZERO;
        this.sampleType = sampleType;
        this.unit = unit;
        this.referenceRange = referenceRange;
        this.turnaroundTime = turnaroundTime != null ? turnaroundTime : "24 Hours";
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public String getTestCode() { return testCode; }
    public void setTestCode(String testCode) { this.testCode = testCode; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getSampleType() { return sampleType; }
    public void setSampleType(String sampleType) { this.sampleType = sampleType; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getReferenceRange() { return referenceRange; }
    public void setReferenceRange(String referenceRange) { this.referenceRange = referenceRange; }

    public String getTurnaroundTime() { return turnaroundTime; }
    public void setTurnaroundTime(String turnaroundTime) { this.turnaroundTime = turnaroundTime; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
