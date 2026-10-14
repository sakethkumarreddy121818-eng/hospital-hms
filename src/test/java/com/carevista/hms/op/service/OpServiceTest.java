package com.carevista.hms.op.service;

import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.doctor.repository.DoctorRepository;
import com.carevista.hms.op.dto.OpRegistrationDto;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.patient.repository.PatientRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

import com.carevista.hms.doctor.entity.Doctor;
import com.carevista.hms.op.dto.CreateOpRegistrationRequest;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OpServiceTest {

    @Mock
    private OpRegistrationRepository opRegistrationRepository;

    @Mock
    private PatientRepository patientRepository;

    @Mock
    private DoctorRepository doctorRepository;

    @Mock
    private TenantRepository tenantRepository;

    @Mock
    private PaymentRecordRepository paymentRecordRepository;

    @InjectMocks
    private OpService opService;

    private Tenant testTenant;
    private Patient testPatient;
    private OpRegistration testOp;

    @BeforeEach
    void setUp() {
        testTenant = new Tenant();
        testTenant.setId(1L);
        testTenant.setHospitalName("CareVista Multispeciality");

        testPatient = new Patient();
        testPatient.setId(10L);
        testPatient.setTenant(testTenant);
        testPatient.setUhid("UHID-1001");
        testPatient.setFullName("Ramesh Kumar");
        testPatient.setPhone("9876543210");

        testOp = new OpRegistration(
                testTenant,
                "OP-2026-001",
                testPatient,
                "Dr. Sarah Jenkins",
                "General Medicine",
                new BigDecimal("500.00"),
                LocalDate.now(),
                "10:00 AM",
                "CASH",
                "PAID"
        );
        testOp.setId(100L);

        lenient().when(patientRepository.save(any(Patient.class))).thenAnswer(inv -> inv.getArgument(0));
        lenient().when(tenantRepository.save(any(Tenant.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    @Test
    void testGetOpHistory_Today_FiltersOnlyToday() {
        LocalDate today = LocalDate.now();
        when(opRegistrationRepository.searchOpRegistrationsWithDateRange(eq(1L), eq(""), eq(today), eq(today)))
                .thenReturn(List.of(testOp));

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "", "TODAY", null, null);

        assertNotNull(result);
        assertEquals(1, result.size());
        assertEquals("OP-2026-001", result.get(0).getOpId());
        verify(opRegistrationRepository).searchOpRegistrationsWithDateRange(1L, "", today, today);
    }

    @Test
    void testGetOpHistory_Today_EmptyStateReturnsZero() {
        LocalDate today = LocalDate.now();
        when(opRegistrationRepository.searchOpRegistrationsWithDateRange(eq(1L), eq(""), eq(today), eq(today)))
                .thenReturn(Collections.emptyList());

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "", "TODAY", null, null);

        assertNotNull(result);
        assertEquals(0, result.size());
    }

    @Test
    void testGetOpHistory_Yesterday_FiltersOnlyYesterday() {
        LocalDate today = LocalDate.now();
        LocalDate yesterday = today.minusDays(1);
        when(opRegistrationRepository.searchOpRegistrationsWithDateRange(eq(1L), eq(""), eq(yesterday), eq(yesterday)))
                .thenReturn(List.of(testOp));

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "", "YESTERDAY", null, null);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(opRegistrationRepository).searchOpRegistrationsWithDateRange(1L, "", yesterday, yesterday);
    }

    @Test
    void testGetOpHistory_OneWeek_FiltersSevenDayWindow() {
        LocalDate today = LocalDate.now();
        LocalDate weekAgo = today.minusDays(6);
        when(opRegistrationRepository.searchOpRegistrationsWithDateRange(eq(1L), eq(""), eq(weekAgo), eq(today)))
                .thenReturn(List.of(testOp));

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "", "ONE_WEEK", null, null);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(opRegistrationRepository).searchOpRegistrationsWithDateRange(1L, "", weekAgo, today);
    }

    @Test
    void testGetOpHistory_CustomDate_ValidRange() {
        LocalDate start = LocalDate.of(2026, 10, 1);
        LocalDate end = LocalDate.of(2026, 10, 10);
        when(opRegistrationRepository.searchOpRegistrationsWithDateRange(eq(1L), eq(""), eq(start), eq(end)))
                .thenReturn(List.of(testOp));

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "", "CUSTOM", "2026-10-01", "2026-10-10");

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(opRegistrationRepository).searchOpRegistrationsWithDateRange(1L, "", start, end);
    }

    @Test
    void testGetOpHistory_CustomDate_SingleDateExpandsToRange() {
        LocalDate date = LocalDate.of(2026, 10, 5);
        when(opRegistrationRepository.searchOpRegistrationsWithDateRange(eq(1L), eq(""), eq(date), eq(date)))
                .thenReturn(List.of(testOp));

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "", "CUSTOM", "2026-10-05", null);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(opRegistrationRepository).searchOpRegistrationsWithDateRange(1L, "", date, date);
    }

    @Test
    void testGetOpHistory_CustomDate_InvalidRangeThrowsBadRequest() {
        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () ->
                opService.getOpHistory(1L, "", "CUSTOM", "2026-10-15", "2026-10-01")
        );
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("Start date cannot be after end date"));
    }

    @Test
    void testGetOpHistory_AllRecords_CallsUnboundedSearch() {
        when(opRegistrationRepository.searchOpRegistrations(eq(1L), eq("test")))
                .thenReturn(List.of(testOp));

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "test", "ALL", null, null);

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(opRegistrationRepository).searchOpRegistrations(1L, "test");
        verify(opRegistrationRepository, never()).searchOpRegistrationsWithDateRange(any(), any(), any(), any());
    }

    @Test
    void testGetOpHistory_DefaultOverload_DefaultsToToday() {
        LocalDate today = LocalDate.now();
        when(opRegistrationRepository.searchOpRegistrationsWithDateRange(eq(1L), eq(""), eq(today), eq(today)))
                .thenReturn(List.of(testOp));

        List<OpRegistrationDto> result = opService.getOpHistory(1L, "");

        assertNotNull(result);
        assertEquals(1, result.size());
        verify(opRegistrationRepository).searchOpRegistrationsWithDateRange(1L, "", today, today);
    }

    // ====================================================================
    // OP REGISTRATION CONSULTATION FEE & DISCOUNT TESTS (SECTION 9 TEST MATRIX)
    // ====================================================================

    private Doctor createTestDoctor(String name, String dept, BigDecimal fee, String status) {
        Doctor doc = new Doctor();
        doc.setId(20L);
        doc.setTenant(testTenant);
        doc.setName(name);
        doc.setDepartment(dept);
        doc.setConsultationFee(fee);
        doc.setStatus(status);
        return doc;
    }

    private CreateOpRegistrationRequest createTestRequest(String doctorName, String discountType, BigDecimal discountValue) {
        CreateOpRegistrationRequest req = new CreateOpRegistrationRequest();
        req.setPatientName("Ramesh Kumar");
        req.setAge(35);
        req.setGender("Male");
        req.setPhone("9876543210");
        req.setDoctorName(doctorName);
        req.setDepartment("General Medicine");
        req.setDiscountType(discountType);
        req.setDiscountValue(discountValue);
        req.setPaymentMethod("CASH");
        return req;
    }

    @Test
    void testRegisterOp_Case1_NoDiscount_500_to_500() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "NO_DISCOUNT", BigDecimal.ZERO);

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));
        when(patientRepository.findByTenantIdAndPhone(1L, "9876543210")).thenReturn(List.of(testPatient));
        when(opRegistrationRepository.save(any(OpRegistration.class))).thenAnswer(inv -> {
            OpRegistration saved = inv.getArgument(0);
            saved.setId(201L);
            return saved;
        });

        OpRegistrationDto result = opService.registerOp(req, 1L);

        assertNotNull(result);
        assertEquals(new BigDecimal("500.00"), result.getOriginalFee());
        assertEquals("NO_DISCOUNT", result.getDiscountType());
        assertEquals(BigDecimal.ZERO, result.getDiscountAmount());
        assertEquals(new BigDecimal("500.00"), result.getConsultationFee());
        assertEquals(new BigDecimal("500.00"), result.getFinalAmount());
        assertEquals("UNPAID", result.getPaymentStatus());
    }

    @Test
    void testRegisterOp_Case2_FixedDiscount_500_minus_100_to_400() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "FIXED", new BigDecimal("100.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));
        when(patientRepository.findByTenantIdAndPhone(1L, "9876543210")).thenReturn(List.of(testPatient));
        when(opRegistrationRepository.save(any(OpRegistration.class))).thenAnswer(inv -> {
            OpRegistration saved = inv.getArgument(0);
            saved.setId(202L);
            return saved;
        });

        OpRegistrationDto result = opService.registerOp(req, 1L);

        assertNotNull(result);
        assertEquals(new BigDecimal("500.00"), result.getOriginalFee());
        assertEquals("FIXED", result.getDiscountType());
        assertEquals(new BigDecimal("100.00"), result.getDiscountAmount());
        assertEquals(new BigDecimal("400.00"), result.getConsultationFee());
        assertEquals(new BigDecimal("400.00"), result.getFinalAmount());
    }

    @Test
    void testRegisterOp_Case3_PercentageDiscount_500_at_20pct_to_400() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "PERCENTAGE", new BigDecimal("20.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));
        when(patientRepository.findByTenantIdAndPhone(1L, "9876543210")).thenReturn(List.of(testPatient));
        when(opRegistrationRepository.save(any(OpRegistration.class))).thenAnswer(inv -> {
            OpRegistration saved = inv.getArgument(0);
            saved.setId(203L);
            return saved;
        });

        OpRegistrationDto result = opService.registerOp(req, 1L);

        assertNotNull(result);
        assertEquals(new BigDecimal("500.00"), result.getOriginalFee());
        assertEquals("PERCENTAGE", result.getDiscountType());
        assertEquals(new BigDecimal("100.00"), result.getDiscountAmount());
        assertEquals(new BigDecimal("400.00"), result.getConsultationFee());
        assertEquals(new BigDecimal("400.00"), result.getFinalAmount());
    }

    @Test
    void testRegisterOp_Case4_FixedDiscount_400_minus_50_to_350() {
        Doctor doc = createTestDoctor("Dr. Rajesh Sharma", "Cardiology", new BigDecimal("400.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Rajesh Sharma", "FIXED", new BigDecimal("50.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Rajesh Sharma")).thenReturn(Optional.of(doc));
        when(patientRepository.findByTenantIdAndPhone(1L, "9876543210")).thenReturn(List.of(testPatient));
        when(opRegistrationRepository.save(any(OpRegistration.class))).thenAnswer(inv -> {
            OpRegistration saved = inv.getArgument(0);
            saved.setId(204L);
            return saved;
        });

        OpRegistrationDto result = opService.registerOp(req, 1L);

        assertNotNull(result);
        assertEquals(new BigDecimal("400.00"), result.getOriginalFee());
        assertEquals("FIXED", result.getDiscountType());
        assertEquals(new BigDecimal("50.00"), result.getDiscountAmount());
        assertEquals(new BigDecimal("350.00"), result.getConsultationFee());
        assertEquals(new BigDecimal("350.00"), result.getFinalAmount());
    }

    @Test
    void testRegisterOp_Case5_PercentageDiscount_400_at_25pct_to_300() {
        Doctor doc = createTestDoctor("Dr. Rajesh Sharma", "Cardiology", new BigDecimal("400.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Rajesh Sharma", "PERCENTAGE", new BigDecimal("25.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Rajesh Sharma")).thenReturn(Optional.of(doc));
        when(patientRepository.findByTenantIdAndPhone(1L, "9876543210")).thenReturn(List.of(testPatient));
        when(opRegistrationRepository.save(any(OpRegistration.class))).thenAnswer(inv -> {
            OpRegistration saved = inv.getArgument(0);
            saved.setId(205L);
            return saved;
        });

        OpRegistrationDto result = opService.registerOp(req, 1L);

        assertNotNull(result);
        assertEquals(new BigDecimal("400.00"), result.getOriginalFee());
        assertEquals("PERCENTAGE", result.getDiscountType());
        assertEquals(new BigDecimal("100.00"), result.getDiscountAmount());
        assertEquals(new BigDecimal("300.00"), result.getConsultationFee());
        assertEquals(new BigDecimal("300.00"), result.getFinalAmount());
    }

    @Test
    void testRegisterOp_Case6_100PercentDiscount_FreeConsultation() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "PERCENTAGE", new BigDecimal("100.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));
        when(patientRepository.findByTenantIdAndPhone(1L, "9876543210")).thenReturn(List.of(testPatient));
        when(opRegistrationRepository.save(any(OpRegistration.class))).thenAnswer(inv -> {
            OpRegistration saved = inv.getArgument(0);
            saved.setId(206L);
            return saved;
        });

        OpRegistrationDto result = opService.registerOp(req, 1L);

        assertNotNull(result);
        assertEquals(new BigDecimal("500.00"), result.getOriginalFee());
        assertEquals("PERCENTAGE", result.getDiscountType());
        assertEquals(new BigDecimal("500.00"), result.getDiscountAmount());
        assertEquals(new BigDecimal("0.00"), result.getConsultationFee());
        assertEquals(new BigDecimal("0.00"), result.getFinalAmount());
        // Outstanding balance is 0, so status must be PAID
        assertEquals("PAID", result.getPaymentStatus());
        assertEquals(new BigDecimal("0.00"), result.getBalanceAmount());
    }

    @Test
    void testRegisterOp_InvalidFixedDiscount_ExceedsFee_ThrowsBadRequest() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "FIXED", new BigDecimal("501.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> opService.registerOp(req, 1L));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("cannot exceed doctor consultation fee"));
    }

    @Test
    void testRegisterOp_InvalidPercentageDiscount_Exceeds100_ThrowsBadRequest() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "PERCENTAGE", new BigDecimal("105.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> opService.registerOp(req, 1L));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("cannot exceed 100%"));
    }

    @Test
    void testRegisterOp_NegativeDiscountValue_ThrowsBadRequest() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "AVAILABLE");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "FIXED", new BigDecimal("-10.00"));

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> opService.registerOp(req, 1L));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("cannot be negative"));
    }

    @Test
    void testRegisterOp_DoctorUnavailable_ThrowsBadRequest() {
        Doctor doc = createTestDoctor("Dr. Sarah Jenkins", "General Medicine", new BigDecimal("500.00"), "BUSY");
        CreateOpRegistrationRequest req = createTestRequest("Dr. Sarah Jenkins", "NO_DISCOUNT", BigDecimal.ZERO);

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Sarah Jenkins")).thenReturn(Optional.of(doc));

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> opService.registerOp(req, 1L));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("currently unavailable"));
    }

    @Test
    void testRegisterOp_DoctorNotFoundInTenant_ThrowsBadRequest() {
        CreateOpRegistrationRequest req = createTestRequest("Dr. Unknown", "NO_DISCOUNT", BigDecimal.ZERO);

        when(tenantRepository.findById(1L)).thenReturn(Optional.of(testTenant));
        when(doctorRepository.findFirstByTenantIdAndNameIgnoreCase(1L, "Dr. Unknown")).thenReturn(Optional.empty());

        ResponseStatusException ex = assertThrows(ResponseStatusException.class, () -> opService.registerOp(req, 1L));
        assertEquals(400, ex.getStatusCode().value());
        assertTrue(ex.getReason().contains("was not found for this hospital"));
    }
}
