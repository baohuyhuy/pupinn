use argon2::{
    password_hash::{rand_core::OsRng, PasswordHash, PasswordHasher, PasswordVerifier, SaltString},
    Argon2,
};
use chrono::{Duration, Utc};
use diesel::prelude::*;
use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, Validation};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::{AppError, AppResult};
use crate::models::{GuestInfo, NewGuestUser, NewUser, User, UserInfo, UserRole};
use crate::schema::users;

/// JWT claims structure
#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,        // User ID
    pub role: UserRole,   // User role
    pub exp: i64,         // Expiration timestamp
    pub iat: i64,         // Issued at timestamp
}

/// Login request payload
#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

/// Login response payload
#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

/// Create user request payload
#[derive(Debug, Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub password: String,
    pub role: UserRole,
}

/// Guest registration request payload
#[derive(Debug, Deserialize)]
pub struct GuestRegisterRequest {
    pub email: String,
    pub password: String,
    pub full_name: String,
}

/// Guest authentication response payload
#[derive(Debug, Serialize)]
pub struct GuestAuthResponse {
    pub token: String,
    pub user: GuestInfo,
}

/// Guest login request payload
#[derive(Debug, Deserialize)]
pub struct GuestLoginRequest {
    pub email: String,
    pub password: String,
}

/// Authentication service for user management and JWT operations
pub struct AuthService {
    pool: DbPool,
    jwt_secret: String,
    token_expiry_hours: i64,
}

impl AuthService {
    /// Create a new AuthService instance
    pub fn new(pool: DbPool, jwt_secret: String) -> Self {
        Self {
            pool,
            jwt_secret,
            token_expiry_hours: 8, // 8-hour token expiry (single shift)
        }
    }

