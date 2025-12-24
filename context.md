### Tech Stack

- **Backend**: Rust (`axum` web framework, `tokio` async runtime, `tower` / `tower-http` middleware).
- **Database**: PostgreSQL using `diesel` ORM with enums for `user_role`, `room_type`, `room_status`, and `booking_status`.
- **Auth/Security**: JWT via `jsonwebtoken`, password hashing via `argon2`.
- **Frontend**: Next.js (App Router) with React, TypeScript, `@tanstack/react-query`, `zod`, and a custom UI kit.

### Database Schema (Users & Rooms)

- **`users` table** (`id` UUID, `username` nullable, `password_hash`, `role` `user_role`, timestamps, `email` nullable, `full_name` nullable).  
  - **Roles enum**: `admin`, `receptionist`, `guest` mapped to `UserRole::Admin | Receptionist | Guest`.  
  - **Staff**: identified by non-null `username` (login via username/password).  
  - **Guests**: identified by `email`, `full_name`, `role = guest` (login via email/password).
- **`rooms` table** (`id` UUID, `number` varchar, `room_type` enum, `status` enum, timestamps).  
  - **Room types**: `single`, `double`, `suite`.  
  - **Room status**: `available`, `occupied`, `maintenance`, with explicit transition rules in `RoomStatus::can_transition_to`.

### Current Roles in Code

- **Backend enum**: `UserRole` is a Diesel/Postgres enum with variants `Admin`, `Receptionist`, `Guest`, `Cleaner` used in JWT claims and role middleware.  
  - **`require_admin`**: only `Admin` can access.  
  - **`require_guest`**: only `Guest` can access guest APIs.  
  - **`require_staff`**: admin or receptionist endpoints only (cleaner is excluded).  
  - **`require_cleaner`**: cleaner-only endpoints for the cleaning workflow.
- **Frontend (staff + cleaner)**: `User.role` is a string union `'admin' | 'receptionist' | 'guest' | 'cleaner'`; helpers and route guard should treat cleaners separately from staff dashboards.
- **Frontend (guest)**: guests are separate via `guest-auth` utilities (`GuestUser` type) and `isGuestAuthenticated`, and are routed under `/guest`.

### Auth Flow & Redirects

- **Staff login**:
  - `POST /auth/login` with `username`/`password` (handled by `AuthService::login`) returns `{ token, user }` where `user.role` is `admin` or `receptionist`.
  - Frontend `AuthProvider.login` calls `/auth/login`, stores token/user via `lib/auth.ts`, then redirects to `/` (dashboard).
  - Protected staff pages (dashboard, bookings, rooms) check `isAuthenticated`; unauthenticated users are redirected to `/login` or `/staff/login`.
- **Guest registration & login**:
  - Registration: `POST /auth/register` via `registerGuest` creates a `users` row with `role = guest`, validates email/password, stores token and guest user, then frontend redirects to `/guest`.
  - Login: `POST /auth/guest/login` via `loginGuest` issues a guest JWT; frontend stores it and redirects to `/guest`.
  - Guest-only APIs are guarded by backend `require_guest` middleware; staff-only APIs use `require_staff` (admin + reception).


