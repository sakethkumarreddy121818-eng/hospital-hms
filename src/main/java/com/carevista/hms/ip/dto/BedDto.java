package com.carevista.hms.ip.dto;

import com.carevista.hms.ip.entity.Bed;
import java.math.BigDecimal;

public class BedDto {

    private Long id;
    private Long roomId;
    private String roomNumber;
    private String roomType;
    private String bedNumber;
    private BigDecimal dailyPrice;
    private String status; // AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE
    private String assignedPatientName;
    private String assignedPatientUhid;
    private String assignedIpId;
    private Long admissionId;
    private BigDecimal totalCharges;
    private BigDecimal paidAmount;
    private BigDecimal balanceAmount;
    private String paymentStatus;
    private String notes;

    public BedDto() {}

    public static BedDto fromEntity(Bed bed) {
        if (bed == null) return null;
        BedDto dto = new BedDto();
        dto.setId(bed.getId());
        if (bed.getRoom() != null) {
            dto.setRoomId(bed.getRoom().getId());
            dto.setRoomNumber(bed.getRoom().getRoomNumber());
            dto.setRoomType(bed.getRoom().getRoomType());
        }
        dto.setBedNumber(bed.getBedNumber());
        dto.setDailyPrice(bed.getDailyPrice());
        dto.setStatus(bed.getStatus());
        dto.setNotes(bed.getNotes());

        if (bed.getCurrentAdmission() != null) {
            com.carevista.hms.ip.entity.IpAdmission adm = bed.getCurrentAdmission();
            dto.setAdmissionId(adm.getId());
            dto.setAssignedIpId(adm.getIpId());
            if (adm.getPatient() != null) {
                dto.setAssignedPatientName(adm.getPatient().getFullName());
                dto.setAssignedPatientUhid(adm.getPatient().getUhid());
            }
            BigDecimal roomBed = (adm.getRoomPrice() != null ? adm.getRoomPrice() : BigDecimal.ZERO)
                    .add(adm.getBedPrice() != null ? adm.getBedPrice() : BigDecimal.ZERO);
            BigDecimal total = adm.getTotalCharges() != null && adm.getTotalCharges().compareTo(BigDecimal.ZERO) > 0 ?
                    (adm.getTotalCharges().compareTo(roomBed) >= 0 ? adm.getTotalCharges() : roomBed) : roomBed;
            if (total.compareTo(BigDecimal.ZERO) <= 0 && adm.getDepositAmount() != null) {
                total = adm.getDepositAmount();
            }
            BigDecimal paid = adm.getPaidAmount() != null ? adm.getPaidAmount() :
                    ("PAID".equalsIgnoreCase(adm.getPaymentStatus()) ? total :
                    (adm.getDepositAmount() != null ? adm.getDepositAmount() : BigDecimal.ZERO));
            BigDecimal bal = adm.getBalanceAmount() != null ? adm.getBalanceAmount() :
                    total.subtract(paid).max(BigDecimal.ZERO);
            dto.setTotalCharges(total);
            dto.setPaidAmount(paid);
            dto.setBalanceAmount(bal);
            dto.setPaymentStatus(adm.getPaymentStatus() != null ? adm.getPaymentStatus() : (bal.compareTo(BigDecimal.ZERO) == 0 ? "PAID" : "PARTIALLY PAID"));
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getRoomId() { return roomId; }
    public void setRoomId(Long roomId) { this.roomId = roomId; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public String getBedNumber() { return bedNumber; }
    public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }

    public BigDecimal getDailyPrice() { return dailyPrice; }
    public void setDailyPrice(BigDecimal dailyPrice) { this.dailyPrice = dailyPrice; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getAssignedPatientName() { return assignedPatientName; }
    public void setAssignedPatientName(String assignedPatientName) { this.assignedPatientName = assignedPatientName; }

    public String getAssignedPatientUhid() { return assignedPatientUhid; }
    public void setAssignedPatientUhid(String assignedPatientUhid) { this.assignedPatientUhid = assignedPatientUhid; }

    public String getAssignedIpId() { return assignedIpId; }
    public void setAssignedIpId(String assignedIpId) { this.assignedIpId = assignedIpId; }

    public Long getAdmissionId() { return admissionId; }
    public void setAdmissionId(Long admissionId) { this.admissionId = admissionId; }

    public BigDecimal getTotalCharges() { return totalCharges; }
    public void setTotalCharges(BigDecimal totalCharges) { this.totalCharges = totalCharges; }

    public BigDecimal getPaidAmount() { return paidAmount; }
    public void setPaidAmount(BigDecimal paidAmount) { this.paidAmount = paidAmount; }

    public BigDecimal getBalanceAmount() { return balanceAmount; }
    public void setBalanceAmount(BigDecimal balanceAmount) { this.balanceAmount = balanceAmount; }

    public String getPaymentStatus() { return paymentStatus; }
    public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
