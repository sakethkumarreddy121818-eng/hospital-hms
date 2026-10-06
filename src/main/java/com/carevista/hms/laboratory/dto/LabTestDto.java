package com.carevista.hms.laboratory.dto;

import com.carevista.hms.laboratory.entity.LabTest;
import java.math.BigDecimal;

public class LabTestDto {
    private Long id;
    private String testCode;
    private String testName;
    private String category;
    private BigDecimal price;
    private String sampleType;
    private String unit;
    private String referenceRange;
    private String turnaroundTime;
    private String status;

    public LabTestDto() {}

    public LabTestDto(LabTest t) {
        if (t != null) {
            this.id = t.getId();
            this.testCode = t.getTestCode();
            this.testName = t.getTestName();
            this.category = t.getCategory();
            this.price = t.getPrice();
            this.sampleType = t.getSampleType();
            this.unit = t.getUnit();
            this.referenceRange = t.getReferenceRange();
            this.turnaroundTime = t.getTurnaroundTime();
            this.status = t.getStatus();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

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
}
