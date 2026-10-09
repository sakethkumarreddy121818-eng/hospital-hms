package com.carevista.hms.pharmacy.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public class DashboardDrillDownItemDto {

    private Long batchId;
    private Long medicineId;
    private String medicineCode;
    private String name;
    private String genericName;
    private String strength;
    private String manufacturer;
    private String placement;
    private String category;
    private String batchNumber;
    private LocalDate expiryDate;
    private Integer currentQuantity;
    private Integer reorderLevel;
    private BigDecimal unitPrice;
    private String statusText;
    private String alertCategory; // "out-of-stock", "low-stock", "expiring-soon", "expired"

    public DashboardDrillDownItemDto() {}

    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public Long getMedicineId() { return medicineId; }
    public void setMedicineId(Long medicineId) { this.medicineId = medicineId; }

    public String getMedicineCode() { return medicineCode; }
    public void setMedicineCode(String medicineCode) { this.medicineCode = medicineCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGenericName() { return genericName; }
    public void setGenericName(String genericName) { this.genericName = genericName; }

    public String getStrength() { return strength; }
    public void setStrength(String strength) { this.strength = strength; }

    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }

    public String getPlacement() { return placement; }
    public void setPlacement(String placement) { this.placement = placement; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public Integer getCurrentQuantity() { return currentQuantity; }
    public void setCurrentQuantity(Integer currentQuantity) { this.currentQuantity = currentQuantity; }

    public Integer getReorderLevel() { return reorderLevel; }
    public void setReorderLevel(Integer reorderLevel) { this.reorderLevel = reorderLevel; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public String getStatusText() { return statusText; }
    public void setStatusText(String statusText) { this.statusText = statusText; }

    public String getAlertCategory() { return alertCategory; }
    public void setAlertCategory(String alertCategory) { this.alertCategory = alertCategory; }
}
