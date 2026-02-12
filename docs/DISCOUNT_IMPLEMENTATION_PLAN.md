# Discount Implementation Plan (Minimal + Usage Limits)

This document captures the implementation plan for adding discounts to Kahani: simple code + type + value, with **usage limits** (total and/or per user). Other features from the full strategy (date range, package/album restrictions, min/max amount, audit table) can be added later.

---

## 1. Scope (now)

- **Discount definition**: Code, type (percentage or fixed amount), value, active flag.
- **Usage limits**: Optional “max total redemptions” and/or “max redemptions per user” (e.g. by phone).
- **Flow**: Server computes amount from package type + optional discount; stores expected amount on transaction; callback verifies against stored amount.

Out of scope for now: validity dates, applicable packages/albums, min order / max discount caps, full audit/analytics (beyond what’s needed for limits).

---

## 2. Data model

### 2.1 `discounts` table

| Column                      | Type              | Purpose                                                         |
| --------------------------- | ----------------- | --------------------------------------------------------------- |
| `id`                        | uuid PK           | —                                                               |
| `code`                      | varchar, unique   | e.g. WELCOME20, FLAT100 (normalize: uppercase, no spaces)       |
| `discount_type`             | enum/varchar      | `percentage` \| `fixed_amount`                                  |
| `discount_value`            | integer           | Percentage (e.g. 20) or amount in **paise** (e.g. 10000 = ₹100) |
| `is_active`                 | boolean           | Soft on/off                                                     |
| `usage_limit_total`         | integer, nullable | Max total redemptions (null = unlimited)                        |
| `usage_limit_per_user`      | integer, nullable | Max per user/phone (null = unlimited)                           |
| `created_at` / `updated_at` | timestamptz       | —                                                               |

Indexes: unique on `code`, index on `is_active` if you query by it.

### 2.2 `discount_redemptions` table (for usage limits)

Needed to count how many times a code was used (total and per user).

| Column            | Type                   | Purpose                                        |
| ----------------- | ---------------------- | ---------------------------------------------- |
| `id`              | uuid PK                | —                                              |
| `discount_id`     | uuid FK → discounts    | —                                              |
| `transaction_id`  | uuid FK → transactions | —                                              |
| `user_identifier` | varchar, nullable      | e.g. transaction.phone_e164 for per-user limit |
| `created_at`      | timestamptz            | —                                              |

Indexes: `(discount_id)` for total count; `(discount_id, user_identifier)` for per-user count.

### 2.3 `transactions` (add columns)

- **`expected_amount_paise`** (integer, nullable) — Amount sent to PhonePe at create-order. Callback verifies gateway amount === this. (If you prefer, you can reuse `payment_amount` and set it at create-order, then overwrite with gateway amount on success; either way you must persist the “expected” amount at create-order.)
- **`discount_code_applied`** (varchar, nullable) — Which code was applied (optional, for support).

---

## 3. Flow

### 3.1 Create order (`POST /api/phonepe/create-order`)

**Input:** `albumId`, `packageType`, `transactionId`, optional `discountCode`.

1. Resolve **base amount** from package type (e.g. hardcoded map: digital 19900, ebook 59900, printed 99900). Do not use client-supplied amount.
2. **If no discount code:**  
   `finalAmountPaise = baseAmountPaise`.
3. **If discount code present:**
   - Normalize code (trim, uppercase). Look up row in `discounts` where `code = ?` and `is_active = true`.
   - If not found or inactive → reject or treat as no discount (your choice).
   - **Usage limits:**
     - If `usage_limit_total` is set: `SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = ?`. If count >= limit → reject.
     - If `usage_limit_per_user` is set: get user identifier (e.g. from transaction by `transactionId`: `phone_e164` or `phone`). `SELECT COUNT(*) FROM discount_redemptions WHERE discount_id = ? AND user_identifier = ?`. If count >= limit → reject.
   - Compute discount:
     - **percentage:** `discountPaise = floor(baseAmountPaise * discount_value / 100)`, then `finalAmountPaise = baseAmountPaise - discountPaise`.
     - **fixed_amount:** `discountPaise = min(discount_value, baseAmountPaise)`, then `finalAmountPaise = baseAmountPaise - discountPaise`.
     - Ensure `finalAmountPaise >= 0`.
   - Create PhonePe order with `finalAmountPaise`.
   - Insert row into **discount_redemptions** (discount_id, transaction_id, user_identifier). Optionally set `transactions.discount_code_applied = code`.
   - Set **transactions.expected_amount_paise = finalAmountPaise** (and `payment_order_id`, `payment_status = 'pending'` as today).
4. If no discount code: create PhonePe order with base amount; set `expected_amount_paise = baseAmountPaise`; no redemption row.

**When to insert redemption:** Insert when you apply the discount (at create-order), so the same code can’t be reused beyond limits. If the user abandons payment, that redemption still counts toward the limit (simple approach). Optionally later you can add a “consumed only on payment success” flow and a status on redemptions.

### 3.2 Payment callback / update

1. Load transaction by `paymentOrderId`.
2. **Expected amount** = `transaction.expected_amount_paise` (the value stored at create-order). Do **not** recompute from package type or discount.
3. Verify: gateway returned amount === `expected_amount_paise`. If not, treat as mismatch and fail.
4. Update transaction: `payment_status`, `payment_id`, `payment_transaction_id`, `payment_amount` (from gateway), etc., as you do today.

---

## 4. Client

- Checkout/free-trial flow: add optional “Discount code” input.
- On submit: send `discountCode` (if any) in `POST /api/phonepe/create-order` body. Do not send a custom `amount`; server decides amount.
- Optionally call a small “validate discount” endpoint that returns `{ valid, discountAmountPaise, finalAmountPaise }` for UI (“You save ₹X”) before starting payment.

---

## 5. Summary

| Item                              | Decision                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Discount storage                  | `discounts`: code, type, value, is_active, usage_limit_total, usage_limit_per_user                                                   |
| Counting redemptions              | `discount_redemptions`: discount_id, transaction_id, user_identifier                                                                 |
| Expected amount                   | Stored on transaction at create-order (`expected_amount_paise` or similar); callback verifies against it                             |
| Usage limits                      | Enforced at create-order by counting rows in `discount_redemptions`                                                                  |
| Later (from DISCOUNT_STRATEGY.md) | valid_from/valid_until, applicable_package_types, applicable_album_ids, min_amount_paise, max_discount_paise, richer audit/analytics |
