package com.carevista.hms.security.filter;

import com.carevista.hms.security.service.TokenService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class TokenAuthenticationFilter extends OncePerRequestFilter {

    private final TokenService tokenService;

    public TokenAuthenticationFilter(TokenService tokenService) {
        this.tokenService = tokenService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.trim().startsWith("Bearer ")) {
            String token = authHeader.trim().substring(7).trim();
            TokenService.TokenData tokenData = tokenService.validateToken(token);

            if (tokenData != null && tokenData.isValid()) {
                String authority = "ROLE_" + tokenData.getRole();
                UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                        tokenData.getEmail(),
                        null,
                        Collections.singletonList(new SimpleGrantedAuthority(authority))
                );

                // Populate security context if not already populated or if anonymous
                if (SecurityContextHolder.getContext().getAuthentication() == null ||
                        "anonymousUser".equals(SecurityContextHolder.getContext().getAuthentication().getName())) {
                    SecurityContextHolder.getContext().setAuthentication(auth);
                }

                // Propagate user and tenant credentials to request attributes
                request.setAttribute("USER_ID", tokenData.getUserId());
                request.setAttribute("USER_EMAIL", tokenData.getEmail());
                request.setAttribute("USER_ROLE", tokenData.getRole());
                if (tokenData.getTenantId() != null) {
                    request.setAttribute("TENANT_ID", tokenData.getTenantId());
                }

                // If session exists or is created, propagate attributes for seamless session continuity
                HttpSession session = request.getSession(false);
                if (session != null) {
                    session.setAttribute("USER_ID", tokenData.getUserId());
                    session.setAttribute("USER_EMAIL", tokenData.getEmail());
                    session.setAttribute("USER_ROLE", tokenData.getRole());
                    if (tokenData.getTenantId() != null) {
                        session.setAttribute("TENANT_ID", tokenData.getTenantId());
                    }
                }
            }
        }

        filterChain.doFilter(request, response);
    }
}
