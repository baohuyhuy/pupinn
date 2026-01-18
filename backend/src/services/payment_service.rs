use diesel::prelude::*;
use diesel::dsl::{count, sum};
use bigdecimal::BigDecimal;
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::{AppError, AppResult};
use crate::models::{
    Booking, Payment, PaymentSummary, PaymentType, NewPayment, UpdatePayment,
};
use crate::schema::{bookings, payments};

/// Payment service for managing payment transactions
pub struct PaymentService {
    pool: DbPool,
}

impl PaymentService {
    /// Create a new PaymentService instance
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Create a new payment
    pub fn create_payment(
        &self,
        booking_id: Uuid,
        amount: BigDecimal,
        payment_type: PaymentType,
        payment_method: String,
        notes: Option<String>,
        created_by_user_id: Uuid,
    ) -> AppResult<Payment> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify booking exists
        let _booking: Booking = bookings::table
            .find(booking_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Booking with ID '{}' not found", booking_id)))?;

        // Validate amount
        if amount == BigDecimal::from(0) {
            return Err(AppError::ValidationError(
                "Payment amount cannot be zero".to_string(),
            ));
        }

        // Validate refund amount (must be negative)
        if payment_type == PaymentType::Refund && amount > BigDecimal::from(0) {
            return Err(AppError::ValidationError(
                "Refund amount must be negative".to_string(),
            ));
        }

        // Validate non-refund amount (must be positive)
        if payment_type != PaymentType::Refund && amount < BigDecimal::from(0) {
            return Err(AppError::ValidationError(
                "Payment amount must be positive (use refund type for negative amounts)".to_string(),
            ));
        }

        // Validate payment method
        let valid_methods = vec!["cash", "card", "bank_transfer", "other"];
        if !valid_methods.contains(&payment_method.as_str()) {
            return Err(AppError::ValidationError(
                format!("Invalid payment method. Must be one of: {}", valid_methods.join(", "))
            ));
        }

        let new_payment = NewPayment {
            booking_id,
            amount,
            payment_type,
            payment_method,
            notes,
            created_by_user_id,
        };

        diesel::insert_into(payments::table)
            .values(&new_payment)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Get all payments for a booking
    pub fn get_payments_by_booking(&self, booking_id: Uuid) -> AppResult<Vec<Payment>> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify booking exists
        bookings::table
            .find(booking_id)
            .first::<Booking>(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Booking with ID '{}' not found", booking_id)))?;

        let payment_list: Vec<Payment> = payments::table
            .filter(payments::booking_id.eq(booking_id))
            .order(payments::created_at.desc())
            .load(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(payment_list)
    }

    /// Get a payment by ID
    pub fn get_payment_by_id(&self, payment_id: Uuid) -> AppResult<Payment> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        payments::table
            .find(payment_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Payment with ID '{}' not found", payment_id)))
    }

    /// Update a payment
    pub fn update_payment(
        &self,
        payment_id: Uuid,
        update: UpdatePayment,
    ) -> AppResult<Payment> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Get existing payment
        let existing: Payment = payments::table
            .find(payment_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Payment with ID '{}' not found", payment_id)))?;

        // Validate amount if provided
        if let Some(ref amount) = update.amount {
            if *amount == BigDecimal::from(0) {
                return Err(AppError::ValidationError(
                    "Payment amount cannot be zero".to_string(),
                ));
            }

            // Validate refund amount
            let payment_type = update.payment_type.unwrap_or(existing.payment_type);
            if payment_type == PaymentType::Refund && *amount > BigDecimal::from(0) {
                return Err(AppError::ValidationError(
                    "Refund amount must be negative".to_string(),
                ));
            }

            if payment_type != PaymentType::Refund && *amount < BigDecimal::from(0) {
                return Err(AppError::ValidationError(
                    "Payment amount must be positive".to_string(),
                ));
            }
        }

        // Validate payment method if provided
        if let Some(ref method) = update.payment_method {
            let valid_methods = vec!["cash", "card", "bank_transfer", "other"];
            if !valid_methods.contains(&method.as_str()) {
                return Err(AppError::ValidationError(
                    format!("Invalid payment method. Must be one of: {}", valid_methods.join(", "))
                ));
            }
        }

        diesel::update(payments::table.find(payment_id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))
    }

    /// Delete a payment
    pub fn delete_payment(&self, payment_id: Uuid) -> AppResult<()> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Verify payment exists
        payments::table
            .find(payment_id)
            .first::<Payment>(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Payment with ID '{}' not found", payment_id)))?;

        diesel::delete(payments::table.find(payment_id))
            .execute(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(())
    }

    /// Calculate payment summary for a booking
    pub fn get_payment_summary(&self, booking_id: Uuid) -> AppResult<PaymentSummary> {
        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Get booking to get total price
        let booking: Booking = bookings::table
            .find(booking_id)
            .first(&mut conn)
            .map_err(|_| AppError::NotFound(format!("Booking with ID '{}' not found", booking_id)))?;

        // Calculate total paid
        let total_paid: Option<BigDecimal> = payments::table
            .filter(payments::booking_id.eq(booking_id))
            .select(sum(payments::amount))
            .first(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Get payment count
        let payment_count: i64 = payments::table
            .filter(payments::booking_id.eq(booking_id))
            .select(count(payments::id))
            .first(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let total_paid = total_paid.unwrap_or_else(|| BigDecimal::from(0));
        let remaining_balance = &booking.price - &total_paid;

        Ok(PaymentSummary {
            booking_id,
            total_price: booking.price,
            total_paid,
            remaining_balance,
            payment_count,
        })
    }

    /// Calculate total payments collected for bookings (for financial reports)
    #[allow(dead_code)]
    pub fn calculate_total_payments_for_bookings(
        &self,
        booking_ids: &[Uuid],
    ) -> AppResult<BigDecimal> {
        if booking_ids.is_empty() {
            return Ok(BigDecimal::from(0));
        }

        let mut conn = self
            .pool
            .get()
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        let total: Option<BigDecimal> = payments::table
            .filter(payments::booking_id.eq_any(booking_ids))
            .select(sum(payments::amount))
            .first(&mut conn)
            .map_err(|e| AppError::DatabaseError(e.to_string()))?;

        Ok(total.unwrap_or_else(|| BigDecimal::from(0)))
    }
}
