package com.carevista.hms.admin.money.service;

import com.carevista.hms.admin.money.dto.*;
import com.carevista.hms.admin.money.entity.HospitalExpense;
import com.carevista.hms.admin.money.repository.HospitalExpenseRepository;
import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.billing.entity.CentralBill;
import com.carevista.hms.billing.entity.PaymentRecord;
import com.carevista.hms.billing.repository.CentralBillRepository;
import com.carevista.hms.billing.repository.PaymentRecordRepository;
import com.carevista.hms.doctor.entity.Doctor;
import com.carevista.hms.doctor.repository.DoctorRepository;
import com.carevista.hms.ip.entity.Bed;
import com.carevista.hms.ip.entity.IpAdmission;
import com.carevista.hms.ip.entity.Room;
import com.carevista.hms.ip.repository.BedRepository;
import com.carevista.hms.ip.repository.IpAdmissionRepository;
import com.carevista.hms.ip.repository.RoomRepository;
import com.carevista.hms.laboratory.entity.LabOrder;
import com.carevista.hms.laboratory.repository.LabOrderRepository;
import com.carevista.hms.op.entity.OpRegistration;
import com.carevista.hms.op.repository.OpRegistrationRepository;
import com.carevista.hms.pharmacy.entity.Medicine;
import com.carevista.hms.pharmacy.entity.PharmacyBill;
import com.carevista.hms.pharmacy.repository.MedicineRepository;
import com.carevista.hms.pharmacy.repository.PharmacyBillRepository;
import com.carevista.hms.tenant.entity.Tenant;
import com.carevista.hms.tenant.repository.TenantRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class MoneyManagementService {

    private final TenantRepository tenantRepository;
    private final OpRegistrationRepository opRegistrationRepository;
    private final IpAdmissionRepository ipAdmissionRepository;
    private final PharmacyBillRepository pharmacyBillRepository;
    private final LabOrderRepository labOrderRepository;
    private final MedicineRepository medicineRepository;
    private final DoctorRepository doctorRepository;
    private final HospitalExpenseRepository hospitalExpenseRepository;
    private final RoomRepository roomRepository;
    private final BedRepository bedRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final CentralBillRepository centralBillRepository;
    private final AuditService auditService;

    private static final DateTimeFormatter DD_MM_YYYY = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter ISO_DATE = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public MoneyManagementService(TenantRepository tenantRepository,
                                  OpRegistrationRepository opRegistrationRepository,
                                  IpAdmissionRepository ipAdmissionRepository,
                                  PharmacyBillRepository pharmacyBillRepository,
                                  LabOrderRepository labOrderRepository,
                                  MedicineRepository medicineRepository,
                                  DoctorRepository doctorRepository,
                                  HospitalExpenseRepository hospitalExpenseRepository,
                                  RoomRepository roomRepository,
                                  BedRepository bedRepository,
                                  PaymentRecordRepository paymentRecordRepository,
                                  CentralBillRepository centralBillRepository,
                                  AuditService auditService) {
        this.tenantRepository = tenantRepository;
        this.opRegistrationRepository = opRegistrationRepository;
        this.ipAdmissionRepository = ipAdmissionRepository;
        this.pharmacyBillRepository = pharmacyBillRepository;
        this.labOrderRepository = labOrderRepository;
        this.medicineRepository = medicineRepository;
        this.doctorRepository = doctorRepository;
        this.hospitalExpenseRepository = hospitalExpenseRepository;
        this.roomRepository = roomRepository;
        this.bedRepository = bedRepository;
        this.paymentRecordRepository = paymentRecordRepository;
        this.centralBillRepository = centralBillRepository;
        this.auditService = auditService;
    }

    public MoneyDashboardSummaryDto getMoneyDashboard(Long tenantId, String period, String customStart, String customEnd) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found with ID: " + tenantId));

        DateRange range = calculateDateRange(period, customStart, customEnd);
        LocalDate start = range.startDate;
        LocalDate end = range.endDate;

        MoneyDashboardSummaryDto summary = new MoneyDashboardSummaryDto();
        summary.setHospitalName(tenant.getHospitalName());
        summary.setPeriod(range.periodName);
        summary.setStartDate(start != null ? start.format(DD_MM_YYYY) : "Lifetime");
        summary.setEndDate(end != null ? end.format(DD_MM_YYYY) : "Present");

        // 1. Fetch all tenant records
        List<OpRegistration> allOps = opRegistrationRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<IpAdmission> allIps = ipAdmissionRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<PharmacyBill> allPhars = pharmacyBillRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<LabOrder> allLabs = labOrderRepository.findByTenantIdOrderByCreatedAtDesc(tenantId);
        List<Medicine> allMeds = medicineRepository.findByTenantIdOrderByNameAsc(tenantId);
        List<HospitalExpense> allExpenses = hospitalExpenseRepository.findByTenantIdOrderByExpenseDateDescCreatedAtDesc(tenantId);
        List<Doctor> allDoctors = doctorRepository.findByTenantId(tenantId);

        // Filter by selected period
        List<OpRegistration> periodOps = allOps.stream()
                .filter(op -> isDateInRange(getOpDate(op), start, end))
                .collect(Collectors.toList());

        List<IpAdmission> periodIps = allIps.stream()
                .filter(ip -> isDateInRange(getIpDate(ip), start, end))
                .collect(Collectors.toList());

        List<PharmacyBill> periodPhars = allPhars.stream()
                .filter(p -> isDateInRange(getPharDate(p), start, end))
                .collect(Collectors.toList());

        List<LabOrder> periodLabs = allLabs.stream()
                .filter(l -> isDateInRange(getLabDate(l), start, end))
                .collect(Collectors.toList());

        List<Medicine> periodMeds = allMeds.stream()
                .filter(m -> isDateInRange(getMedPurchaseDate(m), start, end))
                .collect(Collectors.toList());

        List<HospitalExpense> periodExpenses = allExpenses.stream()
                .filter(e -> isDateInRange(e.getExpenseDate(), start, end) && !"CANCELLED".equalsIgnoreCase(e.getStatus()))
                .collect(Collectors.toList());

        // 2. Revenue Sources Breakdown
        RevenueSourcesDto sources = new RevenueSourcesDto();

        // OP Stats
        BigDecimal opBilled = BigDecimal.ZERO;
        BigDecimal opPaid = BigDecimal.ZERO;
        for (OpRegistration op : periodOps) {
            BigDecimal fee = op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO;
            opBilled = opBilled.add(fee);
            if ("PAID".equalsIgnoreCase(op.getPaymentStatus())) {
                opPaid = opPaid.add(fee);
            } else if (op.getPaidAmount() != null) {
                opPaid = opPaid.add(op.getPaidAmount().min(fee));
            }
        }
        BigDecimal opOutstanding = opBilled.subtract(opPaid).max(BigDecimal.ZERO);

        // IP Stats
        BigDecimal ipBilled = BigDecimal.ZERO;
        BigDecimal ipPaid = BigDecimal.ZERO;
        for (IpAdmission ip : periodIps) {
            BigDecimal chg = getIpTotalCharges(ip);
            ipBilled = ipBilled.add(chg);
            if ("PAID".equalsIgnoreCase(ip.getPaymentStatus())) {
                ipPaid = ipPaid.add(chg);
            } else if (ip.getPaidAmount() != null) {
                ipPaid = ipPaid.add(ip.getPaidAmount().min(chg));
            } else if (ip.getDepositAmount() != null) {
                ipPaid = ipPaid.add(ip.getDepositAmount().min(chg));
            }
        }
        BigDecimal ipOutstanding = ipBilled.subtract(ipPaid).max(BigDecimal.ZERO);

        // Pharmacy Stats
        BigDecimal pharBilled = BigDecimal.ZERO;
        BigDecimal pharPaid = BigDecimal.ZERO;
        for (PharmacyBill p : periodPhars) {
            BigDecimal tot = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal pd = p.getPaidAmount() != null ? p.getPaidAmount() : BigDecimal.ZERO;
            pharBilled = pharBilled.add(tot);
            pharPaid = pharPaid.add(pd);
        }
        BigDecimal pharOutstanding = pharBilled.subtract(pharPaid).max(BigDecimal.ZERO);

        // Laboratory Stats
        BigDecimal labBilled = BigDecimal.ZERO;
        BigDecimal labPaid = BigDecimal.ZERO;
        for (LabOrder l : periodLabs) {
            BigDecimal tot = l.getTotalAmount() != null && l.getTotalAmount().compareTo(BigDecimal.ZERO) > 0 ? l.getTotalAmount() : (l.getTestPrice() != null ? l.getTestPrice() : BigDecimal.ZERO);
            BigDecimal pd = l.getPaidAmount() != null ? l.getPaidAmount() : BigDecimal.ZERO;
            labBilled = labBilled.add(tot);
            labPaid = labPaid.add(pd);
        }
        BigDecimal labOutstanding = labBilled.subtract(labPaid).max(BigDecimal.ZERO);

        BigDecimal totalRevBilled = opBilled.add(ipBilled).add(pharBilled).add(labBilled);
        BigDecimal totalRevCollected = opPaid.add(ipPaid).add(pharPaid).add(labPaid);
        BigDecimal totalRevOutstanding = opOutstanding.add(ipOutstanding).add(pharOutstanding).add(labOutstanding);

        double opPct = calculatePercentage(opBilled, totalRevBilled);
        double ipPct = calculatePercentage(ipBilled, totalRevBilled);
        double pharPct = calculatePercentage(pharBilled, totalRevBilled);
        double labPct = calculatePercentage(labBilled, totalRevBilled);

        sources.setOp(new RevenueSourcesDto.SourceStat("OP Consultation", opBilled, opPaid, opOutstanding, periodOps.size(), opPct));
        sources.setIp(new RevenueSourcesDto.SourceStat("Inpatient Care", ipBilled, ipPaid, ipOutstanding, periodIps.size(), ipPct));
        sources.setPharmacy(new RevenueSourcesDto.SourceStat("Pharmacy Sales", pharBilled, pharPaid, pharOutstanding, periodPhars.size(), pharPct));
        sources.setLaboratory(new RevenueSourcesDto.SourceStat("Laboratory Tests", labBilled, labPaid, labOutstanding, periodLabs.size(), labPct));
        sources.setTotalBilled(totalRevBilled);
        sources.setTotalCollected(totalRevCollected);
        sources.setTotalOutstanding(totalRevOutstanding);

        // 3. Doctor-Wise Revenue Breakdown
        Map<String, DoctorRevenueDto> docMap = new LinkedHashMap<>();
        for (Doctor d : allDoctors) {
            DoctorRevenueDto dto = new DoctorRevenueDto();
            dto.setId(d.getId());
            dto.setDoctorName(d.getName());
            dto.setDepartment(d.getDepartment());
            dto.setSpecialization(d.getSpecialization());
            docMap.put(d.getName().trim().toLowerCase(), dto);
        }

        // OP doctor revenue
        for (OpRegistration op : periodOps) {
            if (op.getDoctorName() != null && !op.getDoctorName().trim().isEmpty()) {
                String key = op.getDoctorName().trim().toLowerCase();
                DoctorRevenueDto dto = docMap.computeIfAbsent(key, k -> {
                    DoctorRevenueDto d = new DoctorRevenueDto();
                    d.setDoctorName(op.getDoctorName().trim());
                    d.setDepartment(op.getDepartment() != null ? op.getDepartment() : "General");
                    return d;
                });
                BigDecimal fee = op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO;
                dto.setOpCount(dto.getOpCount() + 1);
                dto.setOpRevenue(dto.getOpRevenue().add(fee));
                dto.setTotalRevenueBilled(dto.getTotalRevenueBilled().add(fee));
                if ("PAID".equalsIgnoreCase(op.getPaymentStatus())) {
                    dto.setTotalRevenueCollected(dto.getTotalRevenueCollected().add(fee));
                } else if (op.getPaidAmount() != null) {
                    dto.setTotalRevenueCollected(dto.getTotalRevenueCollected().add(op.getPaidAmount().min(fee)));
                }
            }
        }

        // IP doctor revenue
        for (IpAdmission ip : periodIps) {
            if (ip.getDoctorName() != null && !ip.getDoctorName().trim().isEmpty()) {
                String key = ip.getDoctorName().trim().toLowerCase();
                DoctorRevenueDto dto = docMap.computeIfAbsent(key, k -> {
                    DoctorRevenueDto d = new DoctorRevenueDto();
                    d.setDoctorName(ip.getDoctorName().trim());
                    d.setDepartment(ip.getDepartment() != null ? ip.getDepartment() : "General Medicine");
                    return d;
                });
                BigDecimal chg = getIpTotalCharges(ip);
                dto.setIpCount(dto.getIpCount() + 1);
                dto.setIpRevenue(dto.getIpRevenue().add(chg));
                dto.setTotalRevenueBilled(dto.getTotalRevenueBilled().add(chg));
                if ("PAID".equalsIgnoreCase(ip.getPaymentStatus())) {
                    dto.setTotalRevenueCollected(dto.getTotalRevenueCollected().add(chg));
                } else if (ip.getPaidAmount() != null) {
                    dto.setTotalRevenueCollected(dto.getTotalRevenueCollected().add(ip.getPaidAmount().min(chg)));
                } else if (ip.getDepositAmount() != null) {
                    dto.setTotalRevenueCollected(dto.getTotalRevenueCollected().add(ip.getDepositAmount().min(chg)));
                }
            }
        }

        // Pharmacy prescribed by doctor (if explicitly tagged)
        for (PharmacyBill p : periodPhars) {
            if (p.getDoctorName() != null && !p.getDoctorName().trim().isEmpty()) {
                String key = p.getDoctorName().trim().toLowerCase();
                DoctorRevenueDto dto = docMap.get(key);
                if (dto != null) {
                    BigDecimal tot = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;
                    dto.setPharmacyCount(dto.getPharmacyCount() + 1);
                    dto.setPharmacyRevenue(dto.getPharmacyRevenue().add(tot));
                    dto.setTotalRevenueBilled(dto.getTotalRevenueBilled().add(tot));
                    if (p.getPaidAmount() != null) {
                        dto.setTotalRevenueCollected(dto.getTotalRevenueCollected().add(p.getPaidAmount()));
                    }
                }
            }
        }

        // Lab ordered by doctor (if explicitly tagged)
        for (LabOrder l : periodLabs) {
            if (l.getDoctorName() != null && !l.getDoctorName().trim().isEmpty()) {
                String key = l.getDoctorName().trim().toLowerCase();
                DoctorRevenueDto dto = docMap.get(key);
                if (dto != null) {
                    BigDecimal tot = l.getTotalAmount() != null && l.getTotalAmount().compareTo(BigDecimal.ZERO) > 0 ? l.getTotalAmount() : (l.getTestPrice() != null ? l.getTestPrice() : BigDecimal.ZERO);
                    dto.setLabCount(dto.getLabCount() + 1);
                    dto.setLabRevenue(dto.getLabRevenue().add(tot));
                    dto.setTotalRevenueBilled(dto.getTotalRevenueBilled().add(tot));
                    if (l.getPaidAmount() != null) {
                        dto.setTotalRevenueCollected(dto.getTotalRevenueCollected().add(l.getPaidAmount()));
                    }
                }
            }
        }

        BigDecimal doctorTotalBilled = BigDecimal.ZERO;
        BigDecimal doctorTotalCollected = BigDecimal.ZERO;
        List<DoctorRevenueDto> docList = new ArrayList<>(docMap.values());
        for (DoctorRevenueDto d : docList) {
            d.setOutstanding(d.getTotalRevenueBilled().subtract(d.getTotalRevenueCollected()).max(BigDecimal.ZERO));
            doctorTotalBilled = doctorTotalBilled.add(d.getTotalRevenueBilled());
            doctorTotalCollected = doctorTotalCollected.add(d.getTotalRevenueCollected());
        }
        for (DoctorRevenueDto d : docList) {
            d.setPercentage(calculatePercentage(d.getTotalRevenueBilled(), doctorTotalBilled));
        }
        // Default sort: highest revenue first
        docList.sort((a, b) -> b.getTotalRevenueBilled().compareTo(a.getTotalRevenueBilled()));
        summary.setDoctorRevenueList(docList);
        sources.setDoctors(new RevenueSourcesDto.SourceStat("Doctor-Linked", doctorTotalBilled, doctorTotalCollected, doctorTotalBilled.subtract(doctorTotalCollected).max(BigDecimal.ZERO), docList.size(), calculatePercentage(doctorTotalBilled, totalRevBilled)));

        // 4. IP Room / Ward Revenue Breakdown (Standard & Dynamic Hospital Categories)
        IpRevenueBreakdownDto ipBreakdown = new IpRevenueBreakdownDto();
        ipBreakdown.setTotalBilled(ipBilled);
        ipBreakdown.setTotalCollected(ipPaid);
        ipBreakdown.setTotalOutstanding(ipOutstanding);
        ipBreakdown.setTotalAdmissions(periodIps.size());

        List<Room> allRooms = roomRepository.findByTenantIdOrderByRoomNumberAsc(tenantId);
        List<Bed> allBeds = bedRepository.findByTenantIdOrderByBedNumberAsc(tenantId);

        // Identify custom room types configured in hospital that don't match the 7 standard categories
        Set<String> customConfiguredTypes = new LinkedHashSet<>();
        for (Room r : allRooms) {
            if (r.getRoomType() != null && !r.getRoomType().trim().isEmpty()) {
                String standardMatch = resolveWardCategory(r.getRoomType(), null, null);
                if ("Other".equals(standardMatch)) {
                    customConfiguredTypes.add(r.getRoomType().trim().toUpperCase().replace("_", " "));
                }
            }
        }

        // Initialize wardMap with standard categories in requested order
        Map<String, WardStatAccumulator> wardMap = new LinkedHashMap<>();
        for (String std : STANDARD_WARD_CATEGORIES) {
            if (!"Other".equals(std)) {
                wardMap.put(std, new WardStatAccumulator());
            }
        }
        // Dynamically add hospital-specific custom room types
        for (String custom : customConfiguredTypes) {
            wardMap.put(toTitleCase(custom), new WardStatAccumulator());
        }
        // Always place "Other" at the end to catch miscellaneous / unmapped room types
        wardMap.put("Other", new WardStatAccumulator());

        // Count total beds and currently occupied beds per category from real master data
        for (Bed b : allBeds) {
            String rType = (b.getRoom() != null) ? b.getRoom().getRoomType() : null;
            String cat = resolveWardCategory(rType, null, customConfiguredTypes);
            WardStatAccumulator acc = wardMap.computeIfAbsent(cat, k -> new WardStatAccumulator());
            acc.totalBeds++;
            if ("OCCUPIED".equalsIgnoreCase(b.getStatus()) || b.getCurrentAdmission() != null) {
                acc.occupiedCount++;
            }
        }

        // Cross-verify with active admitted patient records to ensure occupied count is completely accurate
        Map<String, Long> activeAdmCounts = new HashMap<>();
        for (IpAdmission ip : allIps) {
            if ("ADMITTED".equalsIgnoreCase(ip.getStatus())) {
                String cat = resolveWardCategory(ip.getRoom() != null ? ip.getRoom().getRoomType() : null, ip.getWardName(), customConfiguredTypes);
                activeAdmCounts.put(cat, activeAdmCounts.getOrDefault(cat, 0L) + 1L);
            }
        }
        for (Map.Entry<String, Long> e : activeAdmCounts.entrySet()) {
            WardStatAccumulator acc = wardMap.computeIfAbsent(e.getKey(), k -> new WardStatAccumulator());
            acc.occupiedCount = Math.max(acc.occupiedCount, e.getValue());
        }

        // Process period admissions for revenue calculations and bed-level details
        List<IpRevenueBreakdownDto.BedRevenueDto> bedList = new ArrayList<>();
        for (IpAdmission ip : periodIps) {
            String wardCategory = resolveWardCategory(ip.getRoom() != null ? ip.getRoom().getRoomType() : null, ip.getWardName(), customConfiguredTypes);
            BigDecimal chg = getIpTotalCharges(ip);
            BigDecimal paid = "PAID".equalsIgnoreCase(ip.getPaymentStatus()) ? chg : (ip.getDepositAmount() != null ? ip.getDepositAmount().min(chg) : BigDecimal.ZERO);

            WardStatAccumulator acc = wardMap.computeIfAbsent(wardCategory, k -> new WardStatAccumulator());
            acc.billed = acc.billed.add(chg);
            acc.collected = acc.collected.add(paid);
            acc.count++;
            acc.transactionCount++;

            // Bed level item
            IpRevenueBreakdownDto.BedRevenueDto bedItem = new IpRevenueBreakdownDto.BedRevenueDto();
            bedItem.setIpId(ip.getIpId());
            bedItem.setPatientName(ip.getPatient() != null ? ip.getPatient().getFullName() : "Patient");
            bedItem.setRoomNumber(ip.getRoomNumber() != null ? ip.getRoomNumber() : (ip.getRoom() != null ? ip.getRoom().getRoomNumber() : "-"));
            bedItem.setBedNumber(ip.getBedNumber() != null ? ip.getBedNumber() : (ip.getBed() != null ? ip.getBed().getBedNumber() : "-"));
            bedItem.setWardType(wardCategory);
            bedItem.setDoctorName(ip.getDoctorName() != null ? ip.getDoctorName() : "-");
            bedItem.setAdmissionDate(ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(DD_MM_YYYY) : "-");
            bedItem.setRoomPrice(ip.getRoomPrice() != null ? ip.getRoomPrice() : BigDecimal.ZERO);
            bedItem.setBedPrice(ip.getBedPrice() != null ? ip.getBedPrice() : BigDecimal.ZERO);
            bedItem.setTotalCharges(chg);
            bedItem.setCollected(paid);
            bedItem.setPaymentStatus(ip.getPaymentStatus() != null ? ip.getPaymentStatus() : "PAID");
            bedList.add(bedItem);
        }

        List<IpRevenueBreakdownDto.WardRevenueDto> wardList = new ArrayList<>();
        for (Map.Entry<String, WardStatAccumulator> e : wardMap.entrySet()) {
            WardStatAccumulator a = e.getValue();
            BigDecimal out = a.billed.subtract(a.collected).max(BigDecimal.ZERO);
            double pct = calculatePercentage(a.billed, ipBilled);
            wardList.add(new IpRevenueBreakdownDto.WardRevenueDto(
                    e.getKey(),
                    a.billed,
                    a.collected,
                    out,
                    a.count,
                    a.transactionCount,
                    a.occupiedCount,
                    a.totalBeds,
                    pct
            ));
        }
        ipBreakdown.setWardBreakdown(wardList);
        ipBreakdown.setBedBreakdown(bedList);
        summary.setIpRevenueBreakdown(ipBreakdown);

        // 5. Expense Breakdown & Supplier / Agency Purchases
        ExpenseBreakdownDto expenseBreakdown = new ExpenseBreakdownDto();
        BigDecimal totalPharPurchases = BigDecimal.ZERO;
        List<PharmacyPurchaseDto> pharPurchaseDtos = new ArrayList<>();

        for (Medicine m : periodMeds) {
            BigDecimal cost = m.getCostPrice() != null ? m.getCostPrice() : BigDecimal.ZERO;
            Integer qty = m.getStockQuantity() != null ? m.getStockQuantity() : 0;
            if (cost.compareTo(BigDecimal.ZERO) > 0 && qty > 0) {
                BigDecimal purchaseTotal = cost.multiply(BigDecimal.valueOf(qty));
                totalPharPurchases = totalPharPurchases.add(purchaseTotal);

                PharmacyPurchaseDto pDto = new PharmacyPurchaseDto();
                pDto.setId(m.getId());
                pDto.setSupplier(m.getSupplier() != null && !m.getSupplier().trim().isEmpty() ? m.getSupplier() :
                        (m.getManufacturer() != null && !m.getManufacturer().trim().isEmpty() ? m.getManufacturer() : "Direct Agency"));
                pDto.setPurchaseDate(m.getPurchaseDate() != null ? m.getPurchaseDate().format(DD_MM_YYYY) : (m.getCreatedAt() != null ? m.getCreatedAt().format(DD_MM_YYYY) : "-"));
                pDto.setMedicineName(m.getName());
                pDto.setGenericName(m.getGenericName());
                pDto.setBatchNumber(m.getBatchNumber());
                pDto.setQuantity(qty);
                pDto.setCostPrice(cost);
                pDto.setPurchaseAmount(purchaseTotal);
                pDto.setManufacturer(m.getManufacturer());
                pharPurchaseDtos.add(pDto);
            }
        }
        pharPurchaseDtos.sort((a, b) -> b.getPurchaseAmount().compareTo(a.getPurchaseAmount()));
        expenseBreakdown.setPharmacyPurchases(pharPurchaseDtos);
        expenseBreakdown.setPharmacyPurchasesTotal(totalPharPurchases);

        // Operational Expenses
        BigDecimal totalOperational = BigDecimal.ZERO;
        Map<String, ExpenseStatAccumulator> expenseCategoryMap = new LinkedHashMap<>();
        List<ExpenseBreakdownDto.HospitalExpenseItemDto> opExpList = new ArrayList<>();

        for (HospitalExpense exp : periodExpenses) {
            BigDecimal amt = exp.getAmount() != null ? exp.getAmount() : BigDecimal.ZERO;
            totalOperational = totalOperational.add(amt);

            String cat = exp.getCategory() != null ? exp.getCategory().trim().toUpperCase() : "GENERAL EXPENSES";
            ExpenseStatAccumulator acc = expenseCategoryMap.computeIfAbsent(cat, k -> new ExpenseStatAccumulator());
            acc.amount = acc.amount.add(amt);
            acc.count++;

            ExpenseBreakdownDto.HospitalExpenseItemDto item = new ExpenseBreakdownDto.HospitalExpenseItemDto();
            item.setId(exp.getId());
            item.setExpenseNumber(exp.getExpenseNumber());
            item.setCategory(exp.getCategory());
            item.setTitle(exp.getTitle());
            item.setPayeeVendor(exp.getPayeeVendor());
            item.setAmount(amt);
            item.setPaymentMethod(exp.getPaymentMethod());
            item.setExpenseDate(exp.getExpenseDate() != null ? exp.getExpenseDate().format(DD_MM_YYYY) : "-");
            item.setReceiptNumber(exp.getReceiptNumber());
            item.setStatus(exp.getStatus());
            item.setNotes(exp.getNotes());
            item.setCreatedByName(exp.getCreatedByName());
            opExpList.add(item);
        }
        expenseBreakdown.setOperationalExpenses(opExpList);
        expenseBreakdown.setOperationalExpensesTotal(totalOperational);

        BigDecimal overallTotalExpenses = totalPharPurchases.add(totalOperational);
        expenseBreakdown.setTotalExpenses(overallTotalExpenses);

        // Combine category items
        List<ExpenseBreakdownDto.ExpenseCategoryItemDto> catItems = new ArrayList<>();
        if (totalPharPurchases.compareTo(BigDecimal.ZERO) > 0) {
            double pharExpPct = calculatePercentage(totalPharPurchases, overallTotalExpenses);
            catItems.add(new ExpenseBreakdownDto.ExpenseCategoryItemDto("PHARMACY PURCHASES", totalPharPurchases, pharPurchaseDtos.size(), pharExpPct));
        }
        for (Map.Entry<String, ExpenseStatAccumulator> e : expenseCategoryMap.entrySet()) {
            double catPct = calculatePercentage(e.getValue().amount, overallTotalExpenses);
            catItems.add(new ExpenseBreakdownDto.ExpenseCategoryItemDto(e.getKey(), e.getValue().amount, e.getValue().count, catPct));
        }
        catItems.sort((a, b) -> b.getAmount().compareTo(a.getAmount()));
        expenseBreakdown.setCategories(catItems);
        summary.setExpenseBreakdown(expenseBreakdown);

        // 6. Main KPI Calculation
        summary.setRevenueSources(sources);
        summary.setTotalRevenueBilled(totalRevBilled);
        summary.setTotalRevenueCollected(totalRevCollected);
        summary.setTotalExpenses(overallTotalExpenses);
        summary.setNetAmount(totalRevBilled.subtract(overallTotalExpenses));
        summary.setNetCollected(totalRevCollected.subtract(overallTotalExpenses));
        summary.setTotalOutstanding(totalRevOutstanding);

        // 7. Today's Metrics
        LocalDate today = LocalDate.now();
        calculateTodayMetrics(summary, tenantId, allOps, allIps, allPhars, allLabs, allMeds, allExpenses, today);

        // 8. Unified Transaction History
        List<FinancialTransactionDto> transactions = buildTransactionHistory(periodOps, periodIps, periodPhars, periodLabs, periodMeds, periodExpenses);
        summary.setRecentTransactions(transactions);

        // 9. Fetch Central Bills & Payment Records for accurate invoice/tax linking
        List<CentralBill> allCentralBills = centralBillRepository != null ? centralBillRepository.findByTenantIdOrderByCreatedAtDesc(tenantId) : Collections.emptyList();
        List<PaymentRecord> allPaymentRecords = paymentRecordRepository != null ? paymentRecordRepository.findByTenantIdOrderByCreatedAtDesc(tenantId) : Collections.emptyList();

        Map<String, CentralBill> centralBillsByOpId = new HashMap<>();
        Map<String, CentralBill> centralBillsByIpId = new HashMap<>();
        for (CentralBill cb : allCentralBills) {
            if (cb.getOpId() != null && !cb.getOpId().trim().isEmpty()) {
                centralBillsByOpId.putIfAbsent(cb.getOpId().trim(), cb);
            }
            if (cb.getIpId() != null && !cb.getIpId().trim().isEmpty()) {
                centralBillsByIpId.putIfAbsent(cb.getIpId().trim(), cb);
            }
        }

        Map<String, PaymentRecord> paymentsByOpId = new HashMap<>();
        Map<String, PaymentRecord> paymentsByIpId = new HashMap<>();
        for (PaymentRecord pr : allPaymentRecords) {
            if (pr.getOpId() != null && !pr.getOpId().trim().isEmpty()) {
                paymentsByOpId.putIfAbsent(pr.getOpId().trim(), pr);
            }
            if (pr.getIpId() != null && !pr.getIpId().trim().isEmpty()) {
                paymentsByIpId.putIfAbsent(pr.getIpId().trim(), pr);
            }
        }

        // 10. Dedicated Independent Financial Sections (OP, IP, Laboratory, Pharmacy, Doctors)
        summary.setOpFinancials(buildOpFinancialSection(periodOps, centralBillsByOpId, paymentsByOpId));
        summary.setIpFinancials(buildIpFinancialSection(periodIps, customConfiguredTypes, centralBillsByIpId, paymentsByIpId));
        summary.setLabFinancials(buildLabFinancialSection(periodLabs));
        summary.setPharmacyFinancials(buildPharmacyFinancialSection(periodPhars));
        summary.setDoctorFinancials(buildDoctorFinancialSection(docList, totalRevBilled, totalRevCollected));

        return summary;
    }

    private void calculateTodayMetrics(MoneyDashboardSummaryDto summary,
                                       Long tenantId,
                                       List<OpRegistration> allOps,
                                       List<IpAdmission> allIps,
                                       List<PharmacyBill> allPhars,
                                       List<LabOrder> allLabs,
                                       List<Medicine> allMeds,
                                       List<HospitalExpense> allExpenses,
                                       LocalDate today) {
        BigDecimal todayBilled = BigDecimal.ZERO;
        BigDecimal todayCollected = BigDecimal.ZERO;

        for (OpRegistration op : allOps) {
            if (today.equals(getOpDate(op))) {
                BigDecimal fee = op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO;
                todayBilled = todayBilled.add(fee);
            }
        }
        for (IpAdmission ip : allIps) {
            if (today.equals(getIpDate(ip))) {
                BigDecimal chg = getIpTotalCharges(ip);
                todayBilled = todayBilled.add(chg);
            }
        }
        for (PharmacyBill p : allPhars) {
            if (today.equals(getPharDate(p))) {
                BigDecimal tot = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;
                todayBilled = todayBilled.add(tot);
            }
        }
        for (LabOrder l : allLabs) {
            if (today.equals(getLabDate(l))) {
                BigDecimal tot = l.getTotalAmount() != null && l.getTotalAmount().compareTo(BigDecimal.ZERO) > 0 ? l.getTotalAmount() : (l.getTestPrice() != null ? l.getTestPrice() : BigDecimal.ZERO);
                todayBilled = todayBilled.add(tot);
            }
        }

        if (paymentRecordRepository != null && tenantId != null) {
            BigDecimal paymentsToday = paymentRecordRepository.sumAmountByTenantIdAndPaymentDate(tenantId, today);
            if (paymentsToday != null) {
                todayCollected = paymentsToday;
            }
        }

        BigDecimal todayExpenses = BigDecimal.ZERO;
        for (Medicine m : allMeds) {
            if (today.equals(getMedPurchaseDate(m))) {
                BigDecimal cost = m.getCostPrice() != null ? m.getCostPrice() : BigDecimal.ZERO;
                Integer qty = m.getStockQuantity() != null ? m.getStockQuantity() : 0;
                todayExpenses = todayExpenses.add(cost.multiply(BigDecimal.valueOf(qty)));
            }
        }
        for (HospitalExpense e : allExpenses) {
            if (today.equals(e.getExpenseDate()) && !"CANCELLED".equalsIgnoreCase(e.getStatus())) {
                todayExpenses = todayExpenses.add(e.getAmount() != null ? e.getAmount() : BigDecimal.ZERO);
            }
        }

        summary.setTodayRevenue(todayBilled);
        summary.setTodayExpenses(todayExpenses);
        summary.setTodayNet(todayBilled.subtract(todayExpenses));
        summary.setTodayOutstanding(todayBilled.subtract(todayCollected).max(BigDecimal.ZERO));
    }

    private List<FinancialTransactionDto> buildTransactionHistory(
            List<OpRegistration> ops,
            List<IpAdmission> ips,
            List<PharmacyBill> phars,
            List<LabOrder> labs,
            List<Medicine> meds,
            List<HospitalExpense> expenses) {

        List<FinancialTransactionDto> list = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        // OP Transactions
        for (OpRegistration op : ops) {
            String time = op.getRegistrationTime() != null ? op.getRegistrationTime() :
                    (op.getCreatedAt() != null ? op.getCreatedAt().format(timeFmt) : "");
            String date = op.getVisitDate() != null ? op.getVisitDate().format(DD_MM_YYYY) : "";
            list.add(new FinancialTransactionDto(
                    "OP-" + op.getId(),
                    "REVENUE",
                    "OP Consultation",
                    "OP",
                    op.getOpId(),
                    op.getPatient() != null ? op.getPatient().getFullName() : "-",
                    "-",
                    op.getDoctorName() != null ? op.getDoctorName() : "-",
                    date,
                    time,
                    op.getConsultationFee(),
                    op.getPaymentStatus() != null ? op.getPaymentStatus() : "PAID",
                    op.getPaymentMethod() != null ? op.getPaymentMethod() : "CASH"
            ));
        }

        // IP Transactions
        for (IpAdmission ip : ips) {
            String time = ip.getAdmissionTime() != null ? ip.getAdmissionTime() :
                    (ip.getCreatedAt() != null ? ip.getCreatedAt().format(timeFmt) : "");
            String date = ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(DD_MM_YYYY) : "";
            String ward = resolveWardCategory(ip.getRoom() != null ? ip.getRoom().getRoomType() : null, ip.getWardName(), null);
            list.add(new FinancialTransactionDto(
                    "IP-" + ip.getId(),
                    "REVENUE",
                    "Inpatient Care (" + ward + ")",
                    "IP",
                    ip.getIpId(),
                    ip.getPatient() != null ? ip.getPatient().getFullName() : "-",
                    "-",
                    ip.getDoctorName() != null ? ip.getDoctorName() : "-",
                    date,
                    time,
                    getIpTotalCharges(ip),
                    ip.getPaymentStatus() != null ? ip.getPaymentStatus() : "PAID",
                    ip.getPaymentMethod() != null ? ip.getPaymentMethod() : "CASH"
            ));
        }

        // Pharmacy Transactions
        for (PharmacyBill p : phars) {
            String time = p.getBillTime() != null ? p.getBillTime() :
                    (p.getCreatedAt() != null ? p.getCreatedAt().format(timeFmt) : "");
            String date = p.getBillDate() != null ? p.getBillDate().format(DD_MM_YYYY) : "";
            list.add(new FinancialTransactionDto(
                    "PHAR-" + p.getId(),
                    "REVENUE",
                    "Pharmacy Sale",
                    "PHARMACY",
                    p.getBillNumber(),
                    p.getPatientName() != null ? p.getPatientName() : (p.getPatient() != null ? p.getPatient().getFullName() : "-"),
                    "-",
                    p.getDoctorName() != null ? p.getDoctorName() : "-",
                    date,
                    time,
                    p.getTotalAmount(),
                    p.getPaymentStatus() != null ? p.getPaymentStatus() : "PAID",
                    p.getPaymentMethod() != null ? p.getPaymentMethod() : "CASH"
            ));
        }

        // Laboratory Transactions
        for (LabOrder l : labs) {
            String time = l.getCreatedAt() != null ? l.getCreatedAt().format(timeFmt) : "";
            String date = l.getOrderDate() != null ? l.getOrderDate().format(DD_MM_YYYY) : "";
            BigDecimal amt = l.getTotalAmount() != null && l.getTotalAmount().compareTo(BigDecimal.ZERO) > 0 ? l.getTotalAmount() : (l.getTestPrice() != null ? l.getTestPrice() : BigDecimal.ZERO);
            list.add(new FinancialTransactionDto(
                    "LAB-" + l.getId(),
                    "REVENUE",
                    "Lab Diagnostics (" + (l.getCategory() != null ? l.getCategory() : "GENERAL") + ")",
                    "LABORATORY",
                    l.getOrderNumber(),
                    l.getPatientName() != null ? l.getPatientName() : (l.getPatient() != null ? l.getPatient().getFullName() : "-"),
                    "-",
                    l.getDoctorName() != null ? l.getDoctorName() : "-",
                    date,
                    time,
                    amt,
                    l.getPaymentStatus() != null ? l.getPaymentStatus() : "PAID",
                    l.getPaymentMethod() != null ? l.getPaymentMethod() : "CASH"
            ));
        }

        // Pharmacy Purchase Expenses
        for (Medicine m : meds) {
            BigDecimal cost = m.getCostPrice() != null ? m.getCostPrice() : BigDecimal.ZERO;
            Integer qty = m.getStockQuantity() != null ? m.getStockQuantity() : 0;
            if (cost.compareTo(BigDecimal.ZERO) > 0 && qty > 0) {
                String supplier = m.getSupplier() != null && !m.getSupplier().trim().isEmpty() ? m.getSupplier() :
                        (m.getManufacturer() != null && !m.getManufacturer().trim().isEmpty() ? m.getManufacturer() : "Direct Agency");
                String date = m.getPurchaseDate() != null ? m.getPurchaseDate().format(DD_MM_YYYY) :
                        (m.getCreatedAt() != null ? m.getCreatedAt().format(DD_MM_YYYY) : "");
                list.add(new FinancialTransactionDto(
                        "MED-PUR-" + m.getId(),
                        "EXPENSE",
                        "PHARMACY PURCHASES",
                        "PHARMACY_PURCHASE",
                        m.getBatchNumber() != null ? m.getBatchNumber() : m.getMedicineCode(),
                        "-",
                        supplier,
                        "-",
                        date,
                        "",
                        cost.multiply(BigDecimal.valueOf(qty)),
                        "PAID",
                        "INVOICE"
                ));
            }
        }

        // Operational Expenses
        for (HospitalExpense exp : expenses) {
            String time = exp.getCreatedAt() != null ? exp.getCreatedAt().format(timeFmt) : "";
            String date = exp.getExpenseDate() != null ? exp.getExpenseDate().format(DD_MM_YYYY) : "";
            list.add(new FinancialTransactionDto(
                    "EXP-" + exp.getId(),
                    "EXPENSE",
                    exp.getCategory() != null ? exp.getCategory() : "GENERAL EXPENSES",
                    "OPERATIONAL",
                    exp.getExpenseNumber(),
                    "-",
                    exp.getPayeeVendor() != null ? exp.getPayeeVendor() : "-",
                    "-",
                    date,
                    time,
                    exp.getAmount(),
                    exp.getStatus() != null ? exp.getStatus() : "PAID",
                    exp.getPaymentMethod() != null ? exp.getPaymentMethod() : "BANK_TRANSFER"
            ));
        }

        // Sort: newest first
        list.sort((a, b) -> {
            int dateCmp = (b.getDate() != null ? b.getDate() : "").compareTo(a.getDate() != null ? a.getDate() : "");
            if (dateCmp != 0) return dateCmp;
            return (b.getId() != null ? b.getId() : "").compareTo(a.getId() != null ? a.getId() : "");
        });

        return list;
    }

    @Transactional
    public HospitalExpense createExpense(Long tenantId, CreateExpenseRequest request, Long userId, String userEmail, String ipAddress) {
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(() -> new IllegalArgumentException("Tenant not found with ID: " + tenantId));

        String expNum = generateExpenseNumber(tenantId);
        LocalDate expDate = parseDate(request.getExpenseDate());

        HospitalExpense expense = new HospitalExpense(
                tenant,
                expNum,
                request.getCategory() != null ? request.getCategory().trim().toUpperCase() : "GENERAL EXPENSES",
                request.getTitle() != null ? request.getTitle().trim() : "Operational Expense",
                request.getPayeeVendor() != null ? request.getPayeeVendor().trim() : "",
                request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO,
                request.getPaymentMethod() != null ? request.getPaymentMethod() : "BANK_TRANSFER",
                expDate,
                request.getReceiptNumber(),
                request.getStatus() != null ? request.getStatus() : "PAID",
                request.getNotes(),
                userEmail
        );

        HospitalExpense saved = hospitalExpenseRepository.save(expense);

        if (auditService != null) {
            auditService.log(userId, userEmail, "ADMIN", tenantId, "EXPENSE_CREATED",
                    "Created expense " + expNum + " for ₹" + saved.getAmount() + " (" + saved.getCategory() + ") - " + saved.getTitle(),
                    ipAddress, "SUCCESS");
        }

        return saved;
    }

    @Transactional
    public void deleteExpense(Long tenantId, Long expenseId, Long userId, String userEmail, String ipAddress) {
        HospitalExpense exp = hospitalExpenseRepository.findById(expenseId)
                .orElseThrow(() -> new IllegalArgumentException("Expense not found with ID: " + expenseId));

        if (!exp.getTenant().getId().equals(tenantId)) {
            throw new IllegalArgumentException("Access denied: Tenant mismatch");
        }

        exp.setStatus("CANCELLED");
        exp.setUpdatedAt(java.time.LocalDateTime.now());
        hospitalExpenseRepository.save(exp);

        if (auditService != null) {
            auditService.log(userId, userEmail, "ADMIN", tenantId, "EXPENSE_CANCELLED",
                    "Cancelled expense " + exp.getExpenseNumber() + " for ₹" + exp.getAmount() + " - " + exp.getTitle(),
                    ipAddress, "SUCCESS");
        }
    }

    private String generateExpenseNumber(Long tenantId) {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        long count = hospitalExpenseRepository.countByTenantId(tenantId) + 1;
        return String.format("EXP-%s-%04d", datePart, count);
    }

    private BigDecimal getIpTotalCharges(IpAdmission ip) {
        if (ip.getTotalCharges() != null && ip.getTotalCharges().compareTo(BigDecimal.ZERO) > 0) {
            return ip.getTotalCharges();
        }
        BigDecimal base = (ip.getRoomPrice() != null ? ip.getRoomPrice() : BigDecimal.ZERO)
                .add(ip.getBedPrice() != null ? ip.getBedPrice() : BigDecimal.ZERO);
        if (base.compareTo(BigDecimal.ZERO) > 0) return base;
        if (ip.getDepositAmount() != null && ip.getDepositAmount().compareTo(BigDecimal.ZERO) > 0) return ip.getDepositAmount();
        return new BigDecimal("1800.00");
    }

    public static final List<String> STANDARD_WARD_CATEGORIES = Arrays.asList(
            "General Ward",
            "ICU",
            "VIP Room",
            "Deluxe Room",
            "Semi-Private Room",
            "Private Room",
            "Emergency / Observation",
            "Other"
    );

    private String resolveWardCategory(String rawRoomType, String rawWardName, Set<String> customConfiguredTypes) {
        String raw = (rawRoomType != null && !rawRoomType.trim().isEmpty()) ? rawRoomType : rawWardName;
        if (raw == null || raw.trim().isEmpty()) {
            return "General Ward";
        }
        String clean = raw.trim().toUpperCase().replace("_", " ").replaceAll("\\s+", " ");

        // 1. General Ward
        if (clean.contains("GENERAL") || clean.contains("GEN WARD") || clean.contains("GEN_WARD") || clean.equals("WARD")) {
            return "General Ward";
        }
        // 2. ICU
        if (clean.contains("ICU") || clean.contains("INTENSIVE") || clean.contains("CRITICAL CARE") || clean.contains("CCU") || clean.contains("NICU") || clean.contains("PICU")) {
            return "ICU";
        }
        // 3. VIP Room
        if (clean.contains("VIP")) {
            return "VIP Room";
        }
        // 4. Deluxe Room
        if (clean.contains("DELUXE") || clean.contains("DLX")) {
            return "Deluxe Room";
        }
        // 5. Semi-Private Room
        if (clean.contains("SEMI") || clean.contains("TWIN") || clean.contains("SHARED") || clean.contains("DUAL")) {
            return "Semi-Private Room";
        }
        // 6. Private Room (excluding Semi-Private)
        if (clean.contains("PRIVATE") || clean.contains("SINGLE")) {
            return "Private Room";
        }
        // 7. Emergency / Observation
        if (clean.contains("EMERGENCY") || clean.contains("OBSERVATION") || clean.contains("CASUALTY") || clean.contains("TRIAGE")
                || clean.equals("ER") || clean.startsWith("ER ") || clean.endsWith(" ER") || clean.contains(" ER ")) {
            return "Emergency / Observation";
        }

        // 8. Custom configured hospital types
        if (customConfiguredTypes != null) {
            for (String custom : customConfiguredTypes) {
                if (custom.equalsIgnoreCase(clean) || custom.equalsIgnoreCase(raw.trim())) {
                    return toTitleCase(custom);
                }
            }
        }

        // 9. Otherwise -> "Other"
        return "Other";
    }

    private String toTitleCase(String input) {
        if (input == null || input.trim().isEmpty()) return "Other";
        String[] words = input.trim().replace("_", " ").split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String w : words) {
            if (w.isEmpty()) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(Character.toUpperCase(w.charAt(0)));
            if (w.length() > 1) {
                sb.append(w.substring(1).toLowerCase());
            }
        }
        return sb.toString();
    }

    private double calculatePercentage(BigDecimal part, BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) == 0 || part == null) return 0.0;
        return part.multiply(BigDecimal.valueOf(100.0))
                .divide(total, 1, RoundingMode.HALF_UP)
                .doubleValue();
    }

    private LocalDate getOpDate(OpRegistration op) {
        return op.getVisitDate() != null ? op.getVisitDate() : (op.getCreatedAt() != null ? op.getCreatedAt().toLocalDate() : null);
    }

    private LocalDate getIpDate(IpAdmission ip) {
        return ip.getAdmissionDate() != null ? ip.getAdmissionDate() : (ip.getCreatedAt() != null ? ip.getCreatedAt().toLocalDate() : null);
    }

    private LocalDate getPharDate(PharmacyBill p) {
        return p.getBillDate() != null ? p.getBillDate() : (p.getCreatedAt() != null ? p.getCreatedAt().toLocalDate() : null);
    }

    private LocalDate getLabDate(LabOrder l) {
        return l.getOrderDate() != null ? l.getOrderDate() : (l.getCreatedAt() != null ? l.getCreatedAt().toLocalDate() : null);
    }

    private LocalDate getMedPurchaseDate(Medicine m) {
        return m.getPurchaseDate() != null ? m.getPurchaseDate() : (m.getCreatedAt() != null ? m.getCreatedAt().toLocalDate() : null);
    }

    private boolean isDateInRange(LocalDate target, LocalDate start, LocalDate end) {
        if (target == null) return true;
        if (start != null && target.isBefore(start)) return false;
        if (end != null && target.isAfter(end)) return false;
        return true;
    }

    private DateRange calculateDateRange(String period, String customStart, String customEnd) {
        LocalDate today = LocalDate.now();
        if (period == null || period.trim().isEmpty()) period = "ONE_MONTH";
        period = period.trim().toUpperCase();

        switch (period) {
            case "ONE_DAY":
                return new DateRange("ONE_DAY", today, today);
            case "ONE_WEEK":
                return new DateRange("ONE_WEEK", today.minusDays(6), today);
            case "ONE_MONTH":
                return new DateRange("ONE_MONTH", today.minusDays(29), today);
            case "ONE_YEAR":
                return new DateRange("ONE_YEAR", today.minusDays(364), today);
            case "LIFETIME":
                return new DateRange("LIFETIME", null, null);
            case "CUSTOM":
                LocalDate s = parseDate(customStart);
                LocalDate e = parseDate(customEnd);
                if (s == null) s = today.minusDays(29);
                if (e == null) e = today;
                if (s.isAfter(e)) {
                    LocalDate tmp = s; s = e; e = tmp;
                }
                return new DateRange("CUSTOM", s, e);
            default:
                return new DateRange("ONE_MONTH", today.minusDays(29), today);
        }
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty()) return null;
        dateStr = dateStr.trim();
        try {
            if (dateStr.contains("/")) {
                return LocalDate.parse(dateStr, DD_MM_YYYY);
            }
            return LocalDate.parse(dateStr, ISO_DATE);
        } catch (Exception e) {
            return null;
        }
    }

    private static class DateRange {
        String periodName;
        LocalDate startDate;
        LocalDate endDate;

        DateRange(String periodName, LocalDate startDate, LocalDate endDate) {
            this.periodName = periodName;
            this.startDate = startDate;
            this.endDate = endDate;
        }
    }

    private static class WardStatAccumulator {
        BigDecimal billed = BigDecimal.ZERO;
        BigDecimal collected = BigDecimal.ZERO;
        long count = 0;
        long transactionCount = 0;
        long occupiedCount = 0;
        long totalBeds = 0;
    }

    private static class ExpenseStatAccumulator {
        BigDecimal amount = BigDecimal.ZERO;
        long count = 0;
    }

    // -------------------------------------------------------------------------
    // DEDICATED FINANCIAL SECTION BUILDERS (OP, IP, LAB, PHARMACY, DOCTORS)
    // -------------------------------------------------------------------------

    private OpFinancialSectionDto buildOpFinancialSection(
            List<OpRegistration> periodOps,
            Map<String, CentralBill> centralBillsByOpId,
            Map<String, PaymentRecord> paymentsByOpId) {
        OpFinancialSectionDto section = new OpFinancialSectionDto();
        section.setTotalBills(periodOps.size());

        BigDecimal totalBilled = BigDecimal.ZERO;
        BigDecimal totalCollected = BigDecimal.ZERO;
        BigDecimal totalDiscounts = BigDecimal.ZERO;
        BigDecimal totalGst = BigDecimal.ZERO;

        List<OpFinancialRecordDto> records = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        for (OpRegistration op : periodOps) {
            BigDecimal fee = op.getConsultationFee() != null ? op.getConsultationFee() : BigDecimal.ZERO;
            totalBilled = totalBilled.add(fee);

            BigDecimal paid = BigDecimal.ZERO;
            if ("PAID".equalsIgnoreCase(op.getPaymentStatus())) {
                paid = fee;
            } else if (op.getPaidAmount() != null) {
                paid = op.getPaidAmount().min(fee);
            }
            totalCollected = totalCollected.add(paid);

            CentralBill cb = op.getOpId() != null ? centralBillsByOpId.get(op.getOpId().trim()) : null;
            PaymentRecord pr = op.getOpId() != null ? paymentsByOpId.get(op.getOpId().trim()) : null;

            BigDecimal disc = cb != null && cb.getDiscountAmount() != null ? cb.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal gst = cb != null && cb.getGstAmount() != null ? cb.getGstAmount() : BigDecimal.ZERO;
            totalDiscounts = totalDiscounts.add(disc);
            totalGst = totalGst.add(gst);

            String invNo = (cb != null && cb.getInvoiceNumber() != null && !cb.getInvoiceNumber().trim().isEmpty())
                    ? cb.getInvoiceNumber()
                    : ((pr != null && pr.getInvoiceNumber() != null && !pr.getInvoiceNumber().trim().isEmpty())
                    ? pr.getInvoiceNumber()
                    : ((cb != null && cb.getBillNumber() != null) ? cb.getBillNumber() : "INV-OP-" + String.format("%04d", op.getId())));

            String date = op.getVisitDate() != null ? op.getVisitDate().format(DD_MM_YYYY) : "-";
            String time = op.getRegistrationTime() != null ? op.getRegistrationTime() : (op.getCreatedAt() != null ? op.getCreatedAt().format(timeFmt) : "-");

            OpFinancialRecordDto rec = new OpFinancialRecordDto();
            rec.setId(op.getId());
            rec.setOpId(op.getOpId());
            rec.setInvoiceNumber(invNo);
            rec.setPatientName(op.getPatient() != null ? op.getPatient().getFullName() : "-");
            rec.setUhid(op.getPatient() != null ? op.getPatient().getUhid() : "-");
            rec.setDoctorName(op.getDoctorName() != null ? op.getDoctorName() : "-");
            rec.setDepartment(op.getDepartment() != null ? op.getDepartment() : "General");
            rec.setDate(date);
            rec.setTime(time);
            rec.setConsultationFee(fee);
            rec.setTotalBill(fee);
            rec.setPaidAmount(paid);
            rec.setBalanceAmount(fee.subtract(paid).max(BigDecimal.ZERO));
            rec.setDiscountAmount(disc);
            rec.setGstAmount(gst);
            rec.setPaymentStatus(op.getPaymentStatus() != null ? op.getPaymentStatus() : "PAID");
            rec.setPaymentMethod(op.getPaymentMethod() != null ? op.getPaymentMethod() : "CASH");
            records.add(rec);
        }

        section.setTotalBilledAmount(totalBilled);
        section.setTotalCollections(totalCollected);
        section.setTotalOutstanding(totalBilled.subtract(totalCollected).max(BigDecimal.ZERO));
        section.setTotalDiscounts(totalDiscounts);
        section.setTotalGst(totalGst);
        section.setRecords(records);
        return section;
    }

    private IpFinancialSectionDto buildIpFinancialSection(
            List<IpAdmission> periodIps,
            Set<String> customConfiguredTypes,
            Map<String, CentralBill> centralBillsByIpId,
            Map<String, PaymentRecord> paymentsByIpId) {
        IpFinancialSectionDto section = new IpFinancialSectionDto();
        section.setTotalAdmissions(periodIps.size());

        BigDecimal totalBilled = BigDecimal.ZERO;
        BigDecimal totalCollected = BigDecimal.ZERO;
        BigDecimal totalRoom = BigDecimal.ZERO;
        BigDecimal totalBed = BigDecimal.ZERO;
        BigDecimal totalOther = BigDecimal.ZERO;
        BigDecimal totalDiscounts = BigDecimal.ZERO;
        BigDecimal totalGst = BigDecimal.ZERO;

        List<IpFinancialRecordDto> records = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        for (IpAdmission ip : periodIps) {
            BigDecimal chg = getIpTotalCharges(ip);
            BigDecimal roomChg = ip.getRoomPrice() != null ? ip.getRoomPrice() : BigDecimal.ZERO;
            BigDecimal bedChg = ip.getBedPrice() != null ? ip.getBedPrice() : BigDecimal.ZERO;
            BigDecimal otherChg = chg.subtract(roomChg).subtract(bedChg).max(BigDecimal.ZERO);

            totalBilled = totalBilled.add(chg);
            totalRoom = totalRoom.add(roomChg);
            totalBed = totalBed.add(bedChg);
            totalOther = totalOther.add(otherChg);

            BigDecimal paid = BigDecimal.ZERO;
            if ("PAID".equalsIgnoreCase(ip.getPaymentStatus())) {
                paid = chg;
            } else if (ip.getPaidAmount() != null) {
                paid = ip.getPaidAmount().min(chg);
            } else if (ip.getDepositAmount() != null) {
                paid = ip.getDepositAmount().min(chg);
            }
            totalCollected = totalCollected.add(paid);

            CentralBill cb = ip.getIpId() != null ? centralBillsByIpId.get(ip.getIpId().trim()) : null;
            PaymentRecord pr = ip.getIpId() != null ? paymentsByIpId.get(ip.getIpId().trim()) : null;

            BigDecimal disc = cb != null && cb.getDiscountAmount() != null ? cb.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal gst = cb != null && cb.getGstAmount() != null ? cb.getGstAmount() : BigDecimal.ZERO;
            totalDiscounts = totalDiscounts.add(disc);
            totalGst = totalGst.add(gst);

            String invNo = (cb != null && cb.getInvoiceNumber() != null && !cb.getInvoiceNumber().trim().isEmpty())
                    ? cb.getInvoiceNumber()
                    : ((pr != null && pr.getInvoiceNumber() != null && !pr.getInvoiceNumber().trim().isEmpty())
                    ? pr.getInvoiceNumber()
                    : ((cb != null && cb.getBillNumber() != null) ? cb.getBillNumber() : "INV-IP-" + String.format("%04d", ip.getId())));

            String date = ip.getAdmissionDate() != null ? ip.getAdmissionDate().format(DD_MM_YYYY) : "-";
            String time = ip.getAdmissionTime() != null ? ip.getAdmissionTime() : (ip.getCreatedAt() != null ? ip.getCreatedAt().format(timeFmt) : "-");
            String ward = resolveWardCategory(ip.getRoom() != null ? ip.getRoom().getRoomType() : null, ip.getWardName(), customConfiguredTypes);

            IpFinancialRecordDto rec = new IpFinancialRecordDto();
            rec.setId(ip.getId());
            rec.setIpId(ip.getIpId());
            rec.setInvoiceNumber(invNo);
            rec.setPatientName(ip.getPatient() != null ? ip.getPatient().getFullName() : "-");
            rec.setUhid(ip.getPatient() != null ? ip.getPatient().getUhid() : "-");
            rec.setDoctorName(ip.getDoctorName() != null ? ip.getDoctorName() : "-");
            rec.setDepartment(ip.getDepartment() != null ? ip.getDepartment() : "General Medicine");
            rec.setAdmissionDate(date);
            rec.setAdmissionTime(time);
            rec.setRoomNumber(ip.getRoomNumber() != null ? ip.getRoomNumber() : (ip.getRoom() != null ? ip.getRoom().getRoomNumber() : "-"));
            rec.setWardType(ward);
            rec.setBedNumber(ip.getBedNumber() != null ? ip.getBedNumber() : (ip.getBed() != null ? ip.getBed().getBedNumber() : "-"));
            rec.setRoomCharges(roomChg);
            rec.setBedCharges(bedChg);
            rec.setOtherCharges(otherChg);
            rec.setTotalBill(chg);
            rec.setPaidAmount(paid);
            rec.setBalanceAmount(chg.subtract(paid).max(BigDecimal.ZERO));
            rec.setDiscountAmount(disc);
            rec.setGstAmount(gst);
            rec.setPaymentStatus(ip.getPaymentStatus() != null ? ip.getPaymentStatus() : "PAID");
            rec.setPaymentMethod(ip.getPaymentMethod() != null ? ip.getPaymentMethod() : "CASH");
            records.add(rec);
        }

        section.setTotalBilledAmount(totalBilled);
        section.setTotalCollections(totalCollected);
        section.setTotalOutstanding(totalBilled.subtract(totalCollected).max(BigDecimal.ZERO));
        section.setTotalRoomCharges(totalRoom);
        section.setTotalBedCharges(totalBed);
        section.setTotalOtherCharges(totalOther);
        section.setTotalDiscounts(totalDiscounts);
        section.setTotalGst(totalGst);
        section.setRecords(records);
        return section;
    }

    private LabFinancialSectionDto buildLabFinancialSection(List<LabOrder> periodLabs) {
        LabFinancialSectionDto section = new LabFinancialSectionDto();
        section.setTotalOrders(periodLabs.size());

        BigDecimal totalBilled = BigDecimal.ZERO;
        BigDecimal totalCollected = BigDecimal.ZERO;
        BigDecimal totalDiscounts = BigDecimal.ZERO;
        BigDecimal totalGst = BigDecimal.ZERO;

        List<LabFinancialRecordDto> records = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        for (LabOrder l : periodLabs) {
            BigDecimal tot = l.getTotalAmount() != null && l.getTotalAmount().compareTo(BigDecimal.ZERO) > 0
                    ? l.getTotalAmount()
                    : (l.getTestPrice() != null ? l.getTestPrice() : BigDecimal.ZERO);
            BigDecimal paid = l.getPaidAmount() != null ? l.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal disc = l.getDiscountAmount() != null ? l.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal gst = l.getGstAmount() != null ? l.getGstAmount() : BigDecimal.ZERO;
            BigDecimal sub = l.getSubtotal() != null && l.getSubtotal().compareTo(BigDecimal.ZERO) > 0 ? l.getSubtotal() : tot;

            totalBilled = totalBilled.add(tot);
            totalCollected = totalCollected.add(paid);
            totalDiscounts = totalDiscounts.add(disc);
            totalGst = totalGst.add(gst);

            String date = l.getOrderDate() != null ? l.getOrderDate().format(DD_MM_YYYY) : "-";
            String time = l.getCreatedAt() != null ? l.getCreatedAt().format(timeFmt) : "-";

            LabFinancialRecordDto rec = new LabFinancialRecordDto();
            rec.setId(l.getId());
            rec.setOrderNumber(l.getOrderNumber());
            rec.setInvoiceNumber(l.getOrderNumber() != null ? l.getOrderNumber() : "INV-LAB-" + String.format("%04d", l.getId()));
            rec.setPatientName(l.getPatientName() != null ? l.getPatientName() : (l.getPatient() != null ? l.getPatient().getFullName() : "-"));
            rec.setUhid(l.getUhid() != null ? l.getUhid() : (l.getPatient() != null ? l.getPatient().getUhid() : "-"));
            rec.setDoctorName(l.getDoctorName() != null ? l.getDoctorName() : "-");
            rec.setTestNames(l.getTestName());
            rec.setCategory(l.getCategory() != null ? l.getCategory() : "GENERAL");
            rec.setOrderDate(date);
            rec.setOrderTime(time);
            rec.setSubtotal(sub);
            rec.setDiscountAmount(disc);
            rec.setGstAmount(gst);
            rec.setTotalAmount(tot);
            rec.setPaidAmount(paid);
            rec.setBalanceAmount(tot.subtract(paid).max(BigDecimal.ZERO));
            rec.setPaymentStatus(l.getPaymentStatus() != null ? l.getPaymentStatus() : "PAID");
            rec.setPaymentMethod(l.getPaymentMethod() != null ? l.getPaymentMethod() : "CASH");
            records.add(rec);
        }

        section.setTotalBilledAmount(totalBilled);
        section.setTotalCollections(totalCollected);
        section.setTotalOutstanding(totalBilled.subtract(totalCollected).max(BigDecimal.ZERO));
        section.setTotalDiscounts(totalDiscounts);
        section.setTotalGst(totalGst);
        section.setRecords(records);
        return section;
    }

    private PharmacyFinancialSectionDto buildPharmacyFinancialSection(List<PharmacyBill> periodPhars) {
        PharmacyFinancialSectionDto section = new PharmacyFinancialSectionDto();
        section.setTotalBills(periodPhars.size());

        BigDecimal totalSales = BigDecimal.ZERO;
        BigDecimal totalCollected = BigDecimal.ZERO;
        BigDecimal totalDiscounts = BigDecimal.ZERO;
        BigDecimal totalGst = BigDecimal.ZERO;

        List<PharmacyFinancialRecordDto> records = new ArrayList<>();
        DateTimeFormatter timeFmt = DateTimeFormatter.ofPattern("hh:mm a");

        for (PharmacyBill p : periodPhars) {
            BigDecimal tot = p.getTotalAmount() != null ? p.getTotalAmount() : BigDecimal.ZERO;
            BigDecimal paid = p.getPaidAmount() != null ? p.getPaidAmount() : BigDecimal.ZERO;
            BigDecimal disc = p.getDiscountAmount() != null ? p.getDiscountAmount() : BigDecimal.ZERO;
            BigDecimal gst = p.getGstAmount() != null ? p.getGstAmount() : BigDecimal.ZERO;
            BigDecimal sub = p.getSubtotal() != null ? p.getSubtotal() : tot;

            totalSales = totalSales.add(tot);
            totalCollected = totalCollected.add(paid);
            totalDiscounts = totalDiscounts.add(disc);
            totalGst = totalGst.add(gst);

            String date = p.getBillDate() != null ? p.getBillDate().format(DD_MM_YYYY) : "-";
            String time = p.getBillTime() != null ? p.getBillTime() : (p.getCreatedAt() != null ? p.getCreatedAt().format(timeFmt) : "-");

            String medsSummary;
            int totalQty = 0;
            if (p.getItems() != null && !p.getItems().isEmpty()) {
                medsSummary = p.getItems().stream()
                        .map(i -> (i.getMedicineName() != null ? i.getMedicineName() : "Item") + " (" + (i.getQuantity() != null ? i.getQuantity() : 1) + ")")
                        .collect(Collectors.joining(", "));
                totalQty = p.getItems().stream().mapToInt(i -> i.getQuantity() != null ? i.getQuantity() : 0).sum();
            } else {
                medsSummary = "Prescription Medicines";
                totalQty = 1;
            }

            PharmacyFinancialRecordDto rec = new PharmacyFinancialRecordDto();
            rec.setId(p.getId());
            rec.setBillNumber(p.getBillNumber());
            rec.setInvoiceNumber(p.getBillNumber() != null ? p.getBillNumber() : "INV-PHAR-" + String.format("%04d", p.getId()));
            rec.setBillDate(date);
            rec.setBillTime(time);
            rec.setCustomerName(p.getPatientName() != null ? p.getPatientName() : (p.getPatient() != null ? p.getPatient().getFullName() : "Walk-in Customer"));
            rec.setUhid(p.getUhid() != null ? p.getUhid() : (p.getPatient() != null ? p.getPatient().getUhid() : "-"));
            rec.setDoctorName(p.getDoctorName() != null ? p.getDoctorName() : "-");
            rec.setMedicinesSold(medsSummary);
            rec.setTotalQuantity(totalQty);
            rec.setSubtotal(sub);
            rec.setDiscountAmount(disc);
            rec.setGstAmount(gst);
            rec.setTotalAmount(tot);
            rec.setPaidAmount(paid);
            rec.setBalanceAmount(tot.subtract(paid).max(BigDecimal.ZERO));
            rec.setPaymentStatus(p.getPaymentStatus() != null ? p.getPaymentStatus() : "PAID");
            rec.setPaymentMethod(p.getPaymentMethod() != null ? p.getPaymentMethod() : "CASH");
            records.add(rec);
        }

        section.setTotalSales(totalSales);
        section.setTotalCollections(totalCollected);
        section.setTotalOutstanding(totalSales.subtract(totalCollected).max(BigDecimal.ZERO));
        section.setTotalDiscounts(totalDiscounts);
        section.setTotalGst(totalGst);
        section.setRecords(records);
        return section;
    }

    private DoctorFinancialSectionDto buildDoctorFinancialSection(List<DoctorRevenueDto> docList, BigDecimal totalRevBilled, BigDecimal totalRevCollected) {
        DoctorFinancialSectionDto section = new DoctorFinancialSectionDto();
        section.setTotalDoctors(docList.size());

        long totalConsultations = 0;
        long totalAdmissions = 0;
        BigDecimal totalBilled = BigDecimal.ZERO;
        BigDecimal totalCollected = BigDecimal.ZERO;

        for (DoctorRevenueDto d : docList) {
            totalConsultations += d.getOpCount();
            totalAdmissions += d.getIpCount();
            totalBilled = totalBilled.add(d.getTotalRevenueBilled());
            totalCollected = totalCollected.add(d.getTotalRevenueCollected());
        }

        section.setTotalConsultations(totalConsultations);
        section.setTotalAdmissions(totalAdmissions);
        section.setTotalBilledAmount(totalBilled);
        section.setTotalCollections(totalCollected);
        section.setTotalOutstanding(totalBilled.subtract(totalCollected).max(BigDecimal.ZERO));
        section.setDoctors(docList);
        return section;
    }

    public OpFinancialSectionDto getOpFinancials(Long tenantId, String period, String customStart, String customEnd) {
        return getMoneyDashboard(tenantId, period, customStart, customEnd).getOpFinancials();
    }

    public IpFinancialSectionDto getIpFinancials(Long tenantId, String period, String customStart, String customEnd) {
        return getMoneyDashboard(tenantId, period, customStart, customEnd).getIpFinancials();
    }

    public LabFinancialSectionDto getLabFinancials(Long tenantId, String period, String customStart, String customEnd) {
        return getMoneyDashboard(tenantId, period, customStart, customEnd).getLabFinancials();
    }

    public PharmacyFinancialSectionDto getPharmacyFinancials(Long tenantId, String period, String customStart, String customEnd) {
        return getMoneyDashboard(tenantId, period, customStart, customEnd).getPharmacyFinancials();
    }

    public DoctorFinancialSectionDto getDoctorFinancials(Long tenantId, String period, String customStart, String customEnd) {
        return getMoneyDashboard(tenantId, period, customStart, customEnd).getDoctorFinancials();
    }
}
