-- Migration: Add cleaner role and room cleaning statuses
-- This migration extends existing enums to support cleaner workflow

-- 1. Add cleaner role to user_role enum
ALTER TYPE user_role ADD VALUE 'cleaner';

-- 2. Add dirty status to room_status enum
ALTER TYPE room_status ADD VALUE 'dirty';

-- 3. Add cleaning status to room_status enum
ALTER TYPE room_status ADD VALUE 'cleaning';

