const { validateDiscountStackData } = require('../utils/validation');
const { calculateBOGODiscount } = require('./utils/testHelpers/bogoCalculator');

describe('BOGO Validation Tests', () => {
  test('should validate BOGO with specific mode and free products', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['12345', '67890'],
          freeProductIds: ['11111', '22222'],
          limitPerOrder: 3,
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

  test('should validate BOGO with cheapest mode', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['12345', '67890'],
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
    expect(errors).toHaveLength(0);
  });

  test('should fail validation when cheapest mode has no eligible products', () => {
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

  test('should fail validation with invalid freeProductMode', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['12345'],
          freeProductIds: [],
          limitPerOrder: null,
          freeProductMode: 'invalid',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    expect(errors).toContain(
      "Discount 1: Invalid free product mode. Must be 'specific' or 'cheapest'"
    );
  });

  test('should validate limit per order correctly', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['12345'],
          freeProductIds: ['67890'],
          limitPerOrder: 5,
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

  test('should fail validation with negative limit per order', () => {
    const discounts = [
      {
        type: 'buy_x_get_y',
        value: 2,
        bogoConfig: {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['12345'],
          freeProductIds: ['67890'],
          limitPerOrder: -1,
          freeProductMode: 'specific',
        },
        conditions: {},
        priority: 0,
        isActive: true,
      },
    ];

    const errors = validateDiscountStackData('Test Stack', discounts);
    expect(errors).toContain(
      'Discount 1: Per-order limit must be greater than 0 or leave empty for no limit'
    );
  });
});

describe('BOGO Calculation Logic Tests', () => {

  test('should calculate discount for cheapest mode', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 3, price: 50 },
        { productId: '67890', quantity: 2, price: 30 },
        { productId: '11111', quantity: 1, price: 20 },
      ],
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345', '67890', '11111'],
      freeProductIds: [],
      limitPerOrder: null,
      freeProductMode: 'cheapest',
    };

    const result = calculateBOGODiscount(cart, bogoConfig);

    // Should get 3 free items (6 total / 2 buy = 3 sets)
    // Should discount: 1x$20 + 2x$30 = $80
    expect(result.discount).toBe(80);
    expect(result.freeItems).toHaveLength(2);
    expect(result.freeItems[0].productId).toBe('11111');
    expect(result.freeItems[1].productId).toBe('67890');
  });

  test('should respect limit per order in cheapest mode', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 6, price: 50 },
        { productId: '67890', quantity: 4, price: 30 },
      ],
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345', '67890'],
      freeProductIds: [],
      limitPerOrder: 2,
      freeProductMode: 'cheapest',
    };

    const result = calculateBOGODiscount(cart, bogoConfig);

    // Should get only 2 free items due to limit
    expect(result.discount).toBe(60); // 2 x $30
    expect(result.freeItems).toHaveLength(1);
    expect(result.freeItems[0].quantity).toBe(2);
  });

  test('should handle specific mode with free products', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 4, price: 50 }, // Buy these
        { productId: '99999', quantity: 3, price: 25 }, // Get these free
      ],
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345'],
      freeProductIds: ['99999'],
      limitPerOrder: null,
      freeProductMode: 'specific',
    };

    const result = calculateBOGODiscount(cart, bogoConfig);

    // Buy 4, get 2 free
    expect(result.discount).toBe(50); // 2 x $25
    expect(result.freeItems[0].productId).toBe('99999');
    expect(result.freeItems[0].quantity).toBe(2);
  });

  test('should fallback to eligible products when no free products specified', () => {
    const cart = {
      items: [{ productId: '12345', quantity: 3, price: 50 }],
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345'],
      freeProductIds: [],
      limitPerOrder: null,
      freeProductMode: 'specific',
    };

    const result = calculateBOGODiscount(cart, bogoConfig);

    // Buy 2, get 1 free (same product)
    expect(result.discount).toBe(50);
    expect(result.freeItems[0].productId).toBe('12345');
    expect(result.freeItems[0].quantity).toBe(1);
  });
});