const DiscountStack = require('../models/DiscountStack');
const { shopify } = require('../config/shopify');
const { validateDiscountStackData } = require('../utils/validation');
const BOGOCalculator = require('../utils/bogoCalculator');

// Helper function to validate product IDs
const validateProductIds = (productIds) => {
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

// Helper function to initialize BOGO configuration
const initializeBogoConfig = (discount) => {
	const { _id, id, ...discountWithoutId } = discount;

	// Initialize bogoConfig for BOGO discounts
	if (discountWithoutId.type === 'buy_x_get_y') {
		const freeProductMode = discountWithoutId.bogoConfig?.freeProductMode || 'specific';
		
		discountWithoutId.bogoConfig = {
			buyQuantity: discountWithoutId.bogoConfig?.buyQuantity || discountWithoutId.value || 1,
			getQuantity: discountWithoutId.bogoConfig?.getQuantity || 1,
			eligibleProductIds: validateProductIds(discountWithoutId.bogoConfig?.eligibleProductIds || []),
			freeProductIds: freeProductMode === 'cheapest' ? [] : validateProductIds(discountWithoutId.bogoConfig?.freeProductIds || []),
			limitPerOrder: discountWithoutId.bogoConfig?.limitPerOrder || null,
			freeProductMode: freeProductMode,
			...discountWithoutId.bogoConfig
		};
		
		// Validation is now handled by validateDiscountStackData function
	}

	return discountWithoutId;
};

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

			// Remove _id from discounts array and handle BOGO config
			const discountData = {
				...req.body,
				shop,
				discounts: req.body.discounts?.map(initializeBogoConfig) || [],
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

			// Remove _id from discounts array and handle BOGO config
			const updateData = isStatusUpdate
				? req.body
				: {
						...req.body,
						discounts: req.body.discounts?.map(initializeBogoConfig) || [],
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
			const skippedDiscounts = [];
			let currentPrice = testData.originalPrice;
			let shippingCost = testData.shippingCost || 0;
			let originalShippingCost = shippingCost;
			let freeShippingApplied = false;
			let totalDiscountAmount = 0;
			let stopProcessing = false;

			// Sort discounts by priority (lower numbers have higher priority)
			const sortedDiscounts = [...discountStack.discounts]
				.filter(discount => discount.isActive)
				.sort((a, b) => (a.priority || 0) - (b.priority || 0));

			for (const discount of sortedDiscounts) {
				// Check if we should stop processing due to previous failure
				if (stopProcessing) {
					skippedDiscounts.push({
						...discount.toObject(),
						skippedReason: 'Previous discount in chain failed to apply'
					});
					continue;
				}
				const conditions = discount.conditions || {};
				console.log('Checking discount:', {
					type: discount.type,
					value: discount.value,
					conditions: conditions,
					testQuantity: testData.quantity,
					testAmount: testData.originalPrice
				});

				// Track if this discount failed to apply
				let discountFailed = false;
				let failureReason = '';

				// Check minimum amount condition
				if (conditions.minimumAmount && testData.originalPrice < conditions.minimumAmount) {
					discountFailed = true;
					failureReason = `Minimum amount not met: $${conditions.minimumAmount} required`;
				}

				// Check minimum quantity condition
				if (!discountFailed && conditions.minimumQuantity && testData.quantity < conditions.minimumQuantity) {
					console.log(`Skipping discount due to quantity check: ${testData.quantity} < ${conditions.minimumQuantity}`);
					discountFailed = true;
					failureReason = `Minimum quantity not met: ${conditions.minimumQuantity} required`;
				}

				// Check product IDs condition
				if (!discountFailed && conditions.productIds && conditions.productIds.length > 0) {
					const hasMatchingProduct = testData.productIds?.some(productId =>
						conditions.productIds.includes(productId)
					);
					if (!hasMatchingProduct) {
						discountFailed = true;
						failureReason = 'No matching products in cart';
					}
				}

				// Check collection IDs condition
				if (!discountFailed && conditions.collectionIds && conditions.collectionIds.length > 0) {
					const hasMatchingCollection = testData.collectionIds?.some(collectionId =>
						conditions.collectionIds.includes(collectionId)
					);
					if (!hasMatchingCollection) {
						discountFailed = true;
						failureReason = 'No matching collections in cart';
					}
				}

				// Check customer segment condition
				if (!discountFailed && conditions.customerSegments && conditions.customerSegments.length > 0) {
					if (!testData.customerSegment ||
						!conditions.customerSegments.includes(testData.customerSegment)) {
						discountFailed = true;
						failureReason = 'Customer segment not eligible';
					}
				}

				// Check BOGO-specific minimum buy quantity condition
				if (!discountFailed && discount.type === 'buy_x_get_y') {
					const buyQuantity = discount.bogoConfig?.buyQuantity || discount.value || 1;
					const getQuantity = discount.bogoConfig?.getQuantity || 1;
					if (testData.quantity < buyQuantity) {
						discountFailed = true;
						failureReason = `Buy ${buyQuantity} Get ${getQuantity}: Only ${testData.quantity} items in cart`;
					}
				}

				// If any condition failed, handle based on stopOnFirstFailure setting
				if (discountFailed) {
					if (discountStack.stopOnFirstFailure) {
						stopProcessing = true;
						skippedDiscounts.push({
							...discount.toObject(),
							skippedReason: failureReason
						});
					}
					continue;
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
						// Enhanced BOGO calculation with auto-cheapest mode support
						const bogoConfig = discount.bogoConfig || {};
						const freeProductMode = bogoConfig.freeProductMode || 'specific';
						
						console.log('Enhanced BOGO Debug:', {
							quantity: testData.quantity,
							bogoConfig,
							freeProductMode,
							meetsCondition: testData.quantity >= (bogoConfig.buyQuantity || 1)
						});

						// Use new BOGO calculator with mode support
						if (freeProductMode === 'cheapest' || (bogoConfig.eligibleProductIds && bogoConfig.eligibleProductIds.length > 0)) {
							// Validate testData to prevent division by zero and invalid quantities
							if (testData.quantity <= 0) {
								console.warn('BOGO calculation skipped: testData.quantity must be greater than 0');
								break;
							}

							// Use enhanced calculator for new modes
							const cart = {
								items: testData.productIds?.map((productId, index) => {
									const productCount = testData.productIds?.length || 1;
									let itemQuantity = Math.floor(testData.quantity / productCount);
									
									// Ensure minimum quantity of 1 per item to avoid zero quantities
									if (itemQuantity === 0) {
										itemQuantity = 1;
									}
									
									return {
										productId,
										quantity: itemQuantity,
										price: testData.originalPrice / testData.quantity
									};
								}) || [{
									productId: 'test-product',
									quantity: testData.quantity,
									price: testData.originalPrice / testData.quantity
								}]
							};

							const bogoResult = BOGOCalculator.calculateBOGODiscount(cart, bogoConfig, testData);
							
							if (bogoResult.appliedAmount > 0) {
								discountAmount = bogoResult.appliedAmount;
								appliedDiscount.appliedAmount = discountAmount;
								appliedDiscount.freeItems = bogoResult.freeItems;
								appliedDiscount.calculationDetails = bogoResult.calculationDetails;
								appliedDiscount.bogoMode = freeProductMode;

								console.log('Enhanced BOGO Calculation:', bogoResult);
							}
						} else {
							// Use legacy calculation for backward compatibility
							const buyQuantity = bogoConfig.buyQuantity || discount.value || 1;
							const getQuantity = bogoConfig.getQuantity || 1;
							const limitPerOrder = bogoConfig.limitPerOrder || null;

							const legacyResult = BOGOCalculator.calculateLegacyBOGO(testData, buyQuantity, getQuantity, limitPerOrder);
							
							if (legacyResult.appliedAmount > 0) {
								discountAmount = legacyResult.appliedAmount;
								appliedDiscount.appliedAmount = discountAmount;
								appliedDiscount.freeItems = legacyResult.freeItems;
								appliedDiscount.bogoDetails = legacyResult.bogoDetails;
								appliedDiscount.bogoMode = 'legacy';

								console.log('Legacy BOGO Calculation:', legacyResult);
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
				skippedDiscounts: skippedDiscounts,
				productDiscountAmount: productDiscountAmount,
				shippingDiscountAmount: shippingDiscountAmount,
				totalDiscountAmount: totalDiscountAmountCombined,
				savingsPercentage: testData.originalPrice > 0
					? Math.round((totalDiscountAmountCombined / (testData.originalPrice + originalShippingCost)) * 100)
					: 0,
				stopOnFirstFailure: discountStack.stopOnFirstFailure
			};

			res.json(result);
		} catch (error) {
			console.error('Error testing discount stack:', error);
			res.status(500).json({ error: 'Failed to test discount stack' });
		}
	},

	async searchProducts(req, res) {
		try {
			const { shop } = req.query;
			const { query, limit = 50 } = req.query;

			if (!query || query.trim().length < 2) {
				return res.json({ products: [] });
			}

			// Use session from auth middleware
			if (!req.session) {
				return res.status(401).json({ error: 'Shop session not found' });
			}

			// Use real Shopify API for all requests now that we have proper sessions

			const client = new shopify.clients.Graphql({ session: req.session });

			// Search products using GraphQL
			const searchQuery = `
				query searchProducts($query: String!, $first: Int!) {
					products(first: $first, query: $query) {
						edges {
							node {
								id
								legacyResourceId
								title
								handle
								featuredImage {
									url
									altText
								}
								priceRangeV2 {
									minVariantPrice {
										amount
										currencyCode
									}
									maxVariantPrice {
										amount
										currencyCode
									}
								}
								status
							}
						}
					}
				}
			`;

			const response = await client.query({
				data: {
					query: searchQuery,
					variables: {
						query: query.trim(),
						first: parseInt(limit)
					}
				}
			});

			const products = response.body.data.products.edges.map(edge => ({
				id: edge.node.legacyResourceId,
				gid: edge.node.id,
				title: edge.node.title,
				handle: edge.node.handle,
				imageUrl: edge.node.featuredImage?.url || 'https://via.placeholder.com/100x100?text=No+Image',
				imageAlt: edge.node.featuredImage?.altText || edge.node.title,
				minPrice: parseFloat(edge.node.priceRangeV2.minVariantPrice.amount),
				maxPrice: parseFloat(edge.node.priceRangeV2.maxVariantPrice.amount),
				currency: edge.node.priceRangeV2.minVariantPrice.currencyCode,
				status: edge.node.status
			}));

			res.json({ products });
		} catch (error) {
			console.error('Error searching products:', error);
			res.status(500).json({ error: 'Failed to search products' });
		}
	},

	// Get all products for bulk selection
	getAllProducts: async (req, res) => {
		try {
			const { shop } = req.query;
			
			// Validate and constrain limit parameter
			let limit = parseInt(req.query.limit);
			if (isNaN(limit) || limit < 1 || limit > 100) {
				limit = 100; // Default to 100 if invalid or out of bounds
			}

			if (!shop) {
				return res.status(400).json({ error: 'Shop parameter is required' });
			}

			// Use session from auth middleware
			if (!req.session) {
				return res.status(401).json({ error: 'Shop session not found' });
			}

			// Use real Shopify API for all requests now that we have proper sessions
			const client = new shopify.clients.Graphql({ session: req.session });

			// Get all products using GraphQL
			const allProductsQuery = `
				query getAllProducts($first: Int!) {
					products(first: $first, sortKey: TITLE) {
						edges {
							node {
								id
								legacyResourceId
								title
								handle
								status
								featuredImage {
									url
									altText
								}
								priceRangeV2 {
									minVariantPrice {
										amount
										currencyCode
									}
									maxVariantPrice {
										amount
										currencyCode
									}
								}
								totalInventory
							}
						}
						pageInfo {
							hasNextPage
							endCursor
						}
					}
				}
			`;

			const response = await client.query({
				data: {
					query: allProductsQuery,
					variables: {
						first: limit
					}
				}
			});

			const products = response.body.data.products.edges.map(edge => ({
				id: edge.node.legacyResourceId,
				gid: edge.node.id,
				title: edge.node.title,
				handle: edge.node.handle,
				imageUrl: edge.node.featuredImage?.url || 'https://via.placeholder.com/100x100?text=No+Image',
				imageAlt: edge.node.featuredImage?.altText || edge.node.title,
				minPrice: parseFloat(edge.node.priceRangeV2.minVariantPrice.amount),
				maxPrice: parseFloat(edge.node.priceRangeV2.maxVariantPrice.amount),
				currency: edge.node.priceRangeV2.minVariantPrice.currencyCode,
				status: edge.node.status,
				inventory: edge.node.totalInventory || 0
			}));

			const hasNextPage = response.body.data.products.pageInfo.hasNextPage;
			
			res.json({ 
				products, 
				hasNextPage,
				totalCount: products.length 
			});
		} catch (error) {
			console.error('Error fetching all products:', error);
			res.status(500).json({ error: 'Failed to fetch products' });
		}
	},
};

module.exports = discountController;
