package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.Medicine;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class MedicineDto {

    private Long id;
    private String medicineCode;
    private String name;
    private String genericName;
    private String category;
    private String medicineForm;
    private String dosageStrength;
    private String batchNumber;
    private String supplier;
    private String purchaseDate;
    private String expiryDate;
    private BigDecimal unitPrice;
    private BigDecimal costPrice;
    private Integer stockQuantity;
    private Integer reorderLevel;
    private BigDecimal gstPercentage;
    private String notes;
    private String manufacturer;
    private String rackLocation;
    private String status;
    private boolean lowStock;
    private boolean expired;
    private boolean nearExpiry;

    public MedicineDto() {}

    public static MedicineDto fromEntity(Medicine m) {
        if (m == null) return null;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        MedicineDto dto = new MedicineDto();
        dto.setId(m.getId());
        dto.setMedicineCode(m.getMedicineCode());
        dto.setName(m.getName());
        dto.setGenericName(m.getGenericName());
        dto.setCategory(m.getCategory());
        dto.setMedicineForm(m.getMedicineForm() != null ? m.getMedicineForm() : m.getCategory());
        dto.setDosageStrength(m.getDosageStrength());
        dto.setBatchNumber(m.getBatchNumber());
        dto.setSupplier(m.getSupplier());
        dto.setPurchaseDate(m.getPurchaseDate() != null ? m.getPurchaseDate().format(fmt) : "");
        dto.setExpiryDate(m.getExpiryDate() != null ? m.getExpiryDate().format(fmt) : "");
        dto.setUnitPrice(m.getUnitPrice());
        dto.setCostPrice(m.getCostPrice());
        dto.setStockQuantity(m.getStockQuantity());
        dto.setReorderLevel(m.getReorderLevel());
        dto.setGstPercentage(m.getGstPercentage());
        dto.setNotes(m.getNotes());
        dto.setManufacturer(m.getManufacturer());
        dto.setRackLocation(m.getRackLocation());
        dto.setStatus(m.getStatus());
        dto.setLowStock(m.isLowStock());
        dto.setExpired(m.isExpired());
        dto.setNearExpiry(m.isNearExpiry());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getMedicineCode() { return medicineCode; }
    public void setMedicineCode(String medicineCode) { this.medicineCode = medicineCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGenericName() { return genericName; }
    public void setGenericName(String genericName) { this.genericName = genericName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getMedicineForm() { return medicineForm; }
    public void setMedicineForm(String medicineForm) { this.medicineForm = medicineForm; }

    public String getDosageStrength() { return dosageStrength; }
    public void setDosageStrength(String dosageStrength) { this.dosageStrength = dosageStrength; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public String getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

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

    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }

    public String getRackLocation() { return rackLocation; }
    public void setRackLocation(String rackLocation) { this.rackLocation = rackLocation; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isLowStock() { return lowStock; }
    public void setLowStock(boolean lowStock) { this.lowStock = lowStock; }

    public boolean isExpired() { return expired; }
    public void setExpired(boolean expired) { this.expired = expired; }

    public boolean isNearExpiry() { return nearExpiry; }
    public void setNearExpiry(boolean nearExpiry) { this.nearExpiry = nearExpiry; }
}