    /// Hash a password using Argon2id
    pub fn hash_password(password: &str) -> AppResult<String> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| AppError::InternalError(format!("Password hashing failed: {}", e)))?;
        Ok(hash.to_string())
    }

    /// Verify a password against a hash
    pub fn verify_password(password: &str, hash: &str) -> AppResult<bool> {
        let parsed_hash = PasswordHash::new(hash)
            .map_err(|e| AppError::InternalError(format!("Invalid password hash: {}", e)))?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }

    /// Generate a JWT token for a user
    pub fn generate_token(&self, user: &User) -> AppResult<String> {
        let now = Utc::now();
        let exp = now + Duration::hours(self.token_expiry_hours);

        let claims = Claims {
            sub: user.id,
            role: user.role,
            exp: exp.timestamp(),
            iat: now.timestamp(),
        };

        encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )
        .map_err(|e| AppError::InternalError(format!("Token generation failed: {}", e)))
    }

    /// Validate and decode a JWT token
    pub fn validate_token(&self, token: &str) -> AppResult<Claims> {
        let token_data = decode::<Claims>(
            token,
            &DecodingKey::from_secret(self.jwt_secret.as_bytes()),
            &Validation::default(),
        )?;
        Ok(token_data.claims)
    }

    /// Login a user with username and password
    pub fn login(&self, request: &LoginRequest) -> AppResult<LoginResponse> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let user: User = users::table
            .filter(users::username.eq(&request.username))
            .first(&mut conn)
            .map_err(|_| AppError::Unauthorized("Invalid credentials".to_string()))?;

        if !Self::verify_password(&request.password, &user.password_hash)? {
            return Err(AppError::Unauthorized("Invalid credentials".to_string()));
        }

        let token = self.generate_token(&user)?;

        Ok(LoginResponse {
            token,
            user: user.into(),
        })
    }

    /// Get user by ID
    pub fn get_user_by_id(&self, user_id: Uuid) -> AppResult<User> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        users::table
            .find(user_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound("User not found".to_string()))
    }

    /// Create a new user (admin only)
    pub fn create_user(&self, request: &CreateUserRequest) -> AppResult<UserInfo> {
        // Validate password length
        if request.password.len() < 8 {
            return Err(AppError::ValidationError(
                "Password must be at least 8 characters".to_string(),
            ));
        }

        // Validate username length
        if request.username.len() < 3 || request.username.len() > 50 {
            return Err(AppError::ValidationError(
                "Username must be between 3 and 50 characters".to_string(),
            ));
        }

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Check if username already exists
        let existing: Option<User> = users::table
            .filter(users::username.eq(&request.username))
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::ValidationError(
                "Username already exists".to_string(),
            ));
        }

        let password_hash = Self::hash_password(&request.password)?;

        let new_user = NewUser {
            username: Some(&request.username),
            password_hash: &password_hash,
            role: request.role,
            email: None,
            full_name: None,
        };

        let user: User = diesel::insert_into(users::table)
            .values(&new_user)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(user.into())
    }

    /// Validate password requirements:
    /// - At least 8 characters
    /// - At least one letter
    /// - At least one number
    pub fn validate_guest_password(password: &str) -> AppResult<()> {
        if password.len() < 8 {
            return Err(AppError::ValidationError(
                "Password must be at least 8 characters".to_string(),
            ));
        }

        let has_letter = password.chars().any(|c| c.is_alphabetic());
        if !has_letter {
            return Err(AppError::ValidationError(
                "Password must contain at least one letter".to_string(),
            ));
        }

        let has_number = password.chars().any(|c| c.is_numeric());
        if !has_number {
            return Err(AppError::ValidationError(
                "Password must contain at least one number".to_string(),
            ));
        }

        Ok(())
    }

    /// Validate email format (basic validation)
    pub fn validate_email(email: &str) -> AppResult<()> {
        // Trim whitespace
        let email = email.trim();

        if email.is_empty() {
            return Err(AppError::ValidationError(
                "Email is required".to_string(),
            ));
        }

        // Basic email format validation
        let parts: Vec<&str> = email.split('@').collect();
        if parts.len() != 2 {
            return Err(AppError::ValidationError(
                "Invalid email format".to_string(),
            ));
        }

        let local = parts[0];
        let domain = parts[1];

        if local.is_empty() || domain.is_empty() {
            return Err(AppError::ValidationError(
                "Invalid email format".to_string(),
            ));
        }

        if !domain.contains('.') || domain.starts_with('.') || domain.ends_with('.') {
            return Err(AppError::ValidationError(
                "Invalid email format".to_string(),
            ));
        }

        Ok(())
    }

    /// Register a new guest user
    pub fn register_guest(&self, request: &GuestRegisterRequest) -> AppResult<GuestAuthResponse> {
        // Validate email format
        Self::validate_email(&request.email)?;

        // Validate password requirements
        Self::validate_guest_password(&request.password)?;

        // Validate full name
        let full_name = request.full_name.trim();
        if full_name.is_empty() {
            return Err(AppError::ValidationError(
                "Full name is required".to_string(),
            ));
        }
        if full_name.len() > 100 {
            return Err(AppError::ValidationError(
                "Full name must be 100 characters or less".to_string(),
            ));
        }

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Check if email already exists
        let email_lower = request.email.trim().to_lowercase();
        let existing: Option<User> = users::table
            .filter(users::email.eq(&email_lower))
            .first(&mut conn)
            .optional()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        if existing.is_some() {
            return Err(AppError::Conflict(
                "An account with this email already exists".to_string(),
            ));
        }

        // Hash password
        let password_hash = Self::hash_password(&request.password)?;

        // Create new guest user
        let new_guest = NewGuestUser {
            email: &email_lower,
            full_name,
            password_hash: &password_hash,
            role: UserRole::Guest,
        };

        let user: User = diesel::insert_into(users::table)
            .values(&new_guest)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Generate JWT token
        let token = self.generate_token(&user)?;

        // Convert to GuestInfo
        let guest_info = GuestInfo::try_from(user)
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        Ok(GuestAuthResponse {
            token,
            user: guest_info,
        })
    }

    /// Login a guest user with email and password
    ///
    /// # Arguments
    /// * `request` - Guest login request with email and password
    ///
    /// # Returns
    /// * `GuestAuthResponse` with user info and JWT token on success
    ///
    /// # Errors
    /// * `Unauthorized` - Invalid email or password
    /// * `Unauthorized` - Account exists but is not a guest account (staff trying guest login)
    pub fn login_guest(&self, request: &GuestLoginRequest) -> AppResult<GuestAuthResponse> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Look up user by email
        let email_lower = request.email.trim().to_lowercase();
        let user: User = users::table
            .filter(users::email.eq(&email_lower))
            .first(&mut conn)
            .map_err(|_| AppError::Unauthorized("Invalid email or password".to_string()))?;

        // Verify password
        if !Self::verify_password(&request.password, &user.password_hash)? {
            return Err(AppError::Unauthorized(
                "Invalid email or password".to_string(),
            ));
        }

        // Ensure user has guest role (staff should use /auth/login, not /auth/guest/login)
        if user.role != UserRole::Guest {
            return Err(AppError::Unauthorized(
                "Invalid email or password".to_string(),
            ));
        }

        // Generate JWT token
        let token = self.generate_token(&user)?;

        // Convert to GuestInfo
        let guest_info = GuestInfo::try_from(user)
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        Ok(GuestAuthResponse {
            token,
            user: guest_info,
        })
    }

    /// Get guest user by ID (for /auth/guest/me endpoint)
    ///
    /// # Arguments
    /// * `user_id` - The user's UUID
    ///
    /// # Returns
    /// * `GuestInfo` on success
    ///
    /// # Errors
    /// * `NotFound` - User not found
    /// * `Forbidden` - User is not a guest
    pub fn get_guest_by_id(&self, user_id: Uuid) -> AppResult<GuestInfo> {
        let user = self.get_user_by_id(user_id)?;

        // Verify the user is a guest
        if user.role != UserRole::Guest {
            return Err(AppError::Forbidden(
                "Guest access only".to_string(),
            ));
        }

        GuestInfo::try_from(user).map_err(|e| AppError::InternalError(e.to_string()))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_hashing() {
        let password = "test_password_123";
        let hash = AuthService::hash_password(password).unwrap();

        // Hash should be different from password
        assert_ne!(hash, password);

        // Verification should succeed
        assert!(AuthService::verify_password(password, &hash).unwrap());

        // Wrong password should fail
        assert!(!AuthService::verify_password("wrong_password", &hash).unwrap());
    }

    #[test]
    fn test_password_hash_format() {
        let password = "test_password_123";
        let hash = AuthService::hash_password(password).unwrap();

        // Argon2 hash should start with $argon2
        assert!(hash.starts_with("$argon2"));
    }
}

