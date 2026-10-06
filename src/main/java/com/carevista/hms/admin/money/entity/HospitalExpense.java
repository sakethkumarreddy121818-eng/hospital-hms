package com.carevista.hms.admin.money.entity;

import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_expenses", indexes = {
    @Index(name = "idx_exp_tenant", columnList = "tenant_id"),
    @Index(name = "idx_exp_date", columnList = "expense_date"),
    @Index(name = "idx_exp_cat", columnList = "category"),
    @Index(name = "idx_exp_number", columnList = "expense_number")
})
public class HospitalExpense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "expense_number", nullable = false, length = 50)
    private String expenseNumber;

    @Column(name = "category", nullable = false, length = 100)
    private String category; // GENERAL EXPENSES, LAB EXPENSES, OTHER EXPENSES, UTILITIES, MAINTENANCE, etc.

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "payee_vendor", length = 150)
    private String payeeVendor;

    @Column(name = "amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(name = "payment_method", length = 50)
    private String paymentMethod = "BANK_TRANSFER"; // CASH, BANK_TRANSFER, CARD, UPI, CHEQUE

    @Column(name = "expense_date", nullable = false)
    private LocalDate expenseDate = LocalDate.now();

    @Column(name = "receipt_number", length = 100)
    private String receiptNumber;

    @Column(name = "status", length = 30)
    private String status = "PAID"; // PAID, PENDING, CANCELLED

    @Column(name = "notes", length = 500)
    private String notes;

    @Column(name = "created_by_name", length = 100)
    private String createdByName;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    public HospitalExpense() {}

    public HospitalExpense(Tenant tenant, String expenseNumber, String category, String title,
                           String payeeVendor, BigDecimal amount, String paymentMethod,
                           LocalDate expenseDate, String receiptNumber, String status,
                           String notes, String createdByName) {
        this.tenant = tenant;
        this.expenseNumber = expenseNumber;
        this.category = category != null ? category : "GENERAL EXPENSES";
        this.title = title;
        this.payeeVendor = payeeVendor;
        this.amount = amount != null ? amount : BigDecimal.ZERO;
        this.paymentMethod = paymentMethod != null ? paymentMethod : "BANK_TRANSFER";
        this.expenseDate = expenseDate != null ? expenseDate : LocalDate.now();
        this.receiptNumber = receiptNumber;
        this.status = status != null ? status : "PAID";
        this.notes = notes;
        this.createdByName = createdByName;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public String getExpenseNumber() { return expenseNumber; }
    public void setExpenseNumber(String expenseNumber) { this.expenseNumber = expenseNumber; }

    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getPayeeVendor() { return payeeVendor; }
    public void setPayeeVendor(String payeeVendor) { this.payeeVendor = payeeVendor; }

    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }

    public String getPaymentMethod() { return paymentMethod; }
    public void setPaymentMethod(String paymentMethod) { this.paymentMethod = paymentMethod; }

    public LocalDate getExpenseDate() { return expenseDate; }
    public void setExpenseDate(LocalDate expenseDate) { this.expenseDate = expenseDate; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCreatedByName() { return createdByName; }
    public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
