package com.carevista.hms.security.controller;

import com.carevista.hms.common.dto.ApiResponse;
import com.carevista.hms.security.dto.LoginRequest;
import com.carevista.hms.security.dto.UserDto;
import com.carevista.hms.security.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/auth/login")
    public ResponseEntity<ApiResponse<UserDto>> login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
        UserDto user = authService.login(request, httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Authentication successful", user));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(HttpServletRequest httpRequest) {
        UserDto user = authService.getCurrentUser(httpRequest);
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest httpRequest) {
        authService.logout(httpRequest);
        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @GetMapping("/health")
    public ResponseEntity<ApiResponse<Map<String, Object>>> healthCheck() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("application", "CareVista Hospital Management SaaS");
        health.put("database", "MySQL 8.x Connected");
        health.put("version", "1.0.0");
        return ResponseEntity.ok(ApiResponse.success("System operational", health));
    }
}
