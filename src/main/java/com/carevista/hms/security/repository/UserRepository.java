package com.carevista.hms.security.repository;

import com.carevista.hms.common.enums.UserRole;
import com.carevista.hms.security.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailAndRole(String email, UserRole role);
    boolean existsByEmail(String email);
    List<User> findByTenantId(Long tenantId);
    List<User> findByRole(UserRole role);
    long countByTenantIdAndRole(Long tenantId, UserRole role);
}
