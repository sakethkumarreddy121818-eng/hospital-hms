package com.carevista.hms.laboratory.dto;

import java.util.List;

public class UpdateLabResultsRequest {
    private List<UpdateLabItemResultDto> itemResults;
    private String technicianName;
    private String orderNotes;
    private Boolean markCompleted = false;

    public UpdateLabResultsRequest() {}

    public List<UpdateLabItemResultDto> getItemResults() { return itemResults; }
    public void setItemResults(List<UpdateLabItemResultDto> itemResults) { this.itemResults = itemResults; }

    public String getTechnicianName() { return technicianName; }
    public void setTechnicianName(String technicianName) { this.technicianName = technicianName; }

    public String getOrderNotes() { return orderNotes; }
    public void setOrderNotes(String orderNotes) { this.orderNotes = orderNotes; }

    public Boolean getMarkCompleted() { return markCompleted; }
    public void setMarkCompleted(Boolean markCompleted) { this.markCompleted = markCompleted; }
}
