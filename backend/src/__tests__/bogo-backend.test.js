const BOGOCalculator = require('../utils/bogoCalculator');

describe('Backend BOGO Calculator Tests', () => {
  test('should calculate cheapest mode discount correctly', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 3, price: 50 },
        { productId: '67890', quantity: 2, price: 30 },
        { productId: '11111', quantity: 1, price: 20 }
      ]
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345', '67890', '11111'],
      freeProductIds: [],
      limitPerOrder: null,
      freeProductMode: 'cheapest'
    };

    const testData = { quantity: 6, originalPrice: 280 };
    const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

    // Should get 3 free items (6 total / 2 buy = 3 sets)
    // Should discount: 1x$20 + 2x$30 = $80
    expect(result.appliedAmount).toBe(80);
    expect(result.freeItems).toHaveLength(2);
    expect(result.freeItems[0].productId).toBe('11111'); // Cheapest first
    expect(result.calculationDetails.mode).toBe('cheapest');
  });

  test('should respect limit per order in cheapest mode', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 6, price: 50 },
        { productId: '67890', quantity: 4, price: 30 }
      ]
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345', '67890'],
      freeProductIds: [],
      limitPerOrder: 2,
      freeProductMode: 'cheapest'
    };

    const testData = { quantity: 10, originalPrice: 420 };
    const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

    // Should get only 2 free items due to limit
    expect(result.appliedAmount).toBe(60); // 2 x $30 (cheapest available)
    expect(result.calculationDetails.limitApplied).toBe(true);
  });

  test('should handle specific mode with designated free products', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 4, price: 50 }, // Buy these
        { productId: '99999', quantity: 3, price: 25 }  // Get these free
      ]
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345'],
      freeProductIds: ['99999'],
      limitPerOrder: null,
      freeProductMode: 'specific'
    };

    const testData = { quantity: 7, originalPrice: 275 };
    const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

    // Buy 4, get 2 free from specific product
    expect(result.appliedAmount).toBe(50); // 2 x $25
    expect(result.freeItems[0].productId).toBe('99999');
    expect(result.calculationDetails.mode).toBe('specific');
  });

  test('should fallback to eligible products when no free products specified', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 3, price: 50 }
      ]
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345'],
      freeProductIds: [],
      limitPerOrder: null,
      freeProductMode: 'specific'
    };

    const testData = { quantity: 3, originalPrice: 150 };
    const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

    // Buy 2, get 1 free (same product)
    expect(result.appliedAmount).toBe(50);
    expect(result.freeItems[0].productId).toBe('12345');
    expect(result.calculationDetails.mode).toBe('specific');
  });

  test('should handle legacy BOGO calculation', () => {
    const testData = {
      quantity: 5,
      originalPrice: 250
    };

    const result = BOGOCalculator.calculateLegacyBOGO(testData, 2, 1, null);

    // 5 items: buy 2 + get 1 = 3 items per set, so 1 complete set
    // 1 free item at $50 each
    expect(result.appliedAmount).toBe(50);
    expect(result.freeItems).toBe(1);
    expect(result.bogoDetails.completeBuySets).toBe(1);
  });

  test('should return zero discount when no eligible items', () => {
    const cart = {
      items: [
        { productId: 'ineligible', quantity: 5, price: 50 }
      ]
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345'], // Different from cart items
      freeProductIds: [],
      limitPerOrder: null,
      freeProductMode: 'cheapest'
    };

    const testData = { quantity: 5, originalPrice: 250 };
    const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

    expect(result.appliedAmount).toBe(0);
    expect(result.freeItems).toHaveLength(0);
    expect(result.calculationDetails.eligibleItems).toBe(0);
  });

  test('should handle insufficient quantity for BOGO', () => {
    const cart = {
      items: [
        { productId: '12345', quantity: 1, price: 50 }
      ]
    };

    const bogoConfig = {
      buyQuantity: 2,
      getQuantity: 1,
      eligibleProductIds: ['12345'],
      freeProductIds: [],
      limitPerOrder: null,
      freeProductMode: 'specific'
    };

    const testData = { quantity: 1, originalPrice: 50 };
    const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

    expect(result.appliedAmount).toBe(0);
    expect(result.calculationDetails.setsQualified).toBe(0);
  });
});