package com.carevista.hms.pharmacy.entity;

import com.carevista.hms.tenant.entity.Tenant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "pharmacy_batches", indexes = {
    @Index(name = "idx_batch_tenant", columnList = "tenant_id"),
    @Index(name = "idx_batch_medicine", columnList = "medicine_id"),
    @Index(name = "idx_batch_num", columnList = "batch_number"),
    @Index(name = "idx_batch_expiry", columnList = "expiry_date")
})
public class PharmacyBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @Column(name = "batch_number", nullable = false, length = 60)
    private String batchNumber;

    @Column(name = "manufacturing_date")
    private LocalDate manufacturingDate;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "reminder_period_months")
    private Integer reminderPeriodMonths = 3;

    @Column(name = "reminder_date")
    private LocalDate reminderDate;

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 0;

    @Column(name = "cost_per_unit", precision = 10, scale = 2)
    private BigDecimal costPerUnit = BigDecimal.ZERO;

    @Column(name = "mrp", precision = 10, scale = 2)
    private BigDecimal mrp = BigDecimal.ZERO;

    @Column(name = "supplier_name", length = 150)
    private String supplierName;

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public PharmacyBatch() {}

    public PharmacyBatch(Tenant tenant, Medicine medicine, String batchNumber, LocalDate expiryDate,
                         Integer quantity, BigDecimal costPerUnit, Integer reminderPeriodMonths) {
        this.tenant = tenant;
        this.medicine = medicine;
        this.batchNumber = batchNumber;
        this.expiryDate = expiryDate;
        this.quantity = quantity != null ? quantity : 0;
        this.costPerUnit = costPerUnit != null ? costPerUnit : BigDecimal.ZERO;
        this.reminderPeriodMonths = reminderPeriodMonths != null ? reminderPeriodMonths : 3;
        if (expiryDate != null && this.reminderPeriodMonths != null) {
            this.reminderDate = expiryDate.minusMonths(this.reminderPeriodMonths);
        }
        this.isDeleted = false;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PrePersist
    @PreUpdate
    public void calculateReminderDate() {
        if (this.expiryDate != null && this.reminderPeriodMonths != null) {
            this.reminderDate = this.expiryDate.minusMonths(this.reminderPeriodMonths);
        }
        this.updatedAt = LocalDateTime.now();
    }

    public boolean isExpired() {
        return expiryDate != null && expiryDate.isBefore(LocalDate.now());
    }

    public boolean isExpiringSoon() {
        if (expiryDate == null || isExpired()) return false;
        LocalDate today = LocalDate.now();
        boolean within90Days = !expiryDate.isAfter(today.plusDays(90));
        boolean pastReminderDate = reminderDate != null && !reminderDate.isAfter(today);
        return within90Days || pastReminderDate;
    }

    public boolean isOutOfStock() {
        return quantity == null || quantity <= 0;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public Medicine getMedicine() { return medicine; }
    public void setMedicine(Medicine medicine) { this.medicine = medicine; }

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

    public Boolean getIsDeleted() { return isDeleted != null && isDeleted; }
    public void setIsDeleted(Boolean isDeleted) { this.isDeleted = isDeleted; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
