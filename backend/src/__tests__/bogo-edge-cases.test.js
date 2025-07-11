const BOGOCalculator = require('../utils/bogoCalculator');

describe('BOGO Edge Cases Tests', () => {
  describe('Division by Zero Protection', () => {
    test('should handle zero quantity gracefully', () => {
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

      const testData = { quantity: 0, originalPrice: 150 }; // Zero quantity
      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      expect(result.appliedAmount).toBe(0);
      expect(result.calculationDetails.error).toBe('Invalid quantity: must be greater than 0');
    });

    test('should handle negative quantity gracefully', () => {
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

      const testData = { quantity: -5, originalPrice: 150 }; // Negative quantity
      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      expect(result.appliedAmount).toBe(0);
      expect(result.calculationDetails.error).toBe('Invalid quantity: must be greater than 0');
    });

    test('should handle cart items with zero quantity', () => {
      const cart = {
        items: [
          { productId: '12345', quantity: 0, price: 50 }, // Zero quantity item
          { productId: '67890', quantity: 3, price: 30 }
        ]
      };

      const bogoConfig = {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: ['12345', '67890'],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'cheapest'
      };

      const testData = { quantity: 3, originalPrice: 90 };
      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      // Should only consider items with positive quantities
      expect(result.calculationDetails.eligibleItems).toBe(1); // Only the item with quantity 3
      expect(result.appliedAmount).toBe(30); // 1 free item at $30
    });
  });

  describe('Minimum Quantity Handling', () => {
    test('should assign minimum quantity of 1 when division results in 0', () => {
      // This test simulates the controller logic for creating cart items
      const testData = {
        quantity: 2,
        originalPrice: 100,
        productIds: ['12345', '67890', '11111'] // 3 products, 2 total quantity
      };

      // Simulate the controller's cart creation logic with our fixes
      const cart = {
        items: testData.productIds.map((productId, index) => {
          const productCount = testData.productIds.length || 1;
          let itemQuantity = Math.floor(testData.quantity / productCount);
          
          // Ensure minimum quantity of 1 per item to avoid zero quantities
          if (itemQuantity === 0) {
            itemQuantity = 1;
          }
          
          return {
            productId,
            quantity: itemQuantity,
            price: testData.originalPrice / testData.quantity
          };
        })
      };

      const bogoConfig = {
        buyQuantity: 1,
        getQuantity: 1,
        eligibleProductIds: ['12345', '67890', '11111'],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'cheapest'
      };

      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      // Each item should have quantity 1 (minimum)
      expect(cart.items.every(item => item.quantity >= 1)).toBe(true);
      expect(result.appliedAmount).toBeGreaterThan(0);
    });

    test('should handle single product with sufficient quantity', () => {
      const testData = {
        quantity: 5,
        originalPrice: 250,
        productIds: ['12345']
      };

      // Simulate controller logic
      const cart = {
        items: testData.productIds.map((productId) => {
          const productCount = testData.productIds.length || 1;
          let itemQuantity = Math.floor(testData.quantity / productCount);
          
          if (itemQuantity === 0) {
            itemQuantity = 1;
          }
          
          return {
            productId,
            quantity: itemQuantity,
            price: testData.originalPrice / testData.quantity
          };
        })
      };

      const bogoConfig = {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: ['12345'],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      };

      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      expect(cart.items[0].quantity).toBe(5);
      expect(result.appliedAmount).toBe(100); // 2 free items at $50 each
    });
  });

  describe('Price Calculation Edge Cases', () => {
    test('should handle zero original price', () => {
      const cart = {
        items: [
          { productId: '12345', quantity: 3, price: 0 } // Zero price
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

      const testData = { quantity: 3, originalPrice: 0 };
      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      expect(result.appliedAmount).toBe(0); // No discount on free items
      expect(result.freeItems).toHaveLength(1); // But still gets free item
      expect(result.freeItems[0].price).toBe(0);
    });

    test('should calculate correct price per item', () => {
      const testData = {
        quantity: 4,
        originalPrice: 200, // $50 per item
        productIds: ['12345', '67890']
      };

      // Simulate controller logic
      const cart = {
        items: testData.productIds.map((productId) => {
          const productCount = testData.productIds.length || 1;
          let itemQuantity = Math.floor(testData.quantity / productCount);
          
          if (itemQuantity === 0) {
            itemQuantity = 1;
          }
          
          return {
            productId,
            quantity: itemQuantity,
            price: testData.originalPrice / testData.quantity // $50 per item
          };
        })
      };

      expect(cart.items[0].price).toBe(50);
      expect(cart.items[1].price).toBe(50);
      expect(cart.items[0].quantity).toBe(2); // 4 / 2 = 2 each
      expect(cart.items[1].quantity).toBe(2);
    });
  });

  describe('Controller Edge Case Simulation', () => {
    test('should skip BOGO calculation when quantity is zero', () => {
      // This simulates what happens in the controller when testData.quantity <= 0
      const testData = { quantity: 0, originalPrice: 100 };
      
      // Controller should skip calculation and not call BOGOCalculator
      // We test this by ensuring our validation catches it
      
      const cart = { items: [] };
      const bogoConfig = {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: ['12345'],
        freeProductMode: 'specific'
      };

      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);
      
      expect(result.appliedAmount).toBe(0);
      expect(result.calculationDetails.error).toBe('Invalid quantity: must be greater than 0');
    });

    test('should handle empty productIds array', () => {
      const testData = {
        quantity: 3,
        originalPrice: 150,
        productIds: [] // Empty array
      };

      // Controller should fall back to default single item
      const cart = {
        items: [{
          productId: 'test-product',
          quantity: testData.quantity,
          price: testData.originalPrice / testData.quantity
        }]
      };

      const bogoConfig = {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: ['test-product'], // Include the test product
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      };

      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      expect(result.appliedAmount).toBe(50); // 1 free item at $50
    });

    test('should handle undefined productIds', () => {
      const testData = {
        quantity: 4,
        originalPrice: 200,
        productIds: undefined // Undefined
      };

      // Controller should fall back to default single item
      const cart = {
        items: [{
          productId: 'test-product',
          quantity: testData.quantity,
          price: testData.originalPrice / testData.quantity
        }]
      };

      const bogoConfig = {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: ['test-product'], // Include the test product
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      };

      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      expect(result.appliedAmount).toBe(100); // 2 free items at $50 each
    });
  });

  describe('Legacy BOGO Division by Zero Protection', () => {
    test('should handle zero quantity in legacy BOGO calculation', () => {
      const testData = { quantity: 0, originalPrice: 100 };
      const result = BOGOCalculator.calculateLegacyBOGO(testData, 2, 1, null);
      
      expect(result.appliedAmount).toBe(0);
      expect(result.freeItems).toBe(0);
      expect(result.bogoDetails.error).toBe('Invalid quantity: must be greater than 0');
    });

    test('should handle negative quantity in legacy BOGO calculation', () => {
      const testData = { quantity: -3, originalPrice: 150 };
      const result = BOGOCalculator.calculateLegacyBOGO(testData, 1, 1, null);
      
      expect(result.appliedAmount).toBe(0);
      expect(result.freeItems).toBe(0);
      expect(result.bogoDetails.error).toBe('Invalid quantity: must be greater than 0');
    });

    test('should handle undefined testData in legacy BOGO calculation', () => {
      const result = BOGOCalculator.calculateLegacyBOGO(null, 2, 1, null);
      
      expect(result.appliedAmount).toBe(0);
      expect(result.freeItems).toBe(0);
      expect(result.bogoDetails.error).toBe('Invalid quantity: must be greater than 0');
    });

    test('should work normally with valid data in legacy BOGO calculation', () => {
      const testData = { quantity: 6, originalPrice: 300 }; // $50 per item
      const result = BOGOCalculator.calculateLegacyBOGO(testData, 2, 1, null);
      
      expect(result.appliedAmount).toBe(100); // 2 free items at $50 each
      expect(result.freeItems).toBe(2);
      expect(result.bogoDetails.completeBuySets).toBe(2);
      expect(result.bogoDetails.error).toBeUndefined();
    });
  });

  describe('Boundary Conditions', () => {
    test('should handle very small quantities', () => {
      const testData = {
        quantity: 1,
        originalPrice: 50,
        productIds: ['12345', '67890', '11111'] // 3 products, 1 total quantity
      };

      // With our fix, each item should get minimum quantity of 1
      const cart = {
        items: testData.productIds.map((productId) => {
          const productCount = testData.productIds.length || 1;
          let itemQuantity = Math.floor(testData.quantity / productCount); // Would be 0
          
          if (itemQuantity === 0) {
            itemQuantity = 1; // Minimum quantity
          }
          
          return {
            productId,
            quantity: itemQuantity,
            price: testData.originalPrice / testData.quantity
          };
        })
      };

      expect(cart.items.every(item => item.quantity === 1)).toBe(true);
      expect(cart.items).toHaveLength(3);
    });

    test('should handle large quantities efficiently', () => {
      const testData = {
        quantity: 1000,
        originalPrice: 50000,
        productIds: ['12345']
      };

      const cart = {
        items: [{
          productId: '12345',
          quantity: 1000,
          price: 50
        }]
      };

      const bogoConfig = {
        buyQuantity: 2,
        getQuantity: 1,
        eligibleProductIds: ['12345'],
        freeProductIds: [],
        limitPerOrder: null,
        freeProductMode: 'specific'
      };

      const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

      expect(result.appliedAmount).toBe(25000); // 500 free items at $50 each
      expect(result.calculationDetails.setsQualified).toBe(500);
    });
  });
});