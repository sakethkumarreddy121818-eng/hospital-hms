package com.carevista.hms.common.util;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.regex.Pattern;

/**
 * Shared utility for strict validation of patient attributes across
 * Outpatient (OP), Inpatient (IP), Pharmacy, and Laboratory modules.
 */
public final class PatientValidationUtil {

    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z]+(\\s+[a-zA-Z]+)*$");
    private static final Pattern PHONE_PATTERN = Pattern.compile("^\\d{10}$");

    private PatientValidationUtil() {}

    /**
     * Validates that the patient name contains only alphabetic characters and spaces.
     * Rejects numbers, punctuation, symbols, and whitespace-only strings.
     */
    public static String validatePatientName(String name, boolean mandatory) {
        if (name == null || name.trim().isEmpty()) {
            if (mandatory) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patient name is required.");
            }
            return null;
        }
        String trimmed = name.trim();
        if (!NAME_PATTERN.matcher(trimmed).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Patient name must contain alphabetic characters and spaces only (no numbers or special characters).");
        }
        return trimmed;
    }

    /**
     * Validates that patient age contains numeric digits only with a maximum of three digits (0-150).
     */
    public static Integer validatePatientAge(Integer age, boolean mandatory) {
        if (age == null) {
            if (mandatory) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patient age is required.");
            }
            return null;
        }
        if (age < 0 || age > 150) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Patient age must be numeric digits only with a maximum of three digits (0-150).");
        }
        return age;
    }

    /**
     * Validates that patient phone contains exactly 10 numeric digits.
     * Rejects letters, spaces, and special characters (+, -, parentheses, etc.).
     */
    public static String validatePatientPhone(String phone, boolean mandatory) {
        if (phone == null || phone.trim().isEmpty()) {
            if (mandatory) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Patient phone number is required.");
            }
            return null;
        }
        String trimmed = phone.trim();
        if (!PHONE_PATTERN.matcher(trimmed).matches()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Patient phone number must contain numeric digits only and be exactly 10 digits.");
        }
        return trimmed;
    }
}
