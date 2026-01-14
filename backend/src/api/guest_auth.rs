//! Guest authentication API handlers
//!
//! Handles guest registration, login, and profile operations.

use axum::{extract::State, http::StatusCode, Extension, Json};
use serde::{Deserialize, Serialize};

use crate::api::middleware::AuthUser;
use crate::api::AppState;
use crate::errors::AppError;
use crate::models::GuestInfo;
use crate::services::auth_service::ChangePasswordRequest;
use crate::services::{AuthService, GuestAuthResponse, GuestLoginRequest, GuestRegisterRequest};

/// Response wrapper for authentication (matches API contract)
#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub user: GuestInfo,
    pub token: String,
}

impl From<GuestAuthResponse> for AuthResponse {
    fn from(response: GuestAuthResponse) -> Self {
        Self {
            user: response.user,
            token: response.token,
        }
    }
}

/// Change password DTO for guest users
#[derive(Debug, Deserialize)]
pub struct GuestChangePasswordDto {
    pub current_password: String,
    pub new_password: String,
}

/// POST /auth/register - Register a new guest account
///
/// Creates a new guest user account with email, password, and full name.
/// Returns the user info and a JWT token on success.
///
/// # Request Body
/// ```json
/// {
///   "email": "guest@example.com",
///   "password": "SecurePass123",
///   "full_name": "John Doe"
/// }
/// ```
///
/// # Response (201 Created)
/// ```json
/// {
///   "user": {
///     "id": "uuid",
///     "email": "guest@example.com",
///     "full_name": "John Doe",
///     "role": "guest"
///   },
///   "token": "jwt-token-here"
/// }
/// ```
///
/// # Errors
/// - 400 Bad Request: Invalid email, weak password, or missing fields
/// - 409 Conflict: Email already registered
pub async fn register(
    State(state): State<AppState>,
    Json(request): Json<GuestRegisterRequest>,
) -> Result<(StatusCode, Json<AuthResponse>), AppError> {
    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let response = auth_service.register_guest(&request)?;

    Ok((StatusCode::CREATED, Json(response.into())))
}

/// POST /auth/guest/login - Login as a guest user
///
/// Authenticates a guest user with email and password.
/// Returns the user info and a JWT token on success.
///
/// # Request Body
/// ```json
/// {
///   "email": "guest@example.com",
///   "password": "SecurePass123"
/// }
/// ```
///
/// # Response (200 OK)
/// ```json
/// {
///   "user": {
///     "id": "uuid",
///     "email": "guest@example.com",
///     "full_name": "John Doe",
///     "role": "guest"
///   },
///   "token": "jwt-token-here"
/// }
/// ```
///
/// # Errors
/// - 401 Unauthorized: Invalid email or password
pub async fn login(
    State(state): State<AppState>,
    Json(request): Json<GuestLoginRequest>,
) -> Result<Json<AuthResponse>, AppError> {
    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let response = auth_service.login_guest(&request)?;

    Ok(Json(response.into()))
}

/// GET /auth/guest/me - Get current guest user info
///
/// Returns the authenticated guest user's profile information.
/// Requires a valid guest JWT token.
///
/// # Response (200 OK)
/// ```json
/// {
///   "id": "uuid",
///   "email": "guest@example.com",
///   "full_name": "John Doe",
///   "role": "guest"
/// }
/// ```
///
/// # Errors
/// - 401 Unauthorized: No or invalid token
/// - 403 Forbidden: Token belongs to non-guest user
pub async fn me(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<Json<GuestInfo>, AppError> {
    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let guest_info = auth_service.get_guest_by_id(auth_user.user_id)?;

    Ok(Json(guest_info))
}

/// POST /auth/guest/change-password - Change password for authenticated guest
pub async fn change_password(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<GuestChangePasswordDto>,
) -> Result<StatusCode, AppError> {
    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let request = ChangePasswordRequest {
        current_password: payload.current_password,
        new_password: payload.new_password,
    };

    auth_service.change_guest_password(auth_user.user_id, &request)?;

    Ok(StatusCode::NO_CONTENT)
}
