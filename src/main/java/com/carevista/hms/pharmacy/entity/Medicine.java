package com.carevista.hms.pharmacy.entity;

import com.carevista.hms.tenant.entity.Tenant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "pharmacy_medicines", indexes = {
    @Index(name = "idx_med_tenant", columnList = "tenant_id"),
    @Index(name = "idx_med_code", columnList = "medicine_code"),
    @Index(name = "idx_med_name", columnList = "name"),
    @Index(name = "idx_med_batch", columnList = "batch_number"),
    @Index(name = "idx_med_deleted", columnList = "is_deleted")
})
public class Medicine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "medicine_code", nullable = false, length = 50)
    private String medicineCode;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "generic_name", length = 150)
    private String genericName;

    @Column(name = "category", length = 50)
    private String category = "Tablet"; // Tablet, Capsule, Syrup, Injection, Ointment, Drops, Inhaler

    @Column(name = "batch_number", length = 50)
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "cost_price", precision = 10, scale = 2)
    private BigDecimal costPrice = BigDecimal.ZERO;

    @Column(name = "stock_quantity", nullable = false)
    private Integer stockQuantity = 0;

    @Column(name = "reorder_level", nullable = false)
    private Integer reorderLevel = 10;

    @Column(name = "medicine_form", length = 50)
    private String medicineForm = "Tablet";

    @Column(name = "dosage_strength", length = 50)
    private String dosageStrength;

    @Column(name = "supplier", length = 150)
    private String supplier;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "gst_percentage", precision = 5, scale = 2)
    private BigDecimal gstPercentage = new BigDecimal("5.00");

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "manufacturer", length = 150)
    private String manufacturer;

    @Column(name = "rack_location", length = 50)
    private String rackLocation;

    @Column(name = "sold_as", length = 30)
    private String soldAs = "tablet"; // tablet, capsule, other

    @Column(name = "units_per_strip")
    private Integer unitsPerStrip = 10;

    @Column(name = "prescription_required", nullable = false)
    private Boolean prescriptionRequired = false;

    @Column(name = "hsn_code", length = 30)
    private String hsnCode = "3004";

    @Column(name = "is_deleted", nullable = false)
    private Boolean isDeleted = false;

    @Column(name = "status", length = 30)
    private String status = "ACTIVE"; // ACTIVE, DISCONTINUED

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @JsonIgnore
    @OneToMany(mappedBy = "medicine", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<PharmacyBatch> batches = new ArrayList<>();

    public Medicine() {}

    public Medicine(Tenant tenant, String medicineCode, String name, String genericName, String category,
                    String batchNumber, LocalDate expiryDate, BigDecimal unitPrice, BigDecimal costPrice,
                    Integer stockQuantity, Integer reorderLevel, String manufacturer, String rackLocation) {
        this.tenant = tenant;
        this.medicineCode = medicineCode;
        this.name = name;
        this.genericName = genericName;
        this.category = category != null ? category : "Tablet";
        this.medicineForm = this.category;
        this.soldAs = "Capsule".equalsIgnoreCase(category) ? "capsule" : ("Tablet".equalsIgnoreCase(category) ? "tablet" : "other");
        this.batchNumber = batchNumber;
        this.expiryDate = expiryDate;
        this.unitPrice = unitPrice != null ? unitPrice : BigDecimal.ZERO;
        this.costPrice = costPrice != null ? costPrice : BigDecimal.ZERO;
        this.stockQuantity = stockQuantity != null ? stockQuantity : 0;
        this.reorderLevel = reorderLevel != null ? reorderLevel : 10;
        this.manufacturer = manufacturer;
        this.rackLocation = rackLocation;
        this.prescriptionRequired = false;
        this.isDeleted = false;
        this.status = "ACTIVE";
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public String getMedicineCode() { return medicineCode; }
    public void setMedicineCode(String medicineCode) { this.medicineCode = medicineCode; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getGenericName() { return genericName; }
    public void setGenericName(String genericName) { this.genericName = genericName; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

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

    public String getMedicineForm() { return medicineForm; }
    public void setMedicineForm(String medicineForm) { this.medicineForm = medicineForm; }

    public String getDosageStrength() { return dosageStrength; }
    public void setDosageStrength(String dosageStrength) { this.dosageStrength = dosageStrength; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public LocalDate getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDate purchaseDate) { this.purchaseDate = purchaseDate; }

    public BigDecimal getGstPercentage() { return gstPercentage; }
    public void setGstPercentage(BigDecimal gstPercentage) { this.gstPercentage = gstPercentage; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }

    public String getRackLocation() { return rackLocation; }
    public void setRackLocation(String rackLocation) { this.rackLocation = rackLocation; }

    public String getPlacement() { return rackLocation; }
    public void setPlacement(String placement) { this.rackLocation = placement; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public List<PharmacyBatch> getBatches() { return batches; }
    public void setBatches(List<PharmacyBatch> batches) { this.batches = batches; }

    public boolean isExpired() {
        return expiryDate != null && expiryDate.isBefore(LocalDate.now());
    }

    public boolean isNearExpiry() {
        if (expiryDate == null || isExpired()) return false;
        return !expiryDate.isAfter(LocalDate.now().plusDays(60));
    }

    public boolean isLowStock() {
        return stockQuantity != null && stockQuantity <= reorderLevel && stockQuantity > 0;
    }

    public boolean isOutOfStock() {
        return stockQuantity == null || stockQuantity <= 0;
    }
}
