package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;

public class PharmacyPurchaseDto {

    private Long id;
    private String supplier;
    private String purchaseDate;
    private String medicineName;
    private String genericName;
    private String batchNumber;
    private Integer quantity = 0;
    private BigDecimal costPrice = BigDecimal.ZERO;
    private BigDecimal purchaseAmount = BigDecimal.ZERO;
    private String manufacturer;

    public PharmacyPurchaseDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getSupplier() { return supplier; }
    public void setSupplier(String supplier) { this.supplier = supplier; }

    public String getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(String purchaseDate) { this.purchaseDate = purchaseDate; }

    public String getMedicineName() { return medicineName; }
    public void setMedicineName(String medicineName) { this.medicineName = medicineName; }

    public String getGenericName() { return genericName; }
    public void setGenericName(String genericName) { this.genericName = genericName; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public Integer getQuantity() { return quantity; }
    public void setQuantity(Integer quantity) { this.quantity = quantity; }

    public BigDecimal getCostPrice() { return costPrice; }
    public void setCostPrice(BigDecimal costPrice) { this.costPrice = costPrice; }

    public BigDecimal getPurchaseAmount() { return purchaseAmount; }
    public void setPurchaseAmount(BigDecimal purchaseAmount) { this.purchaseAmount = purchaseAmount; }

    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }
}
