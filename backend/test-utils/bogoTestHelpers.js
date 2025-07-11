/**
 * Shared test utilities for BOGO functionality
 * Provides common functions used across multiple test files to maintain DRY principles
 */

// Conditionally import functions - fallback to local implementations for standalone tests
let initializeBogoConfig, validateProductIds;

try {
	// Try to import from controller (for formal test suite)
	const controller = require('../src/controllers/discountController');
	initializeBogoConfig = controller.initializeBogoConfig;
	validateProductIds = controller.validateProductIds;
} catch (error) {
	// Fallback implementations for standalone tests
	validateProductIds = (productIds) => {
		if (!Array.isArray(productIds)) {
			return [];
		}
		
		const productIdRegex = /^(?:\d+|gid:\/\/shopify\/Product\/\d+)$/;
		return productIds.filter(id => {
			if (typeof id !== 'string' || !productIdRegex.test(id)) {
				console.warn(`Invalid product ID format: "${id}"`);
				return false;
			}
			return true;
		});
	};

	initializeBogoConfig = (discount) => {
		const { _id, id, ...discountWithoutId } = discount;

		// Initialize bogoConfig for BOGO discounts
		if (discountWithoutId.type === 'buy_x_get_y') {
			const freeProductMode = discountWithoutId.bogoConfig?.freeProductMode || 'specific';
			
			const eligibleProductIds = validateProductIds(discountWithoutId.bogoConfig?.eligibleProductIds || []);
			const originalFreeProductIds = validateProductIds(discountWithoutId.bogoConfig?.freeProductIds || []);
			
			// Auto-set free products to eligible products when none selected (specific mode only)
			let freeProductIds;
			if (freeProductMode === 'cheapest') {
				freeProductIds = [];
			} else if (originalFreeProductIds.length === 0) {
				freeProductIds = [...eligibleProductIds]; // Auto-set to same as eligible
			} else {
				freeProductIds = originalFreeProductIds;
			}
			
			// Ensure BOGO discount has a value (use buyQuantity as the value)
			const buyQuantity = discountWithoutId.bogoConfig?.buyQuantity || discountWithoutId.value || 1;
			const getQuantity = discountWithoutId.bogoConfig?.getQuantity || 1;
			
			// Auto-set limitPerOrder to match getQuantity by default, but allow user override
			let limitPerOrder;
			if (discountWithoutId.bogoConfig?.limitPerOrder !== undefined) {
				// User has explicitly set a limit (including null to disable limit)
				limitPerOrder = discountWithoutId.bogoConfig.limitPerOrder;
			} else {
				// Auto-set limit to match get quantity for sensible default
				limitPerOrder = getQuantity;
			}
			
			discountWithoutId.value = buyQuantity;
			
			discountWithoutId.bogoConfig = {
				buyQuantity: buyQuantity,
				getQuantity: getQuantity,
				eligibleProductIds: eligibleProductIds,
				freeProductIds: freeProductIds,
				limitPerOrder: limitPerOrder,
				freeProductMode: freeProductMode
			};
		}

		return discountWithoutId;
	};
}

/**
 * Initialize BOGO configuration with auto-setting logic
 * @param {Object} discount - The discount object to initialize
 * @returns {Object} The discount object with initialized bogoConfig
 */
const initializeBogoConfigTest = initializeBogoConfig;

/**
 * Validate product IDs according to the system's validation rules
 * @param {Array} productIds - Array of product IDs to validate
 * @returns {Array} Array of valid product IDs
 */
const validateProductIdsTest = validateProductIds;

/**
 * Create a basic BOGO discount object for testing
 * @param {Object} options - Configuration options
 * @param {number} options.buyQuantity - Number of items to buy
 * @param {number} options.getQuantity - Number of free items to get
 * @param {Array} options.eligibleProductIds - Array of eligible product IDs
 * @param {Array} options.freeProductIds - Array of free product IDs
 * @param {string} options.freeProductMode - Mode for free products ('specific' or 'cheapest')
 * @param {number|null} options.limitPerOrder - Limit per order
 * @returns {Object} Basic BOGO discount object
 */
