package com.carevista.hms.security.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Base64;

@Service
public class TokenService {

    private static final Logger log = LoggerFactory.getLogger(TokenService.class);
    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final String secretKey;
    private final long expirationMs;

    public TokenService(
            @Value("${carevista.security.jwt-secret:CarevistaSuperSecretKeyForJwtAuthenticationTokens2026SecureKey}") String secretKey,
            @Value("${carevista.security.jwt-expiration-ms:86400000}") long expirationMs) {
        this.secretKey = (secretKey != null && !secretKey.trim().isEmpty())
                ? secretKey.trim()
                : "CarevistaSuperSecretKeyForJwtAuthenticationTokens2026SecureKey";
        this.expirationMs = expirationMs > 0 ? expirationMs : 86400000L;
    }

    public String generateToken(Long userId, String email, String role, Long tenantId) {
        long now = System.currentTimeMillis();
        long expiry = now + expirationMs;

        String safeEmail = email != null ? email.trim().toLowerCase() : "";
        String safeRole = role != null ? role.trim().toUpperCase() : "ADMIN";
        String tenantStr = tenantId != null ? String.valueOf(tenantId) : "";
        String userStr = userId != null ? String.valueOf(userId) : "";

        String payload = userStr + ":" + safeEmail + ":" + safeRole + ":" + tenantStr + ":" + now + ":" + expiry;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding().encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        String signature = computeSignature(encodedPayload);

        return encodedPayload + "." + signature;
    }

    public TokenData validateToken(String token) {
        if (token == null || token.trim().isEmpty()) {
            return null;
        }

        String[] parts = token.trim().split("\\.");
        if (parts.length != 2) {
            return null;
        }

        String encodedPayload = parts[0];
        String receivedSignature = parts[1];

        String expectedSignature = computeSignature(encodedPayload);
        if (!MessageDigest.isEqual(expectedSignature.getBytes(StandardCharsets.UTF_8), receivedSignature.getBytes(StandardCharsets.UTF_8))) {
            log.warn("Token validation failed: signature mismatch");
            return null;
        }

        try {
            byte[] decodedBytes = Base64.getUrlDecoder().decode(encodedPayload);
            String payload = new String(decodedBytes, StandardCharsets.UTF_8);
            String[] fields = payload.split(":");
            if (fields.length < 6) {
                return null;
            }

            Long userId = !fields[0].isEmpty() ? Long.parseLong(fields[0]) : null;
            String email = fields[1];
            String role = fields[2];
            Long tenantId = !fields[3].isEmpty() ? Long.parseLong(fields[3]) : null;
            long expiry = Long.parseLong(fields[5]);

            if (System.currentTimeMillis() > expiry) {
                log.warn("Token expired for user: {}", email);
                return null;
            }

            return new TokenData(userId, email, role, tenantId, true);
        } catch (Exception e) {
            log.warn("Token parsing error: {}", e.getMessage());
            return null;
        }
    }

    private String computeSignature(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(hmacBytes);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to calculate HMAC signature", e);
        }
    }

    public static class TokenData {
        private final Long userId;
        private final String email;
        private final String role;
        private final Long tenantId;
        private final boolean valid;

        public TokenData(Long userId, String email, String role, Long tenantId, boolean valid) {
            this.userId = userId;
            this.email = email;
            this.role = role;
            this.tenantId = tenantId;
            this.valid = valid;
        }

        public Long getUserId() { return userId; }
        public String getEmail() { return email; }
        public String getRole() { return role; }
        public Long getTenantId() { return tenantId; }
        public boolean isValid() { return valid; }
    }
}
