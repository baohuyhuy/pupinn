pub mod auth;
pub mod bookings;
pub mod guest_auth;
pub mod guest_bookings;
pub mod middleware;
pub mod rooms;

use axum::{
    middleware as axum_middleware,
    routing::{get, post},
    Router,
};

use crate::db::DbPool;

/// Application state shared across handlers
#[derive(Clone)]
pub struct AppState {
    pub pool: DbPool,
    pub jwt_secret: String,
}

/// Create the API router with all routes
pub fn create_router(state: AppState) -> Router {
    // Staff auth routes
    let auth_routes = Router::new()
        .route("/login", post(auth::login))
        .route("/me", get(auth::me))
        .route("/users", post(auth::create_user))
        // Guest registration (public)
        .route("/register", post(guest_auth::register))
        // Guest login (public)
        .route("/guest/login", post(guest_auth::login))
        // Guest me (requires guest auth)
        .route(
            "/guest/me",
            get(guest_auth::me).layer(axum_middleware::from_fn_with_state(
                state.clone(),
                middleware::require_guest,
            )),
        );

    let room_routes = Router::new()
        .route("/", get(rooms::list_rooms).post(rooms::create_room))
        // Available rooms endpoint is public (no auth required) for guests to search
        .route("/available", get(rooms::available_rooms))
        .route("/:id", get(rooms::get_room).patch(rooms::update_room));

    let booking_routes = Router::new()
        .route(
            "/",
            get(bookings::list_bookings).post(bookings::create_booking),
        )
        .route(
            "/:id",
            get(bookings::get_booking).patch(bookings::update_booking),
        )
        .route("/:id/check-in", post(bookings::check_in))
        .route("/:id/check-out", post(bookings::check_out))
        .route("/:id/cancel", post(bookings::cancel))
        .route(
            "/reference/:reference",
            get(bookings::get_booking_by_reference),
        );

    // Guest booking routes (requires guest auth)
    let guest_booking_routes = Router::new()
        .route(
            "/",
            get(guest_bookings::list_bookings).post(guest_bookings::create_booking),
        )
        .route("/:id", get(guest_bookings::get_booking))
        .route("/:id/cancel", post(guest_bookings::cancel_booking))
        .layer(axum_middleware::from_fn_with_state(
            state.clone(),
            middleware::require_guest,
        ));

    // Health check endpoint
    let health_route = Router::new().route("/health", get(health_check));

    Router::new()
        .nest("/auth", auth_routes)
        .nest("/rooms", room_routes)
        .nest("/bookings", booking_routes)
        .nest("/guest/bookings", guest_booking_routes)
        .merge(health_route)
        .with_state(state)
}

/// Health check handler
async fn health_check() -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({ "status": "ok" }))
}
