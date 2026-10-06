package com.carevista.hms.ip.dto;

import java.math.BigDecimal;

public class DischargeIpRequest {

    private String dischargeNotes;
    private BigDecimal additionalCharges = BigDecimal.ZERO;
    private String finalPaymentMethod = "CASH";

    public DischargeIpRequest() {}

    public String getDischargeNotes() { return dischargeNotes; }
    public void setDischargeNotes(String dischargeNotes) { this.dischargeNotes = dischargeNotes; }

    public BigDecimal getAdditionalCharges() { return additionalCharges; }
    public void setAdditionalCharges(BigDecimal additionalCharges) { this.additionalCharges = additionalCharges; }

    public String getFinalPaymentMethod() { return finalPaymentMethod; }
    public void setFinalPaymentMethod(String finalPaymentMethod) { this.finalPaymentMethod = finalPaymentMethod; }
}
