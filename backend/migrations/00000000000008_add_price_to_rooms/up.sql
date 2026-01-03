-- Add price column to rooms table
ALTER TABLE rooms
  ADD COLUMN price DECIMAL(10, 2) NOT NULL DEFAULT 100.00;

-- Set default prices based on room_type
-- Single: 100.00, Double: 150.00, Suite: 250.00
UPDATE rooms
SET price = CASE
  WHEN room_type = 'single' THEN 100.00
  WHEN room_type = 'double' THEN 150.00
  WHEN room_type = 'suite' THEN 250.00
  ELSE 100.00
END;

-- Add constraint to ensure price is non-negative
ALTER TABLE rooms
  ADD CONSTRAINT chk_room_price_non_negative CHECK (price >= 0);
