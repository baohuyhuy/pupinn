-- Seed data for rooms table
-- Idempotent: uses ON CONFLICT DO NOTHING to avoid duplicates

DO $$
BEGIN
  RAISE NOTICE 'Starting room seed data...';
END $$;

-- Insert sample rooms with various types and statuses
-- Using ON CONFLICT to make idempotent
INSERT INTO rooms (id, number, room_type, status, created_at, updated_at)
VALUES 
  -- Floor 1: Single rooms
  ('10000000-0000-0000-0000-000000000101'::uuid, '101', 'single', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000102'::uuid, '102', 'single', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000103'::uuid, '103', 'single', 'occupied', NOW(), NOW()),
  
  -- Floor 2: Double rooms
  ('10000000-0000-0000-0000-000000000201'::uuid, '201', 'double', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000202'::uuid, '202', 'double', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000203'::uuid, '203', 'double', 'maintenance', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000204'::uuid, '204', 'double', 'occupied', NOW(), NOW()),
  
  -- Floor 3: Suites
  ('10000000-0000-0000-0000-000000000301'::uuid, '301', 'suite', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000302'::uuid, '302', 'suite', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000303'::uuid, '303', 'suite', 'occupied', NOW(), NOW()),
  
  -- Floor 4: Mix
  ('10000000-0000-0000-0000-000000000401'::uuid, '401', 'single', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000402'::uuid, '402', 'double', 'available', NOW(), NOW()),
  ('10000000-0000-0000-0000-000000000403'::uuid, '403', 'suite', 'available', NOW(), NOW())
ON CONFLICT (number) DO NOTHING;

DO $$
DECLARE
  inserted_count integer;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count > 0 THEN
    RAISE NOTICE '  ✓ Inserted % sample rooms', inserted_count;
  ELSE
    RAISE NOTICE '  ⊘ Sample rooms already exist, skipping';
  END IF;
  RAISE NOTICE 'Room seed data complete!';
END $$;

