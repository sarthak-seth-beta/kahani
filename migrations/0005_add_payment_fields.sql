-- Migration: Add PhonePe payment fields to free_trials table
-- Created: 2026-02-06

ALTER TABLE free_trials 
  ADD COLUMN IF NOT EXISTS payment_gateway VARCHAR(20) DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS payment_order_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_transaction_id VARCHAR(255),
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payment_amount INTEGER,
  ADD COLUMN IF NOT EXISTS package_type VARCHAR(20);

-- Create index on payment_order_id for faster lookups
CREATE INDEX IF NOT EXISTS free_trials_payment_order_id_idx ON free_trials(payment_order_id);

-- Create index on payment_status for filtering
CREATE INDEX IF NOT EXISTS free_trials_payment_status_idx ON free_trials(payment_status);
