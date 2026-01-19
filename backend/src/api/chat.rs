use axum::{
    extract::{
        ws::{Message as WsMessage, WebSocket, WebSocketUpgrade},
        Extension, Multipart, Query, State,
    },
    response::IntoResponse,
    Json,
};
use diesel::prelude::*;
use futures::{sink::SinkExt, stream::StreamExt};
use std::{collections::HashMap, sync::Arc, sync::Mutex};
use tokio::sync::broadcast;
use uuid::Uuid;
use crate::{
    api::{middleware::AuthUser, AppState},
    db::get_conn,
    errors::{AppError, AppResult},
    models::{message::*, user::*},
    schema::{messages, users},
};
use serde::{Deserialize, Serialize};
use chrono::Utc;

// Global state for chat connections
#[derive(Clone)]
pub struct ChatState {
    pub active_connections: Arc<Mutex<HashMap<Uuid, broadcast::Sender<String>>>>,
}

impl Default for ChatState {
    fn default() -> Self {
        Self {
            active_connections: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

#[derive(Deserialize)]
pub struct ChatHistoryParams {
    other_user_id: Uuid,
}

#[derive(Serialize, Clone)]
pub struct Contact {
    id: Uuid,
    name: String,
    role: UserRole,
    unread_count: i64,
}

#[derive(Serialize, Clone)]
pub struct MessageResponse {
    id: Uuid,
    sender_id: Uuid,
    receiver_id: Uuid,
    content: String,
    image_url: Option<String>,
    is_read: bool,
    created_at: chrono::DateTime<Utc>,
}

#[derive(Deserialize)]
pub struct IncomingChatMessage {
    receiver_id: Uuid,
    content: String,
    image_url: Option<String>,
}

// RBAC Validation Logic
fn can_chat(role_a: UserRole, role_b: UserRole) -> bool {
    match (role_a, role_b) {
        // Guest <-> Reception
        (UserRole::Guest, UserRole::Receptionist) => true,
        (UserRole::Receptionist, UserRole::Guest) => true,
        
        // Admin <-> Reception
        (UserRole::Admin, UserRole::Receptionist) => true,
        (UserRole::Receptionist, UserRole::Admin) => true,
        
        // Admin <-> Cleaner
        (UserRole::Admin, UserRole::Cleaner) => true,
        (UserRole::Cleaner, UserRole::Admin) => true,
        
        _ => false,
    }
}

// Get allowed contacts for the current user
pub async fn get_contacts(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
) -> AppResult<Json<Vec<Contact>>> {
    tracing::info!("get_contacts called for user_id={}, role={:?}", auth_user.user_id, auth_user.role);
    
    let mut conn = get_conn(&state.pool)
        .map_err(|e| {
            tracing::error!("Failed to get DB connection: {}", e);
            AppError::DatabaseError(format!("Connection pool error: {}", e))
        })?;
    
    // Determine which roles this user can chat with
    let allowed_roles: Vec<UserRole> = match auth_user.role {
        UserRole::Admin => vec![UserRole::Receptionist, UserRole::Cleaner],
        UserRole::Receptionist => vec![UserRole::Admin, UserRole::Guest],
        UserRole::Guest => vec![UserRole::Receptionist],
        UserRole::Cleaner => vec![UserRole::Admin],
    };
    
    tracing::debug!("Allowed roles for user: {:?}", allowed_roles);
    
    // Query users with allowed roles
    let contact_users: Vec<User> = users::table
        .filter(users::role.eq_any(&allowed_roles))
        .filter(users::deactivated_at.is_null())
        .load(&mut conn)
        .map_err(|e| {
            tracing::error!("Failed to query contact users: {}", e);
            AppError::DatabaseError(e.to_string())
        })?;
    
    tracing::debug!("Found {} potential contacts", contact_users.len());
    
    // Calculate unread counts for each contact
    let mut contacts = Vec::new();
    for user in contact_users {
        let unread_count: i64 = messages::table
            .filter(messages::sender_id.eq(user.id))
            .filter(messages::receiver_id.eq(auth_user.user_id))
            .filter(messages::is_read.eq(false))
            .count()
            .get_result(&mut conn)
            .unwrap_or_else(|e| {
                tracing::warn!("Failed to get unread count for user {}: {}", user.id, e);
                0
            });
        
        let name = user.username
            .clone()
            .or(user.full_name.clone())
            .unwrap_or_else(|| format!("User {}", user.id));
        
        contacts.push(Contact {
            id: user.id,
            name,
            role: user.role,
            unread_count,
        });
    }
    
    tracing::info!("Returning {} contacts for user {}", contacts.len(), auth_user.user_id);
    Ok(Json(contacts))
}

// Get message history with another user
pub async fn get_chat_history(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(params): Query<ChatHistoryParams>,
) -> AppResult<Json<Vec<MessageResponse>>> {
    tracing::info!("get_chat_history called: user_id={}, other_user_id={}", auth_user.user_id, params.other_user_id);
    
    let mut conn = get_conn(&state.pool)
        .map_err(|e| {
            tracing::error!("Failed to get DB connection: {}", e);
            AppError::DatabaseError(format!("Connection pool error: {}", e))
        })?;
    
    // Fetch the other user to verify they exist and can chat
    let other_user: User = users::table
        .find(params.other_user_id)
        .first(&mut conn)
        .map_err(|e| {
            tracing::error!("User {} not found: {}", params.other_user_id, e);
            AppError::NotFound("User not found".to_string())
        })?;
    
    tracing::debug!("Other user found: id={}, role={:?}", other_user.id, other_user.role);
    
    // Verify RBAC
    if !can_chat(auth_user.role, other_user.role) {
        tracing::warn!("RBAC check failed: {:?} cannot chat with {:?}", auth_user.role, other_user.role);
        return Err(AppError::Forbidden("Cannot chat with this user".to_string()));
    }
    
    // Fetch messages between the two users
    let message_list: Vec<Message> = messages::table
        .filter(
            messages::sender_id.eq(auth_user.user_id)
                .and(messages::receiver_id.eq(params.other_user_id))
                .or(messages::sender_id.eq(params.other_user_id)
                    .and(messages::receiver_id.eq(auth_user.user_id))),
        )
        .order(messages::created_at.asc())
        .load(&mut conn)
        .map_err(|e| {
            tracing::error!("Failed to load messages: {}", e);
            AppError::DatabaseError(e.to_string())
        })?;
    
    tracing::debug!("Loaded {} messages", message_list.len());
    
    // Mark messages as read
    let updated_count = diesel::update(
        messages::table
            .filter(messages::sender_id.eq(params.other_user_id))
            .filter(messages::receiver_id.eq(auth_user.user_id))
            .filter(messages::is_read.eq(false)),
    )
    .set(messages::is_read.eq(true))
    .execute(&mut conn)
    .map_err(|e| {
        tracing::error!("Failed to mark messages as read: {}", e);
        AppError::DatabaseError(e.to_string())
    })?;
    
    tracing::debug!("Marked {} messages as read", updated_count);
    
    let response: Vec<MessageResponse> = message_list
        .into_iter()
        .map(|m| MessageResponse {
            id: m.id,
            sender_id: m.sender_id,
            receiver_id: m.receiver_id,
            content: m.content,
            image_url: m.image_url,
            is_read: m.is_read,
            created_at: m.created_at,
        })
        .collect();
    
    tracing::info!("Returning {} messages for chat history", response.len());
    Ok(Json(response))
}

// WebSocket handler - extract token from query params
pub async fn chat_websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> impl IntoResponse {
    tracing::info!("WebSocket connection attempt");
    
    // Extract token from query params
    let token = params.get("token").cloned();
    
    // Validate token and extract user info
    let auth_result = if let Some(ref token_str) = token {
        let auth_service = crate::services::AuthService::new(
            state.pool.clone(),
            state.jwt_secret.clone(),
        );
        auth_service.validate_token(token_str)
    } else {
        tracing::warn!("WebSocket connection rejected: missing token");
        return axum::response::Response::builder()
            .status(axum::http::StatusCode::UNAUTHORIZED)
            .body(axum::body::Body::from("Missing token"))
            .unwrap()
            .into_response();
    };
    
    let claims = match auth_result {
        Ok(claims) => claims,
        Err(e) => {
            tracing::warn!("WebSocket connection rejected: invalid token - {:?}", e);
            return axum::response::Response::builder()
                .status(axum::http::StatusCode::UNAUTHORIZED)
                .body(axum::body::Body::from("Invalid token"))
                .unwrap()
                .into_response();
        }
    };
    
    tracing::info!("WebSocket authenticated for user_id={}, role={:?}", claims.sub, claims.role);
    
    // Convert to Arc for use in spawned tasks
    let state_arc = std::sync::Arc::new(state);
    
    ws.on_upgrade(move |socket| {
        handle_socket(
            socket,
            state_arc,
            claims.sub,
            claims.role,
        )
    })
}

async fn handle_socket(
    socket: WebSocket,
    state: Arc<AppState>,
    my_id: Uuid,
    my_role: UserRole,
) {
    tracing::info!("WebSocket handler started for user_id={}", my_id);
    let (mut sender, mut receiver) = socket.split();
    
    // Create or get broadcast channel for this user
    let tx = {
        let mut connections = state.chat_state.active_connections.lock().unwrap();
        connections.entry(my_id).or_insert_with(|| {
            let (tx, _rx) = broadcast::channel(100);
            tx
        }).clone()
    };
    
    let mut rx = tx.subscribe();
    
    // Task 1: Send incoming messages from other users to this socket
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(WsMessage::Text(msg)).await.is_err() {
                break;
            }
        }
    });
    
