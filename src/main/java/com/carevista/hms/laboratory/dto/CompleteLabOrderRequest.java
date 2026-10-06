package com.carevista.hms.laboratory.dto;

public class CompleteLabOrderRequest {
    private String technicianName;
    private String notes;

    public CompleteLabOrderRequest() {}

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }
}
