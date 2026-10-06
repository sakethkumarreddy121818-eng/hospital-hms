package com.carevista.hms.ip.entity;

import com.carevista.hms.tenant.entity.Tenant;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "beds", indexes = {
    @Index(name = "idx_bed_tenant", columnList = "tenant_id"),
    @Index(name = "idx_bed_room", columnList = "room_id"),
    @Index(name = "idx_bed_status", columnList = "status"),
    @Index(name = "idx_bed_number", columnList = "bed_number")
})
public class Bed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "tenant_id", nullable = false)
    private Tenant tenant;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "room_id", nullable = false)
    private Room room;

    @Column(name = "bed_number", nullable = false, length = 50)
    private String bedNumber; // e.g., "Bed 101-A", "ICU-Bed-01"

    @Column(name = "daily_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal dailyPrice = BigDecimal.ZERO;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "AVAILABLE"; // AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE

    @com.fasterxml.jackson.annotation.JsonIgnore
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "current_admission_id")
    private IpAdmission currentAdmission;

    @Column(name = "notes", length = 255)
    private String notes;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Bed() {}

    public Bed(Tenant tenant, Room room, String bedNumber, BigDecimal dailyPrice, String status, String notes) {
        this.tenant = tenant;
        this.room = room;
        this.bedNumber = bedNumber;
        this.dailyPrice = dailyPrice != null ? dailyPrice : BigDecimal.ZERO;
        this.status = status != null ? status : "AVAILABLE";
        this.notes = notes;
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Tenant getTenant() { return tenant; }
    public void setTenant(Tenant tenant) { this.tenant = tenant; }

    public Room getRoom() { return room; }
    public void setRoom(Room room) { this.room = room; }

    public String getBedNumber() { return bedNumber; }
    public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }

    public BigDecimal getDailyPrice() { return dailyPrice; }
    public void setDailyPrice(BigDecimal dailyPrice) { this.dailyPrice = dailyPrice; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public IpAdmission getCurrentAdmission() { return currentAdmission; }
    public void setCurrentAdmission(IpAdmission currentAdmission) { this.currentAdmission = currentAdmission; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
