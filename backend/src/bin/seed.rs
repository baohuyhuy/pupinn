use diesel::prelude::*;
use dotenvy::dotenv;
use std::env;

// Import from the main crate
use hotel_management_backend::db::create_pool;
use hotel_management_backend::models::{NewRoom, NewUser, RoomType, UserRole};
use hotel_management_backend::schema::{rooms, users};
use hotel_management_backend::services::AuthService;
use hotel_management_backend::models::RoomStatus;

fn main() {
    dotenv().ok();

    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let pool = create_pool(&database_url);
    let mut conn = pool.get().expect("Failed to get database connection");

    println!("🌱 Seeding database...\n");

    // Seed users
    seed_users(&mut conn);

    // Seed rooms
    seed_rooms(&mut conn);

    println!("\n✅ Database seeding complete!");
}

fn seed_users(conn: &mut PgConnection) {
    println!("Creating users...");

    let users_data = vec![
        ("admin", "admin123", UserRole::Admin),
        ("reception", "reception123", UserRole::Receptionist),
        ("cleaner", "cleaner123", UserRole::Cleaner),
    ];

    for (username, password, role) in users_data {
        // Check if user already exists
        let existing: Option<hotel_management_backend::models::User> = users::table
            .filter(users::username.eq(username))
            .first(conn)
            .optional()
            .expect("Failed to query users");

        if existing.is_some() {
            println!("  ⏭️  User '{}' already exists, skipping", username);
            continue;
        }

        let password_hash = AuthService::hash_password(password).expect("Failed to hash password");

        let new_user = NewUser {
            username: Some(username),
            password_hash: &password_hash,
            role,
            email: None,
            full_name: None,
        };

        diesel::insert_into(users::table)
            .values(&new_user)
            .execute(conn)
            .expect("Failed to insert user");

        println!("  ✅ Created user '{}' with role {:?}", username, role);
    }
}

fn seed_rooms(conn: &mut PgConnection) {
    println!("\nCreating rooms...");

    // Tuple format: (Room Number, Room Type, Initial Status)
    let rooms_data = vec![
        ("101", RoomType::Single, RoomStatus::Dirty),     // <--- TEST DATA
        ("102", RoomType::Single, RoomStatus::Dirty),     // <--- TEST DATA
        ("201", RoomType::Double, RoomStatus::Available),
        ("202", RoomType::Double, RoomStatus::Occupied),
        ("301", RoomType::Suite,  RoomStatus::Maintenance),
    ];

    for (number, room_type, status) in rooms_data {
        // 1. Check if room exists
        let existing: Option<hotel_management_backend::models::Room> = rooms::table
            .filter(rooms::number.eq(number))
            .first(conn)
            .optional()
            .expect("Failed to query rooms");

        if existing.is_some() {
            // OPTIONAL: Force update existing rooms to the new status
            diesel::update(rooms::table.filter(rooms::number.eq(number)))
                .set(rooms::status.eq(status))
                .execute(conn)
                .expect("Failed to update room status");
                
            println!("  ⏭️  Room '{}' exists. Updated status to {:?}", number, status);
            continue;
        }

        // 2. Create the room (defaults to Available usually)
        let new_room = NewRoom { number, room_type };

        diesel::insert_into(rooms::table)
            .values(&new_room)
            .execute(conn)
            .expect("Failed to insert room");

        // 3. IMMEDIATELY update the status to what we want
        diesel::update(rooms::table.filter(rooms::number.eq(number)))
            .set(rooms::status.eq(status))
            .execute(conn)
            .expect("Failed to set initial room status");

        println!("  ✅ Created room '{}' [{:?}] -> {:?}", number, room_type, status);
    }
}
