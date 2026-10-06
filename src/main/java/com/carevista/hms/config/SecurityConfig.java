package com.carevista.hms.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                // Static resources & Frontend
                .requestMatchers("/", "/index.html", "/css/**", "/js/**", "/assets/**", "/favicon.ico").permitAll()
                // Public APIs
                .requestMatchers("/api/auth/login", "/api/auth/logout", "/api/health").permitAll()
                // Super Admin APIs
                .requestMatchers("/api/superadmin/**").hasRole("SUPER_ADMIN")
                // Admin APIs
                .requestMatchers("/api/admin/**", "/api/settings/**").hasRole("ADMIN")
                // Employee APIs
                .requestMatchers("/api/employee/**").hasRole("EMPLOYEE")
                // OP Registration APIs
                .requestMatchers("/api/op/**").hasAnyRole("ADMIN", "EMPLOYEE")
                // IP Management & Rooms APIs
                .requestMatchers("/api/ip/**").hasAnyRole("ADMIN", "EMPLOYEE")
                // Pharmacy APIs
                .requestMatchers("/api/pharmacy/**").hasAnyRole("ADMIN", "EMPLOYEE")
                // Other APIs
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint((request, response, authException) -> {
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    Map<String, Object> body = new HashMap<>();
                    body.put("success", false);
                    body.put("message", "Access denied. Please log in to continue.");
                    body.put("error", authException.getMessage());
                    objectMapper.writeValue(response.getOutputStream(), body);
                })
            )
            .logout(logout -> logout
                .logoutUrl("/api/auth/logout")
                .logoutSuccessHandler((request, response, authentication) -> {
                    response.setStatus(HttpServletResponse.SC_OK);
                    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                    Map<String, Object> body = new HashMap<>();
                    body.put("success", true);
                    body.put("message", "Logged out successfully");
                    objectMapper.writeValue(response.getOutputStream(), body);
                })
            );

        return http.build();
    }
}
