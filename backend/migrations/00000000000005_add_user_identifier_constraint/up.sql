-- Migration: Add user identifier constraint
-- This constraint ensures staff have username and guests have email
-- Must be separate from enum value addition due to PostgreSQL transaction requirements
ALTER TABLE users ADD CONSTRAINT user_identifier_check CHECK (
    (
        role = 'guest'
        AND email IS NOT NULL
    )
    OR (
        role != 'guest'
        AND username IS NOT NULL
    )
);