package com.carevista.hms.pharmacy.entity;

import com.carevista.hms.tenant.entity.Tenant;
import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pharmacy_stock_movements", indexes = {
    @Index(name = "idx_sm_tenant", columnList = "tenant_id"),
    @Index(name = "idx_sm_medicine", columnList = "medicine_id"),
    @Index(name = "idx_sm_batch", columnList = "batch_id"),
    @Index(name = "idx_sm_created", columnList = "created_at")
})
public class PharmacyStockMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "medicine_id", nullable = false)
    private Medicine medicine;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id")
    private PharmacyBatch batch;

    @Column(name = "batch_number", length = 60)
    private String batchNumber;

    @Column(name = "change_amount", nullable = false)
    private Integer changeAmount;

    @Column(name = "balance_after")
    private Integer balanceAfter;

    @Column(name = "reason", nullable = false, length = 255)
    private String reason;

    @Column(name = "performed_by", length = 150)
    private String performedBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public PharmacyStockMovement() {}

    public PharmacyStockMovement(Tenant tenant, Medicine medicine, PharmacyBatch batch, String batchNumber,
                                 Integer changeAmount, Integer balanceAfter, String reason, String performedBy) {
        this.tenant = tenant;
        this.medicine = medicine;
        this.batch = batch;
        this.batchNumber = batchNumber;
        this.changeAmount = changeAmount;
        this.balanceAfter = balanceAfter;
        this.reason = reason;
        this.performedBy = performedBy;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public Medicine getMedicine() { return medicine; }
    public void setMedicine(Medicine medicine) { this.medicine = medicine; }

    public PharmacyBatch getBatch() { return batch; }
    public void setBatch(PharmacyBatch batch) { this.batch = batch; }

    public String getBatchNumber() { return batchNumber; }
    public void setBatchNumber(String batchNumber) { this.batchNumber = batchNumber; }

    public Integer getChangeAmount() { return changeAmount; }
    public void setChangeAmount(Integer changeAmount) { this.changeAmount = changeAmount; }

    public Integer getBalanceAfter() { return balanceAfter; }
    public void setBalanceAfter(Integer balanceAfter) { this.balanceAfter = balanceAfter; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getPerformedBy() { return performedBy; }
    public void setPerformedBy(String performedBy) { this.performedBy = performedBy; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
