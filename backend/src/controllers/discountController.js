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

			// Only process active discount stack
			if (!discountStack.isActive) {
				return res.status(400).json({ error: 'Discount stack is not active' });
			}

			// Check date validity
			const now = new Date();
			if (discountStack.startDate && now < new Date(discountStack.startDate)) {
				return res.status(400).json({ error: 'Discount stack has not started yet' });
			}
			if (discountStack.endDate && now > new Date(discountStack.endDate)) {
				return res.status(400).json({ error: 'Discount stack has expired' });
			}

			// Log the received test data for debugging
			console.log('Received testData:', testData);
			
			// Calculate discounts
			const appliedDiscounts = [];
			let currentPrice = testData.originalPrice;
			let shippingCost = testData.shippingCost || 0;
			let originalShippingCost = shippingCost;
			let freeShippingApplied = false;
			let totalDiscountAmount = 0;

			// Sort discounts by priority (lower numbers have higher priority)
			const sortedDiscounts = [...discountStack.discounts]
				.filter(discount => discount.isActive)
				.sort((a, b) => (a.priority || 0) - (b.priority || 0));

			for (const discount of sortedDiscounts) {
				const conditions = discount.conditions || {};
				console.log('Checking discount:', {
					type: discount.type,
					value: discount.value,
					conditions: conditions,
					testQuantity: testData.quantity,
					testAmount: testData.originalPrice
				});
				
				// Check minimum amount condition
				if (conditions.minimumAmount && testData.originalPrice < conditions.minimumAmount) {
					continue;
				}

				// Check minimum quantity condition
				if (conditions.minimumQuantity && testData.quantity < conditions.minimumQuantity) {
					console.log(`Skipping discount due to quantity check: ${testData.quantity} < ${conditions.minimumQuantity}`);
					continue;
				}

				// Check product IDs condition
				if (conditions.productIds && conditions.productIds.length > 0) {
					const hasMatchingProduct = testData.productIds?.some(productId => 
						conditions.productIds.includes(productId)
					);
					if (!hasMatchingProduct) continue;
				}

				// Check collection IDs condition
				if (conditions.collectionIds && conditions.collectionIds.length > 0) {
					const hasMatchingCollection = testData.collectionIds?.some(collectionId => 
						conditions.collectionIds.includes(collectionId)
					);
					if (!hasMatchingCollection) continue;
				}

				// Check customer segment condition
				if (conditions.customerSegments && conditions.customerSegments.length > 0) {
					if (!testData.customerSegment || 
						!conditions.customerSegments.includes(testData.customerSegment)) {
						continue;
					}
				}

				// Apply discount based on type
				let discountAmount = 0;
				let appliedDiscount = {
					...discount.toObject(),
					appliedAmount: 0
				};

				switch (discount.type) {
					case 'percentage':
						discountAmount = currentPrice * (discount.value / 100);
						appliedDiscount.appliedAmount = discountAmount;
						break;
					
					case 'fixed_amount':
						discountAmount = Math.min(discount.value, currentPrice);
						appliedDiscount.appliedAmount = discountAmount;
						break;
					
					case 'free_shipping':
						// Free shipping removes shipping cost
						if (shippingCost > 0) {
							appliedDiscount.appliedAmount = shippingCost;
							appliedDiscount.freeShipping = true;
							freeShippingApplied = true;
							// Don't add to totalDiscountAmount here - we'll add it later
							shippingCost = 0;
						}
						break;
					
					case 'buy_x_get_y':
						// Enhanced BOGO calculation using bogoConfig
						const buyQuantity = discount.bogoConfig?.buyQuantity || discount.value || 1;
						const getQuantity = discount.bogoConfig?.getQuantity || 1;
						const limitPerOrder = discount.bogoConfig?.limitPerOrder || null;
						
						console.log('Enhanced BOGO Debug:', {
							quantity: testData.quantity,
							buyQuantity: buyQuantity,
							getQuantity: getQuantity,
							limitPerOrder: limitPerOrder,
							meetsCondition: testData.quantity >= buyQuantity
						});
						
						if (testData.quantity >= buyQuantity) {
							// Calculate how many complete "buy X get Y" sets we have
							const completeSets = Math.floor(testData.quantity / (buyQuantity + getQuantity));
							const freeItemsFromCompleteSets = completeSets * getQuantity;
							
							// Handle remainder: if we have extra items that don't form a complete set
							// but still meet the minimum buy requirement
							const remainderItems = testData.quantity % (buyQuantity + getQuantity);
							const extraFreeItems = remainderItems >= buyQuantity ? Math.floor(remainderItems / buyQuantity) * getQuantity : 0;
							
							let totalFreeItems = freeItemsFromCompleteSets + extraFreeItems;
							
							// Apply per-order limit if specified
							if (limitPerOrder && totalFreeItems > limitPerOrder) {
								totalFreeItems = limitPerOrder;
							}
							
							if (totalFreeItems > 0) {
								const pricePerItem = testData.originalPrice / testData.quantity;
								discountAmount = totalFreeItems * pricePerItem;
								appliedDiscount.appliedAmount = discountAmount;
								appliedDiscount.freeItems = totalFreeItems;
								appliedDiscount.bogoDetails = {
									buyQuantity,
									getQuantity,
									completeSets,
									remainderItems,
									extraFreeItems,
									limitApplied: limitPerOrder && (freeItemsFromCompleteSets + extraFreeItems) > limitPerOrder
								};
								
								console.log('Enhanced BOGO Calculation:', {
									completeSets,
									freeItemsFromCompleteSets,
									remainderItems,
									extraFreeItems,
									totalFreeItems,
									pricePerItem,
									discountAmount,
									limitPerOrder,
									limitApplied: appliedDiscount.bogoDetails.limitApplied
								});
							}
						}
						break;
				}

				if (discountAmount > 0 || (discount.type === 'free_shipping' && appliedDiscount.freeShipping)) {
					currentPrice -= discountAmount;
					// Only add to totalDiscountAmount if it's not free shipping (free shipping is handled separately)
					if (discount.type !== 'free_shipping') {
						totalDiscountAmount += discountAmount;
					}
					appliedDiscounts.push(appliedDiscount);
				}
			}

			// Ensure final price is not negative
			currentPrice = Math.max(0, currentPrice);

			// Calculate proper discount amounts
			const productDiscountAmount = totalDiscountAmount;
			const shippingDiscountAmount = freeShippingApplied ? originalShippingCost : 0;
			const totalDiscountAmountCombined = productDiscountAmount + shippingDiscountAmount;
			
			console.log('Discount calculation:', {
				productDiscountAmount,
				shippingDiscountAmount,
				totalDiscountAmountCombined,
				originalPrice: testData.originalPrice,
				originalShippingCost
			});

			// Calculate taxes (applied to final price + shipping, after discounts)
			const taxableAmount = currentPrice + shippingCost;
			const taxAmount = taxableAmount * (testData.taxRate || 0);
			const finalTotalWithTax = taxableAmount + taxAmount;

			const result = {
				originalPrice: testData.originalPrice,
				finalPrice: currentPrice,
				shippingCost: shippingCost,
				originalShippingCost: originalShippingCost,
				freeShippingApplied: freeShippingApplied,
				taxRate: testData.taxRate || 0,
				taxAmount: taxAmount,
				subtotal: currentPrice + shippingCost,
				finalTotal: finalTotalWithTax,
				appliedDiscounts: appliedDiscounts,
				productDiscountAmount: productDiscountAmount,
				shippingDiscountAmount: shippingDiscountAmount,
				totalDiscountAmount: totalDiscountAmountCombined,
				savingsPercentage: testData.originalPrice > 0 
					? Math.round((totalDiscountAmountCombined / (testData.originalPrice + originalShippingCost)) * 100) 
					: 0
			};

			res.json(result);
		} catch (error) {
			console.error('Error testing discount stack:', error);
			res.status(500).json({ error: 'Failed to test discount stack' });
		}
	},
};

module.exports = discountController;
