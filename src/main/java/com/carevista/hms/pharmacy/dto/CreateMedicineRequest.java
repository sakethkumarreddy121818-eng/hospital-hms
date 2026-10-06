package com.carevista.hms.pharmacy.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateMedicineRequest {

    @NotBlank(message = "Medicine name is required.")
    private String name;

    @NotBlank(message = "Medicine ID / Code is required.")
    private String medicineCode;

    private String genericName;

    private String category = "Tablet";

    private String medicineForm = "Tablet";

    private String dosageStrength;

    private String manufacturer;

    private String supplier;

    @NotBlank(message = "Batch number is required.")
    private String batchNumber;

    private LocalDate purchaseDate = LocalDate.now();

    @NotNull(message = "Expiry date is required.")
    private LocalDate expiryDate;

    private BigDecimal costPrice = BigDecimal.ZERO;

    @NotNull(message = "Selling price / Unit price is required.")
    @Min(value = 0, message = "Selling price cannot be negative.")
    private BigDecimal unitPrice;

    @NotNull(message = "Opening stock quantity is required.")
    @Min(value = 0, message = "Stock quantity cannot be negative.")
    private Integer stockQuantity = 0;

    private Integer reorderLevel = 10;

    private BigDecimal gstPercentage = new BigDecimal("5.00");

    private String notes;

    private String rackLocation;

    public CreateMedicineRequest() {}

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getMedicineCode() { return medicineCode; }
    public void setMedicineCode(String medicineCode) { this.medicineCode = medicineCode; }

    public String getGenericName() { return genericName; }
    public void setGenericName(String genericName) { this.genericName = genericName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getMedicineForm() { return medicineForm; }
    public void setMedicineForm(String medicineForm) { this.medicineForm = medicineForm; }

    public String getDosageStrength() { return dosageStrength; }
    public void setDosageStrength(String dosageStrength) { this.dosageStrength = dosageStrength; }

    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getCostPrice() { return costPrice; }
    public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }

    public Integer getStockQuantity() { return stockQuantity; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

    public Integer getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(Integer reorderLevel) { this.reorderLevel = reorderLevel; }

    public BigDecimal getGstPercentage() { return gstPercentage; }
    public void setGstPercentage(BigDecimal gstPercentage) { this.gstPercentage = gstPercentage; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getRackLocation() { return rackLocation; }
    public void setRackLocation(String rackLocation) { this.rackLocation = rackLocation; }
}

