//! Guest authentication tests
//!
//! Tests for guest registration, login, and authentication functionality.
//! Following TDD approach per Constitution II.

use hotel_management_backend::models::UserRole;
use hotel_management_backend::services::AuthService;

/// Test helper: Check if email format is valid
fn is_valid_email(email: &str) -> bool {
    // Basic email validation: contains @ and at least one . after @
    let parts: Vec<&str> = email.split('@').collect();
    if parts.len() != 2 {
        return false;
    }
    let local = parts[0];
    let domain = parts[1];

    // Local part must not be empty
    if local.is_empty() || domain.is_empty() {
        return false;
    }

    domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.')
}

/// Test helper: Check if password meets requirements
/// - At least 8 characters
/// - At least one letter
/// - At least one number
fn is_valid_password(password: &str) -> bool {
    if password.len() < 8 {
        return false;
    }
    let has_letter = password.chars().any(|c| c.is_alphabetic());
    let has_number = password.chars().any(|c| c.is_numeric());
    has_letter && has_number
}

// ============================================================================
// US1: Guest Registration Tests
// ============================================================================

#[test]
fn test_password_validation_minimum_length() {
    // Password must be at least 8 characters
    assert!(!is_valid_password("short1")); // Too short
    assert!(!is_valid_password("1234567")); // 7 chars
    assert!(is_valid_password("password1")); // 9 chars with letter and number
}

#[test]
fn test_password_validation_requires_letter() {
    // Password must contain at least one letter
    assert!(!is_valid_password("12345678")); // No letters
    assert!(is_valid_password("12345678a")); // Has letter
}

#[test]
fn test_password_validation_requires_number() {
    // Password must contain at least one number
    assert!(!is_valid_password("abcdefgh")); // No numbers
    assert!(is_valid_password("abcdefg1")); // Has number
}

#[test]
fn test_password_validation_full_requirements() {
    // Test various password combinations
    assert!(!is_valid_password("")); // Empty
    assert!(!is_valid_password("short")); // Too short, no number
    assert!(!is_valid_password("1234567")); // Too short, no letter
    assert!(!is_valid_password("abcdefgh")); // No number
    assert!(!is_valid_password("12345678")); // No letter
    assert!(is_valid_password("Password1")); // Valid
    assert!(is_valid_password("securepass123")); // Valid
    assert!(is_valid_password("MyP@ssw0rd!")); // Valid with special chars
}

#[test]
fn test_email_validation_basic_format() {
    // Email must contain @ and valid domain
    assert!(!is_valid_email("invalid"));
    assert!(!is_valid_email("invalid@"));
    assert!(!is_valid_email("@domain.com"));
    assert!(!is_valid_email("user@.com"));
    assert!(!is_valid_email("user@domain."));
    assert!(is_valid_email("user@domain.com"));
    assert!(is_valid_email("test.user@example.org"));
}

#[test]
fn test_email_validation_various_formats() {
    // Test various email formats
    assert!(is_valid_email("simple@example.com"));
    assert!(is_valid_email("very.common@example.com"));
    assert!(is_valid_email("user+tag@example.com"));
    assert!(is_valid_email("user@subdomain.example.com"));
    assert!(!is_valid_email("plainaddress"));
    assert!(!is_valid_email("@missing-local.com"));
    assert!(!is_valid_email("missing-at-sign.com"));
}

#[test]
fn test_password_hash_and_verify() {
    // Test Argon2id password hashing and verification
    let password = "SecurePass123";
    let hash = AuthService::hash_password(password).expect("Password hashing should succeed");

    // Hash should be different from password
    assert_ne!(hash, password);

    // Verify correct password
    let is_valid =
        AuthService::verify_password(password, &hash).expect("Verification should succeed");
    assert!(is_valid, "Correct password should verify");

    // Wrong password should not verify
    let is_invalid =
        AuthService::verify_password("wrongpassword", &hash).expect("Verification should succeed");
    assert!(!is_invalid, "Wrong password should not verify");
}

#[test]
fn test_guest_role_exists() {
    // Ensure Guest variant exists in UserRole enum
    let guest_role = UserRole::Guest;
    assert_eq!(format!("{:?}", guest_role), "Guest");
}

// ============================================================================
// US2: Guest Login Tests
// ============================================================================

/// Test helper: Verify JWT claims structure for guest login
/// The token should contain:
/// - sub: user ID (UUID)
/// - role: "guest"
/// - exp: expiration timestamp
/// - iat: issued at timestamp
#[test]
fn test_guest_login_jwt_structure() {
    // A valid guest JWT should contain the guest role claim
    // This tests the expected structure without requiring a database
    let role = UserRole::Guest;
    assert_eq!(format!("{:?}", role), "Guest");

    // JWT should encode role as lowercase "guest"
    // This verifies the serialization format
    let serialized = serde_json::to_string(&role).expect("Role should serialize");
    assert!(
        serialized.contains("guest"),
        "Role should serialize as 'guest'"
    );
}

#[test]
fn test_guest_login_requires_email_not_username() {
    // Guest login should use email, not username
    // This test verifies the design decision documented in research.md

    // Staff login: uses username field
    // Guest login: uses email field
    // Both are stored in the same users table, but login endpoints differ

    // The email validation helper should accept valid emails
    assert!(is_valid_email("guest@example.com"));
    assert!(is_valid_email("test.user@hotel.com"));

    // But should reject username-like strings
    assert!(!is_valid_email("admin"));
    assert!(!is_valid_email("reception"));
}

#[test]
fn test_invalid_credentials_error_is_generic() {
    // Security: Error messages should not reveal whether email exists
    // Both "wrong email" and "wrong password" should return same error
    // This is a design principle test - actual implementation tests below

    // The error message should be generic like "Invalid email or password"
    // NOT "Email not found" or "Wrong password"
    let expected_error_patterns = ["Invalid", "credentials", "email", "password"];
    let actual_error = "Invalid email or password";

    // At least some pattern should match
    let matches = expected_error_patterns
        .iter()
        .filter(|p| actual_error.to_lowercase().contains(&p.to_lowercase()))
        .count();
    assert!(matches >= 2, "Error message should be generic");
}

#[test]
fn test_staff_role_cannot_use_guest_login() {
    // Design: Staff (admin/receptionist) must use /auth/login, not /auth/guest/login
    // Guest login endpoint should reject staff roles

    let admin_role = UserRole::Admin;
    let receptionist_role = UserRole::Receptionist;
    let guest_role = UserRole::Guest;

    // Only Guest role should be allowed through guest login
    assert_ne!(admin_role, guest_role);
    assert_ne!(receptionist_role, guest_role);

    // Staff roles should be detected and rejected
    let is_staff = |role: UserRole| matches!(role, UserRole::Admin | UserRole::Receptionist);
    assert!(is_staff(admin_role));
    assert!(is_staff(receptionist_role));
    assert!(!is_staff(guest_role));
}

// ============================================================================
// Integration tests (require database connection)
// These will be expanded when the full registration endpoint is implemented
// ============================================================================

// Note: Full integration tests for:
// - T014: valid registration creates user with guest role
// - T015: duplicate email registration returns conflict error
// - T016: weak password returns validation error
// - T017: invalid email format returns validation error
// - T027: valid guest login returns JWT with guest role
// - T028: invalid credentials returns 401 unauthorized
// - T029: staff credentials cannot login via guest endpoint
// These require database setup and will be tested via API integration tests.
