# Security Updates for Dashboard Routes

## Overview

This document outlines the security improvements made to `backend/src/routes/dashboard.js` to address authentication and data integrity issues.

## Changes Made

### 1. Authentication Middleware Application

- **Issue**: `verifyShopifyAuth` middleware was imported but not applied to endpoints
- **Fix**: Applied `verifyShopifyAuth` to all production endpoints:
  - `/add-usage` (POST)
  - `/add-sample-activities` (POST)
  - `/metrics` (GET)
  - `/activity` (GET)
  - `/top-performing` (GET)

### 2. Admin API Key Middleware

- **Issue**: Admin-only endpoints lacked proper authentication
- **Fix**: Created `requireAdminKey` middleware that:
  - Checks for `x-admin-api-key` header
  - Validates against `ADMIN_API_KEY` environment variable
  - Applied to admin-only endpoints:
    - `/migrate-shop` (POST)
    - `/debug` (GET)

### 3. Usage Count Increment Fix

- **Issue**: `/add-usage` endpoint overwrote `usageCount` instead of incrementing
- **Fix**:
  - Changed from `{ usageCount: usageCount }` to `{ $inc: { usageCount: usageCountNum } }`
  - Added validation to ensure `usageCount` is a positive number
  - Prevents data loss from overwriting existing usage counts

### 4. Migration Safety Checks

- **Issue**: `/migrate-shop` could overwrite existing data without confirmation
- **Fix**: Added comprehensive safety checks:
  - Checks if target shop already has data
  - Requires `confirmation: true` parameter to proceed
  - Implements `dryRun` mode for testing migrations
  - Returns detailed information about existing data

### 5. Debug Endpoint Security

- **Issue**: `/debug` exposed all discount stacks without authentication
- **Fix**:
  - Restricted to admin access only via `requireAdminKey`
  - Added optional `shop` query parameter for filtering
  - Returns filtered data based on authenticated user's scope

## Environment Variables Required

Add the following to your environment configuration:

```bash
# Required for admin endpoints
ADMIN_API_KEY=your-secure-admin-api-key-here
```

## API Usage Examples

### Admin Endpoints (require x-admin-api-key header)

```bash
# Debug endpoint with shop filtering
curl -H "x-admin-api-key: your-key" "http://localhost:3000/api/dashboard/debug?shop=test-shop.myshopify.com"

# Migration with confirmation
curl -X POST -H "x-admin-api-key: your-key" -H "Content-Type: application/json" \
  -d '{"fromShop":"old-shop","toShop":"new-shop","confirmation":true}' \
  "http://localhost:3000/api/dashboard/migrate-shop"

# Dry run migration
curl -X POST -H "x-admin-api-key: your-key" -H "Content-Type: application/json" \
  -d '{"fromShop":"old-shop","toShop":"new-shop","dryRun":true}' \
  "http://localhost:3000/api/dashboard/migrate-shop"
```

### Production Endpoints (require Shopify authentication)

```bash
# Add usage (now increments instead of overwrites)
curl -X POST -H "Content-Type: application/json" \
  -d '{"shop":"test-shop.myshopify.com","stackId":"stack-id","usageCount":5}' \
  "http://localhost:3000/api/dashboard/add-usage?shop=test-shop.myshopify.com"
```

## Security Benefits

1. **Authentication**: All endpoints now require proper authentication
2. **Data Integrity**: Usage counts are properly incremented, not overwritten
3. **Safe Migrations**: Prevents accidental data loss during shop migrations
4. **Access Control**: Admin endpoints are properly restricted
5. **Input Validation**: Added validation for numeric inputs

## Testing

To test the security updates:

1. Set the `ADMIN_API_KEY` environment variable
2. Test admin endpoints with and without the correct API key
3. Test production endpoints with and without proper Shopify authentication
4. Verify that usage counts increment properly instead of overwriting
5. Test migration safety checks with existing data
