# Test Utilities

This directory contains shared test utilities to maintain DRY principles across the test suite.

## bogoTestHelpers.js

Shared utilities for BOGO (Buy One Get One) functionality testing. This module provides consistent access to BOGO configuration functions across all test files.

### Functions

#### Core Functions
- `initializeBogoConfig(discount)` - Initialize BOGO configuration with auto-setting logic
- `validateProductIds(productIds)` - Validate product IDs according to system rules

#### Helper Functions
- `createBasicBogoDiscount(options)` - Create a basic BOGO discount object for testing
- `createTestProductIds(count, format)` - Generate valid test product IDs in specified format
- `assertBogoConfigEquals(actual, expected, testName)` - Assert BOGO configurations are equivalent

### Usage

```javascript
// Import the utilities
const { initializeBogoConfig, createBasicBogoDiscount, createTestProductIds } = require('../test-utils/bogoTestHelpers');

// Generate valid product IDs
const numericIds = createTestProductIds(3);                    // ['1', '2', '3']
const gidIds = createTestProductIds(3, 'gid');                 // ['gid://shopify/Product/1', ...]
const mixedIds = createTestProductIds(4, 'auto');              // Mixed numeric and GID formats

// Create a basic BOGO discount
const discount = createBasicBogoDiscount({
  buyQuantity: 2,
  getQuantity: 1,
  eligibleProductIds: numericIds
});

const result = initializeBogoConfig(discount);
```

### Import Strategy

The module uses a conditional import strategy:
1. **In formal test suite (Jest)**: Imports actual functions from the controller for consistency
2. **In standalone tests**: Falls back to local implementations to avoid dependency issues

This ensures tests always use the production implementation when possible, while allowing standalone testing scripts to work independently.

### Files Using This Utility

- `test_auto_free_products.js` - Standalone test script
- `verify-refactor.js` - Verification script
- `src/__tests__/bogo-auto-fix.test.js` - Jest test suite (via controller import)
- `src/__tests__/bogo-limit-auto-set.test.js` - Jest test suite (via controller import)
- `src/__tests__/bogo-limit-frontend-integration.test.js` - Jest test suite (via controller import)

### Product ID Generation

The `createTestProductIds` function generates product IDs that conform to the validation regex:
- **Numeric format** (default): `['1', '2', '3']` - Simple numeric strings
- **GID format**: `['gid://shopify/Product/1', 'gid://shopify/Product/2']` - Shopify Global ID format
- **Auto format**: Mixed numeric and GID formats for comprehensive testing

All generated IDs pass the validation regex: `/^(?:\d+|gid:\/\/shopify\/Product\/\d+)$/`

### Benefits

1. **DRY Principle**: Eliminates duplicated function implementations across test files
2. **Consistency**: Ensures all tests use the same implementation
3. **Maintainability**: Changes only need to be made in one place
4. **Flexibility**: Supports both formal test suites and standalone scripts
5. **Validation Compliance**: Generated test data always passes product ID validation