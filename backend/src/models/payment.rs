use chrono::{DateTime, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use bigdecimal::BigDecimal;
use crate::schema::payments;

use super::Booking;

/// Payment type enum matching PostgreSQL payment_type type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, DbEnum)]
#[ExistingTypePath = "crate::schema::sql_types::PaymentType"]
#[serde(rename_all = "snake_case")]
#[DbValueStyle = "snake_case"]
pub enum PaymentType {
    Deposit,
    Partial,
    Full,
    Refund,
}

/// Payment model representing a payment transaction for a booking
#[derive(Debug, Clone, Queryable, Identifiable, Associations, Serialize, Selectable)]
#[diesel(table_name = payments)]
#[diesel(belongs_to(Booking, foreign_key = booking_id))]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct Payment {
    pub id: Uuid,
    pub booking_id: Uuid,
    pub amount: BigDecimal,
    pub payment_type: PaymentType,
    pub payment_method: String,
    pub notes: Option<String>,
    pub created_by_user_id: Uuid,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// New payment for insertion
#[derive(Debug, Insertable)]
#[diesel(table_name = payments)]
pub struct NewPayment {
    pub booking_id: Uuid,
    pub amount: BigDecimal,
    pub payment_type: PaymentType,
    pub payment_method: String,
    pub notes: Option<String>,
    pub created_by_user_id: Uuid,
}

/// Payment update changeset
#[derive(Debug, AsChangeset, Default)]
#[diesel(table_name = payments)]
pub struct UpdatePayment {
    pub amount: Option<BigDecimal>,
    pub payment_type: Option<PaymentType>,
    pub payment_method: Option<String>,
    pub notes: Option<Option<String>>, // Option<Option> to allow setting to NULL
}

/// Payment summary for a booking
#[derive(Debug, Clone, Serialize)]
pub struct PaymentSummary {
    pub booking_id: Uuid,
    pub total_price: BigDecimal,
    pub total_paid: BigDecimal,
    pub remaining_balance: BigDecimal,
    pub payment_count: i64,
}

/// Payment with booking details for API responses
#[allow(dead_code)]
#[derive(Debug, Clone, Serialize)]
pub struct PaymentWithBooking {
    #[serde(flatten)]
    pub payment: Payment,
    pub booking: Option<Booking>,
}
