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
            dto.setAssignedIpId(bed.getCurrentAdmission().getIpId());
            if (bed.getCurrentAdmission().getPatient() != null) {
                dto.setAssignedPatientName(bed.getCurrentAdmission().getPatient().getFullName());
                dto.setAssignedPatientUhid(bed.getCurrentAdmission().getPatient().getUhid());
            }
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

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
