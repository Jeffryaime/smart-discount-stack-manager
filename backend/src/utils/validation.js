function validateDiscountStackData(name, discounts) {
	const validationErrors = [];

	if (!name || name.trim().length === 0) {
		validationErrors.push('Name is required');
	}

	if (!discounts || discounts.length === 0) {
		validationErrors.push('At least one discount rule is required');
	} else {
		discounts.forEach((discount, index) => {
			if (!discount.type) {
				validationErrors.push(`Discount ${index + 1}: Type is required`);
			} else if (
				!['percentage', 'fixed_amount', 'buy_x_get_y'].includes(discount.type)
			) {
				validationErrors.push(`Discount ${index + 1}: Invalid discount type`);
			} else if (typeof discount.value !== 'number' || isNaN(discount.value)) {
				validationErrors.push(
					`Discount ${index + 1}: Value must be a valid number`
				);
			} else if (discount.value <= 0) {
				validationErrors.push(
					`Discount ${index + 1}: Amount must be greater than 0`
				);
			} else {
				if (
					discount.type === 'percentage' &&
					(discount.value < 0 || discount.value > 100)
				) {
					validationErrors.push(
						`Discount ${index + 1}: Percentage must be between 0 and 100`
					);
				}
			}
		});
	}

	return validationErrors;
}

module.exports = { validateDiscountStackData };
