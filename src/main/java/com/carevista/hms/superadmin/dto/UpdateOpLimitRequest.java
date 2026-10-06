package com.carevista.hms.superadmin.dto;

import jakarta.validation.constraints.Min;

public class UpdateOpLimitRequest {

    @Min(value = 1, message = "OP Limit must be at least 1")
    private int opLimit;

    public UpdateOpLimitRequest() {}

    public UpdateOpLimitRequest(int opLimit) {
        this.opLimit = opLimit;
    }

    public int getOpLimit() { return opLimit; }
    public void setOpLimit(int opLimit) { this.opLimit = opLimit; }
}
