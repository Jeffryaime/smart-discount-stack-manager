/**
 * Test for BOGO value validation fix
 * Ensures BOGO discounts don't require manual value entry
 */

const { validateDiscountStackData } = require('../utils/validation');

describe('BOGO Value Validation Fix', () => {
	describe('Frontend BOGO Creation Scenarios', () => {
		test('should pass when creating "buy 1 get 1" with specific SKUs and one product', () => {
			// This represents what the frontend sends when user:
			// 1. Selects "buy_x_get_y" type
			// 2. Sets "use specific SKUs"  
			// 3. Picks one product for eligible products
			// 4. Leaves free products empty (auto-set by controller)
			// 5. Clicks "Create Discount Stack"
			
			const discounts = [{
				type: 'buy_x_get_y',
				// No value field - this is the key issue that was causing the error
				bogoConfig: {
					buyQuantity: 1,  // "buy 1"
					getQuantity: 1,  // "get 1"
					eligibleProductIds: ['product-123'], // One product selected
					freeProductIds: [], // Empty - will be auto-set to eligible products
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscountStackData('Test BOGO Stack', discounts);
			
			// Should pass validation without requiring manual value entry
			expect(errors).toHaveLength(0);
		});

		test('should validate buyQuantity instead of value for BOGO discounts', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 0, // Invalid - should trigger error
					getQuantity: 1,
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscountStackData('Test Stack', discounts);
			
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('Buy quantity must be greater than 0');
			// Should NOT contain "Amount must be greater than 0"
			expect(errors[0]).not.toContain('Amount must be greater than 0');
		});

		test('should validate getQuantity for BOGO discounts', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				bogoConfig: {
					buyQuantity: 2,
					getQuantity: 0, // Invalid - should trigger error
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscountStackData('Test Stack', discounts);
			
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('Get quantity must be greater than 0');
		});

		test('should still require value for non-BOGO discount types', () => {
			const discounts = [{
				type: 'fixed_amount'
				// Missing value field
			}];

			const errors = validateDiscountStackData('Test Stack', discounts);
			
			expect(errors).toHaveLength(1);
			expect(errors[0]).toContain('Value is required');
		});

		test('should handle BOGO with value field present (backward compatibility)', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 2, // Present but should be ignored in favor of bogoConfig
				bogoConfig: {
					buyQuantity: 1, // This should take precedence over value
					getQuantity: 1,
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscountStackData('Test Stack', discounts);
			expect(errors).toHaveLength(0);
		});

		test('should use value as fallback buyQuantity when bogoConfig is incomplete', () => {
			const discounts = [{
				type: 'buy_x_get_y',
				value: 3, // Should be used as buyQuantity fallback
				bogoConfig: {
					// buyQuantity missing - should fall back to value
					getQuantity: 2,
					eligibleProductIds: ['product-123'],
					freeProductIds: [],
					freeProductMode: 'specific'
				}
			}];

			const errors = validateDiscountStackData('Test Stack', discounts);
			expect(errors).toHaveLength(0);
		});
	});

	describe('Error Message Improvements', () => {
		test('should provide clear error messages for BOGO validation failures', () => {
			const discounts = [
				{
					type: 'buy_x_get_y',
					bogoConfig: {
						buyQuantity: 0, // Invalid
						getQuantity: -1, // Invalid
						eligibleProductIds: [],
						freeProductIds: ['product-456'], // Invalid config
						freeProductMode: 'specific'
					}
				}
			];

			const errors = validateDiscountStackData('Test Stack', discounts);
			
			// Should have multiple specific error messages
			expect(errors.length).toBeGreaterThan(1);
			expect(errors.some(err => err.includes('Buy quantity must be greater than 0'))).toBe(true);
			expect(errors.some(err => err.includes('Get quantity must be greater than 0'))).toBe(true);
			expect(errors.some(err => err.includes('Cannot specify free products without eligible products'))).toBe(true);
		});
	});
});