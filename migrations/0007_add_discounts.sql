-- Migration: Add discounts system
-- Creates discounts table, discount_redemptions table, and adds columns to transactions
-- Created: 2026-02-12

-- 1. Create discounts table
CREATE TABLE IF NOT EXISTS discounts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL,
  discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value INTEGER NOT NULL CHECK (discount_value > 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  usage_limit_total INTEGER,        -- NULL = unlimited
  usage_limit_per_user INTEGER,     -- NULL = unlimited
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX discounts_code_idx ON discounts(code);
CREATE INDEX discounts_is_active_idx ON discounts(is_active);

-- 2. Create discount_redemptions table
CREATE TABLE IF NOT EXISTS discount_redemptions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  discount_id VARCHAR NOT NULL REFERENCES discounts(id) ON DELETE RESTRICT,
  transaction_id VARCHAR NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  user_identifier VARCHAR(50),       -- phone_e164 for per-user limits
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX discount_redemptions_discount_id_idx ON discount_redemptions(discount_id);
CREATE INDEX discount_redemptions_discount_user_idx ON discount_redemptions(discount_id, user_identifier);

-- 3. Add columns to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS expected_amount_paise INTEGER;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS discount_code_applied VARCHAR(50);
