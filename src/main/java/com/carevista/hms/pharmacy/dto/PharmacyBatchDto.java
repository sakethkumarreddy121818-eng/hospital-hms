package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.PharmacyBatch;
import java.math.BigDecimal;
import java.time.LocalDate;

public class PharmacyBatchDto {

    private Long id;
    private Long medicineId;
    private String medicineName;
    private String medicineCode;
    private String strength;
    private String manufacturer;
    private String placement;
    private String batchNumber;
    private LocalDate manufacturingDate;
    private LocalDate expiryDate;
    private Integer reminderPeriodMonths;
    private LocalDate reminderDate;
    private Integer quantity;
    private BigDecimal costPerUnit;
    private BigDecimal mrp;
    private String supplierName;
    private boolean expired;
    private boolean expiringSoon;
    private boolean outOfStock;

    public PharmacyBatchDto() {}

    public static PharmacyBatchDto fromEntity(PharmacyBatch b) {
        PharmacyBatchDto dto = new PharmacyBatchDto();
        dto.setId(b.getId());
        if (b.getMedicine() != null) {
            dto.setMedicineId(b.getMedicine().getId());
            dto.setMedicineName(b.getMedicine().getName());
            dto.setMedicineCode(b.getMedicine().getMedicineCode());
            dto.setStrength(b.getMedicine().getDosageStrength());
            dto.setManufacturer(b.getMedicine().getManufacturer());
            dto.setPlacement(b.getMedicine().getRackLocation());
        }
        dto.setBatchNumber(b.getBatchNumber());
        dto.setManufacturingDate(b.getManufacturingDate());
        dto.setExpiryDate(b.getExpiryDate());
        dto.setReminderPeriodMonths(b.getReminderPeriodMonths());
        dto.setReminderDate(b.getReminderDate());
        dto.setQuantity(b.getQuantity());
        dto.setCostPerUnit(b.getCostPerUnit());
        dto.setMrp(b.getMrp());
        dto.setSupplierName(b.getSupplierName());
        dto.setExpired(b.isExpired());
        dto.setExpiringSoon(b.isExpiringSoon());
        dto.setOutOfStock(b.isOutOfStock());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMedicineId() { return medicineId; }
    public void setMedicineId(Long medicineId) { this.medicineId = medicineId; }

    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }

    public String getMedicineCode() { return medicineCode; }
    public void setMedicineCode(String medicineCode) { this.medicineCode = medicineCode; }

    public String getStrength() { return strength; }
    public void setStrength(String strength) { this.strength = strength; }

    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }

    public String getPlacement() { return placement; }
    public void setPlacement(String placement) { this.placement = placement; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public LocalDate getManufacturingDate() { return manufacturingDate; }
    public void setManufacturingDate(LocalDate manufacturingDate) { this.manufacturingDate = manufacturingDate; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public Integer getReminderPeriodMonths() { return reminderPeriodMonths; }
    public void setReminderPeriodMonths(Integer reminderPeriodMonths) { this.reminderPeriodMonths = reminderPeriodMonths; }

    public LocalDate getReminderDate() { return reminderDate; }
    public void setReminderDate(LocalDate reminderDate) { this.reminderDate = reminderDate; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getCostPerUnit() { return costPerUnit; }
    public void setCostPerUnit(BigDecimal costPerUnit) { this.costPerUnit = costPerUnit; }

    public BigDecimal getMrp() { return mrp; }
    public void setMrp(BigDecimal mrp) { this.mrp = mrp; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public boolean isExpired() { return expired; }
    public void setExpired(boolean expired) { this.expired = expired; }

    public boolean isExpiringSoon() { return expiringSoon; }
    public void setExpiringSoon(boolean expiringSoon) { this.expiringSoon = expiringSoon; }

    public boolean isOutOfStock() { return outOfStock; }
    public void setOutOfStock(boolean outOfStock) { this.outOfStock = outOfStock; }
}
