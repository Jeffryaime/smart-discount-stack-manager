const { validateDiscountStackData } = require('../utils/validation');

describe('Enhanced BOGO Validation Tests', () => {
  test('should fail validation when specific mode has no products specified', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: [], // Empty
          freeProductIds: [], // Empty
          limitPerOrder: null,
          freeProductMode: 'specific',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    expect(errors).toContain(
      'Discount 1: BOGO with specific mode requires either eligible products or free products to be specified'
    );
  });

  test('should pass validation when specific mode has eligible products only', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['12345', '67890'], // Has eligible products
          freeProductIds: [], // Empty but that's OK
          limitPerOrder: null,
          freeProductMode: 'specific',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    expect(errors).toHaveLength(0);
  });

  test('should pass validation when specific mode has free products only', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: [], // Empty but that's OK
          freeProductIds: ['11111', '22222'], // Has free products
          limitPerOrder: null,
          freeProductMode: 'specific',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    expect(errors).toHaveLength(0);
  });

  test('should pass validation when specific mode has both eligible and free products', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['12345', '67890'],
          freeProductIds: ['11111', '22222'],
          limitPerOrder: null,
          freeProductMode: 'specific',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    expect(errors).toHaveLength(0);
  });

  test('should still require eligible products for cheapest mode', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: [], // Empty - should fail
          freeProductIds: [],
          limitPerOrder: null,
          freeProductMode: 'cheapest',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    expect(errors).toContain(
      'Discount 1: Auto-discount cheapest mode requires eligible products to be specified'
    );
  });

  test('should handle multiple validation errors in one discount', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: -1, // Invalid value
        bogoConfig: {
          buyQuantity: 0, // Invalid buy quantity
          getQuantity: 1,
          eligibleProductIds: [], // Missing products for specific mode
          freeProductIds: [],
          limitPerOrder: -5, // Invalid limit
          freeProductMode: 'specific',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    
    // Should have multiple errors for the same discount
    expect(errors.length).toBeGreaterThan(1);
    expect(errors).toContain(
      'Discount 1: BOGO with specific mode requires either eligible products or free products to be specified'
    );
    expect(errors).toContain(
      'Discount 1: Per-order limit must be greater than 0 or leave empty for no limit'
    );
  });

  test('should handle undefined bogoConfig gracefully', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: undefined, // Missing config
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    
    // Should not crash and may have validation errors, but shouldn't throw
    expect(Array.isArray(errors)).toBe(true);
  });

  test('should handle null freeProductMode (should default to specific)', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: [],
          freeProductIds: [],
          limitPerOrder: null,
          freeProductMode: null, // Null mode should be treated as specific
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    
    // Should treat null as specific mode and require products
    expect(errors).toContain(
      'Discount 1: BOGO with specific mode requires either eligible products or free products to be specified'
    );
  });
});