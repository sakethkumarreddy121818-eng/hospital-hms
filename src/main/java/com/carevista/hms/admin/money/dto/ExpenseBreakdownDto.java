package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class ExpenseBreakdownDto {

    private BigDecimal totalExpenses = BigDecimal.ZERO;
    private BigDecimal pharmacyPurchasesTotal = BigDecimal.ZERO;
    private BigDecimal operationalExpensesTotal = BigDecimal.ZERO;

    private List<ExpenseCategoryItemDto> categories = new ArrayList<>();
    private List<PharmacyPurchaseDto> pharmacyPurchases = new ArrayList<>();
    private List<HospitalExpenseItemDto> operationalExpenses = new ArrayList<>();

    public ExpenseBreakdownDto() {}

    public static class ExpenseCategoryItemDto {
        private String category; // PHARMACY PURCHASES, GENERAL EXPENSES, LAB EXPENSES, OTHER EXPENSES, etc.
        private BigDecimal amount = BigDecimal.ZERO;
        private long count = 0;
        private double percentage = 0.0;

        public ExpenseCategoryItemDto() {}

        public ExpenseCategoryItemDto(String category, BigDecimal amount, long count, double percentage) {
            this.category = category;
            this.amount = amount != null ? amount : BigDecimal.ZERO;
            this.count = count;
            this.percentage = percentage;
        }

        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }

        public BigDecimal getAmount() { return amount; }
        public void setAmount(BigDecimal amount) { this.amount = amount; }

        public long getCount() { return count; }
        public void setCount(long count) { this.count = count; }

        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
    }

    public static class HospitalExpenseItemDto {
        private Long id;
        private String expenseNumber;
        private String category;
        private String title;
        private String payeeVendor;
        private BigDecimal amount = BigDecimal.ZERO;
        private String paymentMethod;
        private String expenseDate;
        private String receiptNumber;
        private String status;
        private String notes;
        private String createdByName;

        public HospitalExpenseItemDto() {}

        public Long getId() { return id; }
        public void setId(Long id) { this.id = id; }

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

        public String getExpenseDate() { return expenseDate; }
        public void setExpenseDate(String expenseDate) { this.expenseDate = expenseDate; }

        public String getReceiptNumber() { return receiptNumber; }
        public void setReceiptNumber(String receiptNumber) { this.receiptNumber = receiptNumber; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }

        public String getNotes() { return notes; }
        public void setNotes(String notes) { this.notes = notes; }

        public String getCreatedByName() { return createdByName; }
        public void setCreatedByName(String createdByName) { this.createdByName = createdByName; }
    }

    public BigDecimal getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(BigDecimal totalExpenses) { this.totalExpenses = totalExpenses; }

    public BigDecimal getPharmacyPurchasesTotal() { return pharmacyPurchasesTotal; }
    public void setPharmacyPurchasesTotal(BigDecimal pharmacyPurchasesTotal) { this.pharmacyPurchasesTotal = pharmacyPurchasesTotal; }

    public BigDecimal getOperationalExpensesTotal() { return operationalExpensesTotal; }
    public void setOperationalExpensesTotal(BigDecimal operationalExpensesTotal) { this.operationalExpensesTotal = operationalExpensesTotal; }

    public List<ExpenseCategoryItemDto> getCategories() { return categories; }
    public void setCategories(List<ExpenseCategoryItemDto> categories) { this.categories = categories; }

    public List<PharmacyPurchaseDto> getPharmacyPurchases() { return pharmacyPurchases; }
    public void setPharmacyPurchases(List<PharmacyPurchaseDto> pharmacyPurchases) { this.pharmacyPurchases = pharmacyPurchases; }

    public List<HospitalExpenseItemDto> getOperationalExpenses() { return operationalExpenses; }
    public void setOperationalExpenses(List<HospitalExpenseItemDto> operationalExpenses) { this.operationalExpenses = operationalExpenses; }
}
