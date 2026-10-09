package com.carevista.hms.pharmacy.dto;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;

public class StockReceiptRequest {

    @NotNull(message = "Medicine ID is required")
    private Long medicineId;

    private Long batchId; // if adding to existing batch
    private String batchNumber; // if creating new batch or overriding
    private LocalDate expiryDate;
    private Integer reminderPeriodMonths = 3;

    @NotNull(message = "Quantity is required")
    private Integer quantity;

    private String unit = "basic"; // "basic" or "strip"
    private BigDecimal costPerUnit;
    private Long supplierId;
    private String supplierName;
    private String notes;

    public StockReceiptRequest() {}

    public Long getMedicineId() { return medicineId; }
    public void setMedicineId(Long medicineId) { this.medicineId = medicineId; }

    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public Integer getReminderPeriodMonths() { return reminderPeriodMonths; }
    public void setReminderPeriodMonths(Integer reminderPeriodMonths) { this.reminderPeriodMonths = reminderPeriodMonths; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public String getUnit() { return unit != null ? unit : "basic"; }
    public void setUnit(String unit) { this.unit = unit; }

    public BigDecimal getCostPerUnit() { return costPerUnit; }
    public void setCostPerUnit(BigDecimal costPerUnit) { this.costPerUnit = costPerUnit; }

    public Long getSupplierId() { return supplierId; }
    public void setSupplierId(Long supplierId) { this.supplierId = supplierId; }

    public String getSupplierName() { return supplierName; }
    public void setSupplierName(String supplierName) { this.supplierName = supplierName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
