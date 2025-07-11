/**
 * Tests for auto-setting Limit Per Order to match Get Quantity
 * Ensures sensible defaults while allowing user override
 */

// Import the actual function from the controller to ensure consistency
const { initializeBogoConfig } = require('../controllers/discountController');

describe('BOGO Limit Per Order Auto-Setting', () => {
	describe('Auto-Setting Behavior', () => {
		test('should auto-set limitPerOrder to match getQuantity for "Buy 2 Get 1"', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1, // Limit should default to 1
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
					// limitPerOrder not specified - should auto-set
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(1); // Should match getQuantity
		});

		test('should auto-set limitPerOrder to match getQuantity for "Buy 1 Get 2"', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 2, // Limit should default to 2
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(2); // Should match getQuantity
		});

		test('should auto-set limitPerOrder to match getQuantity for "Buy 3 Get 5"', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 3,
					getQuantity: 5, // Limit should default to 5
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(5); // Should match getQuantity
		});

		test('should auto-set limitPerOrder when only buyQuantity is provided', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 4,
					// getQuantity will default to 1
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.getQuantity).toBe(1); // Default
			expect(result.bogoConfig.limitPerOrder).toBe(1); // Should match default getQuantity
		});
	});

	describe('User Override Behavior', () => {
		test('should respect explicit limitPerOrder set by user', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					limitPerOrder: 5, // User wants to allow 5 free items per order
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(5); // Should keep user's value
		});

		test('should respect limitPerOrder of 0 (no free items allowed)', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					limitPerOrder: 0, // User wants to disable free items
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(0); // Should keep user's 0 value
		});

		test('should respect limitPerOrder of null (unlimited)', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					limitPerOrder: null, // User wants unlimited free items
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(null); // Should keep user's null value
		});

		test('should allow user to increment from default', () => {
			// Scenario: User creates "Buy 2 Get 1", sees limit defaults to 1,
			// then changes it to 3 to allow more free items per order
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					limitPerOrder: 3, // User incremented from default of 1 to 3
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(3); // Should respect user's increment
		});
	});

	describe('Edge Cases', () => {
		test('should handle missing bogoConfig gracefully', () => {
			const discount = {
				type: 'buy_x_get_y'
				// No bogoConfig - should use defaults
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.getQuantity).toBe(1); // Default
			expect(result.bogoConfig.limitPerOrder).toBe(1); // Should match default getQuantity
		});

		test('should handle partial bogoConfig', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 3
					// getQuantity and limitPerOrder missing - should use defaults
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.getQuantity).toBe(1); // Default
			expect(result.bogoConfig.limitPerOrder).toBe(1); // Should match default getQuantity
		});

		test('should not affect non-BOGO discount types', () => {
			const discount = {
				type: 'percentage',
				value: 10
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig).toBeUndefined(); // Should not create bogoConfig
		});
	});

	describe('Real-World Scenarios', () => {
		test('should handle "Buy 1 Get 1 Free" scenario', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 1,
					eligibleProductIds: ['shirt-123'],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(1);
			// User can later increment to 2, 3, etc. if they want to allow stacking
		});

		test('should handle "Buy 2 Get 1 Free, Limit 1 Per Order" scenario', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					// limitPerOrder auto-set to 1, which is what user wants
					eligibleProductIds: ['shirt-123'],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(1);
			// Perfect default - customer buying 6 items gets 1 free (not 3)
		});

		test('should handle "Buy 1 Get 1, Allow Multiple Free Items" scenario', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 1,
					limitPerOrder: 5, // User wants to allow up to 5 free items per order
					eligibleProductIds: ['shirt-123'],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);

			expect(result.bogoConfig.limitPerOrder).toBe(5);
			// Customer buying 10 items gets 5 free (hits limit), not 10
		});
	});
});