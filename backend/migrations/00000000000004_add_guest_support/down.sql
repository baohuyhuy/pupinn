-- Rollback: Remove guest support
-- Note: The constraint is dropped in migration 00000000000005 rollback
-- 1. Remove guest bookings and users first (data cleanup)
DELETE FROM bookings
WHERE
    creation_source = 'guest';

DELETE FROM users
WHERE
    role = 'guest';

-- 2. Drop index
DROP INDEX IF EXISTS idx_bookings_created_by;

-- 3. Drop new columns from bookings
ALTER TABLE bookings
DROP COLUMN IF EXISTS created_by_user_id,
DROP COLUMN IF EXISTS creation_source;

-- 4. Drop new columns from users
ALTER TABLE users
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS full_name;

-- 5. Make username required again
ALTER TABLE users
ALTER COLUMN username
SET
    NOT NULL;

-- Note: Cannot remove enum value in PostgreSQL without recreating the type
-- The 'guest' value will remain in user_role enum but won't be used