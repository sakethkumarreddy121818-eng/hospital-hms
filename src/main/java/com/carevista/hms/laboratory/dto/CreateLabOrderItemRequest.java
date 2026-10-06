package com.carevista.hms.laboratory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CreateLabOrderItemRequest {

    private Long testId;
    private String testCode;

    @NotBlank(message = "Test name is required.")
    private String testName;

    private String category = "GENERAL";
    private String sampleType;

    @NotNull(message = "Price is required.")
    private BigDecimal price = BigDecimal.ZERO;

    public CreateLabOrderItemRequest() {}

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
}
