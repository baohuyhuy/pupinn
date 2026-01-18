-- Seed data for payments table
-- Idempotent: checks if payments already exist before inserting
-- Creates payments only for bookings that have been checked in (checked_in or checked_out status)

DO $$
BEGIN
  RAISE NOTICE 'Starting payment seed data...';
  
  -- Check if payments already exist for seed bookings (only for checked-in/checked-out bookings)
  IF NOT EXISTS (SELECT 1 FROM payments WHERE booking_id IN (
    '20000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000006'::uuid
  )) THEN
    
    -- Payment 1: Deposit for Booking 1 (SEED-001 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000001'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000001'::uuid) * 0.3,
      'deposit',
      'card',
      'Initial deposit payment',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '3 days',
      NOW() - INTERVAL '3 days'
    );
    
    -- Payment 2: Partial payment for Booking 1 (SEED-001 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000002'::uuid,
      '20000000-0000-0000-0000-000000000001'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000001'::uuid) * 0.4,
      'partial',
      'cash',
      'Additional payment at check-in',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '2 days',
      NOW() - INTERVAL '2 days'
    );
    
    -- Payment 3: Full payment for Booking 2 (SEED-002 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000003'::uuid,
      '20000000-0000-0000-0000-000000000002'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000002'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    );
    
    -- Payment 4: Deposit for Booking 3 (SEED-003 - checked_in)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000004'::uuid,
      '20000000-0000-0000-0000-000000000003'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000003'::uuid) * 0.5,
      'deposit',
      'bank_transfer',
      'Deposit payment via bank transfer',
      '00000000-0000-0000-0000-000000000002'::uuid,  -- Receptionist
      NOW() - INTERVAL '1 day',
      NOW() - INTERVAL '1 day'
    );
    
    -- Payment 5: Full payment for Booking 6 (SEED-006 - checked_out)
    INSERT INTO payments (
      id, booking_id, amount, payment_type, payment_method, notes, created_by_user_id, created_at, updated_at
    ) VALUES (
      '30000000-0000-0000-0000-000000000005'::uuid,
      '20000000-0000-0000-0000-000000000006'::uuid,
      (SELECT price FROM bookings WHERE id = '20000000-0000-0000-0000-000000000006'::uuid),
      'full',
      'card',
      'Full payment at check-in',
      '00000000-0000-0000-0000-000000000001'::uuid,  -- Admin
      NOW() - INTERVAL '5 days',
      NOW() - INTERVAL '5 days'
    );
    
    RAISE NOTICE '  ✓ Inserted 5 sample payments';
    RAISE NOTICE '    - 2 payments for booking SEED-001 (checked_in: deposit + partial)';
    RAISE NOTICE '    - 1 full payment for booking SEED-002 (checked_in)';
    RAISE NOTICE '    - 1 deposit for booking SEED-003 (checked_in)';
    RAISE NOTICE '    - 1 full payment for booking SEED-006 (checked_out)';
  ELSE
    RAISE NOTICE '  ⊘ Sample payments already exist, skipping';
  END IF;
  
  RAISE NOTICE 'Payment seed data complete!';
END $$;
