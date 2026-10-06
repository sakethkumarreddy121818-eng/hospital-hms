package com.carevista.hms.admin.money.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CreateExpenseRequest {

    @NotBlank(message = "Category is required")
    private String category; // GENERAL EXPENSES, LAB EXPENSES, OTHER EXPENSES, UTILITIES, MAINTENANCE, etc.

    @NotBlank(message = "Title / description is required")
    private String title;

    private String payeeVendor;

    @NotNull(message = "Amount is required")
    private BigDecimal amount;

    private String paymentMethod = "BANK_TRANSFER";

    private String expenseDate; // YYYY-MM-DD or DD/MM/YYYY

    private String receiptNumber;

    private String status = "PAID";

    private String notes;

    public CreateExpenseRequest() {}

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

    public String getExpenseDate() { return expenseDate; }
    public void setExpenseDate(String expenseDate) { this.expenseDate = expenseDate; }

    public String getReceiptNumber() { return receiptNumber; }
    public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
