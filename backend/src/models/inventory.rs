use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::schema::inventory_items;

#[derive(Debug, Clone, Copy, PartialEq, Eq, DbEnum, Serialize, Deserialize)]
#[ExistingTypePath = "crate::schema::sql_types::InventoryStatus"]
#[serde(rename_all = "snake_case")]
#[DbValueStyle = "snake_case"]
pub enum InventoryStatus {
    Normal,
    LowStock,
    Broken,
    Lost,
    NeedReplacement,
}

#[derive(Debug, Queryable, Selectable, Serialize, Deserialize)]
#[diesel(table_name = inventory_items)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct InventoryItem {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub quantity: i32,
    pub price: BigDecimal,
    pub status: InventoryStatus,
    pub notes: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Insertable, Deserialize)]
#[diesel(table_name = inventory_items)]
pub struct NewInventoryItem {
    pub name: String,
    pub description: Option<String>,
    pub quantity: i32,
    pub price: BigDecimal,
    pub status: Option<InventoryStatus>, // Default to Normal if None
    pub notes: Option<String>,
}

#[derive(AsChangeset, Deserialize)]
#[diesel(table_name = inventory_items)]
pub struct UpdateInventoryItem {
    pub name: Option<String>,
    pub description: Option<String>,
    pub quantity: Option<i32>,
    pub price: Option<BigDecimal>,
    pub status: Option<InventoryStatus>,
    pub notes: Option<String>,
}

// DTO for Cleaner View (Hides Price)
#[derive(Debug, Serialize)]
pub struct InventoryItemResponse {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub quantity: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub price: Option<String>,
    pub status: InventoryStatus,
    pub notes: Option<String>,
    pub updated_at: DateTime<Utc>,
}