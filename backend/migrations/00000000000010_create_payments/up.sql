-- Create payment_type enum
CREATE TYPE payment_type AS ENUM ('deposit', 'partial', 'full', 'refund');

-- Create payments table
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_type payment_type NOT NULL,
    payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
    notes TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT chk_amount_non_zero CHECK (amount != 0),
    CONSTRAINT chk_refund_amount CHECK (
        (amount > 0) OR (payment_type = 'refund')
    )
);

-- Create indexes
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
CREATE INDEX idx_payments_created_by_user_id ON payments(created_by_user_id);

-- Create trigger to auto-update updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
