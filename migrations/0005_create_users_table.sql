-- Migration: Create users table for payment tracking
-- Created: 2026-02-09

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  phone_e164 VARCHAR(20),
  
  -- Payment tracking fields
  payment_status VARCHAR(20) DEFAULT 'pending',
  payment_id VARCHAR(255),
  payment_transaction_id VARCHAR(255),
  payment_order_id VARCHAR(255),
  payment_amount INTEGER,
  package_type VARCHAR(20),
  album_id UUID,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT users_phone_unique UNIQUE (phone)
);

CREATE INDEX users_payment_order_id_idx ON users(payment_order_id);
CREATE INDEX users_phone_idx ON users(phone);
CREATE INDEX users_payment_status_idx ON users(payment_status);