const createBasicBogoDiscount = (options = {}) => {
	const {
		buyQuantity = 1,
		getQuantity = 1,
		eligibleProductIds = [],
		freeProductIds = [],
		freeProductMode = 'specific',
		limitPerOrder = undefined
	} = options;

	const bogoConfig = {
		buyQuantity,
		getQuantity,
		eligibleProductIds,
		freeProductIds,
		freeProductMode
	};

	// Only add limitPerOrder if explicitly provided
	if (limitPerOrder !== undefined) {
		bogoConfig.limitPerOrder = limitPerOrder;
	}

	return {
		type: 'buy_x_get_y',
		bogoConfig
	};
};

/**
 * Create test product IDs in the correct format for validation
 * @param {number} count - Number of product IDs to create
 * @param {string} format - Format type: 'numeric' (default), 'gid', or 'auto'
 * @returns {Array} Array of valid product ID strings that pass validation
 */
const createTestProductIds = (count, format = 'numeric') => {
	const ids = [];
	for (let i = 1; i <= count; i++) {
		if (format === 'gid') {
			// Generate Shopify GID format: gid://shopify/Product/{id}
			ids.push(`gid://shopify/Product/${i}`);
		} else if (format === 'auto') {
			// Mix of both formats for comprehensive testing
			if (i % 2 === 0) {
				ids.push(`gid://shopify/Product/${i}`);
			} else {
				ids.push(i.toString());
			}
		} else {
			// Default: numeric format that passes validation
			ids.push(i.toString());
		}
	}
	return ids;
};

/**
 * Assert that two BOGO configurations are equivalent
 * @param {Object} actual - Actual BOGO config
 * @param {Object} expected - Expected BOGO config
 * @param {string} testName - Name of the test for error messages
 */
const assertBogoConfigEquals = (actual, expected, testName = 'Test') => {
	const errors = [];

	if (actual.buyQuantity !== expected.buyQuantity) {
		errors.push(`${testName}: buyQuantity mismatch. Expected ${expected.buyQuantity}, got ${actual.buyQuantity}`);
	}

	if (actual.getQuantity !== expected.getQuantity) {
		errors.push(`${testName}: getQuantity mismatch. Expected ${expected.getQuantity}, got ${actual.getQuantity}`);
	}

	if (JSON.stringify(actual.eligibleProductIds) !== JSON.stringify(expected.eligibleProductIds)) {
		errors.push(`${testName}: eligibleProductIds mismatch. Expected ${JSON.stringify(expected.eligibleProductIds)}, got ${JSON.stringify(actual.eligibleProductIds)}`);
	}

	if (JSON.stringify(actual.freeProductIds) !== JSON.stringify(expected.freeProductIds)) {
		errors.push(`${testName}: freeProductIds mismatch. Expected ${JSON.stringify(expected.freeProductIds)}, got ${JSON.stringify(actual.freeProductIds)}`);
	}

	if (actual.freeProductMode !== expected.freeProductMode) {
		errors.push(`${testName}: freeProductMode mismatch. Expected ${expected.freeProductMode}, got ${actual.freeProductMode}`);
	}

	if (actual.limitPerOrder !== expected.limitPerOrder) {
		errors.push(`${testName}: limitPerOrder mismatch. Expected ${expected.limitPerOrder}, got ${actual.limitPerOrder}`);
	}

	if (errors.length > 0) {
		throw new Error(`BOGO Config Assertion Failed:\n${errors.join('\n')}`);
	}
};

module.exports = {
	initializeBogoConfigTest,
	validateProductIdsTest,
	createBasicBogoDiscount,
	createTestProductIds,
	assertBogoConfigEquals,
	// Export the original functions with their original names for compatibility
	initializeBogoConfig: initializeBogoConfigTest,
	validateProductIds: validateProductIdsTest
};