    // Task 2: Receive messages from this socket and save to DB + forward
    let mut recv_task = tokio::spawn({
        let state = state.clone();
        async move {
            while let Some(Ok(msg)) = receiver.next().await {
                if let WsMessage::Text(text) = msg {
                    tracing::debug!("Received WebSocket message: {}", text);
                    if let Ok(incoming) = serde_json::from_str::<IncomingChatMessage>(&text) {
                        tracing::info!("Processing chat message from {} to {}", my_id, incoming.receiver_id);
                        // Get receiver from DB to verify role
                        let mut conn = match get_conn(&state.pool) {
                            Ok(c) => c,
                            Err(e) => {
                                tracing::error!("Failed to get DB connection in WebSocket handler: {}", e);
                                continue;
                            }
                        };
                        
                        let receiver_user: Option<User> = users::table
                            .find(incoming.receiver_id)
                            .first(&mut conn)
                            .optional()
                            .ok()
                            .flatten();
                        
                        if let Some(receiver_user) = receiver_user {
                            // Verify RBAC
                            if !can_chat(my_role, receiver_user.role) {
                                tracing::warn!("WebSocket message blocked by RBAC: {:?} cannot chat with {:?}", my_role, receiver_user.role);
                                continue;
                            }
                            
                            // Save message to DB
                            let new_message = NewMessage {
                                sender_id: my_id,
                                receiver_id: incoming.receiver_id,
                                content: incoming.content.clone(),
                                image_url: incoming.image_url.clone(),
                            };
                            
                            let saved_message: Message = diesel::insert_into(messages::table)
                                .values(&new_message)
                                .get_result(&mut conn)
                                .ok()
                                .unwrap_or_else(|| {
                                    tracing::error!("Failed to save message to database");
                                    // If save fails, still try to forward
                                    Message {
                                        id: Uuid::new_v4(),
                                        sender_id: my_id,
                                        receiver_id: incoming.receiver_id,
                                        content: incoming.content.clone(),
                                        image_url: incoming.image_url.clone(),
                                        is_read: false,
                                        created_at: Utc::now(),
                                        updated_at: Utc::now(),
                                    }
                                });
                            
                            tracing::info!("Message saved with id={}", saved_message.id);
                            
                            // Forward to receiver if connected
                            let connections = state.chat_state.active_connections.lock().unwrap();
                            if let Some(receiver_tx) = connections.get(&incoming.receiver_id) {
                                tracing::debug!("Forwarding message to connected receiver {}", incoming.receiver_id);
                                let message_json = serde_json::json!({
                                    "id": saved_message.id,
                                    "sender_id": saved_message.sender_id,
                                    "receiver_id": saved_message.receiver_id,
                                    "content": saved_message.content,
                                    "image_url": saved_message.image_url,
                                    "is_read": saved_message.is_read,
                                    "created_at": saved_message.created_at,
                                });
                                let _ = receiver_tx.send(serde_json::to_string(&message_json).unwrap_or_default());
                            } else {
                                tracing::debug!("Receiver {} not connected, message saved for later", incoming.receiver_id);
                            }
                        }
                    }
                }
            }
        }
    });
    
