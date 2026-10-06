package com.carevista.hms.settings.dto;

import com.carevista.hms.settings.entity.HospitalSetting;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class HospitalSettingDto {
    private Long id;
    private Long tenantId;
    private String hospitalName;
    private String phone;
    private String email;
    private String address;
    private String emergencyContact;
    private String accreditationDetails;

    // Appearance / Colors
    private String primaryColor;
    private String secondaryColor;
    private String accentColor;
    private String themePreset;
    private Boolean sidebarCollapsed;

    // Billing
    private String gstNumber;
    private BigDecimal defaultGstPct;
    private String invoicePrefix;
    private String defaultPaymentMethod;
    private String billingTerms;

    // Pharmacy
    private Integer pharmacyReorderLevel;
    private Integer pharmacyExpiryAlertDays;
    private String pharmacyReturnNotice;

    // Laboratory
    private Integer labTurnaroundHours;
    private String labCriticalAlert;

    // Notifications
    private Boolean emailNotifications;
    private Boolean lowStockAlerts;
    private Boolean patientArrivalAlerts;
    private Boolean billingAlerts;

    // Security
    private Integer sessionTimeoutMinutes;
    private Integer requirePasswordChangeDays;
    private LocalDateTime updatedAt;

    public HospitalSettingDto() {}

    public static HospitalSettingDto fromEntity(HospitalSetting s) {
        if (s == null) return null;
        HospitalSettingDto dto = new HospitalSettingDto();
        dto.setId(s.getId());
        dto.setTenantId(s.getTenant() != null ? s.getTenant().getId() : null);
        dto.setHospitalName(s.getHospitalName());
        dto.setPhone(s.getPhone());
        dto.setEmail(s.getEmail());
        dto.setAddress(s.getAddress());
        dto.setEmergencyContact(s.getEmergencyContact());
        dto.setAccreditationDetails(s.getAccreditationDetails());

        dto.setPrimaryColor(s.getPrimaryColor());
        dto.setSecondaryColor(s.getSecondaryColor());
        dto.setAccentColor(s.getAccentColor());
        dto.setThemePreset(s.getThemePreset());
        dto.setSidebarCollapsed(s.getSidebarCollapsed());

        dto.setGstNumber(s.getGstNumber());
        dto.setDefaultGstPct(s.getDefaultGstPct());
        dto.setInvoicePrefix(s.getInvoicePrefix());
        dto.setDefaultPaymentMethod(s.getDefaultPaymentMethod());
        dto.setBillingTerms(s.getBillingTerms());

        dto.setPharmacyReorderLevel(s.getPharmacyReorderLevel());
        dto.setPharmacyExpiryAlertDays(s.getPharmacyExpiryAlertDays());
        dto.setPharmacyReturnNotice(s.getPharmacyReturnNotice());

        dto.setLabTurnaroundHours(s.getLabTurnaroundHours());
        dto.setLabCriticalAlert(s.getLabCriticalAlert());

        dto.setEmailNotifications(s.getEmailNotifications());
        dto.setLowStockAlerts(s.getLowStockAlerts());
        dto.setPatientArrivalAlerts(s.getPatientArrivalAlerts());
        dto.setBillingAlerts(s.getBillingAlerts());

        dto.setSessionTimeoutMinutes(s.getSessionTimeoutMinutes());
        dto.setRequirePasswordChangeDays(s.getRequirePasswordChangeDays());
        dto.setUpdatedAt(s.getUpdatedAt());
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }

    public String getEmergencyContact() { return emergencyContact; }
    public void setEmergencyContact(String emergencyContact) { this.emergencyContact = emergencyContact; }

    public String getAccreditationDetails() { return accreditationDetails; }
    public void setAccreditationDetails(String accreditationDetails) { this.accreditationDetails = accreditationDetails; }

    public String getPrimaryColor() { return primaryColor; }
    public void setPrimaryColor(String primaryColor) { this.primaryColor = primaryColor; }

    public String getSecondaryColor() { return secondaryColor; }
    public void setSecondaryColor(String secondaryColor) { this.secondaryColor = secondaryColor; }

    public String getAccentColor() { return accentColor; }
    public void setAccentColor(String accentColor) { this.accentColor = accentColor; }

    public String getThemePreset() { return themePreset; }
    public void setThemePreset(String themePreset) { this.themePreset = themePreset; }

    public Boolean getSidebarCollapsed() { return sidebarCollapsed; }
    public void setSidebarCollapsed(Boolean sidebarCollapsed) { this.sidebarCollapsed = sidebarCollapsed; }

    public String getGstNumber() { return gstNumber; }
    public void setGstNumber(String gstNumber) { this.gstNumber = gstNumber; }

    public BigDecimal getDefaultGstPct() { return defaultGstPct; }
    public void setDefaultGstPct(BigDecimal defaultGstPct) { this.defaultGstPct = defaultGstPct; }

    public String getInvoicePrefix() { return invoicePrefix; }
    public void setInvoicePrefix(String invoicePrefix) { this.invoicePrefix = invoicePrefix; }

    public String getDefaultPaymentMethod() { return defaultPaymentMethod; }
    public void setDefaultPaymentMethod(String defaultPaymentMethod) { this.defaultPaymentMethod = defaultPaymentMethod; }

    public String getBillingTerms() { return billingTerms; }
    public void setBillingTerms(String billingTerms) { this.billingTerms = billingTerms; }

    public Integer getPharmacyReorderLevel() { return pharmacyReorderLevel; }
    public void setPharmacyReorderLevel(Integer pharmacyReorderLevel) { this.pharmacyReorderLevel = pharmacyReorderLevel; }

    public Integer getPharmacyExpiryAlertDays() { return pharmacyExpiryAlertDays; }
    public void setPharmacyExpiryAlertDays(Integer pharmacyExpiryAlertDays) { this.pharmacyExpiryAlertDays = pharmacyExpiryAlertDays; }

    public String getPharmacyReturnNotice() { return pharmacyReturnNotice; }
    public void setPharmacyReturnNotice(String pharmacyReturnNotice) { this.pharmacyReturnNotice = pharmacyReturnNotice; }

    public Integer getLabTurnaroundHours() { return labTurnaroundHours; }
    public void setLabTurnaroundHours(Integer labTurnaroundHours) { this.labTurnaroundHours = labTurnaroundHours; }

    public String getLabCriticalAlert() { return labCriticalAlert; }
    public void setLabCriticalAlert(String labCriticalAlert) { this.labCriticalAlert = labCriticalAlert; }

    public Boolean getEmailNotifications() { return emailNotifications; }
    public void setEmailNotifications(Boolean emailNotifications) { this.emailNotifications = emailNotifications; }

    public Boolean getLowStockAlerts() { return lowStockAlerts; }
    public void setLowStockAlerts(Boolean lowStockAlerts) { this.lowStockAlerts = lowStockAlerts; }

    public Boolean getPatientArrivalAlerts() { return patientArrivalAlerts; }
    public void setPatientArrivalAlerts(Boolean patientArrivalAlerts) { this.patientArrivalAlerts = patientArrivalAlerts; }

    public Boolean getBillingAlerts() { return billingAlerts; }
    public void setBillingAlerts(Boolean billingAlerts) { this.billingAlerts = billingAlerts; }

    public Integer getSessionTimeoutMinutes() { return sessionTimeoutMinutes; }
    public void setSessionTimeoutMinutes(Integer sessionTimeoutMinutes) { this.sessionTimeoutMinutes = sessionTimeoutMinutes; }

    public Integer getRequirePasswordChangeDays() { return requirePasswordChangeDays; }
    public void setRequirePasswordChangeDays(Integer requirePasswordChangeDays) { this.requirePasswordChangeDays = requirePasswordChangeDays; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
