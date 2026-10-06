package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.PharmacyBillItem;
import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;

public class PharmacyBillItemDto {

    private Long id;
    private Long medicineId;
    private String medicineCode;
    private String medicineName;
    private String batchNumber;
    private String expiryDate;
    private Integer quantity;
    private BigDecimal unitPrice;
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
        dto.setMedicineCode(item.getMedicineCode());
        dto.setMedicineName(item.getMedicineName());
        dto.setBatchNumber(item.getBatchNumber());
        dto.setExpiryDate(item.getExpiryDate() != null ? item.getExpiryDate().format(fmt) : "");
        dto.setQuantity(item.getQuantity());
        dto.setUnitPrice(item.getUnitPrice());
        dto.setTotalPrice(item.getTotalPrice());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getMedicineId() { return medicineId; }
    public void setMedicineId(Long medicineId) { this.medicineId = medicineId; }

    public String getMedicineCode() { return medicineCode; }
    public void setMedicineCode(String medicineCode) { this.medicineCode = medicineCode; }

    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public String getExpiryDate() { return expiryDate; }
    public void setExpiryDate(String expiryDate) { this.expiryDate = expiryDate; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getUnitPrice() { return unitPrice; }
    public void setUnitPrice(BigDecimal unitPrice) { this.unitPrice = unitPrice; }

    public BigDecimal getTotalPrice() { return totalPrice; }
    public void setTotalPrice(BigDecimal totalPrice) { this.totalPrice = totalPrice; }
}
