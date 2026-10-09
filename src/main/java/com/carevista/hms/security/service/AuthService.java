package com.carevista.hms.security.service;

import com.carevista.hms.audit.service.AuditService;
import com.carevista.hms.common.enums.TenantStatus;
import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.common.enums.UserStatus;
import com.carevista.hms.security.dto.LoginRequest;
import com.carevista.hms.security.dto.UserDto;
import com.carevista.hms.security.entity.User;
import com.carevista.hms.security.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collections;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final TokenService tokenService;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, AuditService auditService, TokenService tokenService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.auditService = auditService;
        this.tokenService = tokenService;
    }

    @Transactional
    public UserDto login(LoginRequest request, HttpServletRequest httpRequest) {
        String clientIp = getClientIp(httpRequest);

        User user = userRepository.findByEmail(request.getEmail().trim().toLowerCase())
                .orElseThrow(() -> {
                    auditService.log(null, request.getEmail(), request.getRole().name(), null,
                            "LOGIN_FAILED", "User not found with email: " + request.getEmail(), clientIp, "FAILED");
                    return new BadCredentialsException("Invalid email or password.");
                });

        // Verify role
        if (user.getRole() != request.getRole()) {
            auditService.log(user.getId(), user.getEmail(), request.getRole().name(),
                    user.getTenant() != null ? user.getTenant().getId() : null,
                    "LOGIN_FAILED", "Role mismatch. Attempted: " + request.getRole() + ", Actual: " + user.getRole(),
                    clientIp, "FAILED");
            throw new BadCredentialsException("Invalid credentials for role " + request.getRole() + ".");
        }

        // Verify user status
        if (user.getStatus() == UserStatus.DISABLED) {
            auditService.log(user.getId(), user.getEmail(), user.getRole().name(),
                    user.getTenant() != null ? user.getTenant().getId() : null,
                    "LOGIN_BLOCKED", "User account is disabled", clientIp, "BLOCKED");
            throw new DisabledException("Your account is currently disabled. Please contact your administrator.");
        }

        // Verify tenant status if user belongs to a tenant
        if (user.getTenant() != null && user.getTenant().getStatus() == TenantStatus.DISABLED) {
            auditService.log(user.getId(), user.getEmail(), user.getRole().name(),
                    user.getTenant().getId(),
                    "LOGIN_BLOCKED", "Tenant " + user.getTenant().getHospitalName() + " is disabled", clientIp, "BLOCKED");
            throw new DisabledException("Access restricted: Hospital account is disabled by Super Admin.");
        }

        // Verify password
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            auditService.log(user.getId(), user.getEmail(), user.getRole().name(),
                    user.getTenant() != null ? user.getTenant().getId() : null,
                    "LOGIN_FAILED", "Invalid password provided", clientIp, "FAILED");
            throw new BadCredentialsException("Invalid email or password.");
        }

        // Update last login
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        // Setup Spring Security Context & Session
        String authority = "ROLE_" + user.getRole().name();
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                Collections.singletonList(new SimpleGrantedAuthority(authority))
        );

        SecurityContext sc = SecurityContextHolder.createEmptyContext();
        sc.setAuthentication(auth);
        SecurityContextHolder.setContext(sc);

        HttpSession session = httpRequest.getSession(true);
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY, sc);
        session.setAttribute("USER_ID", user.getId());
        session.setAttribute("USER_ROLE", user.getRole().name());
        session.setAttribute("USER_EMAIL", user.getEmail());
        if (user.getTenant() != null) {
            session.setAttribute("TENANT_ID", user.getTenant().getId());
        }

        auditService.log(user.getId(), user.getEmail(), user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null,
                "LOGIN_SUCCESS", "User successfully authenticated as " + user.getRole(), clientIp, "SUCCESS");

        UserDto dto = UserDto.fromEntity(user);
        String token = tokenService.generateToken(
                user.getId(),
                user.getEmail(),
                user.getRole().name(),
                user.getTenant() != null ? user.getTenant().getId() : null
        );
        dto.setToken(token);
        return dto;
    }

    public UserDto getCurrentUser(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        Long userId = null;
        if (session != null && session.getAttribute("USER_ID") != null) {
            userId = (Long) session.getAttribute("USER_ID");
        } else if (request.getAttribute("USER_ID") != null) {
            userId = (Long) request.getAttribute("USER_ID");
        }

        if (userId == null) {
            // Check authorization token from header
            String authHeader = request.getHeader("Authorization");
            if (authHeader != null && authHeader.trim().startsWith("Bearer ")) {
                TokenService.TokenData tokenData = tokenService.validateToken(authHeader.trim().substring(7).trim());
                if (tokenData != null && tokenData.isValid()) {
                    userId = tokenData.getUserId();
                }
            }
        }

        if (userId == null) {
            return null;
        }

        return userRepository.findById(userId)
                .map(u -> {
                    UserDto d = UserDto.fromEntity(u);
                    String tok = tokenService.generateToken(
                            u.getId(),
                            u.getEmail(),
                            u.getRole().name(),
                            u.getTenant() != null ? u.getTenant().getId() : null
                    );
                    d.setToken(tok);
                    return d;
                })
                .orElse(null);
    }

    public void logout(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null) {
            Long userId = (Long) session.getAttribute("USER_ID");
            String userEmail = null;
            String userRole = null;
            Long tenantId = null;

            if (userId != null) {
                User user = userRepository.findById(userId).orElse(null);
                if (user != null) {
                    userEmail = user.getEmail();
                    userRole = user.getRole().name();
                    tenantId = user.getTenant() != null ? user.getTenant().getId() : null;
                }
            }

            auditService.log(userId, userEmail, userRole, tenantId,
                    "LOGOUT", "User logged out", getClientIp(request), "SUCCESS");

            session.invalidate();
        }
        SecurityContextHolder.clearContext();
    }

    private String getClientIp(HttpServletRequest request) {
        if (request == null) return "127.0.0.1";
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip != null ? ip : "127.0.0.1";
    }
}
