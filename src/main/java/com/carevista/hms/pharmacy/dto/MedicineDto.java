package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.Medicine;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

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
    private String placement;
    private String soldAs;
    private Integer unitsPerStrip;
    private Boolean prescriptionRequired;
    private String hsnCode;
    private Boolean isDeleted;
    private String status;
    private boolean lowStock;
    private boolean outOfStock;
    private boolean expired;
    private boolean nearExpiry;
    private int batchesCount;
    private List<PharmacyBatchDto> batches = new ArrayList<>();

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
        dto.setPlacement(m.getRackLocation());
        dto.setSoldAs(m.getSoldAs());
        dto.setUnitsPerStrip(m.getUnitsPerStrip());
        dto.setPrescriptionRequired(m.getPrescriptionRequired());
        dto.setHsnCode(m.getHsnCode());
        dto.setIsDeleted(m.getIsDeleted());
        dto.setStatus(m.getStatus());
        dto.setLowStock(m.isLowStock());
        dto.setOutOfStock(m.isOutOfStock());
        dto.setExpired(m.isExpired());
        dto.setNearExpiry(m.isNearExpiry());

        if (m.getBatches() != null && !m.getBatches().isEmpty()) {
            dto.setBatches(m.getBatches().stream()
                    .filter(b -> !b.getIsDeleted())
                    .map(PharmacyBatchDto::fromEntity)
                    .collect(Collectors.toList()));
            dto.setBatchesCount(dto.getBatches().size());
        } else {
            dto.setBatchesCount(0);
        }

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

    public Boolean getIsDeleted() { return isDeleted != null && isDeleted; }
    public void setIsDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public boolean isLowStock() { return lowStock; }
    public void setLowStock(boolean lowStock) { this.lowStock = lowStock; }

    public boolean isOutOfStock() { return outOfStock; }
    public void setOutOfStock(boolean outOfStock) { this.outOfStock = outOfStock; }

    public boolean isExpired() { return expired; }
    public void setExpired(boolean expired) { this.expired = expired; }

    public boolean isNearExpiry() { return nearExpiry; }
    public void setNearExpiry(boolean nearExpiry) { this.nearExpiry = nearExpiry; }

    public int getBatchesCount() { return batchesCount; }
    public void setBatchesCount(int batchesCount) { this.batchesCount = batchesCount; }

    public List<PharmacyBatchDto> getBatches() { return batches; }
    public void setBatches(List<PharmacyBatchDto> batches) { this.batches = batches; }
}
