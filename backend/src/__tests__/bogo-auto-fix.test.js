/**
 * Tests for auto-setting free products to eligible products
 * Ensures broken BOGO configurations are automatically fixed
 */

const BOGOCalculator = require('../utils/bogoCalculator');
// Import the actual function from the controller to ensure consistency
const { initializeBogoConfig } = require('../controllers/discountController');

describe('BOGO Auto-Fix: Free Products Auto-Setting', () => {
	describe('Auto-setting Logic', () => {
		test('should auto-set free products to eligible products when none selected (specific mode)', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					eligibleProductIds: ['123', '456'], // Valid numeric product IDs
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.freeProductIds).toEqual(['123', '456']);
		});

		test('should keep original free products when already selected', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					eligibleProductIds: ['123', '456'],
					freeProductIds: ['789'],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.freeProductIds).toEqual(['789']);
		});

		test('should keep empty free products in cheapest mode', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					eligibleProductIds: ['123', '456'],
					freeProductIds: [],
					freeProductMode: 'cheapest'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.freeProductIds).toEqual([]);
		});

		test('should keep empty when both eligible and free products are empty', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					eligibleProductIds: [],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.freeProductIds).toEqual([]);
		});
	});

	describe('Previously Broken Scenarios Now Fixed', () => {
		test('should fix broken configuration: eligible products but no free products', () => {
			// This was the broken scenario that returned no discount
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: ['123'],
					freeProductIds: [], // This was the problem
					freeProductMode: 'specific'
				}
			};

			const fixedDiscount = initializeBogoConfig(discount);

			// Verify the fix
			expect(fixedDiscount.bogoConfig.freeProductIds).toEqual(['123']);

			// Test actual BOGO calculation
			const cart = {
				items: [
					{ productId: '123', quantity: 3, price: 25 }
				]
			};

			const result = BOGOCalculator.calculateBOGODiscount(
				cart, 
				fixedDiscount.bogoConfig, 
				{ quantity: 3, originalPrice: 75 }
			);

			// Should now work correctly
			expect(result.appliedAmount).toBe(25);
			expect(result.freeItems).toHaveLength(1);
			expect(result.freeItems[0].productId).toBe('123');
		});

		test('should fix cross-product BOGO scenario', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 1,
					eligibleProductIds: ['123'],
					freeProductIds: [], // Auto-set to expensive-item-123
					freeProductMode: 'specific'
				}
			};

			const fixedDiscount = initializeBogoConfig(discount);

			const cart = {
				items: [
					{ productId: '123', quantity: 2, price: 100 }
				]
			};

			const result = BOGOCalculator.calculateBOGODiscount(
				cart, 
				fixedDiscount.bogoConfig, 
				{ quantity: 2, originalPrice: 200 }
			);

			expect(result.appliedAmount).toBe(100); // 1 free item worth $100
			expect(result.freeItems).toHaveLength(1);
			expect(result.freeItems[0].quantity).toBe(1);
		});

		test('should maintain existing behavior for working configurations', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: ['jeans-123'],
					freeProductIds: ['456'], // Already specified
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			// Should not auto-set, keep original
			expect(result.bogoConfig.freeProductIds).toEqual(['456']);
		});
	});

	describe('Edge Cases', () => {
		test('should handle missing bogoConfig gracefully', () => {
			const discount = {
				type: 'buy_x_get_y'
				// No bogoConfig at all
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.eligibleProductIds).toEqual([]);
			expect(result.bogoConfig.freeProductIds).toEqual([]);
		});

		test('should handle partial bogoConfig', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 3
					// Missing other properties
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.buyQuantity).toBe(3);
			expect(result.bogoConfig.eligibleProductIds).toEqual([]);
			expect(result.bogoConfig.freeProductIds).toEqual([]);
		});

		test('should not modify non-BOGO discount types', () => {
			const discount = {
				type: 'percentage',
				value: 10
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig).toBeUndefined();
		});
	});
});