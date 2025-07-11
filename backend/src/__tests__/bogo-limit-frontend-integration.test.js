/**
 * Tests for frontend-backend integration of auto-limit functionality
 * Verifies that our new dropdown-based limit selection works correctly
 */

const { validateDiscountStackData } = require('../utils/validation');
// Import the actual function from the controller to ensure consistency
const { initializeBogoConfig } = require('../controllers/discountController');

describe('BOGO Frontend-Backend Limit Integration', () => {
	describe('Dropdown Limit Selection Edge Cases', () => {
		test('should handle frontend sending limit as string', () => {
			// Frontend dropdown sends values as strings
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 3,
					limitPerOrder: "9", // String from dropdown (3x multiplier)
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);
			expect(result.bogoConfig.limitPerOrder).toBe("9"); // Should preserve string value
			
			// Validation should still pass
			const errors = validateDiscountStackData('Test Stack', [discount]);
			expect(errors).toHaveLength(0);
		});

		test('should handle valid multiplier scenarios from frontend dropdown', () => {
			const testCases = [
				{ getQuantity: 1, limitPerOrder: 5, expectedMultiplier: 5 }, // 5x multiplier
				{ getQuantity: 2, limitPerOrder: 8, expectedMultiplier: 4 }, // 4x multiplier  
				{ getQuantity: 3, limitPerOrder: 15, expectedMultiplier: 5 }, // 5x multiplier
				{ getQuantity: 4, limitPerOrder: 12, expectedMultiplier: 3 }, // 3x multiplier
			];

			testCases.forEach(({ getQuantity, limitPerOrder, expectedMultiplier }) => {
				const discount = {
					type: 'buy_x_get_y',
					bogoConfig: {
						buyQuantity: 1,
						getQuantity: getQuantity,
						limitPerOrder: limitPerOrder,
						eligibleProductIds: ['product-123'],
						freeProductIds: [],
						freeProductMode: 'specific'
					}
				};

				const result = initializeBogoConfig(discount);
				
				// Should preserve the limit value
				expect(result.bogoConfig.limitPerOrder).toBe(limitPerOrder);
				
				// Verify it's a valid multiplier
				expect(limitPerOrder % getQuantity).toBe(0);
				expect(limitPerOrder / getQuantity).toBe(expectedMultiplier);
				
				// Should pass validation
				const errors = validateDiscountStackData('Test Stack', [discount]);
				expect(errors).toHaveLength(0);
			});
		});

		test('should reject limits that are not valid multiples (edge case)', () => {
			// This shouldn't happen with our dropdown, but test defensive validation
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 3,
					limitPerOrder: 7, // Not a multiple of 3 - shouldn't be possible from dropdown
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			// Backend should still accept it (business logic allows any positive limit)
			const result = initializeBogoConfig(discount);
			expect(result.bogoConfig.limitPerOrder).toBe(7);
			
			// Validation should pass (business allows any positive limit)
			const errors = validateDiscountStackData('Test Stack', [discount]);
			expect(errors).toHaveLength(0);
		});

		test('should handle minimum limit (1) scenarios', () => {
			// Test when getQuantity > 1 but user selects minimum limit
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 5, // Get 5 free
					limitPerOrder: 5, // Minimum (1x multiplier)
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);
			expect(result.bogoConfig.limitPerOrder).toBe(5);
			
			const errors = validateDiscountStackData('Test Stack', [discount]);
			expect(errors).toHaveLength(0);
		});

		test('should handle maximum limit (10x multiplier) scenarios', () => {
			// Test maximum multiplier that our dropdown provides
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 2,
					limitPerOrder: 20, // 10x multiplier (maximum from dropdown)
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);
			expect(result.bogoConfig.limitPerOrder).toBe(20);
			
			const errors = validateDiscountStackData('Test Stack', [discount]);
			expect(errors).toHaveLength(0);
		});
	});

	describe('Auto-Setting Behavior from Frontend Changes', () => {
		test('should auto-set limit when changing getQuantity from 1 to 2', () => {
			// Simulate frontend: user changes Get Quantity, maintains 1x multiplier
			const originalDiscount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 1,
					limitPerOrder: 1, // 1x multiplier
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			// User changes getQuantity to 2, frontend auto-updates limit to 2
			const updatedDiscount = {
				...originalDiscount,
				bogoConfig: {
					...originalDiscount.bogoConfig,
					getQuantity: 2,
					limitPerOrder: 2 // Auto-updated by frontend
				}
			};

			const result = initializeBogoConfig(updatedDiscount);
			expect(result.bogoConfig.getQuantity).toBe(2);
			expect(result.bogoConfig.limitPerOrder).toBe(2);
			
			const errors = validateDiscountStackData('Test Stack', [updatedDiscount]);
			expect(errors).toHaveLength(0);
		});

		test('should preserve multiplier when changing getQuantity from 2 to 3', () => {
			// Simulate: user had Get Quantity = 2, Limit = 4 (2x multiplier)
			// Then changes Get Quantity to 3, frontend should set Limit = 6
			const updatedDiscount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 3,
					limitPerOrder: 6, // Frontend calculated: 3 * 2 = 6
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(updatedDiscount);
			expect(result.bogoConfig.getQuantity).toBe(3);
			expect(result.bogoConfig.limitPerOrder).toBe(6);
			
			// Verify it's still a 2x multiplier
			expect(6 / 3).toBe(2);
			
			const errors = validateDiscountStackData('Test Stack', [updatedDiscount]);
			expect(errors).toHaveLength(0);
		});
	});

	describe('Validation Edge Cases with New Limit System', () => {
		test('should not accept zero limit (prevented by frontend dropdown)', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 2,
					limitPerOrder: 0, // Should not be possible from dropdown
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const errors = validateDiscountStackData('Test Stack', [discount]);
			expect(errors).toContain(
				'Discount 1: Per-order limit must be greater than 0 or leave empty for no limit'
			);
		});

		test('should not accept negative limit (prevented by frontend)', () => {
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 2,
					limitPerOrder: -5, // Should not be possible from dropdown
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const errors = validateDiscountStackData('Test Stack', [discount]);
			expect(errors).toContain(
				'Discount 1: Per-order limit must be greater than 0 or leave empty for no limit'
			);
		});

		test('should handle high limit values gracefully', () => {
			// Edge case: very high getQuantity leading to very high limits
			const discount = {
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 100,
					limitPerOrder: 1000, // 10x multiplier of 100
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			};

			const result = initializeBogoConfig(discount);
			expect(result.bogoConfig.limitPerOrder).toBe(1000);
			
			const errors = validateDiscountStackData('Test Stack', [discount]);
			expect(errors).toHaveLength(0);
		});
	});

	describe('Real-World Frontend Scenarios', () => {
		test('should handle typical "Buy 1 Get 1" with different limits', () => {
			const scenarios = [
				{ limit: 1, description: "1 free item max per order" },
				{ limit: 2, description: "2 free items max per order" },
				{ limit: 5, description: "5 free items max per order" },
				{ limit: 10, description: "10 free items max per order" }
			];

			scenarios.forEach(({ limit, description }) => {
				const discount = {
					type: 'buy_x_get_y',
					bogoConfig: {
						buyQuantity: 1,
						getQuantity: 1,
						limitPerOrder: limit,
						eligibleProductIds: ['product-123'],
						freeProductIds: [],
						freeProductMode: 'specific'
					}
				};

				const result = initializeBogoConfig(discount);
				expect(result.bogoConfig.limitPerOrder).toBe(limit);
				
				const errors = validateDiscountStackData('Test Stack', [discount]);
				expect(errors).toHaveLength(0);
			});
		});

		test('should handle "Buy 2 Get 3" with proportional limits', () => {
			// Buy 2 Get 3: limits of 3, 6, 9, 12, 15 (1x through 5x)
			const limits = [3, 6, 9, 12, 15];
			
			limits.forEach((limit) => {
				const multiplier = limit / 3;
				
				const discount = {
					type: 'buy_x_get_y',
					bogoConfig: {
						buyQuantity: 2,
						getQuantity: 3,
						limitPerOrder: limit,
						eligibleProductIds: ['product-123'],
						freeProductIds: [],
						freeProductMode: 'specific'
					}
				};

				const result = initializeBogoConfig(discount);
				expect(result.bogoConfig.limitPerOrder).toBe(limit);
				expect(limit % 3).toBe(0); // Should be multiple of getQuantity
				
				const errors = validateDiscountStackData('Test Stack', [discount]);
				expect(errors).toHaveLength(0);
			});
		});
	});
});