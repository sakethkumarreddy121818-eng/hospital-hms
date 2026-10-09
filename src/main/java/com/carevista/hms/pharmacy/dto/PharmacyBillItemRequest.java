package com.carevista.hms.pharmacy.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class PharmacyBillItemRequest {

    private Long medicineId;
    private Long batchId;
    private String medicineCode;
    private String medicineName;
    private String strength;
    private String manufacturer;
    private String batchNumber;
    private String unit = "basic"; // basic or strip
    private Integer basicUnitQuantity;

    @NotNull(message = "Quantity is required.")
    @Min(value = 1, message = "Quantity must be at least 1.")
    private Integer quantity;

    @NotNull(message = "Unit price is required.")
    @Min(value = 0, message = "Unit price cannot be negative.")
    private BigDecimal unitPrice;

    private BigDecimal amount;
    private BigDecimal discountPercentage = BigDecimal.ZERO;
    private BigDecimal gstPercentage = BigDecimal.ZERO;
    private Boolean hasPrescription = false;

    public PharmacyBillItemRequest() {}

    public Long getMedicineId() { return medicineId; }
    public void setMedicineId(Long medicineId) { this.medicineId = medicineId; }

    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public String getMedicineCode() { return medicineCode; }
    public void setMedicineCode(String medicineCode) { this.medicineCode = medicineCode; }

    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }

    public String getStrength() { return strength; }
    public void setStrength(String strength) { this.strength = strength; }

    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public String getUnit() { return unit != null ? unit : "basic"; }
    public void setUnit(String unit) { this.unit = unit; }

    public Integer getBasicUnitQuantity() { return basicUnitQuantity != null ? basicUnitQuantity : quantity; }
    public void setBasicUnitQuantity(Integer basicUnitQuantity) { this.basicUnitQuantity = basicUnitQuantity; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public BigDecimal getTotalPrice() { return amount; }
    public void setTotalPrice(BigDecimal totalPrice) { this.amount = totalPrice; }

    public BigDecimal getDiscountPercentage() { return discountPercentage != null ? discountPercentage : BigDecimal.ZERO; }
    public void setDiscountPercentage(BigDecimal discountPercentage) { this.discountPercentage = discountPercentage; }

    public BigDecimal getGstPercentage() { return gstPercentage != null ? gstPercentage : BigDecimal.ZERO; }
    public void setGstPercentage(BigDecimal gstPercentage) { this.gstPercentage = gstPercentage; }

    public Boolean getHasPrescription() { return hasPrescription != null && hasPrescription; }
    public void setHasPrescription(Boolean hasPrescription) { this.hasPrescription = hasPrescription; }
}
