package com.carevista.hms.billing.service;

import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.billing.dto.BillingCategoriesSummaryDto;
import com.carevista.hms.billing.dto.BillingConsolidatedDto;
import com.carevista.hms.billing.dto.BillPaymentRequestDto;
import com.carevista.hms.billing.dto.BillPaymentResponseDto;
import com.carevista.hms.billing.dto.CentralBillRequestDto;
import com.carevista.hms.billing.dto.PatientBillingSearchResultDto;
import com.carevista.hms.billing.entity.CentralBill;
import com.carevista.hms.billing.entity.CentralBillItem;
import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.CentralBillRepository;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.ip.entity.IpAdmission;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.pharmacy.entity.PharmacyBill;
import com.carevista.hms.pharmacy.dto.PharmacyBillDto;
import com.carevista.hms.pharmacy.repository.PharmacyBillRepository;
import com.carevista.hms.laboratory.entity.LabOrder;
import com.carevista.hms.laboratory.dto.LabOrderDto;
import com.carevista.hms.laboratory.repository.LabOrderRepository;
import com.carevista.hms.patient.entity.Patient;
import com.carevista.hms.patient.repository.PatientRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BillingService {

    @PersistenceContext private EntityManager entityManager;
    @Autowired private CentralBillRepository centralBillRepository;
    @Autowired private PaymentRecordRepository paymentRecordRepository;
    @Autowired private OpRegistrationRepository opRegistrationRepository;
    @Autowired private IpAdmissionRepository ipAdmissionRepository;
    @Autowired private PharmacyBillRepository pharmacyBillRepository;
    @Autowired private LabOrderRepository labOrderRepository;
    @Autowired private PatientRepository patientRepository;
    @Autowired private TenantRepository tenantRepository;
    @Autowired(required = false) private AuditService auditService;

    @Transactional(readOnly = true)
    public BillingConsolidatedDto getConsolidatedCharges(Long tenantId, Long patientId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Patient patient = patientRepository.findById(patientId).orElseThrow(() -> new RuntimeException("Patient not found"));

        BillingConsolidatedDto dto = new BillingConsolidatedDto();
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");

        dto.setPatientId(patient.getId());
        dto.setPatientName(patient.getFullName());
        dto.setUhid(patient.getUhid());
        dto.setPhone(patient.getPhone());
        dto.setAge(patient.getAge());
        dto.setGender(patient.getGender());

        // Check if an existing Central Bill / Invoice exists for this patient
        List<CentralBill> existingBills = centralBillRepository.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenant.getId(), patientId);
        if (!existingBills.isEmpty()) {
            CentralBill latest = existingBills.get(0);
            dto.setExistingInvoiceNumber(latest.getInvoiceNumber());
            dto.setExistingBillNumber(latest.getBillNumber());
            dto.setExistingBillId(latest.getId());
            dto.setExistingFinalTotal(latest.getFinalTotal());
            dto.setExistingAmountPaid(latest.getAmountPaid());
            dto.setExistingBalance(latest.getBalance());
            dto.setExistingPaymentStatus(latest.getPaymentStatus());
            dto.setExistingPaymentMethod(latest.getPaymentMethod());
        }

        // 1. OP Charges
        List<OpRegistration> ops = getOpBillingByPatient(tenant.getId(), patientId);
        List<BillingConsolidatedDto.ChargeDto> opCharges = new ArrayList<>();
        BigDecimal opSubtotal = BigDecimal.ZERO;

        for (OpRegistration op : ops) {
            if (dto.getOpId() == null && op.getOpId() != null) dto.setOpId(op.getOpId());
            if (dto.getDoctorName() == null && op.getDoctorName() != null) dto.setDoctorName(op.getDoctorName());
            if (dto.getDepartment() == null && op.getDepartment() != null) dto.setDepartment(op.getDepartment());

            BigDecimal fee = op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO;
            if (fee.compareTo(BigDecimal.ZERO) > 0) {
                String desc = "OP Consultation - " + (op.getDoctorName() != null ? op.getDoctorName() : "Doctor") + " (" + (op.getDepartment() != null ? op.getDepartment() : "General") + ")";
                opCharges.add(new BillingConsolidatedDto.ChargeDto(
                        op.getOpId(),
                        "OP",
                        desc,
                        fee,
                        op.getVisitDate() != null ? op.getVisitDate().format(formatter) : "",
                        op.getRegistrationTime(),
                        op.getPaymentStatus() != null ? op.getPaymentStatus() : "PAID",
                        op.getPaymentMethod() != null ? op.getPaymentMethod() : "CASH",
                        op.getDoctorName(),
                        op.getDepartment()
                ));
                opSubtotal = opSubtotal.add(fee);
            }
        }
        dto.setOpCharges(opCharges);
        dto.setOpSubtotal(opSubtotal);

        // 2. IP Charges
        List<IpAdmission> ips = getIpBillingByPatient(tenant.getId(), patientId);
        List<BillingConsolidatedDto.ChargeDto> ipCharges = new ArrayList<>();
        BigDecimal ipSubtotal = BigDecimal.ZERO;

        for (IpAdmission ip : ips) {
            if (dto.getIpId() == null && ip.getIpId() != null) dto.setIpId(ip.getIpId());
            if (dto.getDoctorName() == null && ip.getDoctorName() != null) dto.setDoctorName(ip.getDoctorName());
            if (dto.getDepartment() == null && ip.getDepartment() != null) dto.setDepartment(ip.getDepartment());

            boolean itemAdded = false;

            // Room Charges
            if (ip.getRoomPrice() != null && ip.getRoomPrice().compareTo(BigDecimal.ZERO) > 0) {
                String roomDesc = "Room Charges (" + (ip.getRoomNumber() != null ? ip.getRoomNumber() : "Standard Room") + " - " + (ip.getWardName() != null ? ip.getWardName() : "General Ward") + ")";
                ipCharges.add(new BillingConsolidatedDto.ChargeDto(
                        ip.getIpId(),
                        "IP",
                        roomDesc,
                        ip.getRoomPrice(),
                        ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(formatter) : "",
                        ip.getAdmissionTime(),
                        ip.getPaymentStatus() != null ? ip.getPaymentStatus() : "PAID",
                        ip.getPaymentMethod() != null ? ip.getPaymentMethod() : "CASH",
                        ip.getDoctorName(),
                        ip.getDepartment()
                ));
                ipSubtotal = ipSubtotal.add(ip.getRoomPrice());
                itemAdded = true;
            }

            // Bed Charges
            if (ip.getBedPrice() != null && ip.getBedPrice().compareTo(BigDecimal.ZERO) > 0) {
                String bedDesc = "Bed Charges (Bed " + (ip.getBedNumber() != null ? ip.getBedNumber() : "Standard") + ")";
                ipCharges.add(new BillingConsolidatedDto.ChargeDto(
                        ip.getIpId(),
                        "IP",
                        bedDesc,
                        ip.getBedPrice(),
                        ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(formatter) : "",
                        ip.getAdmissionTime(),
                        ip.getPaymentStatus() != null ? ip.getPaymentStatus() : "PAID",
                        ip.getPaymentMethod() != null ? ip.getPaymentMethod() : "CASH",
                        ip.getDoctorName(),
                        ip.getDepartment()
                ));
                ipSubtotal = ipSubtotal.add(ip.getBedPrice());
                itemAdded = true;
            }

            // Total or Other configured IP charges
            BigDecimal baseCharges = (ip.getRoomPrice() != null ? ip.getRoomPrice() : BigDecimal.ZERO)
                    .add(ip.getBedPrice() != null ? ip.getBedPrice() : BigDecimal.ZERO);

            if (ip.getTotalCharges() != null && ip.getTotalCharges().compareTo(baseCharges) > 0) {
                BigDecimal remainingCharges = ip.getTotalCharges().subtract(baseCharges);
                ipCharges.add(new BillingConsolidatedDto.ChargeDto(
                        ip.getIpId(),
                        "IP",
                        "Inpatient Nursing & Clinical Care Services",
                        remainingCharges,
                        ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(formatter) : "",
                        ip.getAdmissionTime(),
                        ip.getPaymentStatus() != null ? ip.getPaymentStatus() : "PAID",
                        ip.getPaymentMethod() != null ? ip.getPaymentMethod() : "CASH",
                        ip.getDoctorName(),
                        ip.getDepartment()
                ));
                ipSubtotal = ipSubtotal.add(remainingCharges);
                itemAdded = true;
            } else if (!itemAdded && ip.getTotalCharges() != null && ip.getTotalCharges().compareTo(BigDecimal.ZERO) > 0) {
                ipCharges.add(new BillingConsolidatedDto.ChargeDto(
                        ip.getIpId(),
                        "IP",
                        "IP Admission & Inpatient Charges (" + (ip.getWardName() != null ? ip.getWardName() : "General Ward") + ")",
                        ip.getTotalCharges(),
                        ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(formatter) : "",
                        ip.getAdmissionTime(),
                        ip.getPaymentStatus() != null ? ip.getPaymentStatus() : "PAID",
                        ip.getPaymentMethod() != null ? ip.getPaymentMethod() : "CASH",
                        ip.getDoctorName(),
                        ip.getDepartment()
                ));
                ipSubtotal = ipSubtotal.add(ip.getTotalCharges());
                itemAdded = true;
            }
        }
        dto.setIpCharges(ipCharges);
        dto.setIpSubtotal(ipSubtotal);

        // 3. Pharmacy Charges
        List<PharmacyBillDto> phars = getPharmacyBillingByPatient(tenant.getId(), patientId);
        List<BillingConsolidatedDto.ChargeDto> pharCharges = new ArrayList<>();
        BigDecimal pharmacySubtotal = BigDecimal.ZERO;

        for (PharmacyBillDto p : phars) {
            BigDecimal pharAmt = p.getTotalAmount() != null && p.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                    ? p.getTotalAmount() : (p.getSubtotal() != null ? p.getSubtotal() : BigDecimal.ZERO);

            if (pharAmt.compareTo(BigDecimal.ZERO) > 0) {
                String desc = "Pharmacy Medicines Dispensed (" + p.getBillNumber() + ")";
                if (p.getItems() != null && !p.getItems().isEmpty()) {
                    String medSample = p.getItems().stream()
                            .map(item -> item.getMedicineName() != null ? item.getMedicineName() : "")
                            .filter(s -> !s.isEmpty())
                            .limit(2)
                            .collect(Collectors.joining(", "));
                    desc = "Pharmacy (" + p.getItems().size() + " items: " + medSample + (p.getItems().size() > 2 ? "..." : "") + ")";
                }

                pharCharges.add(new BillingConsolidatedDto.ChargeDto(
                        p.getBillNumber(),
                        "PHARMACY",
                        desc,
                        pharAmt,
                        p.getBillDate() != null ? p.getBillDate() : "",
                        p.getBillTime(),
                        p.getPaymentStatus() != null ? p.getPaymentStatus() : "PAID",
                        p.getPaymentMethod() != null ? p.getPaymentMethod() : "CASH",
                        p.getDoctorName(),
                        p.getDepartment()
                ));
                pharmacySubtotal = pharmacySubtotal.add(pharAmt);
            }
        }
        dto.setPharmacyCharges(pharCharges);
        dto.setPharmacySubtotal(pharmacySubtotal);

        // 4. Laboratory Charges
        List<LabOrderDto> labs = getLabBillingByPatient(tenant.getId(), patientId);
        List<BillingConsolidatedDto.ChargeDto> labCharges = new ArrayList<>();
        BigDecimal labSubtotal = BigDecimal.ZERO;

        for (LabOrderDto lab : labs) {
            BigDecimal labAmt = lab.getTotalAmount() != null && lab.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                    ? lab.getTotalAmount() : (lab.getTestPrice() != null ? lab.getTestPrice() : BigDecimal.ZERO);

            if (labAmt.compareTo(BigDecimal.ZERO) > 0) {
                String desc = "Lab Test: " + (lab.getTestName() != null ? lab.getTestName() : "Diagnostics") + " (" + (lab.getCategory() != null ? lab.getCategory() : "GENERAL") + ")";
                String labTime = lab.getCreatedAt() != null ? lab.getCreatedAt().format(DateTimeFormatter.ofPattern("hh:mm a")) : "";
                labCharges.add(new BillingConsolidatedDto.ChargeDto(
                        lab.getOrderNumber(),
                        "LABORATORY",
                        desc,
                        labAmt,
                        lab.getOrderDate() != null ? lab.getOrderDate().format(formatter) : "",
                        labTime,
                        lab.getPaymentStatus() != null ? lab.getPaymentStatus() : "PAID",
                        lab.getPaymentMethod() != null ? lab.getPaymentMethod() : "CASH",
                        lab.getDoctorName(),
                        lab.getDepartment()
                ));
                labSubtotal = labSubtotal.add(labAmt);
            }
        }
        dto.setLabCharges(labCharges);
        dto.setLabSubtotal(labSubtotal);

        // Overall Subtotal
        BigDecimal totalSubtotal = opSubtotal.add(ipSubtotal).add(pharmacySubtotal).add(labSubtotal);
        dto.setOverallSubtotal(totalSubtotal);

        return dto;
    }

    public List<PatientBillingSearchResultDto> searchPatientsForBilling(Long tenantId, String query) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Map<Long, PatientBillingSearchResultDto> resultMap = new LinkedHashMap<>();

        String cleanQuery = (query != null) ? query.trim() : "";
        List<Patient> directMatches;
        if (cleanQuery.isEmpty()) {
            directMatches = patientRepository.findByTenantId(tenant.getId());
        } else {
            directMatches = patientRepository.searchPatients(tenant.getId(), cleanQuery);
        }

        for (Patient p : directMatches) {
            resultMap.put(p.getId(), toSearchResultDto(p));
        }

        // Also check if query matches OP ID or IP ID
        if (!cleanQuery.isEmpty()) {
            try {
                List<Patient> opPatients = opRegistrationRepository.findPatientsByOpId(tenant.getId(), cleanQuery);
                for (Patient p : opPatients) {
                    if (p != null && !resultMap.containsKey(p.getId())) {
                        resultMap.put(p.getId(), toSearchResultDto(p));
                    }
                }
            } catch (Exception ignored) {}

            try {
                List<IpAdmission> ipMatches = ipAdmissionRepository.searchIpAdmissions(tenant.getId(), cleanQuery);
                for (IpAdmission ip : ipMatches) {
                    if (ip.getPatient() != null && !resultMap.containsKey(ip.getPatient().getId())) {
                        PatientBillingSearchResultDto dto = toSearchResultDto(ip.getPatient());
                        dto.setLatestIpId(ip.getIpId());
                        if (dto.getDoctorName() == null) dto.setDoctorName(ip.getDoctorName());
                        if (dto.getDepartment() == null) dto.setDepartment(ip.getDepartment());
                        resultMap.put(ip.getPatient().getId(), dto);
                    }
                }
            } catch (Exception ignored) {}

            try {
                List<PharmacyBill> phMatches = pharmacyBillRepository.searchBills(tenant.getId(), cleanQuery);
                for (PharmacyBill ph : phMatches) {
                    if (ph.getPatient() != null && !resultMap.containsKey(ph.getPatient().getId())) {
                        PatientBillingSearchResultDto dto = toSearchResultDto(ph.getPatient());
                        if (dto.getDoctorName() == null) dto.setDoctorName(ph.getDoctorName());
                        if (dto.getDepartment() == null) dto.setDepartment(ph.getDepartment());
                        resultMap.put(ph.getPatient().getId(), dto);
                    }
                }
            } catch (Exception ignored) {}

            try {
                List<LabOrder> labMatches = labOrderRepository.searchLabOrders(tenant.getId(), cleanQuery);
                for (LabOrder lab : labMatches) {
                    if (lab.getPatient() != null && !resultMap.containsKey(lab.getPatient().getId())) {
                        PatientBillingSearchResultDto dto = toSearchResultDto(lab.getPatient());
                        if (dto.getDoctorName() == null) dto.setDoctorName(lab.getDoctorName());
                        if (dto.getDepartment() == null) dto.setDepartment(lab.getDepartment());
                        resultMap.put(lab.getPatient().getId(), dto);
                    }
                }
            } catch (Exception ignored) {}
        }

        // Enrich with latest OP/IP IDs if missing
        List<PatientBillingSearchResultDto> list = new ArrayList<>(resultMap.values());
        for (PatientBillingSearchResultDto dto : list) {
            enrichPatientMetadata(tenant.getId(), dto);
        }

        // Prioritize results starting with the entered text (STARTS WITH matching)
        if (!cleanQuery.isEmpty()) {
            final String qLower = cleanQuery.toLowerCase();
            list.sort((a, b) -> {
                String nameA = a.getFullName() != null ? a.getFullName().toLowerCase() : "";
                String nameB = b.getFullName() != null ? b.getFullName().toLowerCase() : "";

                boolean aNameStarts = nameA.startsWith(qLower);
                boolean bNameStarts = nameB.startsWith(qLower);
                if (aNameStarts && !bNameStarts) return -1;
                if (!aNameStarts && bNameStarts) return 1;

                boolean aWordStarts = nameA.contains(" " + qLower);
                boolean bWordStarts = nameB.contains(" " + qLower);
                if (aWordStarts && !bWordStarts) return -1;
                if (!aWordStarts && bWordStarts) return 1;

                String uhidA = a.getUhid() != null ? a.getUhid().toLowerCase() : "";
                String uhidB = b.getUhid() != null ? b.getUhid().toLowerCase() : "";
                boolean aUhidStarts = uhidA.startsWith(qLower);
                boolean bUhidStarts = uhidB.startsWith(qLower);
                if (aUhidStarts && !bUhidStarts) return -1;
                if (!aUhidStarts && bUhidStarts) return 1;

                String phoneA = a.getPhone() != null ? a.getPhone() : "";
                String phoneB = b.getPhone() != null ? b.getPhone() : "";
                boolean aPhoneStarts = phoneA.startsWith(cleanQuery);
                boolean bPhoneStarts = phoneB.startsWith(cleanQuery);
                if (aPhoneStarts && !bPhoneStarts) return -1;
                if (!aPhoneStarts && bPhoneStarts) return 1;

                String opA = a.getLatestOpId() != null ? a.getLatestOpId().toLowerCase() : "";
                String opB = b.getLatestOpId() != null ? b.getLatestOpId().toLowerCase() : "";
                boolean aOpStarts = opA.startsWith(qLower);
                boolean bOpStarts = opB.startsWith(qLower);
                if (aOpStarts && !bOpStarts) return -1;
                if (!aOpStarts && bOpStarts) return 1;

                String ipA = a.getLatestIpId() != null ? a.getLatestIpId().toLowerCase() : "";
                String ipB = b.getLatestIpId() != null ? b.getLatestIpId().toLowerCase() : "";
                boolean aIpStarts = ipA.startsWith(qLower);
                boolean bIpStarts = ipB.startsWith(qLower);
                if (aIpStarts && !bIpStarts) return -1;
                if (!aIpStarts && bIpStarts) return 1;

                return nameA.compareTo(nameB);
            });
        }

        return list;
    }

    private PatientBillingSearchResultDto toSearchResultDto(Patient p) {
        return new PatientBillingSearchResultDto(
                p.getId(),
                p.getFullName(),
                p.getUhid(),
                p.getPhone(),
                p.getGender(),
                p.getAge(),
                null,
                null,
                null,
                null
        );
    }

    private void enrichPatientMetadata(Long tenantId, PatientBillingSearchResultDto dto) {
        try {
            if (dto.getLatestOpId() == null) {
                List<OpRegistration> ops = opRegistrationRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                for (OpRegistration op : ops) {
                    if (op.getPatient() != null && op.getPatient().getId().equals(dto.getId())) {
                        dto.setLatestOpId(op.getOpId());
                        if (dto.getDoctorName() == null) dto.setDoctorName(op.getDoctorName());
                        if (dto.getDepartment() == null) dto.setDepartment(op.getDepartment());
                        break;
                    }
                }
            }
            if (dto.getLatestIpId() == null) {
                List<IpAdmission> ips = ipAdmissionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
                for (IpAdmission ip : ips) {
                    if (ip.getPatient() != null && ip.getPatient().getId().equals(dto.getId())) {
                        dto.setLatestIpId(ip.getIpId());
                        if (dto.getDoctorName() == null) dto.setDoctorName(ip.getDoctorName());
                        if (dto.getDepartment() == null) dto.setDepartment(ip.getDepartment());
                        break;
                    }
                }
            }
            if (dto.getExistingInvoiceNumber() == null) {
                List<CentralBill> bills = centralBillRepository.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenantId, dto.getId());
                if (!bills.isEmpty() && bills.get(0).getInvoiceNumber() != null) {
                    dto.setExistingInvoiceNumber(bills.get(0).getInvoiceNumber());
                }
            }
        } catch (Exception ignored) {}
    }

    @Transactional
    public CentralBill createCentralBill(Long tenantId, CentralBillRequestDto request) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Patient patient = patientRepository.findById(request.getPatientId())
                .orElseThrow(() -> new RuntimeException("Patient not found"));

        LocalDate today = LocalDate.now();

        // Check if an existing Central Bill / Invoice was specified to be updated
        CentralBill bill = null;
        boolean isNew = false;

        if (request.getBillId() != null) {
            bill = centralBillRepository.findById(request.getBillId()).orElse(null);
        }
        if (bill == null && request.getInvoiceNumber() != null && !request.getInvoiceNumber().trim().isEmpty()) {
            bill = centralBillRepository.findByTenantIdAndInvoiceNumber(tenant.getId(), request.getInvoiceNumber().trim()).orElse(null);
        }
        if (bill == null && request.getBillNumber() != null && !request.getBillNumber().trim().isEmpty()) {
            bill = centralBillRepository.findByTenantIdAndBillNumber(tenant.getId(), request.getBillNumber().trim()).orElse(null);
        }

        if (bill == null) {
            isNew = true;
            String datePrefix = today.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
            long nextSeq = centralBillRepository.countByTenantIdAndBillDate(tenant.getId(), today) + 1;

            String billNumber;
            do {
                billNumber = String.format("CB-%s-%04d", datePrefix, nextSeq);
                nextSeq++;
            } while (centralBillRepository.existsByBillNumber(billNumber));

            long invSeq = nextSeq - 1;
            String invoiceNumber;
            do {
                invoiceNumber = String.format("INV-%s-%04d", datePrefix, invSeq);
                invSeq++;
            } while (centralBillRepository.existsByInvoiceNumber(invoiceNumber));

            bill = new CentralBill();
            bill.setTenant(tenant);
            bill.setBillNumber(billNumber);
            bill.setInvoiceNumber(invoiceNumber);
            bill.setPatient(patient);
            bill.setBillDate(today);
            bill.setBillTime(LocalTime.now().format(DateTimeFormatter.ofPattern("hh:mm a")));
        }

        bill.setPatientName(request.getPatientName() != null ? request.getPatientName() : patient.getFullName());
        bill.setUhid(request.getUhid() != null ? request.getUhid() : patient.getUhid());
        bill.setOpId(request.getOpId());
        bill.setIpId(request.getIpId());
        bill.setPhone(request.getPhone() != null ? request.getPhone() : patient.getPhone());
        bill.setDoctorName(request.getDoctorName());
        bill.setDepartment(request.getDepartment());
        bill.setGstNumber(request.getGstNumber());

        BigDecimal subtotal = request.getSubtotal() != null ? request.getSubtotal() : BigDecimal.ZERO;
        BigDecimal discountPct = request.getDiscountPct() != null ? request.getDiscountPct() : BigDecimal.ZERO;
        BigDecimal discountAmount = request.getDiscountAmount() != null ? request.getDiscountAmount() :
                subtotal.multiply(discountPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        BigDecimal net = subtotal.subtract(discountAmount);

        BigDecimal gstPct = request.getGstPct() != null ? request.getGstPct() : BigDecimal.ZERO;
        BigDecimal gstAmount = request.getGstAmount() != null ? request.getGstAmount() :
                net.multiply(gstPct).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        BigDecimal finalTotal = request.getFinalTotal() != null ? request.getFinalTotal() : net.add(gstAmount);
        BigDecimal paymentAmt = request.getAmountPaid() != null ? request.getAmountPaid() : BigDecimal.ZERO;

        BigDecimal newPaid;
        BigDecimal newBal;
        if (isNew) {
            newPaid = paymentAmt;
            newBal = finalTotal.subtract(newPaid).max(BigDecimal.ZERO);
        } else {
            BigDecimal previousPaid = bill.getAmountPaid() != null ? bill.getAmountPaid() : BigDecimal.ZERO;
            newPaid = previousPaid.add(paymentAmt);
            newBal = finalTotal.subtract(newPaid).max(BigDecimal.ZERO);
        }

        bill.setSubtotal(subtotal);
        bill.setDiscountPct(discountPct);
        bill.setDiscountAmount(discountAmount);
        bill.setNetAmount(net);
        bill.setGstPct(gstPct);
        bill.setGstAmount(gstAmount);
        bill.setFinalTotal(finalTotal);
        bill.setAmountPaid(newPaid);
        bill.setBalance(newBal);

        if (newBal.compareTo(BigDecimal.ZERO) <= 0) {
            bill.setPaymentStatus("PAID");
        } else if (newPaid.compareTo(BigDecimal.ZERO) > 0) {
            bill.setPaymentStatus("PARTIALLY PAID");
        } else {
            bill.setPaymentStatus("UNPAID");
        }

        bill.setPaymentMethod(request.getPaymentMethod() != null ? request.getPaymentMethod() : "CASH");
        bill.setConsolidatedNotes(request.getNotes());

        if (request.getItems() != null && !request.getItems().isEmpty()) {
            bill.getItems().clear();
            for (CentralBillRequestDto.ItemDto dtoItem : request.getItems()) {
                CentralBillItem item = new CentralBillItem();
                item.setModuleType(dtoItem.getModuleType() != null ? dtoItem.getModuleType() : "GENERAL");
                item.setReferenceId(dtoItem.getReferenceId());
                item.setDescription(dtoItem.getDescription());
                item.setAmount(dtoItem.getAmount() != null ? dtoItem.getAmount() : BigDecimal.ZERO);
                bill.addItem(item);
            }
        }

        CentralBill savedBill = centralBillRepository.save(bill);

        if (paymentAmt.compareTo(BigDecimal.ZERO) > 0) {
            PaymentRecord pr = new PaymentRecord(
                    tenant,
                    "TXN-" + System.currentTimeMillis(),
                    patient,
                    patient.getFullName(),
                    "CENTRAL",
                    paymentAmt,
                    bill.getPaymentMethod(),
                    today
            );
            pr.setNotes("Payment on Central Bill " + savedBill.getBillNumber() + " / Invoice " + savedBill.getInvoiceNumber());
            paymentRecordRepository.save(pr);
        }

        if (auditService != null) {
            try {
                auditService.log(
                        null,
                        "admin",
                        "ADMIN",
                        tenant.getId(),
                        "CENTRAL_BILL_CREATED",
                        "Created Central Bill " + savedBill.getBillNumber() + " (Invoice: " + savedBill.getInvoiceNumber() + ") for Patient: " + savedBill.getPatientName() + ", Total: " + savedBill.getFinalTotal(),
                        "127.0.0.1",
                        "SUCCESS"
                );
            } catch (Exception ignored) {}
        }

        if (patient != null) {
            savedBill.setOpRecords(getOpBillingByPatient(tenant.getId(), patient.getId()));
            savedBill.setIpRecords(getIpBillingByPatient(tenant.getId(), patient.getId()));
            savedBill.setPharmacyBills(getPharmacyBillingByPatient(tenant.getId(), patient.getId()));
            savedBill.setLabOrders(getLabBillingByPatient(tenant.getId(), patient.getId()));
        }

        return savedBill;
    }

    @Transactional(readOnly = true)
    public CentralBill getCentralBill(Long tenantId, Long id) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        CentralBill bill = centralBillRepository.findByIdAndTenantId(id, tenant.getId())
                .orElseThrow(() -> new RuntimeException("Bill not found"));
        Long patientId = bill.getPatient() != null ? bill.getPatient().getId() : null;
        if (patientId != null) {
            bill.setOpRecords(getOpBillingByPatient(tenant.getId(), patientId));
            bill.setIpRecords(getIpBillingByPatient(tenant.getId(), patientId));
            bill.setPharmacyBills(getPharmacyBillingByPatient(tenant.getId(), patientId));
            bill.setLabOrders(getLabBillingByPatient(tenant.getId(), patientId));
        }
        return bill;
    }

    public List<CentralBill> getCentralBillHistory(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        return centralBillRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
    }

    public List<OpRegistration> getOpBillingHistory(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        return opRegistrationRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
    }

    public List<IpAdmission> getIpBillingHistory(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        return ipAdmissionRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
    }

    public List<PharmacyBill> getPharmacyBillingHistory(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        return pharmacyBillRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
    }

    public List<LabOrder> getLabBillingHistory(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        return labOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
    }

    @Transactional(readOnly = true)
    public List<OpRegistration> getOpBillingByPatient(Long tenantId, Long patientId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Patient patient = patientRepository.findById(patientId).orElseThrow(() -> new RuntimeException("Patient not found"));
        Map<Long, OpRegistration> map = new LinkedHashMap<>();
        for (OpRegistration op : opRegistrationRepository.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenant.getId(), patient.getId())) {
            map.put(op.getId(), op);
        }
        if (patient.getUhid() != null && !patient.getUhid().trim().isEmpty()) {
            for (OpRegistration op : opRegistrationRepository.findByTenantIdAndPatientUhidOrderByCreatedAtDesc(tenant.getId(), patient.getUhid().trim())) {
                map.putIfAbsent(op.getId(), op);
            }
        }
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");
        for (OpRegistration op : map.values()) {
            if (op.getRegistrationTime() == null && op.getCreatedAt() != null) {
                op.setRegistrationTime(op.getCreatedAt().format(timeFmt));
            }
            if (op.getPaymentStatus() == null || op.getPaymentStatus().trim().isEmpty()) {
                op.setPaymentStatus("PAID");
            }
            if (op.getPaymentMethod() == null || op.getPaymentMethod().trim().isEmpty()) {
                op.setPaymentMethod("CASH");
            }
        }
        return new ArrayList<>(map.values());
    }

    @Transactional(readOnly = true)
    public List<IpAdmission> getIpBillingByPatient(Long tenantId, Long patientId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Patient patient = patientRepository.findById(patientId).orElseThrow(() -> new RuntimeException("Patient not found"));
        Map<Long, IpAdmission> map = new LinkedHashMap<>();
        for (IpAdmission ip : ipAdmissionRepository.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenant.getId(), patient.getId())) {
            map.put(ip.getId(), ip);
        }
        if (patient.getUhid() != null && !patient.getUhid().trim().isEmpty()) {
            for (IpAdmission ip : ipAdmissionRepository.findByTenantIdAndPatientUhidOrderByCreatedAtDesc(tenant.getId(), patient.getUhid().trim())) {
                map.putIfAbsent(ip.getId(), ip);
            }
        }
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");
        for (IpAdmission ip : map.values()) {
            if (ip.getRoomPrice() == null) {
                if (ip.getRoom() != null && ip.getRoom().getDailyPrice() != null) {
                    ip.setRoomPrice(ip.getRoom().getDailyPrice());
                } else {
                    ip.setRoomPrice(new BigDecimal("1200.00"));
                }
            }
            if (ip.getBedPrice() == null) {
                if (ip.getBed() != null && ip.getBed().getDailyPrice() != null) {
                    ip.setBedPrice(ip.getBed().getDailyPrice());
                } else {
                    ip.setBedPrice(new BigDecimal("600.00"));
                }
            }
            BigDecimal base = (ip.getRoomPrice() != null ? ip.getRoomPrice() : BigDecimal.ZERO)
                    .add(ip.getBedPrice() != null ? ip.getBedPrice() : BigDecimal.ZERO);
            if (ip.getTotalCharges() == null || ip.getTotalCharges().compareTo(BigDecimal.ZERO) == 0) {
                if (base.compareTo(BigDecimal.ZERO) > 0) {
                    ip.setTotalCharges(base);
                } else if (ip.getDepositAmount() != null && ip.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) {
                    ip.setTotalCharges(ip.getDepositAmount());
                } else {
                    ip.setTotalCharges(new BigDecimal("1800.00"));
                }
            }
            if (ip.getDepositAmount() == null || ip.getDepositAmount().compareTo(BigDecimal.ZERO) == 0) {
                ip.setDepositAmount(ip.getTotalCharges());
            }
            if (ip.getDepartment() == null || ip.getDepartment().trim().isEmpty()) {
                ip.setDepartment("General Medicine");
            }
            if (ip.getPaymentStatus() == null || ip.getPaymentStatus().trim().isEmpty()) {
                ip.setPaymentStatus("PAID");
            }
            if (ip.getPaymentMethod() == null || ip.getPaymentMethod().trim().isEmpty()) {
                ip.setPaymentMethod("CASH");
            }
            if (ip.getAdmissionTime() == null && ip.getCreatedAt() != null) {
                ip.setAdmissionTime(ip.getCreatedAt().format(timeFmt));
            }
        }
        return new ArrayList<>(map.values());
    }

    @Transactional(readOnly = true)
    public List<PharmacyBillDto> getPharmacyBillingByPatient(Long tenantId, Long patientId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Patient patient = patientRepository.findById(patientId).orElseThrow(() -> new RuntimeException("Patient not found"));
        Map<Long, PharmacyBill> map = new LinkedHashMap<>();
        for (PharmacyBill b : pharmacyBillRepository.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenant.getId(), patient.getId())) {
            map.put(b.getId(), b);
        }
        if (patient.getUhid() != null && !patient.getUhid().trim().isEmpty()) {
            for (PharmacyBill b : pharmacyBillRepository.findByTenantIdAndUhidOrderByCreatedAtDesc(tenant.getId(), patient.getUhid().trim())) {
                map.putIfAbsent(b.getId(), b);
            }
        }
        List<PharmacyBillDto> dtos = new ArrayList<>();
        for (PharmacyBill b : map.values()) {
            PharmacyBillDto dto = PharmacyBillDto.fromEntity(b);
            if (dto != null) {
                if (dto.getBalanceAmount() == null && dto.getTotalAmount() != null) {
                    BigDecimal paid = dto.getPaidAmount() != null ? dto.getPaidAmount() : BigDecimal.ZERO;
                    dto.setBalanceAmount(dto.getTotalAmount().subtract(paid).max(BigDecimal.ZERO));
                }
                if (dto.getPaymentStatus() == null || dto.getPaymentStatus().trim().isEmpty()) {
                    BigDecimal bal = dto.getBalanceAmount() != null ? dto.getBalanceAmount() : BigDecimal.ZERO;
                    if (bal.compareTo(BigDecimal.ZERO) == 0 && dto.getTotalAmount() != null && dto.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                        dto.setPaymentStatus("PAID");
                    } else if (dto.getPaidAmount() != null && dto.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                        dto.setPaymentStatus("PARTIALLY PAID");
                    } else {
                        dto.setPaymentStatus("UNPAID");
                    }
                }
                if (dto.getPaymentMethod() == null || dto.getPaymentMethod().trim().isEmpty()) {
                    dto.setPaymentMethod("CASH");
                }
                dtos.add(dto);
            }
        }
        return dtos;
    }

    @Transactional(readOnly = true)
    public List<LabOrderDto> getLabBillingByPatient(Long tenantId, Long patientId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow(() -> new RuntimeException("Tenant not found"));
        Patient patient = patientRepository.findById(patientId).orElseThrow(() -> new RuntimeException("Patient not found"));
        Map<Long, LabOrder> map = new LinkedHashMap<>();
        for (LabOrder l : labOrderRepository.findByTenantIdAndPatientIdOrderByCreatedAtDesc(tenant.getId(), patient.getId())) {
            map.put(l.getId(), l);
        }
        if (patient.getUhid() != null && !patient.getUhid().trim().isEmpty()) {
            for (LabOrder l : labOrderRepository.findByTenantIdAndUhidOrderByCreatedAtDesc(tenant.getId(), patient.getUhid().trim())) {
                map.putIfAbsent(l.getId(), l);
            }
        }
        List<LabOrderDto> dtos = new ArrayList<>();
        for (LabOrder l : map.values()) {
            LabOrderDto dto = new LabOrderDto(l);
            if (dto.getBalanceAmount() == null && dto.getTotalAmount() != null) {
                BigDecimal paid = dto.getPaidAmount() != null ? dto.getPaidAmount() : BigDecimal.ZERO;
                dto.setBalanceAmount(dto.getTotalAmount().subtract(paid).max(BigDecimal.ZERO));
            }
            if (dto.getPaymentStatus() == null || dto.getPaymentStatus().trim().isEmpty()) {
                BigDecimal bal = dto.getBalanceAmount() != null ? dto.getBalanceAmount() : BigDecimal.ZERO;
                if (bal.compareTo(BigDecimal.ZERO) == 0 && dto.getTotalAmount() != null && dto.getTotalAmount().compareTo(BigDecimal.ZERO) > 0) {
                    dto.setPaymentStatus("PAID");
                } else if (dto.getPaidAmount() != null && dto.getPaidAmount().compareTo(BigDecimal.ZERO) > 0) {
                    dto.setPaymentStatus("PARTIALLY PAID");
                } else {
                    dto.setPaymentStatus("UNPAID");
                }
            }
            if (dto.getPaymentMethod() == null || dto.getPaymentMethod().trim().isEmpty()) {
                dto.setPaymentMethod("CASH");
            }
            dtos.add(dto);
        }
        return dtos;
    }

    public BillingCategoriesSummaryDto getCategoriesSummary(Long tenantId) {
        Tenant tenant = tenantRepository.findById(tenantId).orElseThrow();
        BillingCategoriesSummaryDto summary = new BillingCategoriesSummaryDto();

        // OP Stats
        List<OpRegistration> ops = opRegistrationRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
        BigDecimal opBilled = BigDecimal.ZERO;
        BigDecimal opPaid = BigDecimal.ZERO;
        for (OpRegistration op : ops) {
            BigDecimal fee = op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO;
            opBilled = opBilled.add(fee);
            if ("PAID".equalsIgnoreCase(op.getPaymentStatus())) {
                opPaid = opPaid.add(fee);
            } else if (op.getPaidAmount() != null) {
                opPaid = opPaid.add(op.getPaidAmount().min(fee));
            }
        }
        summary.setOp(new BillingCategoriesSummaryDto.CategoryStat(ops.size(), opBilled, opPaid, opBilled.subtract(opPaid)));

        // IP Stats
        List<IpAdmission> ips = ipAdmissionRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
        BigDecimal ipBilled = BigDecimal.ZERO;
        BigDecimal ipPaid = BigDecimal.ZERO;
        for (IpAdmission ip : ips) {
            BigDecimal chg = ip.getTotalCharges() != null && ip.getTotalCharges().compareTo(BigDecimal.ZERO) > 0 ? ip.getTotalCharges() :
                    (ip.getRoomPrice() != null ? ip.getRoomPrice() : BigDecimal.ZERO).add(ip.getBedPrice() != null ? ip.getBedPrice() : BigDecimal.ZERO);
            ipBilled = ipBilled.add(chg);
            BigDecimal dep = ip.getDepositAmount() != null ? ip.getDepositAmount() : BigDecimal.ZERO;
            if ("PAID".equalsIgnoreCase(ip.getPaymentStatus())) {
                ipPaid = ipPaid.add(chg);
            } else if (ip.getPaidAmount() != null) {
                ipPaid = ipPaid.add(ip.getPaidAmount().min(chg));
            } else {
                ipPaid = ipPaid.add(dep);
            }
        }
        summary.setIp(new BillingCategoriesSummaryDto.CategoryStat(ips.size(), ipBilled, ipPaid, ipBilled.subtract(ipPaid)));

        // Pharmacy Stats
        List<PharmacyBill> phars = pharmacyBillRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
        BigDecimal pharBilled = BigDecimal.ZERO;
        BigDecimal pharPaid = BigDecimal.ZERO;
        for (PharmacyBill p : phars) {
            BigDecimal tot = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal pd = p.getPaidAmount() != null ? p.getPaidAmount() : BigDecimal.ZERO;
            pharBilled = pharBilled.add(tot);
            pharPaid = pharPaid.add(pd);
        }
        summary.setPharmacy(new BillingCategoriesSummaryDto.CategoryStat(phars.size(), pharBilled, pharPaid, pharBilled.subtract(pharPaid)));

        // Laboratory Stats
        List<LabOrder> labs = labOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
        BigDecimal labBilled = BigDecimal.ZERO;
        BigDecimal labPaid = BigDecimal.ZERO;
        for (LabOrder l : labs) {
            BigDecimal tot = l.getTotalAmount() != null && l.getTotalAmount().compareTo(BigDecimal.ZERO) > 0 ? l.getTotalAmount() : (l.getTestPrice() != null ? l.getTestPrice() : BigDecimal.ZERO);
            BigDecimal pd = l.getPaidAmount() != null ? l.getPaidAmount() : BigDecimal.ZERO;
            labBilled = labBilled.add(tot);
            labPaid = labPaid.add(pd);
        }
        summary.setLaboratory(new BillingCategoriesSummaryDto.CategoryStat(labs.size(), labBilled, labPaid, labBilled.subtract(labPaid)));

        // Central Stats
        List<CentralBill> cbs = centralBillRepository.findByTenantIdOrderByCreatedAtDesc(tenant.getId());
        BigDecimal cbBilled = BigDecimal.ZERO;
        BigDecimal cbPaid = BigDecimal.ZERO;
        for (CentralBill b : cbs) {
            cbBilled = cbBilled.add(b.getFinalTotal() != null ? b.getFinalTotal() : BigDecimal.ZERO);
            cbPaid = cbPaid.add(b.getAmountPaid() != null ? b.getAmountPaid() : BigDecimal.ZERO);
        }
        summary.setCentral(new BillingCategoriesSummaryDto.CategoryStat(cbs.size(), cbBilled, cbPaid, cbBilled.subtract(cbPaid)));

        return summary;
    }

    @Transactional
    public synchronized BillPaymentResponseDto processPayment(Long tenantId, BillPaymentRequestDto request, String userEmail, String ipAddress) {
        if (tenantId == null) {
            throw new IllegalArgumentException("Tenant ID is required.");
        }
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found."));

        if (request == null) {
            throw new IllegalArgumentException("Payment request cannot be empty.");
        }

        BigDecimal paymentAmount = request.getPaymentAmount();
        if (paymentAmount == null) {
            throw new IllegalArgumentException("Please enter a valid payment amount.");
        }
        if (paymentAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Payment amount must be greater than zero.");
        }

        String moduleType = (request.getModuleType() != null) ? request.getModuleType().trim().toUpperCase() : "";
        Long billId = request.getBillId();
        if (billId == null && request.getBillNumber() != null && !request.getBillNumber().trim().isEmpty()) {
            String bNum = request.getBillNumber().trim();
            if ("CENTRAL".equals(moduleType) || "MAIN".equals(moduleType)) {
                CentralBill cb = centralBillRepository.findByTenantIdAndInvoiceNumber(tenantId, bNum)
                        .orElse(centralBillRepository.findByTenantIdAndBillNumber(tenantId, bNum).orElse(null));
                if (cb != null) billId = cb.getId();
            } else if ("OP".equals(moduleType)) {
                OpRegistration op = opRegistrationRepository.findFirstByTenantIdAndOpId(tenantId, bNum).orElse(null);
                if (op != null) billId = op.getId();
            } else if ("IP".equals(moduleType)) {
                IpAdmission ip = ipAdmissionRepository.findFirstByTenantIdAndIpId(tenantId, bNum).orElse(null);
                if (ip != null) billId = ip.getId();
            } else if ("PHARMACY".equals(moduleType)) {
                PharmacyBill pb = pharmacyBillRepository.findFirstByTenantIdAndBillNumber(tenantId, bNum).orElse(null);
                if (pb != null) billId = pb.getId();
            } else if ("LAB".equals(moduleType) || "LABORATORY".equals(moduleType)) {
                LabOrder lab = labOrderRepository.findByTenantIdAndOrderNumber(tenantId, bNum).orElse(null);
                if (lab != null) billId = lab.getId();
            }
        }
        if (billId == null) {
            throw new IllegalArgumentException("Bill ID is required to record payment.");
        }

        String paymentMethod = (request.getPaymentMethod() != null && !request.getPaymentMethod().trim().isEmpty())
                ? request.getPaymentMethod().trim().toUpperCase() : "CASH";

        LocalDate today = LocalDate.now();
        String txnId = "TXN-" + System.currentTimeMillis() + "-" + (int)(Math.random() * 900 + 100);

        BillPaymentResponseDto response = new BillPaymentResponseDto();
        response.setModuleType(moduleType);
        response.setBillId(billId);
        response.setTransactionId(txnId);
        response.setPaymentDate(today);
        response.setPaymentMethod(paymentMethod);

        Patient patient = null;
        String billRef = "";

        switch (moduleType) {
            case "OP": {
                OpRegistration op = (entityManager != null) ?
                        entityManager.find(OpRegistration.class, billId, LockModeType.PESSIMISTIC_WRITE) :
                        opRegistrationRepository.findById(billId).orElse(null);
                if (op == null) {
                    throw new IllegalArgumentException("OP bill not found with ID: " + billId);
                }
                if (!op.getTenant().getId().equals(tenantId)) {
                    throw new SecurityException("Access denied: Tenant mismatch for OP bill.");
                }

                BigDecimal total = op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO;
                BigDecimal currentPaid = op.getPaidAmount() != null ? op.getPaidAmount() :
                        ("PAID".equalsIgnoreCase(op.getPaymentStatus()) ? total : BigDecimal.ZERO);
                BigDecimal currentBal = total.subtract(currentPaid).max(BigDecimal.ZERO);

                if (currentBal.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("This bill is already fully paid.");
                }
                if (paymentAmount.compareTo(currentBal) > 0) {
                    throw new IllegalArgumentException("Payment amount cannot exceed the outstanding balance.");
                }

                BigDecimal newPaid = currentPaid.add(paymentAmount);
                BigDecimal newBal = total.subtract(newPaid).max(BigDecimal.ZERO);
                String newStatus = determinePaymentStatus(newPaid, newBal);

                op.setPaidAmount(newPaid);
                op.setBalanceAmount(newBal);
                op.setPaymentStatus(newStatus);
                op.setPaymentMethod(paymentMethod);
                opRegistrationRepository.save(op);
                if (entityManager != null) entityManager.flush();

                patient = op.getPatient();
                billRef = op.getOpId();

                response.setBillNumber(op.getOpId());
                response.setTotalAmount(total);
                response.setAmountPaid(newPaid);
                response.setBalanceAmount(newBal);
                response.setPaymentStatus(newStatus);
                break;
            }

            case "IP": {
                IpAdmission ip = (entityManager != null) ?
                        entityManager.find(IpAdmission.class, billId, LockModeType.PESSIMISTIC_WRITE) :
                        ipAdmissionRepository.findById(billId).orElse(null);
                if (ip == null) {
                    throw new IllegalArgumentException("IP bill not found with ID: " + billId);
                }
                if (!ip.getTenant().getId().equals(tenantId)) {
                    throw new SecurityException("Access denied: Tenant mismatch for IP bill.");
                }

                BigDecimal roomBed = (ip.getRoomPrice() != null ? ip.getRoomPrice() : BigDecimal.ZERO)
                        .add(ip.getBedPrice() != null ? ip.getBedPrice() : BigDecimal.ZERO);
                BigDecimal total = ip.getTotalCharges() != null && ip.getTotalCharges().compareTo(BigDecimal.ZERO) > 0 ?
                        (ip.getTotalCharges().compareTo(roomBed) >= 0 ? ip.getTotalCharges() : roomBed) : roomBed;
                if (total.compareTo(BigDecimal.ZERO) <= 0 && ip.getDepositAmount() != null) {
                    total = ip.getDepositAmount();
                }

                BigDecimal currentPaid = ip.getPaidAmount() != null ? ip.getPaidAmount() :
                        ("UNPAID".equalsIgnoreCase(ip.getPaymentStatus()) ? BigDecimal.ZERO :
                        (ip.getDepositAmount() != null ? ip.getDepositAmount() :
                        ("PAID".equalsIgnoreCase(ip.getPaymentStatus()) ? total : BigDecimal.ZERO)));
                BigDecimal currentBal = ip.getBalanceAmount() != null ? ip.getBalanceAmount() :
                        total.subtract(currentPaid).max(BigDecimal.ZERO);

                if (currentBal.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("This bill is already fully paid.");
                }
                if (paymentAmount.compareTo(currentBal) > 0) {
                    throw new IllegalArgumentException("Payment amount cannot exceed the outstanding balance.");
                }

                BigDecimal newPaid = currentPaid.add(paymentAmount);
                BigDecimal newBal = total.subtract(newPaid).max(BigDecimal.ZERO);
                String newStatus = determinePaymentStatus(newPaid, newBal);

                ip.setPaidAmount(newPaid);
                ip.setDepositAmount(newPaid);
                ip.setBalanceAmount(newBal);
                ip.setPaymentStatus(newStatus);
                ip.setPaymentMethod(paymentMethod);
                ipAdmissionRepository.save(ip);
                if (entityManager != null) entityManager.flush();

                patient = ip.getPatient();
                billRef = ip.getIpId();

                response.setBillNumber(ip.getIpId());
                response.setTotalAmount(total);
                response.setAmountPaid(newPaid);
                response.setBalanceAmount(newBal);
                response.setPaymentStatus(newStatus);
                break;
            }

            case "PHARMACY": {
                PharmacyBill pb = (entityManager != null) ?
                        entityManager.find(PharmacyBill.class, billId, LockModeType.PESSIMISTIC_WRITE) :
                        pharmacyBillRepository.findById(billId).orElse(null);
                if (pb == null) {
                    throw new IllegalArgumentException("Pharmacy bill not found with ID: " + billId);
                }
                if (!pb.getTenant().getId().equals(tenantId)) {
                    throw new SecurityException("Access denied: Tenant mismatch for Pharmacy bill.");
                }

                BigDecimal total = pb.getTotalAmount() != null ? pb.getTotalAmount() : BigDecimal.ZERO;
                BigDecimal currentPaid = pb.getPaidAmount() != null ? pb.getPaidAmount() : BigDecimal.ZERO;
                BigDecimal currentBal = pb.getBalanceAmount() != null ? pb.getBalanceAmount() : total.subtract(currentPaid).max(BigDecimal.ZERO);

                if (currentBal.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("This bill is already fully paid.");
                }
                if (paymentAmount.compareTo(currentBal) > 0) {
                    throw new IllegalArgumentException("Payment amount cannot exceed the outstanding balance.");
                }

                BigDecimal newPaid = currentPaid.add(paymentAmount);
                BigDecimal newBal = total.subtract(newPaid).max(BigDecimal.ZERO);
                String newStatus = determinePaymentStatus(newPaid, newBal);

                pb.setPaidAmount(newPaid);
                pb.setBalanceAmount(newBal);
                pb.setPaymentStatus(newStatus);
                pb.setPaymentMethod(paymentMethod);
                pharmacyBillRepository.save(pb);
                if (entityManager != null) entityManager.flush();

                patient = pb.getPatient();
                billRef = pb.getBillNumber();

                response.setBillNumber(pb.getBillNumber());
                response.setTotalAmount(total);
                response.setAmountPaid(newPaid);
                response.setBalanceAmount(newBal);
                response.setPaymentStatus(newStatus);
                break;
            }

            case "LAB":
            case "LABORATORY": {
                LabOrder lab = (entityManager != null) ?
                        entityManager.find(LabOrder.class, billId, LockModeType.PESSIMISTIC_WRITE) :
                        labOrderRepository.findById(billId).orElse(null);
                if (lab == null) {
                    throw new IllegalArgumentException("Laboratory order not found with ID: " + billId);
                }
                if (!lab.getTenant().getId().equals(tenantId)) {
                    throw new SecurityException("Access denied: Tenant mismatch for Laboratory order.");
                }

                BigDecimal total = lab.getTotalAmount() != null && lab.getTotalAmount().compareTo(BigDecimal.ZERO) > 0 ?
                        lab.getTotalAmount() : (lab.getTestPrice() != null ? lab.getTestPrice() : BigDecimal.ZERO);
                BigDecimal currentPaid = lab.getPaidAmount() != null ? lab.getPaidAmount() : BigDecimal.ZERO;
                BigDecimal currentBal = lab.getBalanceAmount() != null ? lab.getBalanceAmount() : total.subtract(currentPaid).max(BigDecimal.ZERO);

                if (currentBal.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("This bill is already fully paid.");
                }
                if (paymentAmount.compareTo(currentBal) > 0) {
                    throw new IllegalArgumentException("Payment amount cannot exceed the outstanding balance.");
                }

                BigDecimal newPaid = currentPaid.add(paymentAmount);
                BigDecimal newBal = total.subtract(newPaid).max(BigDecimal.ZERO);
                String newStatus = determinePaymentStatus(newPaid, newBal);

                lab.setPaidAmount(newPaid);
                lab.setBalanceAmount(newBal);
                lab.setPaymentStatus(newStatus);
                lab.setPaymentMethod(paymentMethod);
                labOrderRepository.save(lab);
                if (entityManager != null) entityManager.flush();

                patient = lab.getPatient();
                billRef = lab.getOrderNumber();

                response.setBillNumber(lab.getOrderNumber());
                response.setTotalAmount(total);
                response.setAmountPaid(newPaid);
                response.setBalanceAmount(newBal);
                response.setPaymentStatus(newStatus);
                break;
            }

            case "CENTRAL":
            case "MAIN": {
                CentralBill cb = (entityManager != null) ?
                        entityManager.find(CentralBill.class, billId, LockModeType.PESSIMISTIC_WRITE) :
                        centralBillRepository.findById(billId).orElse(null);
                if (cb == null) {
                    throw new IllegalArgumentException("Central bill/invoice not found with ID: " + billId);
                }
                if (!cb.getTenant().getId().equals(tenantId)) {
                    throw new SecurityException("Access denied: Tenant mismatch for Central bill.");
                }

                BigDecimal total = cb.getFinalTotal() != null ? cb.getFinalTotal() : BigDecimal.ZERO;
                BigDecimal currentPaid = cb.getAmountPaid() != null ? cb.getAmountPaid() : BigDecimal.ZERO;
                BigDecimal currentBal = cb.getBalance() != null ? cb.getBalance() : total.subtract(currentPaid).max(BigDecimal.ZERO);

                if (currentBal.compareTo(BigDecimal.ZERO) <= 0) {
                    throw new IllegalArgumentException("This invoice is already fully paid.");
                }
                if (paymentAmount.compareTo(currentBal) > 0) {
                    throw new IllegalArgumentException("Payment amount cannot exceed the outstanding balance.");
                }

                BigDecimal newPaid = currentPaid.add(paymentAmount);
                BigDecimal newBal = total.subtract(newPaid).max(BigDecimal.ZERO);
                String newStatus = determinePaymentStatus(newPaid, newBal);

                cb.setAmountPaid(newPaid);
                cb.setBalance(newBal);
                cb.setPaymentStatus(newStatus);
                cb.setPaymentMethod(paymentMethod);
                centralBillRepository.save(cb);
                if (entityManager != null) entityManager.flush();

                patient = cb.getPatient();
                billRef = cb.getInvoiceNumber() != null ? cb.getInvoiceNumber() : cb.getBillNumber();

                response.setBillNumber(cb.getBillNumber());
                response.setInvoiceNumber(cb.getInvoiceNumber());
                response.setTotalAmount(total);
                response.setAmountPaid(newPaid);
                response.setBalanceAmount(newBal);
                response.setPaymentStatus(newStatus);
                break;
            }

            default:
                throw new IllegalArgumentException("Invalid billing module type: " + moduleType);
        }

        // Save unified payment transaction record in MySQL
        String patientName = (patient != null) ? patient.getFullName() : "Patient";
        PaymentRecord pr = new PaymentRecord(
                tenant,
                txnId,
                patient,
                patientName,
                moduleType.equals("MAIN") ? "CENTRAL" : moduleType,
                paymentAmount,
                paymentMethod,
                today
        );
        String notesStr = "Payment Done against " + billRef + (request.getNotes() != null && !request.getNotes().trim().isEmpty() ? " | " + request.getNotes().trim() : "");
        pr.setNotes(notesStr.length() > 255 ? notesStr.substring(0, 255) : notesStr);
        paymentRecordRepository.save(pr);

        if (auditService != null) {
            try {
                auditService.log(
                        null,
                        userEmail != null ? userEmail : "admin",
                        "ADMIN",
                        tenant.getId(),
                        "BILLING_PAYMENT_DONE",
                        "Recorded payment of ₹" + paymentAmount + " (" + paymentMethod + ") against " + moduleType + " bill " + billRef + " for patient " + patientName + ". Balance remaining: ₹" + response.getBalanceAmount() + ", Status: " + response.getPaymentStatus(),
                        ipAddress != null ? ipAddress : "127.0.0.1",
                        "SUCCESS"
                );
            } catch (Exception ignored) {}
        }

        response.setMessage("Payment of ₹" + paymentAmount + " processed successfully. Status: " + response.getPaymentStatus());
        return response;
    }

    private String determinePaymentStatus(BigDecimal paid, BigDecimal balance) {
        if (balance.compareTo(BigDecimal.ZERO) <= 0) {
            return "PAID";
        } else if (paid.compareTo(BigDecimal.ZERO) > 0) {
            return "PARTIALLY PAID";
        } else {
            return "UNPAID";
        }
    }
}
