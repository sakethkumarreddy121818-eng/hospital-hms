package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class MoneyDashboardSummaryDto {

    private String hospitalName;
    private String period; // ONE_DAY, ONE_WEEK, ONE_MONTH, ONE_YEAR, LIFETIME, CUSTOM
    private String startDate;
    private String endDate;
    private String currency = "₹";

    // Main KPI Cards
    private BigDecimal totalRevenueBilled = BigDecimal.ZERO;
    private BigDecimal totalRevenueCollected = BigDecimal.ZERO;
    private BigDecimal totalExpenses = BigDecimal.ZERO;
    private BigDecimal netAmount = BigDecimal.ZERO; // Billed Revenue - Expenses
    private BigDecimal netCollected = BigDecimal.ZERO; // Collected Revenue - Expenses
    private BigDecimal totalOutstanding = BigDecimal.ZERO;

    // Today's Metrics
    private BigDecimal todayRevenue = BigDecimal.ZERO;
    private BigDecimal todayExpenses = BigDecimal.ZERO;
    private BigDecimal todayNet = BigDecimal.ZERO;
    private BigDecimal todayOutstanding = BigDecimal.ZERO;

    // Breakdowns
    private RevenueSourcesDto revenueSources;
    private List<DoctorRevenueDto> doctorRevenueList = new ArrayList<>();
    private IpRevenueBreakdownDto ipRevenueBreakdown;
    private ExpenseBreakdownDto expenseBreakdown;
    private List<FinancialTransactionDto> recentTransactions = new ArrayList<>();

    // Dedicated Financial Sections
    private OpFinancialSectionDto opFinancials;
    private IpFinancialSectionDto ipFinancials;
    private LabFinancialSectionDto labFinancials;
    private PharmacyFinancialSectionDto pharmacyFinancials;
    private DoctorFinancialSectionDto doctorFinancials;

    public MoneyDashboardSummaryDto() {}

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }

    public String getStartDate() { return startDate; }
    public void setStartDate(String startDate) { this.startDate = startDate; }

    public String getEndDate() { return endDate; }
    public void setEndDate(String endDate) { this.endDate = endDate; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public BigDecimal getTotalRevenueBilled() { return totalRevenueBilled; }
    public void setTotalRevenueBilled(BigDecimal totalRevenueBilled) { this.totalRevenueBilled = totalRevenueBilled; }

    public BigDecimal getTotalRevenueCollected() { return totalRevenueCollected; }
    public void setTotalRevenueCollected(BigDecimal totalRevenueCollected) { this.totalRevenueCollected = totalRevenueCollected; }

    public BigDecimal getTotalExpenses() { return totalExpenses; }
    public void setTotalExpenses(BigDecimal totalExpenses) { this.totalExpenses = totalExpenses; }

    public BigDecimal getNetAmount() { return netAmount; }
    public void setNetAmount(BigDecimal netAmount) { this.netAmount = netAmount; }

    public BigDecimal getNetCollected() { return netCollected; }
    public void setNetCollected(BigDecimal netCollected) { this.netCollected = netCollected; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public BigDecimal getTodayRevenue() { return todayRevenue; }
    public void setTodayRevenue(BigDecimal todayRevenue) { this.todayRevenue = todayRevenue; }

    public BigDecimal getTodayExpenses() { return todayExpenses; }
    public void setTodayExpenses(BigDecimal todayExpenses) { this.todayExpenses = todayExpenses; }

    public BigDecimal getTodayNet() { return todayNet; }
    public void setTodayNet(BigDecimal todayNet) { this.todayNet = todayNet; }

    public BigDecimal getTodayOutstanding() { return todayOutstanding; }
    public void setTodayOutstanding(BigDecimal todayOutstanding) { this.todayOutstanding = todayOutstanding; }

    public RevenueSourcesDto getRevenueSources() { return revenueSources; }
    public void setRevenueSources(RevenueSourcesDto revenueSources) { this.revenueSources = revenueSources; }

    public List<DoctorRevenueDto> getDoctorRevenueList() { return doctorRevenueList; }
    public void setDoctorRevenueList(List<DoctorRevenueDto> doctorRevenueList) { this.doctorRevenueList = doctorRevenueList; }

    public IpRevenueBreakdownDto getIpRevenueBreakdown() { return ipRevenueBreakdown; }
    public void setIpRevenueBreakdown(IpRevenueBreakdownDto ipRevenueBreakdown) { this.ipRevenueBreakdown = ipRevenueBreakdown; }

    public ExpenseBreakdownDto getExpenseBreakdown() { return expenseBreakdown; }
    public void setExpenseBreakdown(ExpenseBreakdownDto expenseBreakdown) { this.expenseBreakdown = expenseBreakdown; }

    public List<FinancialTransactionDto> getRecentTransactions() { return recentTransactions; }
    public void setRecentTransactions(List<FinancialTransactionDto> recentTransactions) { this.recentTransactions = recentTransactions; }

    public OpFinancialSectionDto getOpFinancials() { return opFinancials; }
    public void setOpFinancials(OpFinancialSectionDto opFinancials) { this.opFinancials = opFinancials; }

    public IpFinancialSectionDto getIpFinancials() { return ipFinancials; }
    public void setIpFinancials(IpFinancialSectionDto ipFinancials) { this.ipFinancials = ipFinancials; }

    public LabFinancialSectionDto getLabFinancials() { return labFinancials; }
    public void setLabFinancials(LabFinancialSectionDto labFinancials) { this.labFinancials = labFinancials; }

    public PharmacyFinancialSectionDto getPharmacyFinancials() { return pharmacyFinancials; }
    public void setPharmacyFinancials(PharmacyFinancialSectionDto pharmacyFinancials) { this.pharmacyFinancials = pharmacyFinancials; }

    public DoctorFinancialSectionDto getDoctorFinancials() { return doctorFinancials; }
    public void setDoctorFinancials(DoctorFinancialSectionDto doctorFinancials) { this.doctorFinancials = doctorFinancials; }
}
