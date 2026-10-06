package com.carevista.hms.ip.controller;

import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.ip.dto.*;
import com.carevista.hms.ip.service.IpService;
import com.carevista.hms.op.dto.PatientSearchDto;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/ip")
public class IpController {

    private final IpService ipService;

    public IpController(IpService ipService) {
        this.ipService = ipService;
    }

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<RoomBedSummaryDto>> getRoomBedSummary(HttpServletRequest httpRequest) {
        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        RoomBedSummaryDto summary = ipService.getRoomBedSummary(tenantId);
        return ResponseEntity.ok(ApiResponse.success(summary));
    }

    @GetMapping("/rooms")
    public ResponseEntity<ApiResponse<List<RoomDto>>> getAllRooms(
            @RequestParam(required = false, defaultValue = "") String type,
            @RequestParam(required = false, defaultValue = "") String status,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<RoomDto> rooms = ipService.getAllRooms(tenantId, type, status);
        return ResponseEntity.ok(ApiResponse.success(rooms));
    }

    @PostMapping("/rooms/create")
    public ResponseEntity<ApiResponse<RoomDto>> createRoom(
            @Valid @RequestBody CreateRoomRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            RoomDto created = ipService.createRoomWithBeds(
                    tenantId, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Room and beds configured successfully.", created));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @GetMapping("/rooms/{roomId}/available-beds")
    public ResponseEntity<ApiResponse<List<BedDto>>> getAvailableBeds(
            @PathVariable Long roomId,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<BedDto> beds = ipService.getAvailableBedsForRoom(tenantId, roomId);
        return ResponseEntity.ok(ApiResponse.success(beds));
    }

    @PutMapping("/beds/{bedId}/status")
    public ResponseEntity<ApiResponse<BedDto>> updateBedStatus(
            @PathVariable Long bedId,
            @RequestBody Map<String, String> body,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            String newStatus = body.getOrDefault("status", "AVAILABLE");
            BedDto updated = ipService.updateBedStatus(
                    tenantId, bedId, newStatus,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Bed status updated successfully.", updated));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @PostMapping("/admissions/create")
    public ResponseEntity<ApiResponse<IpAdmissionDto>> createAdmission(
            @Valid @RequestBody CreateIpAdmissionRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            IpAdmissionDto created = ipService.createAdmission(
                    tenantId, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("IP admission created successfully.", created));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @GetMapping("/admissions/current")
    public ResponseEntity<ApiResponse<List<IpAdmissionDto>>> getCurrentInpatients(
            @RequestParam(required = false, defaultValue = "") String search,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<IpAdmissionDto> list = ipService.getCurrentInpatients(tenantId, search);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/admissions/history")
    public ResponseEntity<ApiResponse<List<IpAdmissionDto>>> getIpHistory(
            @RequestParam(required = false, defaultValue = "") String search,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<IpAdmissionDto> list = ipService.getIpHistory(tenantId, search);
        return ResponseEntity.ok(ApiResponse.success(list));
    }

    @GetMapping("/admissions/{id}")
    public ResponseEntity<ApiResponse<IpAdmissionDto>> getIpDetails(
            @PathVariable Long id,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            IpAdmissionDto details = ipService.getIpDetails(tenantId, id);
            return ResponseEntity.ok(ApiResponse.success(details));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        }
    }

    @PostMapping("/admissions/{id}/discharge")
    public ResponseEntity<ApiResponse<IpAdmissionDto>> dischargePatient(
            @PathVariable Long id,
            @RequestBody(required = false) DischargeIpRequest request,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        try {
            IpAdmissionDto discharged = ipService.dischargePatient(
                    tenantId, id, request,
                    getUserId(httpRequest), getUserEmail(httpRequest), httpRequest.getRemoteAddr()
            );
            return ResponseEntity.ok(ApiResponse.success("Patient discharged successfully. Bed released to Available.", discharged));
        } catch (ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode()).body(ApiResponse.error(rse.getReason()));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(ApiResponse.error(ex.getMessage()));
        }
    }

    @GetMapping("/search-patients")
    public ResponseEntity<ApiResponse<List<PatientSearchDto>>> searchPatients(
            @RequestParam(required = false, defaultValue = "") String q,
            HttpServletRequest httpRequest) {

        Long tenantId = getAuthenticatedTenantId(httpRequest);
        if (tenantId == null) {
            return ResponseEntity.status(403).body(ApiResponse.error("Tenant identification missing from session."));
        }
        List<PatientSearchDto> results = ipService.searchPatientsForIp(tenantId, q);
        return ResponseEntity.ok(ApiResponse.success(results));
    }

    private Long getAuthenticatedTenantId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("TENANT_ID") != null) {
            return (Long) session.getAttribute("TENANT_ID");
        }
        return null;
    }

    private Long getUserId(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_ID") != null) {
            return (Long) session.getAttribute("USER_ID");
        }
        return null;
    }

    private String getUserEmail(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("USER_EMAIL") != null) {
            return (String) session.getAttribute("USER_EMAIL");
        }
        return "system";
    }
}
