package com.carevista.hms.pharmacy.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pharmacy_bill_items", indexes = {
    @Index(name = "idx_pbi_bill", columnList = "bill_id"),
    @Index(name = "idx_pbi_medicine", columnList = "medicine_id"),
    @Index(name = "idx_pbi_batch", columnList = "batch_id")
})
public class PharmacyBillItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bill_id", nullable = false)
    private PharmacyBill bill;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "medicine_id")
    private Medicine medicine;

    @Column(name = "batch_id")
    private Long batchId;

    @Column(name = "medicine_code", length = 50)
    private String medicineCode;

    @Column(name = "medicine_name", nullable = false, length = 150)
    private String medicineName;

    @Column(name = "strength", length = 50)
    private String strength;

    @Column(name = "manufacturer", length = 150)
    private String manufacturer;

    @Column(name = "batch_number", length = 60)
    private String batchNumber;

    @Column(name = "expiry_date")
    private LocalDate expiryDate;

    @Column(name = "unit", length = 30)
    private String unit = "basic"; // basic or strip

    @Column(name = "quantity", nullable = false)
    private Integer quantity = 1;

    @Column(name = "basic_unit_quantity")
    private Integer basicUnitQuantity = 1;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "subtotal", precision = 12, scale = 2)
    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "discount_percentage", precision = 5, scale = 2)
    private BigDecimal discountPercentage = BigDecimal.ZERO;

    @Column(name = "discount_amount", precision = 12, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "gst_percentage", precision = 5, scale = 2)
    private BigDecimal gstPercentage = BigDecimal.ZERO;

    @Column(name = "gst_amount", precision = 12, scale = 2)
    private BigDecimal gstAmount = BigDecimal.ZERO;

    @Column(name = "hsn_code", length = 30)
    private String hsnCode;

    @Column(name = "cost_per_unit", precision = 10, scale = 2)
    private BigDecimal costPerUnit = BigDecimal.ZERO;

    @Column(name = "has_prescription")
    private Boolean hasPrescription = false;

    @Column(name = "total_price", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalPrice = BigDecimal.ZERO;

    public PharmacyBillItem() {}

    public PharmacyBillItem(PharmacyBill bill, Medicine medicine, String medicineCode, String medicineName,
                            String batchNumber, LocalDate expiryDate, Integer quantity,
                            BigDecimal unitPrice, BigDecimal totalPrice) {
        this.bill = bill;
        this.medicine = medicine;
        this.medicineCode = medicineCode;
        this.medicineName = medicineName;
        this.batchNumber = batchNumber;
        this.expiryDate = expiryDate;
        this.quantity = quantity != null ? quantity : 1;
        this.basicUnitQuantity = this.quantity;
        this.unit = "basic";
        this.unitPrice = unitPrice != null ? unitPrice : BigDecimal.ZERO;
        this.subtotal = totalPrice != null ? totalPrice : BigDecimal.ZERO;
        this.totalPrice = totalPrice != null ? totalPrice : BigDecimal.ZERO;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public PharmacyBill getBill() { return bill; }
    public void setBill(PharmacyBill bill) { this.bill = bill; }

    public Medicine getMedicine() { return medicine; }
    public void setMedicine(Medicine medicine) { this.medicine = medicine; }

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

    public LocalDate getExpiryDate() { return expiryDate; }
    public void setExpiryDate(LocalDate expiryDate) { this.expiryDate = expiryDate; }

    public String getUnit() { return unit != null ? unit : "basic"; }
    public void setUnit(String unit) { this.unit = unit; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public Integer getBasicUnitQuantity() { return basicUnitQuantity != null ? basicUnitQuantity : quantity; }
    public void setBasicUnitQuantity(Integer basicUnitQuantity) { this.basicUnitQuantity = basicUnitQuantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getSubtotal() { return subtotal != null ? subtotal : totalPrice; }
    public void setSubtotal(BigDecimal subtotal) { this.subtotal = subtotal; }

    public BigDecimal getDiscountPercentage() { return discountPercentage; }
    public void setDiscountPercentage(BigDecimal discountPercentage) { this.discountPercentage = discountPercentage; }

    public BigDecimal getDiscountAmount() { return discountAmount; }
    public void setDiscountAmount(BigDecimal discountAmount) { this.discountAmount = discountAmount; }

    public BigDecimal getGstPercentage() { return gstPercentage; }
    public void setGstPercentage(BigDecimal gstPercentage) { this.gstPercentage = gstPercentage; }

    public BigDecimal getGstAmount() { return gstAmount; }
    public void setGstAmount(BigDecimal gstAmount) { this.gstAmount = gstAmount; }

    public String getHsnCode() { return hsnCode; }
    public void setHsnCode(String hsnCode) { this.hsnCode = hsnCode; }

    public BigDecimal getCostPerUnit() { return costPerUnit; }
    public void setCostPerUnit(BigDecimal costPerUnit) { this.costPerUnit = costPerUnit; }

    public Boolean getHasPrescription() { return hasPrescription != null && hasPrescription; }
    public void setHasPrescription(Boolean hasPrescription) { this.hasPrescription = hasPrescription; }

    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
}
