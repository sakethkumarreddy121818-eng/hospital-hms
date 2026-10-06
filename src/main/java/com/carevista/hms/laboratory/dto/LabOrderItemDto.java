package com.carevista.hms.laboratory.dto;

import com.carevista.hms.laboratory.entity.LabOrderItem;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class LabOrderItemDto {
    private Long id;
    private Long testId;
    private String testCode;
    private String testName;
    private String category;
    private String sampleType;
    private BigDecimal price;
    private String resultValue;
    private String unit;
    private String referenceRange;
    private String resultNotes;
    private String technicianName;
    private String itemStatus;
    private LocalDateTime resultDate;
    private String verifiedBy;
    private LocalDateTime verifiedAt;

    public LabOrderItemDto() {}

    public LabOrderItemDto(LabOrderItem item) {
        if (item != null) {
            this.id = item.getId();
            if (item.getLabTest() != null) {
                this.testId = item.getLabTest().getId();
            }
            this.testCode = item.getTestCode();
            this.testName = item.getTestName();
            this.category = item.getCategory();
            this.sampleType = item.getSampleType();
            this.price = item.getPrice();
            this.resultValue = item.getResultValue();
            this.unit = item.getUnit();
            this.referenceRange = item.getReferenceRange();
            this.resultNotes = item.getResultNotes();
            this.technicianName = item.getTechnicianName();
            this.itemStatus = item.getItemStatus();
            this.resultDate = item.getResultDate();
            this.verifiedBy = item.getVerifiedBy();
            this.verifiedAt = item.getVerifiedAt();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTestId() { return testId; }
    public void setTestId(Long testId) { this.testId = testId; }

    public String getTestCode() { return testCode; }
    public void setTestCode(String testCode) { this.testCode = testCode; }

    public String getTestName() { return testName; }
    public void setTestName(String testName) { this.testName = testName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getSampleType() { return sampleType; }
    public void setSampleType(String sampleType) { this.sampleType = sampleType; }

    public BigDecimal getPrice() { return price; }
    public void setPrice(BigDecimal price) { this.price = price; }

    public String getResultValue() { return resultValue; }
    public void setResultValue(String resultValue) { this.resultValue = resultValue; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public String getReferenceRange() { return referenceRange; }
    public void setReferenceRange(String referenceRange) { this.referenceRange = referenceRange; }

    public String getResultNotes() { return resultNotes; }
    public void setResultNotes(String resultNotes) { this.resultNotes = resultNotes; }

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public String getItemStatus() { return itemStatus; }
    public void setItemStatus(String itemStatus) { this.itemStatus = itemStatus; }

    public LocalDateTime getResultDate() { return resultDate; }
    public void setResultDate(LocalDateTime resultDate) { this.resultDate = resultDate; }

    public String getVerifiedBy() { return verifiedBy; }
    public void setVerifiedBy(String verifiedBy) { this.verifiedBy = verifiedBy; }

    public LocalDateTime getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(LocalDateTime verifiedAt) { this.verifiedAt = verifiedAt; }
}
