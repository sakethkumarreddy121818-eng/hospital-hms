package com.carevista.hms.ip.dto;

public class RoomBedSummaryDto {

    private long totalRooms;
    private long totalBeds;
    private long occupiedBeds;
    private long availableBeds;
    private long reservedBeds;
    private long maintenanceBeds;

    public RoomBedSummaryDto() {}

    public RoomBedSummaryDto(long totalRooms, long totalBeds, long occupiedBeds, long availableBeds, long reservedBeds, long maintenanceBeds) {
        this.totalRooms = totalRooms;
        this.totalBeds = totalBeds;
        this.occupiedBeds = occupiedBeds;
        this.availableBeds = availableBeds;
        this.reservedBeds = reservedBeds;
        this.maintenanceBeds = maintenanceBeds;
    }

    public long getTotalRooms() { return totalRooms; }
    public void setTotalRooms(long totalRooms) { this.totalRooms = totalRooms; }

    public long getTotalBeds() { return totalBeds; }
    public void setTotalBeds(long totalBeds) { this.totalBeds = totalBeds; }

    public long getOccupiedBeds() { return occupiedBeds; }
    public void setOccupiedBeds(long occupiedBeds) { this.occupiedBeds = occupiedBeds; }

    public long getAvailableBeds() { return availableBeds; }
    public void setAvailableBeds(long availableBeds) { this.availableBeds = availableBeds; }

    public long getReservedBeds() { return reservedBeds; }
    public void setReservedBeds(long reservedBeds) { this.reservedBeds = reservedBeds; }

    public long getMaintenanceBeds() { return maintenanceBeds; }
    public void setMaintenanceBeds(long maintenanceBeds) { this.maintenanceBeds = maintenanceBeds; }
}
