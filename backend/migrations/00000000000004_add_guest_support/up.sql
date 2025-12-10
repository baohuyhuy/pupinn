-- Migration: Add guest support to users and bookings
-- Note: The CHECK constraint referencing 'guest' role will be added in a separate migration
-- because PostgreSQL doesn't allow using newly added enum values in the same transaction

-- 1. Add guest role to enum
ALTER TYPE user_role ADD VALUE 'guest';

-- 2. Add new columns to users
ALTER TABLE users
  ADD COLUMN email VARCHAR(255) UNIQUE,
  ADD COLUMN full_name VARCHAR(100);

-- 3. Make username nullable (for guests)
ALTER TABLE users ALTER COLUMN username DROP NOT NULL;

-- 4. Add creator tracking to bookings
ALTER TABLE bookings
  ADD COLUMN created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN creation_source VARCHAR(10) NOT NULL DEFAULT 'staff';

-- 5. Create index for guest bookings lookup
CREATE INDEX idx_bookings_created_by ON bookings(created_by_user_id);

