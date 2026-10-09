package com.carevista.hms.pharmacy.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class CreateMedicineRequest {

    @NotBlank(message = "Medicine name is required.")
    private String name;

    private String medicineCode;

    private String genericName;

    private String category = "Tablet";

    private String medicineForm = "Tablet";

    private String dosageStrength;

    private String manufacturer;

    private String supplier;

    private String batchNumber;

    private LocalDate purchaseDate = LocalDate.now();

    private LocalDate expiryDate;

    private BigDecimal costPrice = BigDecimal.ZERO;

    @NotNull(message = "Selling price / Unit price is required.")
    @Min(value = 0, message = "Selling price cannot be negative.")
    private BigDecimal unitPrice;

    private Integer stockQuantity = 0;

    private Integer reorderLevel = 10;

    private Integer minStockThreshold = 10;

    private BigDecimal gstPercentage = new BigDecimal("5.00");

    private String notes;

    private String rackLocation;

    private String placement;

    private String soldAs = "tablet"; // tablet, capsule, other

    private Integer unitsPerStrip = 10;

    private Boolean prescriptionRequired = false;

    private String hsnCode = "3004";

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

    public Integer getStockQuantity() { return stockQuantity != null ? stockQuantity : 0; }
    public void setStockQuantity(Integer stockQuantity) { this.stockQuantity = stockQuantity; }

    public Integer getReorderLevel() { return reorderLevel != null ? reorderLevel : (minStockThreshold != null ? minStockThreshold : 10); }
    public void setReorderLevel(Integer reorderLevel) { this.reorderLevel = reorderLevel; this.minStockThreshold = reorderLevel; }

    public Integer getMinStockThreshold() { return minStockThreshold != null ? minStockThreshold : reorderLevel; }
    public void setMinStockThreshold(Integer minStockThreshold) { this.minStockThreshold = minStockThreshold; this.reorderLevel = minStockThreshold; }

    public BigDecimal getGstPercentage() { return gstPercentage; }
    public void setGstPercentage(BigDecimal gstPercentage) { this.gstPercentage = gstPercentage; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getRackLocation() { return rackLocation != null ? rackLocation : placement; }
    public void setRackLocation(String rackLocation) { this.rackLocation = rackLocation; this.placement = rackLocation; }

    public String getPlacement() { return placement != null ? placement : rackLocation; }
    public void setPlacement(String placement) { this.placement = placement; this.rackLocation = placement; }

    public String getSoldAs() { return soldAs; }
    public void setSoldAs(String soldAs) { this.soldAs = soldAs; }

    public Integer getUnitsPerStrip() { return unitsPerStrip != null ? unitsPerStrip : 10; }
    public void setUnitsPerStrip(Integer unitsPerStrip) { this.unitsPerStrip = unitsPerStrip; }

    public Boolean getPrescriptionRequired() { return prescriptionRequired != null && prescriptionRequired; }
    public void setPrescriptionRequired(Boolean prescriptionRequired) { this.prescriptionRequired = prescriptionRequired; }

    public String getHsnCode() { return hsnCode; }
    public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }
}
