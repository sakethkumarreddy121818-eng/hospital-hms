package com.carevista.hms.superadmin.dto;

public class MonthlyOpUsageDto {
    private int year;
    private int month;
    private String monthName;
    private long usageCount;
    private int monthlyLimit;
    private long remaining;
    private boolean limitExceeded;

    public MonthlyOpUsageDto() {}

    public MonthlyOpUsageDto(int year, int month, String monthName, long usageCount, int monthlyLimit, long remaining, boolean limitExceeded) {
        this.year = year;
        this.month = month;
        this.monthName = monthName;
        this.usageCount = usageCount;
        this.monthlyLimit = monthlyLimit;
        this.remaining = remaining;
        this.limitExceeded = limitExceeded;
    }

    public int getYear() { return year; }
    public void setYear(int year) { this.year = year; }

    public int getMonth() { return month; }
    public void setMonth(int month) { this.month = month; }

    public String getMonthName() { return monthName; }
    public void setMonthName(String monthName) { this.monthName = monthName; }

    public long getUsageCount() { return usageCount; }
    public void setUsageCount(long usageCount) { this.usageCount = usageCount; }

    public int getMonthlyLimit() { return monthlyLimit; }
    public void setMonthlyLimit(int monthlyLimit) { this.monthlyLimit = monthlyLimit; }

    public long getRemaining() { return remaining; }
    public void setRemaining(long remaining) { this.remaining = remaining; }

    public boolean isLimitExceeded() { return limitExceeded; }
    public void setLimitExceeded(boolean limitExceeded) { this.limitExceeded = limitExceeded; }
}
