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

			if (discount.value === undefined || discount.value === null) {
				validationErrors.push(`Discount ${index + 1}: Value is required`);
			} else {
				if (
					discount.type === 'percentage' &&
					(discount.value < 0 || discount.value > 100)
				) {
					validationErrors.push(
						`Discount ${index + 1}: Percentage must be between 0 and 100`
					);
				}
				if (
					(discount.type === 'fixed_amount' ||
						discount.type === 'buy_x_get_y') &&
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

			// BOGO-specific validation
			if (discount.type === 'buy_x_get_y' && discount.bogoConfig) {
				const bogo = discount.bogoConfig;
				
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
				
				if (bogo.freeProductIds && Array.isArray(bogo.freeProductIds)) {
					bogo.freeProductIds.forEach((productId, productIndex) => {
						if (typeof productId !== 'string' || productId.trim().length === 0) {
							validationErrors.push(
								`Discount ${index + 1}: Free product ID ${productIndex + 1} must be a non-empty string`
							);
						}
					});
				}
			}
		});
	}

	return validationErrors;
}

module.exports = { validateDiscountStackData };
