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
			}
		});
	}

	return validationErrors;
}

module.exports = { validateDiscountStackData };
