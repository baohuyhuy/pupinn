use axum::{
    extract::{Path, State},
    response::IntoResponse,
    Json,
    Extension,
};
use uuid::Uuid;

use crate::api::{middleware::AuthUser, AppState};
use crate::errors::AppError;
use crate::models::{InventoryItemResponse, NewInventoryItem, UpdateInventoryItem, UserRole};
use crate::services::InventoryService;

/// GET /api/inventory
pub async fn list_inventory(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> Result<impl IntoResponse, AppError> {
    let service = InventoryService::new(state.pool);
    let items = service.list_items()?;

    // Map to response DTO, hiding price if not Admin
    let response: Vec<InventoryItemResponse> = items
        .into_iter()
        .map(|item| InventoryItemResponse {
            id: item.id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            // Only show price for Admin
            price: if auth_user.role == UserRole::Admin {
                Some(item.price.to_string())
            } else {
                None
            },
            status: item.status,
            notes: item.notes,
            updated_at: item.updated_at,
        })
        .collect();

    Ok(Json(response))
}

/// POST /api/inventory (Admin only)
pub async fn create_inventory_item(
    State(state): State<AppState>,
    Json(payload): Json<NewInventoryItem>,
) -> Result<impl IntoResponse, AppError> {
    let service = InventoryService::new(state.pool);
    let item = service.create_item(payload)?;
    Ok(Json(item)) // Helper: Returns full item (safe for admin who created it)
}

/// PATCH /api/inventory/:id
pub async fn update_inventory_item(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(payload): Json<UpdateInventoryItem>,
) -> Result<impl IntoResponse, AppError> {
    let service = InventoryService::new(state.pool);

    // Permission Check:
    // Admin can update everything.
    // Cleaner can ONLY update 'status', 'notes', and 'quantity' (reporting usage).
    // Cleaner CANNOT update 'price' or 'name'.
    
    if auth_user.role != UserRole::Admin {
        if payload.price.is_some() || payload.name.is_some() {
            return Err(AppError::Forbidden("Cleaners cannot edit price or name".to_string()));
        }
    }

    let item = service.update_item(id, payload)?;
    Ok(Json(item))
}

/// DELETE /api/inventory/:id (Admin only)
pub async fn delete_inventory_item(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> Result<impl IntoResponse, AppError> {
    let service = InventoryService::new(state.pool);
    service.delete_item(id)?;
    Ok(Json(serde_json::json!({ "status": "deleted" })))
}

/// GET /api/admin/financial/inventory-value
pub async fn get_inventory_value(
    State(state): State<AppState>,
) -> Result<impl IntoResponse, AppError> {
    let service = InventoryService::new(state.pool);
    let value = service.calculate_total_inventory_value()?;
    
    Ok(Json(serde_json::json!({
        "total_inventory_value": value.to_string()
    })))
}