package com.carevista.hms.pharmacy.dto;

import com.carevista.hms.pharmacy.entity.PharmacyStockMovement;
import java.time.LocalDateTime;

public class PharmacyStockMovementDto {

    private Long id;
    private Long medicineId;
    private String medicineName;
    private String medicineCode;
    private Long batchId;
    private String batchNumber;
    private Integer changeAmount;
    private Integer balanceAfter;
    private String reason;
    private String performedBy;
    private LocalDateTime createdAt;

    public PharmacyStockMovementDto() {}

    public static PharmacyStockMovementDto fromEntity(PharmacyStockMovement sm) {
        PharmacyStockMovementDto dto = new PharmacyStockMovementDto();
        dto.setId(sm.getId());
        if (sm.getMedicine() != null) {
            dto.setMedicineId(sm.getMedicine().getId());
            dto.setMedicineName(sm.getMedicine().getName());
            dto.setMedicineCode(sm.getMedicine().getMedicineCode());
        }
        if (sm.getBatch() != null) {
            dto.setBatchId(sm.getBatch().getId());
        }
        dto.setBatchNumber(sm.getBatchNumber());
        dto.setChangeAmount(sm.getChangeAmount());
        dto.setBalanceAfter(sm.getBalanceAfter());
        dto.setReason(sm.getReason());
        dto.setPerformedBy(sm.getPerformedBy());
        dto.setCreatedAt(sm.getCreatedAt());
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

    public Long getBatchId() { return batchId; }
    public void setBatchId(Long batchId) { this.batchId = batchId; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public Integer getChangeAmount() { return changeAmount; }
    public void setChangeAmount(Integer changeAmount) { this.changeAmount = changeAmount; }
    public Integer getQuantityDelta() { return changeAmount; }

    public Integer getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(Integer balanceAfter) { this.balanceAfter = balanceAfter; }
    public Integer getResultingStock() { return balanceAfter; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }
    public String getMovementReason() { return reason; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
