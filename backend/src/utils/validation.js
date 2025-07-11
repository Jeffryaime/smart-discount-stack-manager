function validateDiscountStackData(name, discounts) {
	const validationErrors = [];

	if (!name || name.trim().length === 0) {
		validationErrors.push('Name is required');
	}

	if (!discounts || discounts.length === 0) {
		validationErrors.push('At least one discount rule is required');
	} else {
		// Validate each discount rule
		discounts.forEach((discount, index) => {
			if (!discount.type) {
				validationErrors.push(`Discount ${index + 1}: Type is required`);
			}

			// Handle BOGO discounts differently - they don't need a traditional "value"
			if (discount.type === 'buy_x_get_y') {
				// For BOGO, validate buyQuantity and getQuantity instead of value
				const buyQuantity = discount.bogoConfig?.buyQuantity || discount.value || 1;
				const getQuantity = discount.bogoConfig?.getQuantity || 1;
				
				if (buyQuantity <= 0) {
					validationErrors.push(
						`Discount ${index + 1}: Buy quantity must be greater than 0`
					);
				}
				if (getQuantity <= 0) {
					validationErrors.push(
						`Discount ${index + 1}: Get quantity must be greater than 0`
					);
				}
			} else {
				// For non-BOGO discounts, validate the value field
				if (discount.value === undefined || discount.value === null) {
					validationErrors.push(`Discount ${index + 1}: Value is required`);
				} else {
					if (
						discount.type === 'percentage' &&
						(discount.value <= 0 || discount.value > 100)
					) {
						validationErrors.push(
							`Discount ${index + 1}: Percentage must be between 1 and 100`
						);
					}
					if (
						discount.type === 'fixed_amount' &&
						discount.value <= 0
					) {
						validationErrors.push(
							`Discount ${index + 1}: Amount must be greater than 0`
						);
					}
					if (
						discount.type === 'free_shipping' &&
						discount.value !== 0
					) {
						validationErrors.push(
							`Discount ${index + 1}: Free shipping value should be 0`
						);
					}
				}
			}

			// BOGO-specific validation
			if (discount.type === 'buy_x_get_y') {
				const bogo = discount.bogoConfig || {};
				
				if (bogo.buyQuantity !== undefined && bogo.buyQuantity <= 0) {
					validationErrors.push(
						`Discount ${index + 1}: Buy quantity must be greater than 0`
					);
				}
				
				if (bogo.getQuantity !== undefined && bogo.getQuantity <= 0) {
					validationErrors.push(
						`Discount ${index + 1}: Get quantity must be greater than 0`
					);
				}
				
				// Check limitPerOrder - should be null, undefined, empty string, or positive number
				const limitValue = bogo.limitPerOrder;
				if (limitValue !== undefined && limitValue !== null && limitValue !== '') {
					const numericLimit = Number(limitValue);
					if (isNaN(numericLimit) || numericLimit <= 0) {
						validationErrors.push(
							`Discount ${index + 1}: Per-order limit must be greater than 0 or leave empty for no limit`
						);
					}
				}
				
				// Validate freeProductMode
				if (bogo.freeProductMode && !['specific', 'cheapest'].includes(bogo.freeProductMode)) {
					validationErrors.push(
						`Discount ${index + 1}: Invalid free product mode. Must be 'specific' or 'cheapest'`
					);
				}
				
				// Validate product IDs format if provided
				if (bogo.eligibleProductIds && Array.isArray(bogo.eligibleProductIds)) {
					bogo.eligibleProductIds.forEach((productId, productIndex) => {
						if (typeof productId !== 'string' || productId.trim().length === 0) {
							validationErrors.push(
								`Discount ${index + 1}: Eligible product ID ${productIndex + 1} must be a non-empty string`
							);
						}
					});
				}
				
				// Only validate freeProductIds if mode is 'specific'
				if (bogo.freeProductMode !== 'cheapest' && bogo.freeProductIds && Array.isArray(bogo.freeProductIds)) {
					bogo.freeProductIds.forEach((productId, productIndex) => {
						if (typeof productId !== 'string' || productId.trim().length === 0) {
							validationErrors.push(
								`Discount ${index + 1}: Free product ID ${productIndex + 1} must be a non-empty string`
							);
						}
					});
				}
				
				// Validate that cheapest mode requires eligible products
				if (bogo.freeProductMode === 'cheapest' && (!bogo.eligibleProductIds || bogo.eligibleProductIds.length === 0)) {
					validationErrors.push(
						`Discount ${index + 1}: Auto-discount cheapest mode requires eligible products to be specified`
					);
				}
				
				// Validate specific mode BOGO configuration
				// Default to 'specific' mode if freeProductMode is not set, null, or undefined
				const mode = bogo.freeProductMode || 'specific';
				if (mode === 'specific') {
					const hasEligibleProducts = bogo.eligibleProductIds && bogo.eligibleProductIds.length > 0;
					const hasFreeProducts = bogo.freeProductIds && bogo.freeProductIds.length > 0;
					
					// Case 1: Neither eligible nor free products specified
					if (!hasEligibleProducts && !hasFreeProducts) {
						validationErrors.push(
							`Discount ${index + 1}: BOGO with specific mode requires eligible products to be specified (free products will auto-default to eligible products if not specified)`
						);
					}
					
					// Case 2: Free products specified without eligible products (broken configuration)
					if (!hasEligibleProducts && hasFreeProducts) {
						validationErrors.push(
							`Discount ${index + 1}: Cannot specify free products without eligible products. Eligible products determine which items qualify for the "buy" part of the BOGO offer`
						);
					}
				}
			}
		});
	}

	return validationErrors;
}

module.exports = { validateDiscountStackData };
