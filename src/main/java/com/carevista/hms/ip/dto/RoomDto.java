package com.carevista.hms.ip.dto;

import com.carevista.hms.ip.entity.Room;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class RoomDto {

    private Long id;
    private String roomNumber;
    private String roomType;
    private String floor;
    private BigDecimal dailyPrice;
    private String status;
    private String notes;
    private int totalBeds;
    private int occupiedBeds;
    private int availableBeds;
    private List<BedDto> beds = new ArrayList<>();

    public RoomDto() {}

    public static RoomDto fromEntity(Room room, List<BedDto> beds) {
        if (room == null) return null;
        RoomDto dto = new RoomDto();
        dto.setId(room.getId());
        dto.setRoomNumber(room.getRoomNumber());
        dto.setRoomType(room.getRoomType());
        dto.setFloor(room.getFloor());
        dto.setDailyPrice(room.getDailyPrice());
        dto.setStatus(room.getStatus());
        dto.setNotes(room.getNotes());

        if (beds != null) {
            dto.setBeds(beds);
            dto.setTotalBeds(beds.size());
            int occ = 0;
            int avail = 0;
            for (BedDto b : beds) {
                if ("OCCUPIED".equalsIgnoreCase(b.getStatus())) occ++;
                else if ("AVAILABLE".equalsIgnoreCase(b.getStatus())) avail++;
            }
            dto.setOccupiedBeds(occ);
            dto.setAvailableBeds(avail);
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public String getFloor() { return floor; }
    public void setFloor(String floor) { this.floor = floor; }

    public BigDecimal getDailyPrice() { return dailyPrice; }
    public void setDailyPrice(BigDecimal dailyPrice) { this.dailyPrice = dailyPrice; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public int getTotalBeds() { return totalBeds; }
    public void setTotalBeds(int totalBeds) { this.totalBeds = totalBeds; }

    public int getOccupiedBeds() { return occupiedBeds; }
    public void setOccupiedBeds(int occupiedBeds) { this.occupiedBeds = occupiedBeds; }

    public int getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(int availableBeds) { this.availableBeds = availableBeds; }

    public List<BedDto> getBeds() { return beds; }
    public void setBeds(List<BedDto> beds) { this.beds = beds; }
}
