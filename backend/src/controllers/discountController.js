const DiscountStack = require('../models/DiscountStack');
const { shopify } = require('../config/shopify');
const { validateDiscountStackData } = require('../utils/validation');

const discountController = {
	async getDiscountStacks(req, res) {
		try {
			const { shop } = req.query;
			const discountStacks = await DiscountStack.find({ shop });
			res.json(discountStacks);
		} catch (error) {
			console.error('Error fetching discount stacks:', error);
			res.status(500).json({ error: 'Failed to fetch discount stacks' });
		}
	},

	async createDiscountStack(req, res) {
		try {
			const { shop } = req.query;
			const { name, discounts } = req.body;

			// Validation
			const validationErrors = validateDiscountStackData(name, discounts);

			if (validationErrors.length > 0) {
				return res.status(400).json({
					error: 'Validation failed',
					details: validationErrors,
				});
			}

			// Remove _id from discounts array to let MongoDB generate ObjectIds
			const discountData = {
				...req.body,
				shop,
				discounts:
					req.body.discounts?.map((discount) => {
						const { _id, id, ...discountWithoutId } = discount;
						return discountWithoutId;
					}) || [],
			};

			const discountStack = new DiscountStack(discountData);

			const savedStack = await discountStack.save();
			res.status(201).json(savedStack);
		} catch (error) {
			console.error('Error creating discount stack:', error);
			if (error.name === 'ValidationError') {
				return res.status(400).json({
					error: 'Validation failed',
					details: Object.values(error.errors).map((e) => e.message),
				});
			}
			res.status(500).json({ error: 'Failed to create discount stack' });
		}
	},

	async getDiscountStack(req, res) {
		try {
			const { id } = req.params;
			const { shop } = req.query;

			const discountStack = await DiscountStack.findOne({ _id: id, shop });
			if (!discountStack) {
				return res.status(404).json({ error: 'Discount stack not found' });
			}

			res.json(discountStack);
		} catch (error) {
			console.error('Error fetching discount stack:', error);
			res.status(500).json({ error: 'Failed to fetch discount stack' });
		}
	},

	async updateDiscountStack(req, res) {
		try {
			const { id } = req.params;
			const { shop } = req.query;
			const { name, discounts } = req.body;

			// Only run validation if we're updating name or discounts
			// For simple status updates (like isActive), skip validation
			const isStatusUpdate = (() => {
				const keys = Object.keys(req.body);
				if (keys.length !== 1 || !('isActive' in req.body)) {
					return false;
				}
				// Check that 'isActive' is the only key with a defined, non-null value
				return keys.every((key) => key === 'isActive' || req.body[key] == null);
			})();

			if (!isStatusUpdate) {
				// Validation for full updates
				const validationErrors = validateDiscountStackData(name, discounts);

				if (validationErrors.length > 0) {
					return res.status(400).json({
						error: 'Validation failed',
						details: validationErrors,
					});
				}
			}

			// Remove _id from discounts array to let MongoDB generate ObjectIds
			const updateData = isStatusUpdate
				? req.body
				: {
						...req.body,
						discounts:
							req.body.discounts?.map((discount) => {
								const { _id, id, ...discountWithoutId } = discount;
								return discountWithoutId;
							}) || [],
				  };

			const discountStack = await DiscountStack.findOneAndUpdate(
				{ _id: id, shop },
				updateData,
				{ new: true, runValidators: true }
			);

			if (!discountStack) {
				return res.status(404).json({ error: 'Discount stack not found' });
			}

			res.json(discountStack);
		} catch (error) {
			console.error('Error updating discount stack:', error);
			if (error.name === 'ValidationError') {
				return res.status(400).json({
					error: 'Validation failed',
					details: Object.values(error.errors).map((e) => e.message),
				});
			}
			res.status(500).json({ error: 'Failed to update discount stack' });
		}
	},

	async deleteDiscountStack(req, res) {
		try {
			const { id } = req.params;
			const { shop } = req.query;

			const discountStack = await DiscountStack.findOneAndDelete({
				_id: id,
				shop,
			});
			if (!discountStack) {
				return res.status(404).json({ error: 'Discount stack not found' });
			}

			res.json({ message: 'Discount stack deleted successfully' });
		} catch (error) {
			console.error('Error deleting discount stack:', error);
			res.status(500).json({ error: 'Failed to delete discount stack' });
		}
	},

	async testDiscountStack(req, res) {
		try {
			const { id } = req.params;
			const { shop } = req.query;
			const { testData } = req.body;

			const discountStack = await DiscountStack.findOne({ _id: id, shop });
			if (!discountStack) {
				return res.status(404).json({ error: 'Discount stack not found' });
			}

			// Simulate discount calculation
			const result = {
				originalPrice: testData.originalPrice,
				finalPrice: testData.originalPrice * 0.8, // Example calculation
				appliedDiscounts: discountStack.discounts,
				savings: testData.originalPrice * 0.2,
			};

			res.json(result);
		} catch (error) {
			console.error('Error testing discount stack:', error);
			res.status(500).json({ error: 'Failed to test discount stack' });
		}
	},
};

module.exports = discountController;
