-- Migration: Rename users table to transactions
-- Also removes UNIQUE constraint on phone to allow multiple payments per user
-- Created: 2026-02-11

-- Drop old indexes (they reference the old table name)
DROP INDEX IF EXISTS users_payment_order_id_idx;
DROP INDEX IF EXISTS users_phone_idx;
DROP INDEX IF EXISTS users_payment_status_idx;

-- Drop the unique constraint on phone
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_unique;

-- Rename the table
ALTER TABLE users RENAME TO transactions;

-- Recreate indexes with new names
CREATE INDEX transactions_phone_idx ON transactions(phone);
CREATE INDEX transactions_payment_order_id_idx ON transactions(payment_order_id);
CREATE INDEX transactions_payment_status_idx ON transactions(payment_status);
