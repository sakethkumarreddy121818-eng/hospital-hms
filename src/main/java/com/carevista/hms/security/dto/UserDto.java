package com.carevista.hms.security.dto;

import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.common.enums.UserStatus;
import com.carevista.hms.security.entity.User;

import java.time.LocalDateTime;

public class UserDto {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private UserRole role;
    private UserStatus status;
    private Long tenantId;
    private String hospitalName;
    private String department;
    private String permissions;
    private LocalDateTime lastLoginAt;
    private String token;

    public UserDto() {}

    public static UserDto fromEntity(User user) {
        if (user == null) return null;
        UserDto dto = new UserDto();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFullName(user.getFullName());
        dto.setPhone(user.getPhone());
        dto.setRole(user.getRole());
        dto.setStatus(user.getStatus());
        dto.setDepartment(user.getDepartment());
        dto.setPermissions(user.getPermissions());
        dto.setLastLoginAt(user.getLastLoginAt());
        if (user.getTenant() != null) {
            dto.setTenantId(user.getTenant().getId());
            dto.setHospitalName(user.getTenant().getHospitalName());
        }
        return dto;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }

    public String getPhone() { return phone; }
    public void setPhone(String phone) { this.phone = phone; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public UserStatus getStatus() { return status; }
    public void setStatus(UserStatus status) { this.status = status; }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }

    public String getHospitalName() { return hospitalName; }
    public void setHospitalName(String hospitalName) { this.hospitalName = hospitalName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public String getPermissions() { return permissions; }
    public void setPermissions(String permissions) { this.permissions = permissions; }

    public LocalDateTime getLastLoginAt() { return lastLoginAt; }
    public void setLastLoginAt(LocalDateTime lastLoginAt) { this.lastLoginAt = lastLoginAt; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
