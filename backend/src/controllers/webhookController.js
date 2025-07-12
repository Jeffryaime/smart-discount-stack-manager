const DiscountStack = require('../models/DiscountStack');
const ActivityService = require('../services/activityService');

const webhookController = {
	async handleAppUninstall(req, res) {
		try {
			const { shop } = req.body;
			console.log(`App uninstalled for shop: ${shop}`);

			// Clean up data for uninstalled shop
			// await DiscountStack.deleteMany({ shop });

			res.status(200).json({ message: 'App uninstall processed' });
		} catch (error) {
			console.error('Error handling app uninstall:', error);
			res.status(500).json({ error: 'Failed to process app uninstall' });
		}
	},

	async handleOrderCreated(req, res) {
		try {
			const order = req.body;
			console.log(
				`Order created: ${order.id} for shop: ${order.shop || 'unknown'}`
			);

			// Process order for discount analytics
			await processOrderForDiscountUsage(order);

			res.status(200).json({ message: 'Order created processed' });
		} catch (error) {
			console.error('Error handling order created:', error);
			res.status(500).json({ error: 'Failed to process order created' });
		}
	},

	async handleOrderUpdated(req, res) {
		try {
			const order = req.body;
			console.log(
				`Order updated: ${order.id} for shop: ${order.shop || 'unknown'}`
			);

			// Process order update for analytics
			await processOrderForDiscountUsage(order);

			res.status(200).json({ message: 'Order updated processed' });
		} catch (error) {
			console.error('Error handling order updated:', error);
			res.status(500).json({ error: 'Failed to process order updated' });
		}
	},
};

// Helper function to process orders for discount usage tracking
async function processOrderForDiscountUsage(order) {
	try {
		// Validate order parameter
		if (!order || typeof order !== 'object') {
			console.warn(
				'processOrderForDiscountUsage: Invalid order parameter - order must be an object'
			);
			return;
		}

		// Check for required properties
		if (!order.id) {
			console.warn(
				'processOrderForDiscountUsage: Order missing required id property'
			);
			return;
		}

		if (!order.discount_applications) {
			console.log(`Order ${order.id} has no discount_applications property`);
			return;
		}

		const shop = order.shop || order.myshopify_domain;

		if (!shop) {
			console.warn('Order missing shop information:', order.id);
			return;
		}

		// Check if order has discount applications
		const discountApplications = order.discount_applications || [];

		if (discountApplications.length === 0) {
			console.log(`Order ${order.id} has no discount applications`);
			return;
		}

		console.log(
			`Processing ${discountApplications.length} discount applications for order ${order.id}`
		);

		// Process each discount application
		for (const discountApp of discountApplications) {
			await processDiscountApplication(shop, order, discountApp);
		}
	} catch (error) {
		console.error('Error processing order for discount usage:', error);
	}
}

// Helper function to process individual discount applications
async function processDiscountApplication(shop, order, discountApp) {
	try {
		// Extract discount code or title from the discount application
		const discountTitle = discountApp.title || discountApp.code;

		if (!discountTitle) {
			console.warn('Discount application missing title/code:', discountApp);
			return;
		}

		// Find matching discount stack by searching for the discount title in stack names or discounts
		const matchingStacks = await DiscountStack.find({
			shop: shop,
			isActive: true,
			$or: [
				{ name: { $regex: discountTitle, $options: 'i' } },
				{ 'discounts.title': { $regex: discountTitle, $options: 'i' } },
				{ 'discounts.code': { $regex: discountTitle, $options: 'i' } },
			],
		});

		if (matchingStacks.length === 0) {
			console.log(`No matching discount stack found for: ${discountTitle}`);
			return;
		}

		// Update usage count for each matching stack
		for (const stack of matchingStacks) {
			// Check usage limits
			if (stack.usageLimit && stack.usageCount >= stack.usageLimit) {
				console.warn(`Usage limit reached for stack: ${stack.name}`);
				continue;
			}

			// Increment usage count
			const updatedStack = await DiscountStack.findByIdAndUpdate(
				stack._id,
				{
					$inc: { usageCount: 1 },
					lastUsedAt: new Date(),
				},
				{ new: true }
			);

			if (updatedStack) {
				console.log(
					`Updated usage count for stack "${stack.name}": ${updatedStack.usageCount}`
				);

				// Log activity
				await ActivityService.logStackUsed(shop, updatedStack, {
					orderId: order.id,
					orderNumber: order.order_number,
					totalPrice: order.total_price,
					totalDiscounts: order.total_discounts,
					discountAmount: discountApp.value,
					discountType: discountApp.type,
				});

				// Check if usage limit is reached and deactivate if necessary
				if (
					updatedStack.usageLimit &&
					updatedStack.usageCount >= updatedStack.usageLimit
				) {
					await DiscountStack.findByIdAndUpdate(updatedStack._id, {
						isActive: false,
					});

					await ActivityService.logStackDeactivated(shop, updatedStack);
					console.log(
						`Stack "${updatedStack.name}" automatically deactivated due to usage limit`
					);
				}
			}
		}
	} catch (error) {
		console.error('Error processing discount application:', error);
	}
}

module.exports = webhookController;
