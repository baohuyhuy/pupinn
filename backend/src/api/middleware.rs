use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};

use crate::api::AppState;
use crate::errors::AppError;
use crate::models::UserRole;
use crate::services::AuthService;

/// Extension to hold authenticated user info
#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct AuthUser {
    pub user_id: uuid::Uuid,
    pub role: UserRole,
}

/// Extract JWT token from Authorization header
fn extract_token(request: &Request) -> Option<String> {
    request
        .headers()
        .get(AUTHORIZATION)
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer ").map(|s| s.to_string()))
}

/// Middleware to require authentication
#[allow(dead_code)]
pub async fn require_auth(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, axum::Json<serde_json::Value>)> {
    let token = extract_token(&request).ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid authorization header"
            })),
        )
    })?;

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let claims = auth_service.validate_token(&token).map_err(|e| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": e.to_string()
            })),
        )
    })?;

    // Add user info to request extensions
    let auth_user = AuthUser {
        user_id: claims.sub,
        role: claims.role,
    };
    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}

/// Middleware to require admin role
#[allow(dead_code)]
pub async fn require_admin(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, axum::Json<serde_json::Value>)> {
    let token = extract_token(&request).ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid authorization header"
            })),
        )
    })?;

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let claims = auth_service.validate_token(&token).map_err(|e| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": e.to_string()
            })),
        )
    })?;

    // Check if user is admin
    if claims.role != UserRole::Admin {
        return Err((
            StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({
                "code": "FORBIDDEN",
                "message": "Admin access required"
            })),
        ));
    }

    // Add user info to request extensions
    let auth_user = AuthUser {
        user_id: claims.sub,
        role: claims.role,
    };
    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}

/// Helper to get authenticated user from request extensions
#[allow(dead_code)]
pub fn get_auth_user(request: &Request) -> Result<AuthUser, AppError> {
    request
        .extensions()
        .get::<AuthUser>()
        .cloned()
        .ok_or_else(|| AppError::Unauthorized("Not authenticated".to_string()))
}

/// Middleware to require guest role
pub async fn require_guest(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, axum::Json<serde_json::Value>)> {
    let token = extract_token(&request).ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid authorization header"
            })),
        )
    })?;

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let claims = auth_service.validate_token(&token).map_err(|e| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": e.to_string()
            })),
        )
    })?;

    // Check if user is a guest
    if claims.role != UserRole::Guest {
        return Err((
            StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({
                "code": "FORBIDDEN",
                "message": "Guest access only"
            })),
        ));
    }

    // Add user info to request extensions
    let auth_user = AuthUser {
        user_id: claims.sub,
        role: claims.role,
    };
    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}

/// Middleware to require staff role (admin or receptionist, not guest)
#[allow(dead_code)]
pub async fn require_staff(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, (StatusCode, axum::Json<serde_json::Value>)> {
    let token = extract_token(&request).ok_or_else(|| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": "Missing or invalid authorization header"
            })),
        )
    })?;

    let auth_service = AuthService::new(state.pool.clone(), state.jwt_secret.clone());

    let claims = auth_service.validate_token(&token).map_err(|e| {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(serde_json::json!({
                "code": "UNAUTHORIZED",
                "message": e.to_string()
            })),
        )
    })?;

    // Check if user is staff (admin or receptionist)
    if claims.role == UserRole::Guest {
        return Err((
            StatusCode::FORBIDDEN,
            axum::Json(serde_json::json!({
                "code": "FORBIDDEN",
                "message": "Staff access required"
            })),
        ));
    }

    // Add user info to request extensions
    let auth_user = AuthUser {
        user_id: claims.sub,
        role: claims.role,
    };
    request.extensions_mut().insert(auth_user);

    Ok(next.run(request).await)
}
