package com.carevista.hms.ip.entity;

import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "rooms", indexes = {
    @Index(name = "idx_room_tenant", columnList = "tenant_id"),
    @Index(name = "idx_room_type", columnList = "room_type"),
    @Index(name = "idx_room_number", columnList = "room_number")
})
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @Column(name = "room_number", nullable = false, length = 50)
    private String roomNumber;

    @Column(name = "room_type", nullable = false, length = 50)
    private String roomType; // ICU, GENERAL_WARD, VIP, DELUXE, SEMI_PRIVATE

    @Column(name = "floor", length = 50)
    private String floor = "Ground Floor";

    @Column(name = "daily_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal dailyPrice = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE"; // ACTIVE, MAINTENANCE

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Room() {}

    public Room(Tenant tenant, String roomNumber, String roomType, String floor, BigDecimal dailyPrice, String status, String notes) {
        this.tenant = tenant;
        this.roomNumber = roomNumber;
        this.roomType = roomType != null ? roomType : "GENERAL_WARD";
        this.floor = floor != null ? floor : "1st Floor";
        this.dailyPrice = dailyPrice != null ? dailyPrice : BigDecimal.ZERO;
        this.status = status != null ? status : "ACTIVE";
        this.notes = notes;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

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

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
