-- Migration: Add book_order flag to discounts table
-- Only codes with book_order = true can be used on the AddressForm / extra-copies flow.
-- Created: 2026

ALTER TABLE discounts ADD COLUMN IF NOT EXISTS book_order BOOLEAN NOT NULL DEFAULT false;
