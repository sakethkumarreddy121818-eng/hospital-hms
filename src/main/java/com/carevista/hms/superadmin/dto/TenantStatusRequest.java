package com.carevista.hms.superadmin.dto;

import com.carevista.hms.common.enums.TenantStatus;
import jakarta.validation.constraints.NotNull;

public class TenantStatusRequest {

    @NotNull(message = "Status is required (ACTIVE or DISABLED)")
    private TenantStatus status;

    public TenantStatusRequest() {}

    public TenantStatusRequest(TenantStatus status) {
        this.status = status;
    }

    public TenantStatus getStatus() { return status; }
    public void setStatus(TenantStatus status) { this.status = status; }
}
