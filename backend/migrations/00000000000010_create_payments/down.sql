-- Drop trigger
DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;

-- Drop indexes
DROP INDEX IF EXISTS idx_payments_created_by_user_id;
DROP INDEX IF EXISTS idx_payments_created_at;
DROP INDEX IF EXISTS idx_payments_booking_id;

-- Drop table
DROP TABLE IF EXISTS payments;

-- Drop enum type
DROP TYPE IF EXISTS payment_type;
