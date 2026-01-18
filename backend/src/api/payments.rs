use axum::{
    extract::{Extension, Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::api::{middleware::AuthUser, AppState};
use crate::errors::AppError;
use crate::models::PaymentType;
use crate::services::PaymentService;
use bigdecimal::BigDecimal;

/// Create payment request DTO
#[derive(Debug, Deserialize)]
pub struct CreatePaymentDto {
    pub amount: BigDecimal,
    pub payment_type: PaymentType,
    pub payment_method: String,
    pub notes: Option<String>,
}

/// Update payment request DTO
#[derive(Debug, Deserialize)]
pub struct UpdatePaymentDto {
    pub amount: Option<BigDecimal>,
    pub payment_type: Option<PaymentType>,
    pub payment_method: Option<String>,
    pub notes: Option<Option<String>>,
}

/// Create a new payment for a booking
/// POST /bookings/:id/payments
pub async fn create_payment(
    State(state): State<AppState>,
    Path(booking_id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
    Json(payload): Json<CreatePaymentDto>,
) -> Result<impl IntoResponse, AppError> {
    let payment_service = PaymentService::new(state.pool);
    
    let payment = payment_service.create_payment(
        booking_id,
        payload.amount,
        payload.payment_type,
        payload.payment_method,
        payload.notes,
        auth_user.user_id,
    )?;
    
    Ok((StatusCode::CREATED, Json(payment)))
}

/// List all payments for a booking
/// GET /bookings/:id/payments
pub async fn list_payments(
    State(state): State<AppState>,
    Path(booking_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let payment_service = PaymentService::new(state.pool);
    let payments = payment_service.get_payments_by_booking(booking_id)?;
    Ok((StatusCode::OK, Json(payments)))
}

/// Get payment summary for a booking
/// GET /bookings/:id/payments/summary
pub async fn get_payment_summary(
    State(state): State<AppState>,
    Path(booking_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let payment_service = PaymentService::new(state.pool);
    let summary = payment_service.get_payment_summary(booking_id)?;
    Ok((StatusCode::OK, Json(summary)))
}

/// Get a payment by ID
/// GET /payments/:id
pub async fn get_payment(
    State(state): State<AppState>,
    Path(payment_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let payment_service = PaymentService::new(state.pool);
    let payment = payment_service.get_payment_by_id(payment_id)?;
    Ok((StatusCode::OK, Json(payment)))
}

/// Update a payment
/// PATCH /payments/:id
pub async fn update_payment(
    State(state): State<AppState>,
    Path(payment_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
    Json(payload): Json<UpdatePaymentDto>,
) -> Result<impl IntoResponse, AppError> {
    let payment_service = PaymentService::new(state.pool);
    
    let update = crate::models::UpdatePayment {
        amount: payload.amount,
        payment_type: payload.payment_type,
        payment_method: payload.payment_method,
        notes: payload.notes,
    };
    
    let payment = payment_service.update_payment(payment_id, update)?;
    Ok((StatusCode::OK, Json(payment)))
}

/// Delete a payment
/// DELETE /payments/:id
pub async fn delete_payment(
    State(state): State<AppState>,
    Path(payment_id): Path<Uuid>,
    Extension(_auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let payment_service = PaymentService::new(state.pool);
    payment_service.delete_payment(payment_id)?;
    Ok(StatusCode::NO_CONTENT)
}