    tokio::select! {
        _ = &mut send_task => recv_task.abort(),
        _ = &mut recv_task => send_task.abort(),
    };
    
    tracing::info!("WebSocket connection closed for user_id={}", my_id);
    
    // Clean up connection when socket closes
    let mut connections = state.chat_state.active_connections.lock().unwrap();
    connections.remove(&my_id);
}

// Image upload handler
pub async fn upload_image(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    mut multipart: Multipart,
) -> AppResult<Json<serde_json::Value>> {
    tracing::info!("upload_image called for user_id={}", auth_user.user_id);
    
    // Extract file from multipart
    while let Some(field) = multipart.next_field().await.map_err(|e| {
        tracing::error!("Failed to read multipart field: {}", e);
        AppError::InternalError(format!("Failed to read multipart field: {}", e))
    })? {
        if field.name() == Some("file") {
            tracing::debug!("Processing file upload field");
            
            // Extract filename and extension before consuming field
            let file_ext = field.file_name()
                .and_then(|n| n.split('.').last())
                .unwrap_or("jpg")
                .to_string();
            
            tracing::debug!("File extension: {}", file_ext);
            
            // Read file data
            let data = field.bytes().await.map_err(|e| {
                tracing::error!("Failed to read file data: {}", e);
                AppError::InternalError(format!("Failed to read file data: {}", e))
            })?;
            
            tracing::info!("Read {} bytes from uploaded file", data.len());
            
            // Generate unique filename
            let file_name = format!("{}_{}.{}", auth_user.user_id, Uuid::new_v4(), file_ext);
            tracing::info!("Generated filename: {}", file_name);
            
            // Upload to MinIO
            let bucket = "chat-images";
            tracing::info!("Uploading to MinIO bucket '{}'", bucket);
            
            crate::services::storage_service::upload_image(
                &state.s3_client,
                bucket,
                &file_name,
                data.to_vec(),
            )
            .await
            .map_err(|e| {
                tracing::error!("Failed to upload to MinIO: {}", e);
                AppError::InternalError(format!("Failed to upload to MinIO: {}", e))
            })?;
            
            tracing::info!("Successfully uploaded file to MinIO");
            
            // Return MinIO URL (use public URL for browser access)
            let minio_public_url = std::env::var("MINIO_PUBLIC_URL")
                .unwrap_or_else(|_| "http://localhost:9000".to_string());
            let image_url = format!("{}/{}/{}", minio_public_url, bucket, file_name);
            
            tracing::info!("Image uploaded successfully, URL: {}", image_url);
            return Ok(Json(serde_json::json!({ "url": image_url })));
        }
    }
    
    tracing::warn!("No file field found in multipart upload");
    Err(AppError::BadRequest("No file provided".to_string()))
}
