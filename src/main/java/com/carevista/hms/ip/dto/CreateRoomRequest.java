package com.carevista.hms.ip.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public class CreateRoomRequest {

    @NotBlank(message = "Room number is required.")
    private String roomNumber;

    @NotBlank(message = "Room type is required.")
    private String roomType; // ICU, GENERAL_WARD, VIP, DELUXE, SEMI_PRIVATE

    private String floor = "1st Floor";

    @NotNull(message = "Daily room price is required.")
    @Min(value = 0, message = "Daily price cannot be negative.")
    private BigDecimal dailyPrice;

    private BigDecimal bedPrice = BigDecimal.ZERO;

    @Min(value = 1, message = "Must configure at least 1 bed.")
    private int numberOfBeds = 1;

    private String notes;

    public CreateRoomRequest() {}

    public String getRoomNumber() { return roomNumber; }
    public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

    public String getRoomType() { return roomType; }
    public void setRoomType(String roomType) { this.roomType = roomType; }

    public String getFloor() { return floor; }
    public void setFloor(String floor) { this.floor = floor; }

    public BigDecimal getDailyPrice() { return dailyPrice; }
    public void setDailyPrice(BigDecimal dailyPrice) { this.dailyPrice = dailyPrice; }

    public BigDecimal getBedPrice() { return bedPrice; }
    public void setBedPrice(BigDecimal bedPrice) { this.bedPrice = bedPrice; }

    public int getNumberOfBeds() { return numberOfBeds; }
    public void setNumberOfBeds(int numberOfBeds) { this.numberOfBeds = numberOfBeds; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
