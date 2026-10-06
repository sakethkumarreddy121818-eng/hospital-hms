package com.carevista.hms.settings.entity;

import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "hospital_settings", indexes = {
    @Index(name = "idx_hospital_settings_tenant", columnList = "tenant_id", unique = true)
})
public class HospitalSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false, unique = true)
    private Tenant tenant;

    // Hospital Profile
    @Column(name = "hospital_name", length = 150)
    private String hospitalName;

    @Column(name = "phone", length = 50)
    private String phone;

    @Column(name = "email", length = 100)
    private String email;

    @Column(name = "address", length = 255)
    private String address;

    @Column(name = "emergency_contact", length = 100)
    private String emergencyContact;

    @Column(name = "accreditation_details", length = 150)
    private String accreditationDetails = "NABH Accredited Multi-Speciality Tertiary Care Hospital";

    // Appearance / Themes
    @Column(name = "primary_color", length = 30)
    private String primaryColor = "#1d4ed8"; // Medical Blue

    @Column(name = "secondary_color", length = 30)
    private String secondaryColor = "#0f172a"; // Deep Blue / Slate

    @Column(name = "accent_color", length = 30)
    private String accentColor = "#0d9488"; // Healthcare Teal

    @Column(name = "theme_preset", length = 50)
    private String themePreset = "medical-blue";

    @Column(name = "sidebar_collapsed")
    private Boolean sidebarCollapsed = false;

    // Billing Settings
    @Column(name = "gst_number", length = 50)
    private String gstNumber = "29ABCDE1234F1Z5";

    @Column(name = "default_gst_pct", precision = 5, scale = 2)
    private BigDecimal defaultGstPct = new BigDecimal("18.00");

    @Column(name = "invoice_prefix", length = 20)
    private String invoicePrefix = "INV";

    @Column(name = "default_payment_method", length = 30)
    private String defaultPaymentMethod = "CASH";

    @Column(name = "billing_terms", length = 500)
    private String billingTerms = "This is a computer-generated billing document from CareVista Hospital Management SaaS.";

    // Pharmacy Settings
    @Column(name = "pharmacy_reorder_level")
    private Integer pharmacyReorderLevel = 20;

    @Column(name = "pharmacy_expiry_alert_days")
    private Integer pharmacyExpiryAlertDays = 60;

    @Column(name = "pharmacy_return_notice", length = 255)
    private String pharmacyReturnNotice = "Medicines once dispensed cannot be returned or refunded.";

    // Laboratory Settings
    @Column(name = "lab_turnaround_hours")
    private Integer labTurnaroundHours = 24;

    @Column(name = "lab_critical_alert", length = 100)
    private String labCriticalAlert = "Immediate Notification to Physician";

    // Notification Settings
    @Column(name = "email_notifications")
    private Boolean emailNotifications = true;

    @Column(name = "low_stock_alerts")
    private Boolean lowStockAlerts = true;

    @Column(name = "patient_arrival_alerts")
    private Boolean patientArrivalAlerts = true;

    @Column(name = "billing_alerts")
    private Boolean billingAlerts = true;

    // Security Settings
    @Column(name = "session_timeout_minutes")
    private Integer sessionTimeoutMinutes = 60;

    @Column(name = "require_password_change_days")
    private Integer requirePasswordChangeDays = 90;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public HospitalSetting() {}

    public HospitalSetting(Tenant tenant) {
        this.tenant = tenant;
        this.hospitalName = tenant.getHospitalName();
        this.phone = tenant.getPhone();
        this.email = tenant.getEmail();
        this.address = tenant.getAddress();
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
