const BOGOCalculator = require('../../utils/bogoCalculator');

describe('Enhanced BOGO Calculator', () => {
  describe('calculateBOGODiscount', () => {
    const baseCart = {
      items: [
        { productId: 'product-1', quantity: 3, price: 10.00 },
        { productId: 'product-2', quantity: 2, price: 15.00 }
      ]
    };

    const baseTestData = {
      quantity: 5,
      originalPrice: 60.00
    };

    describe('Input Validation', () => {
      test('handles invalid bogoConfig', () => {
        const result = BOGOCalculator.calculateBOGODiscount(baseCart, null, baseTestData);
        
        expect(result.appliedAmount).toBe(0);
        expect(result.calculationDetails.error).toContain('Invalid or missing BOGO configuration');
      });

      test('handles invalid buyQuantity', () => {
        const bogoConfig = { buyQuantity: 0, getQuantity: 1 };
        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.appliedAmount).toBe(0);
        expect(result.calculationDetails.error).toContain('Invalid buyQuantity');
      });

      test('handles invalid getQuantity', () => {
        const bogoConfig = { buyQuantity: 1, getQuantity: 0 };
        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.appliedAmount).toBe(0);
        expect(result.calculationDetails.error).toContain('Invalid getQuantity');
      });

      test('handles invalid testData quantity', () => {
        const bogoConfig = { buyQuantity: 1, getQuantity: 1 };
        const invalidTestData = { quantity: 0, originalPrice: 100 };
        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, invalidTestData);
        
        expect(result.appliedAmount).toBe(0);
        expect(result.calculationDetails.error).toContain('Invalid quantity');
      });
    });

    describe('Specific Mode (Default)', () => {
      test('calculates basic Buy 1 Get 1 Free correctly', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          freeProductIds: ['product-1']
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.setsQualified).toBe(3); // 3 product-1 items / 1 = 3 sets
        expect(result.calculationDetails.freeItemsCount).toBe(3); // 3 sets * 1 get = 3 free
        expect(result.appliedAmount).toBe(30.00); // 3 free items * $10 = $30
        expect(result.calculationDetails.mode).toBe('specific');
      });

      test('calculates Buy 2 Get 1 Free correctly', () => {
        const bogoConfig = {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          freeProductIds: ['product-1']
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.setsQualified).toBe(1); // 3 product-1 items / 2 = 1 set
        expect(result.calculationDetails.freeItemsCount).toBe(1); // 1 set * 1 get = 1 free
        expect(result.appliedAmount).toBe(10.00); // 1 free item * $10 = $10
      });

      test('applies limitPerOrder correctly', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          freeProductIds: ['product-1'],
          limitPerOrder: 2
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.setsQualified).toBe(3);
        expect(result.calculationDetails.freeItemsCount).toBe(2); // Limited to 2
        expect(result.calculationDetails.limitApplied).toBe(true);
        expect(result.appliedAmount).toBe(20.00); // 2 free items * $10 = $20
      });

      test('handles zero limitPerOrder (no free items)', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          freeProductIds: ['product-1'],
          limitPerOrder: 0
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.freeItemsCount).toBe(0);
        expect(result.calculationDetails.limitApplied).toBe(true);
        expect(result.appliedAmount).toBe(0);
      });

      test('auto-defaults free products to eligible products when none specified', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          freeProductIds: [] // Empty - should auto-default
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.appliedAmount).toBe(30.00); // Should work same as explicit freeProductIds
        expect(result.calculationDetails.freeItemsCount).toBe(3);
      });

      test('handles cross-product BOGO (buy X get Y)', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          freeProductIds: ['product-2'] // Different product for free
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.setsQualified).toBe(3); // Based on product-1
        expect(result.calculationDetails.freeItemsCount).toBe(3); // 3 sets qualified, but limited by available products
        expect(result.appliedAmount).toBe(30.00); // Free product-2 items * $15
      });
    });

    describe('Cheapest Mode', () => {
      test('calculates cheapest item discount correctly', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-1', 'product-2'],
          freeProductMode: 'cheapest'
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.mode).toBe('cheapest');
        expect(result.calculationDetails.setsQualified).toBe(5); // All 5 items qualify
        expect(result.calculationDetails.freeItemsCount).toBe(5); // 5 sets * 1 get = 5 free
        // Should discount cheapest items first: 3 * $10 + 2 * $15 = $60
        expect(result.appliedAmount).toBe(60.00);
      });

      test('cheapest mode respects limit', () => {
        const bogoConfig = {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['product-1', 'product-2'],
          freeProductMode: 'cheapest',
          limitPerOrder: 1
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.setsQualified).toBe(2); // 5 items / 2 = 2 sets
        expect(result.calculationDetails.freeItemsCount).toBe(1); // Limited to 1
        expect(result.calculationDetails.limitApplied).toBe(true);
        expect(result.appliedAmount).toBe(10.00); // 1 cheapest item * $10 = $10
      });
    });

    describe('Edge Cases', () => {
      test('handles no eligible items', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-3'] // Non-existent product
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.appliedAmount).toBe(0);
        expect(result.calculationDetails.eligibleItems).toBe(0);
      });

      test('handles insufficient quantity for BOGO', () => {
        const smallCart = {
          items: [{ productId: 'product-1', quantity: 1, price: 10.00 }]
        };
        
        const bogoConfig = {
          buyQuantity: 2, // Need 2 but only have 1
          getQuantity: 1,
          eligibleProductIds: ['product-1']
        };

        const result = BOGOCalculator.calculateBOGODiscount(smallCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails.setsQualified).toBe(0);
        expect(result.appliedAmount).toBe(0);
      });

      test('handles test data fallback mode', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['specific-product'] // Doesn't matter in fallback
        };

        // No cart items provided - should use test data fallback
        const result = BOGOCalculator.calculateBOGODiscount(null, bogoConfig, baseTestData);
        
        expect(result.appliedAmount).toBeGreaterThan(0);
        expect(result.calculationDetails.mode).toBe('specific');
      });
    });

    describe('Calculation Details', () => {
      test('provides comprehensive calculation details', () => {
        const bogoConfig = {
          buyQuantity: 2,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          limitPerOrder: 1
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.calculationDetails).toMatchObject({
          eligibleItems: 1,
          totalEligibleQuantity: 3,
          setsQualified: 1,
          freeItemsCount: 1,
          limitApplied: null, // Limit exists but wasn't applied (1 <= limitPerOrder of 1)
          mode: 'specific',
          buyQuantity: 2,
          getQuantity: 1
        });
      });

      test('tracks free items with details', () => {
        const bogoConfig = {
          buyQuantity: 1,
          getQuantity: 1,
          eligibleProductIds: ['product-1'],
          freeProductIds: ['product-1']
        };

        const result = BOGOCalculator.calculateBOGODiscount(baseCart, bogoConfig, baseTestData);
        
        expect(result.freeItems).toHaveLength(1);
        expect(result.freeItems[0]).toMatchObject({
          productId: 'product-1',
          quantity: 3,
          price: 10.00,
          totalValue: 30.00
        });
      });
    });
  });

  describe('Legacy BOGO Calculation', () => {
    test('maintains backward compatibility', () => {
      const testData = { quantity: 4, originalPrice: 40.00 };
      const result = BOGOCalculator.calculateLegacyBOGO(testData, 2, 1, null);
      
      // Buy 2 Get 1: with 4 items, get 1 complete set (2 buy + 1 free)
      expect(result.bogoDetails.completeBuySets).toBe(1);
      expect(result.freeItems).toBe(1);
      expect(result.appliedAmount).toBe(10.00); // 1 item * ($40/4) = $10
    });

    test('applies legacy limits correctly', () => {
      const testData = { quantity: 9, originalPrice: 90.00 };
      const result = BOGOCalculator.calculateLegacyBOGO(testData, 2, 1, 2);
      
      // Would qualify for 3 sets but limited to 2 free items
      expect(result.bogoDetails.completeBuySets).toBe(3);
      expect(result.bogoDetails.totalFreeItemsBeforeLimit).toBe(3);
      expect(result.freeItems).toBe(2); // Limited
      expect(result.bogoDetails.limitApplied).toBe(true);
      expect(result.appliedAmount).toBe(20.00); // 2 items * ($90/9) = $20
    });
  });
});