
/**
 * Tests for improved BOGO validation logic
 * Ensures broken configurations are properly caught
 */

const { validateDiscountStackData } = require('../utils/validation');

// Helper function to create test discounts and run validation
const validateDiscounts = (discounts) => {
	return validateDiscountStackData('Test Stack', discounts);
};

describe('Improved BOGO Validation', () => {
	describe('Valid Configurations', () => {
		test('should pass with only eligible products (free products will auto-set)', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [], // Will auto-set to eligible products
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(0);
		});

		test('should pass with both eligible and free products specified', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: ['shirt-123'],
					freeProductIds: ['hat-456'],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(0);
		});

		test('should pass for cheapest mode with eligible products only', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: ['shirt-123'],
					freeProductIds: [], // Empty is correct for cheapest mode
					freeProductMode: 'cheapest'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(0);
		});
	});

	describe('Invalid Configurations - Should Fail', () => {
		test('should fail when neither eligible nor free products specified', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: [],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('requires eligible products to be specified');
			expect(errors[0]).toContain('auto-default');
		});

		test('should fail when free products specified without eligible products', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: [], // Empty - this is the problem
					freeProductIds: ['hat-456'], // Has free products but no eligible
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('Cannot specify free products without eligible products');
			expect(errors[0]).toContain('determine which items qualify for the "buy" part');
		});

		test('should fail when free products specified without eligible products (multiple free products)', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 1,
					eligibleProductIds: [],
					freeProductIds: ['hat-456', 'belt-789', 'socks-101'],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('Cannot specify free products without eligible products');
		});
	});

	describe('Validation Messages', () => {
		test('should provide clear error message for the problematic configuration', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 1,
					eligibleProductIds: [],
					freeProductIds: ['free-item-123'],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors[0]).toBe(
				'Discount 1: Cannot specify free products without eligible products. ' +
				'Eligible products determine which items qualify for the "buy" part of the BOGO offer'
			);
		});

		test('should provide clear error message when no products specified', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 1,
					eligibleProductIds: [],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors[0]).toBe(
				'Discount 1: BOGO with specific mode requires eligible products to be specified ' +
				'(free products will auto-default to eligible products if not specified)'
			);
		});
	});

	describe('Edge Cases', () => {
		test('should handle missing freeProductMode (defaults to specific)', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 1,
				bogoConfig: {
					buyQuantity: 1,
					getQuantity: 1,
					eligibleProductIds: [],
					freeProductIds: ['hat-456']
					// freeProductMode missing - should default to 'specific'
				}
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('Cannot specify free products without eligible products');
		});

		test('should not validate non-BOGO discount types', () => {
			const discounts = [{
				type: 'percentage',
				value: 10
				// No bogoConfig - should not trigger BOGO validation
			}];

			const errors = validateDiscounts(discounts);
			expect(errors).toHaveLength(0);
		});
	});
});
