package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.PharmacyBillItem;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class PharmacyBillItemDto {

    private Long id;
    private Long medicineId;
    private Long batchId;
    private String medicineCode;
    private String medicineName;
    private String strength;
    private String manufacturer;
    private String batchNumber;
    private String expiryDate;
    private String unit;
    private Integer quantity;
    private Integer basicUnitQuantity;
    private BigDecimal unitPrice;
    private BigDecimal subtotal;
    private BigDecimal discountPercentage;
    private BigDecimal discountAmount;
    private BigDecimal gstPercentage;
    private BigDecimal gstAmount;
    private String hsnCode;
    private Boolean hasPrescription;
    private BigDecimal totalPrice;

    public PharmacyBillItemDto() {}

    public static PharmacyBillItemDto fromEntity(PharmacyBillItem item) {
        if (item == null) return null;
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd/MM/yyyy");

        PharmacyBillItemDto dto = new PharmacyBillItemDto();
        dto.setId(item.getId());
        if (item.getMedicine() != null) {
            dto.setMedicineId(item.getMedicine().getId());
        }
        dto.setBatchId(item.getBatchId());
        dto.setMedicineCode(item.getMedicineCode());
        dto.setMedicineName(item.getMedicineName());
        dto.setStrength(item.getStrength());
        dto.setManufacturer(item.getManufacturer());
        dto.setBatchNumber(item.getBatchNumber());
        dto.setExpiryDate(item.getExpiryDate() != null ? item.getExpiryDate().format(fmt) : "");
        dto.setUnit(item.getUnit());
        dto.setQuantity(item.getQuantity());
        dto.setBasicUnitQuantity(item.getBasicUnitQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setSubtotal(item.getSubtotal());
        dto.setDiscountPercentage(item.getDiscountPercentage());
        dto.setDiscountAmount(item.getDiscountAmount());
        dto.setGstPercentage(item.getGstPercentage());
        dto.setGstAmount(item.getGstAmount());
        dto.setHsnCode(item.getHsnCode());
        dto.setHasPrescription(item.getHasPrescription());
        dto.setTotalPrice(item.getTotalPrice());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMedicineId() { return medicineId; }
    public void setMedicineId(Long medicineId) { this.medicineId = medicineId; }

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

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

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

    public Boolean getHasPrescription() { return hasPrescription; }
    public void setHasPrescription(Boolean hasPrescription) { this.hasPrescription = hasPrescription; }

    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
}
