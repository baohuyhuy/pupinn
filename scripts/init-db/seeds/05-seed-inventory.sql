-- Seed data for inventory_items table
-- Idempotent: checks if items already exist before inserting

DO $$
BEGIN
  RAISE NOTICE 'Starting inventory seed data...';

  -- 1. Brooms (Normal Status)
  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'Heavy Duty Broom') THEN
    INSERT INTO inventory_items (id, name, description, quantity, price, status, notes, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Heavy Duty Broom',
      'Standard wide-head broom for hallway cleaning',
      12,
      150000.00,
      'normal',
      'Stored in 1st floor closet',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted Heavy Duty Broom';
  END IF;

  -- 2. Mops (Normal Status)
  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'Microfiber Mop') THEN
    INSERT INTO inventory_items (id, name, description, quantity, price, status, notes, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Microfiber Mop',
      'Blue microfiber mop head with aluminum handle',
      8,
      220000.00,
      'normal',
      NULL,
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted Microfiber Mop';
  END IF;

  -- 3. Toilet Cleaner (Low Stock Status)
  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'Toilet Cleaner (1L)') THEN
    INSERT INTO inventory_items (id, name, description, quantity, price, status, notes, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Toilet Cleaner (1L)',
      'Strong acidic cleaner for toilets',
      3,
      100000,
      'low_stock',
      'Running low, please restock by Friday',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted Toilet Cleaner';
  END IF;

  -- 4. Scrubbers (Normal Status)
  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'Sponge Scrubber') THEN
    INSERT INTO inventory_items (id, name, description, quantity, price, status, notes, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Sponge Scrubber',
      'Yellow/Green scouring pads pack (10pk)',
      50,
      15000,
      'normal',
      NULL,
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted Sponge Scrubber';
  END IF;

  -- 5. Vacuum Cleaner (Broken Status)
  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'Industrial Vacuum X200') THEN
    INSERT INTO inventory_items (id, name, description, quantity, price, status, notes, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Industrial Vacuum X200',
      'High capacity vacuum for carpets',
      1,
      70000,
      'broken',
      'Motor overheating, ticket #402 submitted for repair',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted Industrial Vacuum X200';
  END IF;

  -- 6. Lost Item Example
  IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE name = 'Room Key Set - Floor 2') THEN
    INSERT INTO inventory_items (id, name, description, quantity, price, status, notes, created_at, updated_at)
    VALUES (
      gen_random_uuid(),
      'Room Key Set - Floor 2',
      'Backup physical keys for second floor rooms',
      0,
      500000,
      'lost',
      'Missing since last shift change',
      NOW(),
      NOW()
    );
    RAISE NOTICE '  ✓ Inserted Room Key Set - Floor 2 (Lost)';
  END IF;

  RAISE NOTICE 'Inventory seed data complete!';
END $$;