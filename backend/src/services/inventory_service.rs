use bigdecimal::BigDecimal;
use diesel::prelude::*;
use uuid::Uuid;

use crate::db::DbPool;
use crate::errors::AppError;
use crate::models::{InventoryItem, NewInventoryItem, UpdateInventoryItem};
use crate::schema::inventory_items;

#[derive(Clone)]
pub struct InventoryService {
    pool: DbPool,
}

impl InventoryService {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn list_items(&self) -> Result<Vec<InventoryItem>, AppError> {
        let mut conn = self.pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;
        
        inventory_items::table
            .order(inventory_items::name.asc())
            .load::<InventoryItem>(&mut conn)
            .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub fn create_item(&self, new_item: NewInventoryItem) -> Result<InventoryItem, AppError> {
        let mut conn = self.pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

        diesel::insert_into(inventory_items::table)
            .values(&new_item)
            .get_result(&mut conn)
            .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub fn update_item(&self, id: Uuid, update: UpdateInventoryItem) -> Result<InventoryItem, AppError> {
        let mut conn = self.pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

        diesel::update(inventory_items::table.find(id))
            .set(&update)
            .get_result(&mut conn)
            .map_err(|e| AppError::InternalError(e.to_string()))
    }

    pub fn delete_item(&self, id: Uuid) -> Result<(), AppError> {
        let mut conn = self.pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

        diesel::delete(inventory_items::table.find(id))
            .execute(&mut conn)
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        Ok(())
    }

    // Financial Calculation
    pub fn calculate_total_inventory_value(&self) -> Result<BigDecimal, AppError> {
        let mut conn = self.pool.get().map_err(|e| AppError::DatabaseError(e.to_string()))?;

        // Calculate SUM(price * quantity)
        // Diesel 2.x supports numeric expressions, but for simplicity/robustness with BigDecimal:
        let items = inventory_items::table
            .select((inventory_items::price, inventory_items::quantity))
            .load::<(BigDecimal, i32)>(&mut conn)
            .map_err(|e| AppError::InternalError(e.to_string()))?;

        let total = items.iter().fold(BigDecimal::from(0), |acc, (price, qty)| {
            acc + (price * BigDecimal::from(*qty))
        });

        Ok(total)
    }
}