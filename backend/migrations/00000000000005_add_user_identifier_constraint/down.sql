-- Rollback: Remove user identifier constraint

ALTER TABLE users DROP CONSTRAINT IF EXISTS user_identifier_check;

