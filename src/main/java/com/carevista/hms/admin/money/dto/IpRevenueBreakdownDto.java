package com.carevista.hms.admin.money.dto;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

public class IpRevenueBreakdownDto {

    private BigDecimal totalBilled = BigDecimal.ZERO;
    private BigDecimal totalCollected = BigDecimal.ZERO;
    private BigDecimal totalOutstanding = BigDecimal.ZERO;
    private long totalAdmissions = 0;

    private List<WardRevenueDto> wardBreakdown = new ArrayList<>();
    private List<BedRevenueDto> bedBreakdown = new ArrayList<>();

    public IpRevenueBreakdownDto() {}

    public static class WardRevenueDto {
        private String wardType; // General Ward, ICU, VIP Room, Deluxe Room, Semi-Private Room, Private Room, Emergency / Observation, Other
        private BigDecimal billed = BigDecimal.ZERO;
        private BigDecimal collected = BigDecimal.ZERO;
        private BigDecimal outstanding = BigDecimal.ZERO;
        private long count = 0;
        private long transactionCount = 0;
        private long occupiedCount = 0;
        private long totalBeds = 0;
        private double percentage = 0.0;

        public WardRevenueDto() {}

        public WardRevenueDto(String wardType, BigDecimal billed, BigDecimal collected, BigDecimal outstanding, long count, double percentage) {
            this.wardType = wardType;
            this.billed = billed != null ? billed : BigDecimal.ZERO;
            this.collected = collected != null ? collected : BigDecimal.ZERO;
            this.outstanding = outstanding != null ? outstanding : BigDecimal.ZERO;
            this.count = count;
            this.transactionCount = count;
            this.percentage = percentage;
        }

        public WardRevenueDto(String wardType, BigDecimal billed, BigDecimal collected, BigDecimal outstanding, long count, long transactionCount, long occupiedCount, long totalBeds, double percentage) {
            this.wardType = wardType;
            this.billed = billed != null ? billed : BigDecimal.ZERO;
            this.collected = collected != null ? collected : BigDecimal.ZERO;
            this.outstanding = outstanding != null ? outstanding : BigDecimal.ZERO;
            this.count = count;
            this.transactionCount = transactionCount;
            this.occupiedCount = occupiedCount;
            this.totalBeds = totalBeds;
            this.percentage = percentage;
        }

        public String getWardType() { return wardType; }
        public void setWardType(String wardType) { this.wardType = wardType; }

        public BigDecimal getBilled() { return billed; }
        public void setBilled(BigDecimal billed) { this.billed = billed; }

        public BigDecimal getCollected() { return collected; }
        public void setCollected(BigDecimal collected) { this.collected = collected; }

        public BigDecimal getOutstanding() { return outstanding; }
        public void setOutstanding(BigDecimal outstanding) { this.outstanding = outstanding; }

        public long getCount() { return count; }
        public void setCount(long count) {
            this.count = count;
            if (this.transactionCount == 0) this.transactionCount = count;
        }

        public long getTransactionCount() { return transactionCount; }
        public void setTransactionCount(long transactionCount) { this.transactionCount = transactionCount; }

        public long getOccupiedCount() { return occupiedCount; }
        public void setOccupiedCount(long occupiedCount) { this.occupiedCount = occupiedCount; }

        public long getTotalBeds() { return totalBeds; }
        public void setTotalBeds(long totalBeds) { this.totalBeds = totalBeds; }

        public double getPercentage() { return percentage; }
        public void setPercentage(double percentage) { this.percentage = percentage; }
    }

    public static class BedRevenueDto {
        private String ipId;
        private String patientName;
        private String roomNumber;
        private String bedNumber;
        private String wardType;
        private String doctorName;
        private String admissionDate;
        private BigDecimal roomPrice = BigDecimal.ZERO;
        private BigDecimal bedPrice = BigDecimal.ZERO;
        private BigDecimal totalCharges = BigDecimal.ZERO;
        private BigDecimal collected = BigDecimal.ZERO;
        private String paymentStatus;

        public BedRevenueDto() {}

        public String getIpId() { return ipId; }
        public void setIpId(String ipId) { this.ipId = ipId; }

        public String getPatientName() { return patientName; }
        public void setPatientName(String patientName) { this.patientName = patientName; }

        public String getRoomNumber() { return roomNumber; }
        public void setRoomNumber(String roomNumber) { this.roomNumber = roomNumber; }

        public String getBedNumber() { return bedNumber; }
        public void setBedNumber(String bedNumber) { this.bedNumber = bedNumber; }

        public String getWardType() { return wardType; }
        public void setWardType(String wardType) { this.wardType = wardType; }

        public String getDoctorName() { return doctorName; }
        public void setDoctorName(String doctorName) { this.doctorName = doctorName; }

        public String getAdmissionDate() { return admissionDate; }
        public void setAdmissionDate(String admissionDate) { this.admissionDate = admissionDate; }

        public BigDecimal getRoomPrice() { return roomPrice; }
        public void setRoomPrice(BigDecimal roomPrice) { this.roomPrice = roomPrice; }

        public BigDecimal getBedPrice() { return bedPrice; }
        public void setBedPrice(BigDecimal bedPrice) { this.bedPrice = bedPrice; }

        public BigDecimal getTotalCharges() { return totalCharges; }
        public void setTotalCharges(BigDecimal totalCharges) { this.totalCharges = totalCharges; }

        public BigDecimal getCollected() { return collected; }
        public void setCollected(BigDecimal collected) { this.collected = collected; }

        public String getPaymentStatus() { return paymentStatus; }
        public void setPaymentStatus(String paymentStatus) { this.paymentStatus = paymentStatus; }
    }

    public BigDecimal getTotalBilled() { return totalBilled; }
    public void setTotalBilled(BigDecimal totalBilled) { this.totalBilled = totalBilled; }

    public BigDecimal getTotalCollected() { return totalCollected; }
    public void setTotalCollected(BigDecimal totalCollected) { this.totalCollected = totalCollected; }

    public BigDecimal getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(BigDecimal totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public long getTotalAdmissions() { return totalAdmissions; }
    public void setTotalAdmissions(long totalAdmissions) { this.totalAdmissions = totalAdmissions; }

    public List<WardRevenueDto> getWardBreakdown() { return wardBreakdown; }
    public void setWardBreakdown(List<WardRevenueDto> wardBreakdown) { this.wardBreakdown = wardBreakdown; }

    public List<BedRevenueDto> getBedBreakdown() { return bedBreakdown; }
    public void setBedBreakdown(List<BedRevenueDto> bedBreakdown) { this.bedBreakdown = bedBreakdown; }
}
