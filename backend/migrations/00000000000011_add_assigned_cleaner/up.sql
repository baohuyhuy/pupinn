-- Migration: Add assigned cleaner to rooms
ALTER TABLE rooms ADD COLUMN assigned_cleaner_id UUID REFERENCES users(id);