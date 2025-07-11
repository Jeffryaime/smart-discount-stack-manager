/**
 * Comprehensive Edge Case Tests for BOGO System
 * Tests all possible scenarios to catch hidden bugs
 */

const BOGOCalculator = require('../utils/bogoCalculator');
const { validateDiscountStackData } = require('../utils/validation');

describe('BOGO Comprehensive Edge Cases', () => {
	describe('Product ID Edge Cases', () => {
		test('should handle empty product ID arrays', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: [], // Empty - should match any product
				freeProductIds: [], // Empty - should fall back to eligible
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			
			// With empty eligible products, should match any product
			expect(result.appliedAmount).toBe(20); // 2 free items
		});

		test('should handle undefined/null product ID arrays', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: null,
				freeProductIds: undefined,
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			expect(result.appliedAmount).toBe(20);
		});

		test('should handle duplicate product IDs in arrays', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 3, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1', 'item-1', 'item-1'], // Duplicates
				freeProductIds: ['item-1', 'item-1'],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 3, originalPrice: 30 });
			expect(result.appliedAmount).toBe(30); // Should work despite duplicates
		});

		test('should handle overlapping eligible and free product IDs', () => {
			const cart = { 
				items: [
					{ productId: 'item-1', quantity: 2, price: 10 },
					{ productId: 'item-2', quantity: 2, price: 15 }
				] 
			};
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1', 'item-2'],
				freeProductIds: ['item-1'], // Overlap with eligible
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 4, originalPrice: 50 });
			// Should give away item-1 only (free products take precedence)
			expect(result.freeItems.every(item => item.productId === 'item-1')).toBe(true);
		});

		test('should handle very long product ID strings', () => {
			const longId = 'a'.repeat(1000); // Very long product ID
			const cart = { items: [{ productId: longId, quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: [longId],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			}).not.toThrow();
		});

		test('should handle special characters in product IDs', () => {
			const specialId = 'item-123!@#$%^&*()_+-=[]{}|;:,.<>?';
			const cart = { items: [{ productId: specialId, quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: [specialId],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			expect(result.appliedAmount).toBe(20);
		});
	});

	describe('Quantity Edge Cases', () => {
		test('should handle zero buyQuantity with explicit error', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 0, // Invalid - would cause division by zero
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			
			// Should return zero discount and not crash
			expect(result.appliedAmount).toBe(0);
			expect(result.freeItems).toEqual([]);
			expect(result.calculationDetails.error).toBe('Invalid buyQuantity: must be greater than 0');
			expect(result.calculationDetails.setsQualified).toBe(0);
			expect(result.calculationDetails.freeItemsCount).toBe(0);
		});

		test('should handle negative buyQuantity with explicit error', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: -1, // Invalid negative value
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			
			// Should return zero discount and not crash
			expect(result.appliedAmount).toBe(0);
			expect(result.freeItems).toEqual([]);
			expect(result.calculationDetails.error).toBe('Invalid buyQuantity: must be greater than 0');
		});

		test('should handle zero getQuantity with explicit error', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 0, // Invalid - no free items
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			
			// Should return zero discount and not crash
			expect(result.appliedAmount).toBe(0);
			expect(result.freeItems).toEqual([]);
			expect(result.calculationDetails.error).toBe('Invalid getQuantity: must be greater than 0');
		});

		test('should handle negative quantities', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: -1, // Invalid
				getQuantity: -2, // Invalid
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			expect(result.appliedAmount).toBeGreaterThanOrEqual(0); // Should not be negative
		});

		test('should handle very large quantities', () => {
			const cart = { items: [{ productId: 'item-1', quantity: Number.MAX_SAFE_INTEGER, price: 1 }] };
			const bogoConfig = {
				buyQuantity: 1000000,
				getQuantity: 999999,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { 
					quantity: Number.MAX_SAFE_INTEGER, 
					originalPrice: Number.MAX_SAFE_INTEGER 
				});
			}).not.toThrow();
		});

		test('should handle floating point quantities with correct calculations', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 3, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1.5, // Buy 1.5 items
				getQuantity: 0.5,  // Get 0.5 items free
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 3, originalPrice: 30 });
			
			// Verify result is valid number
			expect(typeof result.appliedAmount).toBe('number');
			expect(isNaN(result.appliedAmount)).toBe(false);
			expect(result.appliedAmount).toBeGreaterThanOrEqual(0);
			
			// With 3 items and buyQuantity 1.5, customer qualifies for 2 sets (3/1.5 = 2)
			// Should get 2 * 0.5 = 1 free item worth $10
			expect(result.calculationDetails.setsQualified).toBe(2);
			expect(result.calculationDetails.freeItemsCount).toBe(1); // 2 * 0.5 = 1
			expect(result.appliedAmount).toBe(10); // 1 item * $10 = $10
		});

		test('should handle undefined/null quantities', () => {
			const cart = { items: [{ productId: 'item-1', quantity: null, price: 10 }] };
			const bogoConfig = {
				buyQuantity: undefined,
				getQuantity: null,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: null, originalPrice: 20 });
			}).not.toThrow();
		});
	});

	describe('Cart Edge Cases', () => {
		test('should handle null/undefined cart', () => {
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(null, bogoConfig, { quantity: 2, originalPrice: 20 });
			}).not.toThrow();

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(undefined, bogoConfig, { quantity: 2, originalPrice: 20 });
			}).not.toThrow();
		});

		test('should handle cart with no items array', () => {
			const cart = {}; // Missing items array
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			expect(result.appliedAmount).toBe(20); // Should fall back to test data
		});

		test('should handle items with zero quantities', () => {
			const cart = { 
				items: [
					{ productId: 'item-1', quantity: 0, price: 10 },
					{ productId: 'item-2', quantity: 2, price: 15 }
				] 
			};
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1', 'item-2'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 30 });
			// Should ignore zero quantity items
			expect(result.freeItems.every(item => item.quantity > 0)).toBe(true);
		});

		test('should handle items with negative quantities', () => {
			const cart = { 
				items: [
					{ productId: 'item-1', quantity: -1, price: 10 },
					{ productId: 'item-2', quantity: 2, price: 15 }
				] 
			};
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1', 'item-2'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 1, originalPrice: 15 });
			expect(result.appliedAmount).toBeGreaterThanOrEqual(0);
		});

		test('should handle items with zero/negative prices', () => {
			const cart = { 
				items: [
					{ productId: 'item-1', quantity: 2, price: 0 },
					{ productId: 'item-2', quantity: 2, price: -5 },
					{ productId: 'item-3', quantity: 2, price: 10 }
				] 
			};
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1', 'item-2', 'item-3'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 6, originalPrice: 20 });
			expect(result.appliedAmount).toBeGreaterThanOrEqual(0);
		});

		test('should handle items with missing properties', () => {
			const cart = { 
				items: [
					{ productId: 'item-1', quantity: 2 }, // Missing price
					{ quantity: 2, price: 10 }, // Missing productId
					{ productId: 'item-3', price: 15 }, // Missing quantity
					{ productId: 'item-4', quantity: 1, price: 20 } // Complete
				] 
			};
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: [],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 5, originalPrice: 45 });
			}).not.toThrow();
		});

		test('should handle duplicate product IDs in cart', () => {
			const cart = { 
				items: [
					{ productId: 'item-1', quantity: 1, price: 10 },
					{ productId: 'item-1', quantity: 2, price: 12 }, // Same product, different price
					{ productId: 'item-1', quantity: 1, price: 8 }
				] 
			};
			const bogoConfig = {
				buyQuantity: 2,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 4, originalPrice: 42 });
			// Should handle multiple entries for same product
			expect(result.freeItems.length).toBeGreaterThan(0);
		});
	});

	describe('Limit Edge Cases', () => {
		test('should handle zero limitPerOrder', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 10, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				limitPerOrder: 0, // Zero limit
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 10, originalPrice: 100 });
			expect(result.appliedAmount).toBe(0); // Should apply zero limit
		});

		test('should handle negative limitPerOrder', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 5, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				limitPerOrder: -5, // Negative limit
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 5, originalPrice: 50 });
			expect(result.appliedAmount).toBeGreaterThanOrEqual(0); // Should not go negative
		});

		test('should handle very large limitPerOrder', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				limitPerOrder: Number.MAX_SAFE_INTEGER,
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			expect(result.appliedAmount).toBe(20); // Limit shouldn't affect normal calculation
		});

		test('should handle limit larger than possible free items', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 3, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 2,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				limitPerOrder: 100, // Much larger than possible free items (1)
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 3, originalPrice: 30 });
			expect(result.calculationDetails.limitApplied).toBe(null); // Limit not applied
		});
	});

	describe('Mode Edge Cases', () => {
		test('should handle invalid freeProductMode values', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'invalid-mode'
			};

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			}).not.toThrow();
		});

		test('should normalize case sensitivity in mode values', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'CHEAPEST' // Uppercase - should be normalized to 'cheapest'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			
			// Should normalize to lowercase and use cheapest mode
			expect(result.calculationDetails.mode).toBe('cheapest');
			expect(typeof result.appliedAmount).toBe('number');
			expect(result.appliedAmount).toBeGreaterThan(0); // Should work in cheapest mode
		});

		test('should handle null/undefined mode values defaulting to specific', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: null // Null - should default to 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			
			// Should default to specific mode
			expect(result.calculationDetails.mode).toBe('specific');
			expect(result.appliedAmount).toBe(20); // Should work in specific mode
		});

		test('should handle invalid mode values defaulting to specific', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'INVALID_MODE' // Invalid - should default to 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 2, originalPrice: 20 });
			
			// Should default to specific mode
			expect(result.calculationDetails.mode).toBe('specific');
			expect(result.appliedAmount).toBe(20); // Should work in specific mode
		});
	});

	describe('Test Data Edge Cases', () => {
		test('should handle null/undefined test data', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result1 = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, null);
			expect(result1.calculationDetails.error).toContain('Invalid quantity');

			const result2 = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, undefined);
			expect(result2.calculationDetails.error).toContain('Invalid quantity');
		});

		test('should handle test data with zero originalPrice', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { 
				quantity: 2, 
				originalPrice: 0 
			});
			// Should still work with cart data
			expect(result.appliedAmount).toBe(20);
		});

		test('should handle mismatched test data quantities and prices', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { 
				quantity: 10, // Doesn't match cart
				originalPrice: 5 // Doesn't match cart prices
			});
			
			// Should prioritize cart data when available
			expect(result.appliedAmount).toBe(20); // Based on cart: 2 items * $10
		});
	});

	describe('Calculation Precision Edge Cases', () => {
		test('should handle floating point precision issues', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 3, price: 0.1 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { 
				quantity: 3, 
				originalPrice: 0.3 
			});
			
			// Should handle floating point precision correctly
			expect(result.appliedAmount).toBeCloseTo(0.3, 2);
		});

		test('should handle very small decimal values', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 1000, price: 0.001 }] };
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { 
				quantity: 1000, 
				originalPrice: 1 
			});
			
			expect(result.appliedAmount).toBeCloseTo(1, 3);
		});
	});

	describe('Error Recovery Edge Cases', () => {
		test('should handle malformed bogoConfig objects', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			
			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, null, { quantity: 2, originalPrice: 20 });
			}).not.toThrow();

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, {}, { quantity: 2, originalPrice: 20 });
			}).not.toThrow();

			expect(() => {
				BOGOCalculator.calculateBOGODiscount(cart, "invalid", { quantity: 2, originalPrice: 20 });
			}).not.toThrow();
		});

		test('should handle circular references in objects', () => {
			const cart = { items: [{ productId: 'item-1', quantity: 2, price: 10 }] };
			const circularConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};
			circularConfig.self = circularConfig; // Circular reference

			let result;
			expect(() => {
				result = BOGOCalculator.calculateBOGODiscount(cart, circularConfig, { quantity: 2, originalPrice: 20 });
			}).not.toThrow();

			// Verify the calculation proceeds normally despite circular reference
			// The circular reference should be ignored during calculation
			expect(result).toBeDefined();
			expect(result.appliedAmount).toBe(20); // 2 items * $10 each = $20 discount
			expect(result.freeItems).toHaveLength(1);
			expect(result.freeItems[0].productId).toBe('item-1');
			expect(result.freeItems[0].quantity).toBe(2); // 2 free items (Buy 1 Get 1, with 2 eligible)
			expect(result.freeItems[0].totalValue).toBe(20); // Total value of free items
			
			// Verify calculation details are correct
			expect(result.calculationDetails.eligibleItems).toBe(1); // 1 eligible product type
			expect(result.calculationDetails.totalEligibleQuantity).toBe(2); // 2 total eligible items
			expect(result.calculationDetails.setsQualified).toBe(2); // 2 BOGO sets qualified
			expect(result.calculationDetails.freeItemsCount).toBe(2); // 2 free items given
			expect(result.calculationDetails.mode).toBe('specific');
			expect(result.calculationDetails.buyQuantity).toBe(1);
			expect(result.calculationDetails.getQuantity).toBe(1);
		});
	});

	describe('Legacy Calculation Edge Cases', () => {
		test('should handle edge case where legacy and new methods differ significantly', () => {
			// This tests a scenario where legacy (complete sets) vs new (eligible quantity) gives different results
			const testData = { quantity: 5, originalPrice: 50 }; // 5 items total
			const buyQuantity = 3; // Need 3 to qualify  
			const getQuantity = 2; // Get 2 free

			// Legacy: complete sets = floor(5 / (3+2)) = floor(5/5) = 1 set = 2 free items
			const legacyResult = BOGOCalculator.calculateLegacyBOGO(testData, buyQuantity, getQuantity);
			
			// New: eligible quantity = floor(5 / 3) = 1 set = 2 free items
			const cart = { items: [{ productId: 'item-1', quantity: 5, price: 10 }] };
			const bogoConfig = {
				buyQuantity,
				getQuantity,
				eligibleProductIds: ['item-1'],
				freeProductIds: [],
				freeProductMode: 'specific'
			};
			const newResult = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);

			// In this case they should be the same, but let's verify
			expect(legacyResult.freeItems).toBe(newResult.calculationDetails.freeItemsCount);
		});

		test('should handle legacy calculation with extreme edge cases', () => {
			// Test case that might break legacy calculation
			const testData = { quantity: 1, originalPrice: Number.MAX_SAFE_INTEGER };
			
			expect(() => {
				BOGOCalculator.calculateLegacyBOGO(testData, 1, 1);
			}).not.toThrow();

			expect(() => {
				BOGOCalculator.calculateLegacyBOGO(testData, Number.MAX_SAFE_INTEGER, 1);
			}).not.toThrow();
		});
	});

	describe('Auto-setting Integration Edge Cases', () => {
		test('should verify auto-setting works with edge case product IDs', () => {
			// This tests the integration between our auto-setting controller fix and the calculator
			const cart = { 
				items: [
					{ productId: '', quantity: 2, price: 10 }, // Empty string product ID
					{ productId: null, quantity: 1, price: 15 }, // Null product ID
					{ productId: 'valid-item', quantity: 3, price: 20 }
				] 
			};
			
			// This config would be auto-set by our controller fix
			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: ['valid-item'], // Only valid item
				freeProductIds: ['valid-item'], // Auto-set to same as eligible
				freeProductMode: 'specific'
			};

			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { quantity: 6, originalPrice: 95 });
			
			// Should only process the valid item
			expect(result.freeItems.every(item => item.productId === 'valid-item')).toBe(true);
		});
	});

	describe('Performance Edge Cases', () => {
		test('should handle large datasets without performance issues', () => {
			// Create a cart with many items
			const items = [];
			for (let i = 0; i < 1000; i++) {
				items.push({ productId: `item-${i}`, quantity: 1, price: 10 });
			}
			const cart = { items };

			const bogoConfig = {
				buyQuantity: 1,
				getQuantity: 1,
				eligibleProductIds: items.map(item => item.productId),
				freeProductIds: [],
				freeProductMode: 'specific'
			};

			const startTime = Date.now();
			const result = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, { 
				quantity: 1000, 
				originalPrice: 10000 
			});
			const endTime = Date.now();

			expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
			expect(result.appliedAmount).toBe(10000); // All items should be free
		});
	});
});