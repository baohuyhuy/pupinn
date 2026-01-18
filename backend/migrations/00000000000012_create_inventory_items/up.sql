CREATE TYPE inventory_status AS ENUM ('normal', 'low_stock', 'broken', 'lost', 'need_replacement');

CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    price NUMERIC NOT NULL DEFAULT 0.00,
    status inventory_status NOT NULL DEFAULT 'normal',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for updated_at
SELECT diesel_manage_updated_at('inventory_items');