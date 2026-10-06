package com.carevista.hms.billing.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;

@Entity
@Table(name = "central_bill_items")
public class CentralBillItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "central_bill_id", nullable = false)
    @JsonIgnore
    private CentralBill centralBill;

    @Column(name = "module_type", nullable = false, length = 30)
    private String moduleType; // OP, IP, PHARMACY, LABORATORY

    @Column(name = "reference_id", length = 50)
    private String referenceId; // The ID of the op/ip/pharmacy bill

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "amount", precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    public CentralBillItem() {}

    public CentralBillItem(CentralBill centralBill, String moduleType, String referenceId, String description, BigDecimal amount) {
        this.centralBill = centralBill;
        this.moduleType = moduleType;
        this.referenceId = referenceId;
        this.description = description;
        this.amount = amount != null ? amount : BigDecimal.ZERO;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public CentralBill getCentralBill() { return centralBill; }
    public void setCentralBill(CentralBill centralBill) { this.centralBill = centralBill; }
    public String getModuleType() { return moduleType; }
    public void setModuleType(String moduleType) { this.moduleType = moduleType; }
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String referenceId) { this.referenceId = referenceId; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
}
