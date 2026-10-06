package com.carevista.hms.superadmin.dto;

public class SuperAdminMetricsDto {
    private long totalHospitals;
    private long activeHospitals;
    private long disabledHospitals;
    private long totalAdmins;
    private long totalEmployees;
    private int totalOpCapacity;
    private int totalOpCurrentUsage;
    private long unreadNotificationsCount;
    private String systemStatus = "HEALTHY";

    public SuperAdminMetricsDto() {}

    public long getTotalHospitals() { return totalHospitals; }
    public void setTotalHospitals(long totalHospitals) { this.totalHospitals = totalHospitals; }

    public long getActiveHospitals() { return activeHospitals; }
    public void setActiveHospitals(long activeHospitals) { this.activeHospitals = activeHospitals; }

    public long getDisabledHospitals() { return disabledHospitals; }
    public void setDisabledHospitals(long disabledHospitals) { this.disabledHospitals = disabledHospitals; }

    public long getTotalAdmins() { return totalAdmins; }
    public void setTotalAdmins(long totalAdmins) { this.totalAdmins = totalAdmins; }

    public long getTotalEmployees() { return totalEmployees; }
    public void setTotalEmployees(long totalEmployees) { this.totalEmployees = totalEmployees; }

    public int getTotalOpCapacity() { return totalOpCapacity; }
    public void setTotalOpCapacity(int totalOpCapacity) { this.totalOpCapacity = totalOpCapacity; }

    public int getTotalOpCurrentUsage() { return totalOpCurrentUsage; }
    public void setTotalOpCurrentUsage(int totalOpCurrentUsage) { this.totalOpCurrentUsage = totalOpCurrentUsage; }

    public long getUnreadNotificationsCount() { return unreadNotificationsCount; }
    public void setUnreadNotificationsCount(long unreadNotificationsCount) { this.unreadNotificationsCount = unreadNotificationsCount; }

    public String getSystemStatus() { return systemStatus; }
    public void setSystemStatus(String systemStatus) { this.systemStatus = systemStatus; }
}
