package com.carevista.hms.config;

import com.carevista.hms.common.enums.TenantStatus;
import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.common.enums.UserStatus;
import com.carevista.hms.notification.entity.Notification;
import com.carevista.hms.notification.repository.NotificationRepository;
import com.carevista.hms.security.entity.User;
import com.carevista.hms.security.repository.UserRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final UserRepository userRepository;
    private final TenantRepository tenantRepository;
    private final NotificationRepository notificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.carevista.hms.patient.repository.PatientRepository patientRepository;
    private final com.carevista.hms.op.repository.OpRegistrationRepository opRegistrationRepository;
    private final com.carevista.hms.ip.repository.IpAdmissionRepository ipAdmissionRepository;
    private final com.carevista.hms.pharmacy.repository.PharmacyBillRepository pharmacyBillRepository;
    private final com.carevista.hms.laboratory.repository.LabOrderRepository labOrderRepository;
    private final com.carevista.hms.billing.repository.PaymentRecordRepository paymentRecordRepository;
    private final com.carevista.hms.doctor.repository.DoctorRepository doctorRepository;
    private final com.carevista.hms.ip.repository.RoomRepository roomRepository;
    private final com.carevista.hms.ip.repository.BedRepository bedRepository;
    private final com.carevista.hms.pharmacy.repository.MedicineRepository medicineRepository;
    private final com.carevista.hms.laboratory.repository.LabTestRepository labTestRepository;
    private final com.carevista.hms.admin.money.repository.HospitalExpenseRepository hospitalExpenseRepository;

    @Value("${carevista.app.seed-demo-data:true}")
    private boolean seedDemoData;

    public DataInitializer(UserRepository userRepository,
                           TenantRepository tenantRepository,
                           NotificationRepository notificationRepository,
                           PasswordEncoder passwordEncoder,
                           com.carevista.hms.patient.repository.PatientRepository patientRepository,
                           com.carevista.hms.op.repository.OpRegistrationRepository opRegistrationRepository,
                           com.carevista.hms.ip.repository.IpAdmissionRepository ipAdmissionRepository,
                           com.carevista.hms.pharmacy.repository.PharmacyBillRepository pharmacyBillRepository,
                           com.carevista.hms.laboratory.repository.LabOrderRepository labOrderRepository,
                           com.carevista.hms.billing.repository.PaymentRecordRepository paymentRecordRepository,
                           com.carevista.hms.doctor.repository.DoctorRepository doctorRepository,
                           com.carevista.hms.ip.repository.RoomRepository roomRepository,
                           com.carevista.hms.ip.repository.BedRepository bedRepository,
                           com.carevista.hms.pharmacy.repository.MedicineRepository medicineRepository,
                           com.carevista.hms.laboratory.repository.LabTestRepository labTestRepository,
                           com.carevista.hms.admin.money.repository.HospitalExpenseRepository hospitalExpenseRepository) {
        this.userRepository = userRepository;
        this.tenantRepository = tenantRepository;
        this.notificationRepository = notificationRepository;
        this.passwordEncoder = passwordEncoder;
        this.patientRepository = patientRepository;
        this.opRegistrationRepository = opRegistrationRepository;
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.pharmacyBillRepository = pharmacyBillRepository;
        this.labOrderRepository = labOrderRepository;
        this.paymentRecordRepository = paymentRecordRepository;
        this.doctorRepository = doctorRepository;
        this.roomRepository = roomRepository;
        this.bedRepository = bedRepository;
        this.medicineRepository = medicineRepository;
        this.labTestRepository = labTestRepository;
        this.hospitalExpenseRepository = hospitalExpenseRepository;
    }

    @Override
    @Transactional
    public void run(String... args) {
        log.info("Starting CareVista database verification and initialization...");

        // 1. Ensure Super Admin exists
        String superAdminEmail = "superadmin@carevista.com";
        if (userRepository.findByEmail(superAdminEmail).isEmpty()) {
            User superAdmin = new User();
            superAdmin.setEmail(superAdminEmail);
            superAdmin.setPassword(passwordEncoder.encode("SuperAdmin@123"));
            superAdmin.setFullName("System Super Administrator");
            superAdmin.setPhone("+1 800-555-0199");
            superAdmin.setRole(UserRole.SUPER_ADMIN);
            superAdmin.setStatus(UserStatus.ACTIVE);
            superAdmin.setDepartment("SaaS Operations");
            superAdmin.setPermissions("ALL");
            userRepository.save(superAdmin);
            log.info("Default Super Admin created: {}", superAdminEmail);

            notificationRepository.save(new Notification(
                    null,
                    UserRole.SUPER_ADMIN,
                    "Welcome to CareVista SaaS",
                    "System initialized successfully. Super Admin dashboard is ready for managing hospitals and configurations.",
                    "SYSTEM"
            ));
        }

        // 2. Ensure initial demo tenant & accounts if demo data enabled
        if (seedDemoData) {
            String tenantCode = "HOSP-001";
            Tenant demoTenant = tenantRepository.findByTenantCode(tenantCode).orElseGet(() -> {
                Tenant tenant = new Tenant(
                        tenantCode,
                        "City Care Super Speciality Hospital",
                        true, // has Laboratory
                        true, // has Pharmacy
                        50,   // OP limit
                        "+1 800-555-0101",
                        "info@citycare.com",
                        "450 Healthcare Blvd, Metro Medical District"
                );
                tenant.setOfficeStatus("ACTIVE");
                tenant.setOpCurrentUsage(12);
                tenant.setStatus(TenantStatus.ACTIVE);
                Tenant saved = tenantRepository.save(tenant);
                log.info("Demo Tenant created: {}", saved.getHospitalName());
                return saved;
            });

            // Demo Hospital Admin
            String adminEmail = "admin@citycare.com";
            if (userRepository.findByEmail(adminEmail).isEmpty()) {
                User admin = new User();
                admin.setEmail(adminEmail);
                admin.setPassword(passwordEncoder.encode("Admin@123"));
                admin.setFullName("Dr. Robert Vance (Hospital Admin)");
                admin.setPhone("+1 800-555-0102");
                admin.setRole(UserRole.ADMIN);
                admin.setStatus(UserStatus.ACTIVE);
                admin.setTenant(demoTenant);
                admin.setDepartment("Executive Administration");
                admin.setPermissions("HOSPITAL_ALL");
                userRepository.save(admin);
                log.info("Demo Hospital Admin created: {}", adminEmail);
            }

            // Demo Employee
            String employeeEmail = "reception@citycare.com";
            if (userRepository.findByEmail(employeeEmail).isEmpty()) {
                User employee = new User();
                employee.setEmail(employeeEmail);
                employee.setPassword(passwordEncoder.encode("Employee@123"));
                employee.setFullName("Sarah Jenkins (Front Desk & OP)");
                employee.setPhone("+1 800-555-0103");
                employee.setRole(UserRole.EMPLOYEE);
                employee.setStatus(UserStatus.ACTIVE);
                employee.setTenant(demoTenant);
                employee.setDepartment("Front Desk / OP Reception");
                employee.setPermissions("OP_VIEW,OP_REGISTER,PATIENT_SEARCH,BILLING_VIEW");
                userRepository.save(employee);
                log.info("Demo Employee created: {}", employeeEmail);
            }

            // Seed clinical records for Demo Hospital if not present
            if (patientRepository.countByTenantId(demoTenant.getId()) == 0) {
                log.info("Seeding initial clinical database records for City Care Super Speciality Hospital...");
                java.time.LocalDate today = java.time.LocalDate.now();
                java.time.LocalDate yesterday = today.minusDays(1);

                // 1. Patients
                com.carevista.hms.patient.entity.Patient p1 = patientRepository.save(new com.carevista.hms.patient.entity.Patient(
                        demoTenant, "UHID-1001", "Johnathan Doe", "+1 800-555-0201", 38, "Male", "42 Palm Grove Ave"
                ));
                com.carevista.hms.patient.entity.Patient p2 = patientRepository.save(new com.carevista.hms.patient.entity.Patient(
                        demoTenant, "UHID-1002", "Emily Rose Clark", "+1 800-555-0202", 29, "Female", "118 Maple Parkway"
                ));
                com.carevista.hms.patient.entity.Patient p3 = patientRepository.save(new com.carevista.hms.patient.entity.Patient(
                        demoTenant, "UHID-1003", "Michael S. Brown", "+1 800-555-0203", 64, "Male", "890 Pine Needle Rd"
                ));

                // 2. OP Registrations
                opRegistrationRepository.save(new com.carevista.hms.op.entity.OpRegistration(
                        demoTenant, "OP-2026-001", p1, "Dr. Arthur Vance", "Cardiology", new java.math.BigDecimal("500.00"), today
                ));
                opRegistrationRepository.save(new com.carevista.hms.op.entity.OpRegistration(
                        demoTenant, "OP-2026-002", p2, "Dr. Sarah Lin", "General Medicine", new java.math.BigDecimal("400.00"), today
                ));
                opRegistrationRepository.save(new com.carevista.hms.op.entity.OpRegistration(
                        demoTenant, "OP-2026-003", p3, "Dr. Arthur Vance", "Cardiology", new java.math.BigDecimal("500.00"), yesterday
                ));

                // 3. IP Admissions
                ipAdmissionRepository.save(new com.carevista.hms.ip.entity.IpAdmission(
                        demoTenant, "IP-2026-001", p3, "Dr. Arthur Vance", "ICU WARD", "ICU-101", "BED-01", today
                ));
                ipAdmissionRepository.save(new com.carevista.hms.ip.entity.IpAdmission(
                        demoTenant, "IP-2026-002", p1, "Dr. Robert Vance", "GENERAL WARD", "GW-204", "BED-04", yesterday
                ));

                // 4. Pharmacy Bills
                pharmacyBillRepository.save(new com.carevista.hms.pharmacy.entity.PharmacyBill(
                        demoTenant, "RX-2026-001", p1, p1.getFullName(), new java.math.BigDecimal("1200.00"),
                        new java.math.BigDecimal("120.00"), new java.math.BigDecimal("54.00"), new java.math.BigDecimal("1134.00"),
                        new java.math.BigDecimal("1134.00"), today
                ));
                pharmacyBillRepository.save(new com.carevista.hms.pharmacy.entity.PharmacyBill(
                        demoTenant, "RX-2026-002", p2, p2.getFullName(), new java.math.BigDecimal("850.00"),
                        java.math.BigDecimal.ZERO, new java.math.BigDecimal("42.50"), new java.math.BigDecimal("892.50"),
                        new java.math.BigDecimal("892.50"), today
                ));
                pharmacyBillRepository.save(new com.carevista.hms.pharmacy.entity.PharmacyBill(
                        demoTenant, "RX-2026-003", p3, p3.getFullName(), new java.math.BigDecimal("2400.00"),
                        new java.math.BigDecimal("240.00"), new java.math.BigDecimal("108.00"), new java.math.BigDecimal("2268.00"),
                        new java.math.BigDecimal("2268.00"), yesterday
                ));

                // 5. Lab Test Master Catalog
                if (labTestRepository.countByTenantId(demoTenant.getId()) == 0) {
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-CBC", "Complete Blood Count (CBC)", "Hematology",
                            new java.math.BigDecimal("450.00"), "EDTA Whole Blood", "Various", "WBC: 4.0-11.0 10^3/uL, RBC: 4.5-5.9 10^6/uL, Hb: 13.5-17.5 g/dL", "2 Hours"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-FBS", "Blood Sugar - Fasting (FBS)", "Biochemistry",
                            new java.math.BigDecimal("150.00"), "Fluoride Plasma", "mg/dL", "70 - 99 mg/dL (Normal)", "1 Hour"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-PPBS", "Blood Sugar - Post Prandial (PPBS)", "Biochemistry",
                            new java.math.BigDecimal("150.00"), "Fluoride Plasma", "mg/dL", "< 140 mg/dL (Normal)", "1 Hour"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-LIPID", "Lipid Profile Diagnostic Panel", "Biochemistry",
                            new java.math.BigDecimal("850.00"), "Serum (12h Fasting)", "mg/dL", "Cholesterol: <200, Triglycerides: <150, HDL: >40, LDL: <100", "4 Hours"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-LFT", "Liver Function Test (LFT Comprehensive)", "Biochemistry",
                            new java.math.BigDecimal("750.00"), "Serum", "Various", "Bilirubin Total: 0.2-1.2 mg/dL, SGOT/AST: 5-40 U/L, SGPT/ALT: 7-56 U/L", "4 Hours"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-KFT", "Kidney Function Test (KFT / RFT)", "Biochemistry",
                            new java.math.BigDecimal("700.00"), "Serum", "Various", "Blood Urea: 15-40 mg/dL, Serum Creatinine: 0.7-1.3 mg/dL, Uric Acid: 3.5-7.2 mg/dL", "4 Hours"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-THY", "Thyroid Profile (Total T3, T4, TSH)", "Endocrinology",
                            new java.math.BigDecimal("650.00"), "Serum", "Various", "TSH: 0.35-4.94 uIU/mL, T3: 0.8-2.0 ng/mL, T4: 5.1-14.1 ug/dL", "6 Hours"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-HBA1C", "Glycated Hemoglobin (HbA1c)", "Hematology",
                            new java.math.BigDecimal("550.00"), "EDTA Whole Blood", "%", "Non-diabetic: <5.7%, Prediabetes: 5.7-6.4%, Diabetic: >=6.5%", "2 Hours"
                    ));
                    labTestRepository.save(new com.carevista.hms.laboratory.entity.LabTest(
                            demoTenant, "TEST-URINE", "Routine & Microscopic Urine Analysis", "Clinical Pathology",
                            new java.math.BigDecimal("200.00"), "Clean Catch Urine", "Visual/Microscopic", "Color: Pale Yellow, pH: 5.0-7.0, Protein: Nil, Sugar: Nil", "1 Hour"
                    ));
                }

                // 6. Lab Orders
                labOrderRepository.save(new com.carevista.hms.laboratory.entity.LabOrder(
                        demoTenant, "LAB-2026-001", p1, p1.getFullName(), "Complete Blood Count (CBC)", "Hematology",
                        new java.math.BigDecimal("450.00"), new java.math.BigDecimal("450.00"), new java.math.BigDecimal("450.00"),
                        "COMPLETED", today
                ));
                labOrderRepository.save(new com.carevista.hms.laboratory.entity.LabOrder(
                        demoTenant, "LAB-2026-002", p2, p2.getFullName(), "Comprehensive Metabolic Panel", "Biochemistry",
                        new java.math.BigDecimal("800.00"), new java.math.BigDecimal("800.00"), new java.math.BigDecimal("800.00"),
                        "COMPLETED", today
                ));
                labOrderRepository.save(new com.carevista.hms.laboratory.entity.LabOrder(
                        demoTenant, "LAB-2026-003", p3, p3.getFullName(), "Lipid Profile Diagnostic", "Biochemistry",
                        new java.math.BigDecimal("600.00"), new java.math.BigDecimal("600.00"), new java.math.BigDecimal("600.00"),
                        "COMPLETED", yesterday
                ));

                // 6. Payment Records (Collections)
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-001", p1, p1.getFullName(), "OP", new java.math.BigDecimal("500.00"), "CASH", today
                ));
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-002", p2, p2.getFullName(), "OP", new java.math.BigDecimal("400.00"), "CARD", today
                ));
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-003", p1, p1.getFullName(), "PHARMACY", new java.math.BigDecimal("1134.00"), "UPI", today
                ));
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-004", p1, p1.getFullName(), "LABORATORY", new java.math.BigDecimal("450.00"), "CASH", today
                ));
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-005", p3, p3.getFullName(), "IP", new java.math.BigDecimal("10000.00"), "CARD", today
                ));

                // Historical days for graphs
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-006", p3, p3.getFullName(), "OP", new java.math.BigDecimal("500.00"), "CASH", yesterday
                ));
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-007", p3, p3.getFullName(), "PHARMACY", new java.math.BigDecimal("2268.00"), "CARD", yesterday
                ));
                paymentRecordRepository.save(new com.carevista.hms.billing.entity.PaymentRecord(
                        demoTenant, "PAY-2026-008", p3, p3.getFullName(), "IP", new java.math.BigDecimal("8500.00"), "BANK_TRANSFER", yesterday
                ));

                log.info("Clinical database records seeded successfully.");
            }

            // 7. Seed Doctors for Demo Hospital (City Care)
            if (doctorRepository.countByTenantId(demoTenant.getId()) == 0) {
                log.info("Seeding doctors for City Care Super Speciality Hospital...");
                doctorRepository.save(new com.carevista.hms.doctor.entity.Doctor(
                        demoTenant, "Dr. Arthur Vance", "Cardiology", "Interventional Cardiology",
                        new java.math.BigDecimal("500.00"), "AVAILABLE", "OPD-101"
                ));
                doctorRepository.save(new com.carevista.hms.doctor.entity.Doctor(
                        demoTenant, "Dr. Sarah Lin", "General Medicine", "Internal Medicine & Diagnostics",
                        new java.math.BigDecimal("400.00"), "AVAILABLE", "OPD-102"
                ));
                doctorRepository.save(new com.carevista.hms.doctor.entity.Doctor(
                        demoTenant, "Dr. Marcus Chen", "Orthopedics", "Joint Replacement & Trauma",
                        new java.math.BigDecimal("600.00"), "AVAILABLE", "OPD-103"
                ));
                doctorRepository.save(new com.carevista.hms.doctor.entity.Doctor(
                        demoTenant, "Dr. Priya Sharma", "Gynecology", "Obstetrics & Women's Health",
                        new java.math.BigDecimal("550.00"), "AVAILABLE", "OPD-104"
                ));
                doctorRepository.save(new com.carevista.hms.doctor.entity.Doctor(
                        demoTenant, "Dr. Elena Rostova", "Neurology", "Clinical Neurology & Stroke",
                        new java.math.BigDecimal("750.00"), "BUSY", "OPD-105"
                ));
                doctorRepository.save(new com.carevista.hms.doctor.entity.Doctor(
                        demoTenant, "Dr. David Kim", "Pediatrics", "Pediatric Care & Neonatology",
                        new java.math.BigDecimal("450.00"), "ABSENT", "OPD-106"
                ));
                log.info("Doctors seeded successfully for City Care.");
            }

            // 8. Seed Rooms and Beds for City Care Super Speciality Hospital
            if (roomRepository.countByTenantId(demoTenant.getId()) == 0) {
                log.info("Seeding Rooms & Beds for City Care Super Speciality Hospital...");

                // Room 101: General Ward (6 Beds)
                com.carevista.hms.ip.entity.Room r101 = roomRepository.save(new com.carevista.hms.ip.entity.Room(
                        demoTenant, "101", "GENERAL_WARD", "1st Floor", new java.math.BigDecimal("1500.00"), "ACTIVE", "North Wing Male General Ward"
                ));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r101, "Bed 101-A", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r101, "Bed 101-B", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r101, "Bed 101-C", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r101, "Bed 101-D", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r101, "Bed 101-E", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r101, "Bed 101-F", new java.math.BigDecimal("350.00"), "MAINTENANCE", "Pending electrical servicing"));

                // Room 102: General Ward (4 Beds)
                com.carevista.hms.ip.entity.Room r102 = roomRepository.save(new com.carevista.hms.ip.entity.Room(
                        demoTenant, "102", "GENERAL_WARD", "1st Floor", new java.math.BigDecimal("1500.00"), "ACTIVE", "North Wing Female General Ward"
                ));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r102, "Bed 102-A", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r102, "Bed 102-B", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r102, "Bed 102-C", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r102, "Bed 102-D", new java.math.BigDecimal("350.00"), "AVAILABLE", "Standard motorized bed"));

                // Room 201: Intensive Care Unit (ICU) (4 Beds)
                com.carevista.hms.ip.entity.Room r201 = roomRepository.save(new com.carevista.hms.ip.entity.Room(
                        demoTenant, "201", "ICU", "2nd Floor", new java.math.BigDecimal("6000.00"), "ACTIVE", "Main Critical Care / Intensive Care Unit"
                ));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r201, "ICU-Bed-01", new java.math.BigDecimal("1500.00"), "AVAILABLE", "Equipped with advanced ventilator and telemetry"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r201, "ICU-Bed-02", new java.math.BigDecimal("1500.00"), "AVAILABLE", "Equipped with advanced ventilator and telemetry"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r201, "ICU-Bed-03", new java.math.BigDecimal("1500.00"), "AVAILABLE", "Equipped with advanced ventilator and telemetry"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r201, "ICU-Bed-04", new java.math.BigDecimal("1500.00"), "AVAILABLE", "Equipped with advanced ventilator and telemetry"));

                // Room 301: VIP Suite (2 Beds)
                com.carevista.hms.ip.entity.Room r301 = roomRepository.save(new com.carevista.hms.ip.entity.Room(
                        demoTenant, "301", "VIP", "3rd Floor", new java.math.BigDecimal("8500.00"), "ACTIVE", "Executive VIP Patient Suite with attendant lounge"
                ));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r301, "VIP-Bed-01", new java.math.BigDecimal("2000.00"), "AVAILABLE", "Electric multi-position luxury bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r301, "VIP-Bed-02", new java.math.BigDecimal("2000.00"), "AVAILABLE", "Electric multi-position luxury bed"));

                // Room 302: Deluxe Private (2 Beds)
                com.carevista.hms.ip.entity.Room r302 = roomRepository.save(new com.carevista.hms.ip.entity.Room(
                        demoTenant, "302", "DELUXE", "3rd Floor", new java.math.BigDecimal("4500.00"), "ACTIVE", "Deluxe Single Occupancy Room"
                ));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r302, "DLX-Bed-01", new java.math.BigDecimal("1000.00"), "AVAILABLE", "Deluxe motorized patient bed"));
                bedRepository.save(new com.carevista.hms.ip.entity.Bed(demoTenant, r302, "DLX-Bed-02", new java.math.BigDecimal("1000.00"), "AVAILABLE", "Deluxe motorized patient bed"));

                log.info("Rooms & Beds seeded successfully for City Care.");
            }

            // Also seed rooms for Abson Care (HOSP-002) if tenant exists
            tenantRepository.findByTenantCode("HOSP-002").ifPresent(absonTenant -> {
                if (roomRepository.countByTenantId(absonTenant.getId()) == 0) {
                    com.carevista.hms.ip.entity.Room ar101 = roomRepository.save(new com.carevista.hms.ip.entity.Room(
                            absonTenant, "101", "GENERAL_WARD", "1st Floor", new java.math.BigDecimal("1200.00"), "ACTIVE", "Abson Care General Ward"
                    ));
                    bedRepository.save(new com.carevista.hms.ip.entity.Bed(absonTenant, ar101, "Bed 101-A", new java.math.BigDecimal("300.00"), "AVAILABLE", "General Ward Bed"));
                    bedRepository.save(new com.carevista.hms.ip.entity.Bed(absonTenant, ar101, "Bed 101-B", new java.math.BigDecimal("300.00"), "AVAILABLE", "General Ward Bed"));

                    com.carevista.hms.ip.entity.Room ar201 = roomRepository.save(new com.carevista.hms.ip.entity.Room(
                            absonTenant, "201", "ICU", "2nd Floor", new java.math.BigDecimal("5000.00"), "ACTIVE", "Abson Care ICU Ward"
                    ));
                    bedRepository.save(new com.carevista.hms.ip.entity.Bed(absonTenant, ar201, "ICU-Bed-01", new java.math.BigDecimal("1200.00"), "AVAILABLE", "ICU Care Bed"));
                }
            });

            // 9. Seed Medicines for Demo Hospital (City Care)
            if (medicineRepository.countByTenantId(demoTenant.getId()) == 0) {
                log.info("Seeding Pharmacy Medicines for City Care Super Speciality Hospital...");
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1001", "Paracetamol 500mg", "Paracetamol", "Tablet",
                        "BATCH-PCM-24", java.time.LocalDate.of(2027, 12, 31),
                        new java.math.BigDecimal("20.00"), new java.math.BigDecimal("12.00"),
                        150, 25, "Cipla Ltd", "Rack A-1"
                ));
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1002", "Amoxicillin 500mg", "Amoxicillin Trihydrate", "Capsule",
                        "BATCH-AMX-24", java.time.LocalDate.of(2026, 11, 30),
                        new java.math.BigDecimal("50.00"), new java.math.BigDecimal("32.00"),
                        80, 20, "Sun Pharma", "Rack A-2"
                ));
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1003", "Metformin 500mg", "Metformin Hydrochloride", "Tablet",
                        "BATCH-MET-25", java.time.LocalDate.of(2027, 8, 31),
                        new java.math.BigDecimal("35.00"), new java.math.BigDecimal("18.00"),
                        120, 30, "Abbott Healthcare", "Rack B-1"
                ));
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1004", "Atorvastatin 10mg", "Atorvastatin Calcium", "Tablet",
                        "BATCH-ATV-25", java.time.LocalDate.of(2027, 5, 31),
                        new java.math.BigDecimal("65.00"), new java.math.BigDecimal("40.00"),
                        90, 15, "Lupin Ltd", "Rack B-2"
                ));
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1005", "Pantoprazole 40mg", "Pantoprazole Sodium", "Tablet",
                        "BATCH-PAN-24", java.time.LocalDate.of(2026, 10, 31),
                        new java.math.BigDecimal("45.00"), new java.math.BigDecimal("25.00"),
                        110, 20, "Alkem Laboratories", "Rack C-1"
                ));
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1006", "Azithromycin 500mg", "Azithromycin", "Tablet",
                        "BATCH-AZI-25", java.time.LocalDate.of(2027, 4, 30),
                        new java.math.BigDecimal("120.00"), new java.math.BigDecimal("75.00"),
                        60, 15, "Zydus Cadila", "Rack C-2"
                ));
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1007", "Cetirizine 10mg", "Cetirizine Dihydrochloride", "Tablet",
                        "BATCH-CET-25", java.time.LocalDate.of(2028, 1, 31),
                        new java.math.BigDecimal("15.00"), new java.math.BigDecimal("7.00"),
                        200, 40, "Dr. Reddy's Labs", "Rack A-3"
                ));
                medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                        demoTenant, "MED-1008", "Omeprazole 20mg", "Omeprazole Magnesium", "Capsule",
                        "BATCH-OME-24", java.time.LocalDate.of(2026, 12, 31),
                        new java.math.BigDecimal("30.00"), new java.math.BigDecimal("15.00"),
                        10, 15, "Torrent Pharma", "Rack C-3"
                ));
                log.info("Pharmacy Medicines seeded successfully for City Care.");
            }

            // Also seed medicines for Abson Care (HOSP-002) if tenant exists
            tenantRepository.findByTenantCode("HOSP-002").ifPresent(absonTenant -> {
                if (medicineRepository.countByTenantId(absonTenant.getId()) == 0) {
                    medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                            absonTenant, "MED-2001", "Paracetamol 500mg", "Paracetamol", "Tablet",
                            "BATCH-ABS-01", java.time.LocalDate.of(2027, 9, 30),
                            new java.math.BigDecimal("18.00"), new java.math.BigDecimal("10.00"),
                            100, 20, "Cipla Ltd", "Rack 1"
                    ));
                    medicineRepository.save(new com.carevista.hms.pharmacy.entity.Medicine(
                            absonTenant, "MED-2002", "Amoxicillin 500mg", "Amoxicillin Trihydrate", "Capsule",
                            "BATCH-ABS-02", java.time.LocalDate.of(2026, 12, 31),
                            new java.math.BigDecimal("48.00"), new java.math.BigDecimal("30.00"),
                            75, 15, "Sun Pharma", "Rack 2"
                    ));
                    log.info("Pharmacy Medicines seeded successfully for Abson Care.");
                }
            });

            // 10. Seed Operational Hospital Expenses for City Care Super Speciality Hospital
            if (hospitalExpenseRepository.countByTenantId(demoTenant.getId()) == 0) {
                log.info("Seeding realistic operational hospital expenses for City Care...");
                java.time.LocalDate todayDate = java.time.LocalDate.now();

                hospitalExpenseRepository.save(new com.carevista.hms.admin.money.entity.HospitalExpense(
                        demoTenant, "EXP-20260925-0001", "GENERAL EXPENSES",
                        "Hospital Power & Emergency Backup Generator Fuel", "Apex Energy Utilities",
                        new java.math.BigDecimal("18500.00"), "BANK_TRANSFER",
                        todayDate.minusDays(10), "INV-PWR-2026-89", "PAID",
                        "Monthly grid electricity & diesel supply for emergency generators", "admin@citycare.com"
                ));

                hospitalExpenseRepository.save(new com.carevista.hms.admin.money.entity.HospitalExpense(
                        demoTenant, "EXP-20260928-0002", "LAB EXPENSES",
                        "Biochemistry & Hematology Reagent Diagnostic Kits", "TransAsia Bio-Medicals Ltd",
                        new java.math.BigDecimal("12400.00"), "BANK_TRANSFER",
                        todayDate.minusDays(7), "INV-LAB-4421", "PAID",
                        "Automated analyzer reagent packs and quality control calibrators", "admin@citycare.com"
                ));

                hospitalExpenseRepository.save(new com.carevista.hms.admin.money.entity.HospitalExpense(
                        demoTenant, "EXP-20261001-0003", "OTHER EXPENSES",
                        "Biomedical Equipment AMC & Sterilization Autoclave Maintenance", "MedTech Engineering Services",
                        new java.math.BigDecimal("9800.00"), "BANK_TRANSFER",
                        todayDate.minusDays(4), "INV-MED-7712", "PAID",
                        "Quarterly calibration of telemetry monitors and ICU defibrillators", "admin@citycare.com"
                ));

                hospitalExpenseRepository.save(new com.carevista.hms.admin.money.entity.HospitalExpense(
                        demoTenant, "EXP-20261004-0004", "GENERAL EXPENSES",
                        "Clinical Housekeeping, PPE & Bio-Hazard Waste Disposal", "CleanCare Healthcare Hygiene",
                        new java.math.BigDecimal("6500.00"), "BANK_TRANSFER",
                        todayDate.minusDays(1), "INV-CLN-1029", "PAID",
                        "Infection control PPE kits and authorized bio-medical waste disposal", "admin@citycare.com"
                ));
                log.info("Hospital expenses seeded successfully for City Care.");
            }

            // Ensure medicines have supplier and purchaseDate populated if missing
            List<com.carevista.hms.pharmacy.entity.Medicine> unlinkedMeds = medicineRepository.findByTenantIdOrderByNameAsc(demoTenant.getId());
            boolean medUpdated = false;
            for (com.carevista.hms.pharmacy.entity.Medicine m : unlinkedMeds) {
                if (m.getSupplier() == null || m.getSupplier().trim().isEmpty()) {
                    m.setSupplier(m.getManufacturer() != null && !m.getManufacturer().trim().isEmpty() ? m.getManufacturer() : "CarePharma Agency");
                    medUpdated = true;
                }
                if (m.getPurchaseDate() == null) {
                    m.setPurchaseDate(java.time.LocalDate.now().minusDays(14));
                    medUpdated = true;
                }
            }
            if (medUpdated) {
                medicineRepository.saveAll(unlinkedMeds);
            }
        }

        log.info("CareVista initialization completed successfully.");
    }
}
