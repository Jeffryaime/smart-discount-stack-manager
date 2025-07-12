const express = require('express');
const router = express.Router();
const DiscountStack = require('../models/DiscountStack');
const Activity = require('../models/Activity');
const ActivityService = require('../services/activityService');
const { verifyShopifyAuth } = require('../middleware/auth');

// Admin API key middleware for admin-only endpoints
const requireAdminKey = (req, res, next) => {
	const adminKey = req.headers['x-admin-api-key'];
	const expectedKey = process.env.ADMIN_API_KEY;

	if (!expectedKey) {
		console.error('ADMIN_API_KEY environment variable not set');
		return res
			.status(500)
			.json({ error: 'Admin authentication not configured' });
	}

	if (!adminKey || adminKey !== expectedKey) {
		return res.status(401).json({ error: 'Invalid admin API key' });
	}

	next();
};

// Temporary endpoint to add usage to a stack - now properly increments usage count
router.post('/add-usage', verifyShopifyAuth, async (req, res) => {
	try {
		const { shop, stackId, usageCount } = req.body;

		if (!shop || !stackId || !usageCount) {
			return res
				.status(400)
				.json({ error: 'shop, stackId, and usageCount are required' });
		}

		// Validate usageCount is a positive number
		const usageCountNum = parseInt(usageCount);
		if (isNaN(usageCountNum) || usageCountNum <= 0) {
			return res
				.status(400)
				.json({ error: 'usageCount must be a positive number' });
		}

		const updatedStack = await DiscountStack.findOneAndUpdate(
			{ _id: stackId, shop },
			{ $inc: { usageCount: usageCountNum } }, // Use $inc to increment instead of overwrite
			{ new: true }
		);

		if (!updatedStack) {
			return res.status(404).json({ error: 'Stack not found' });
		}

		res.json({
			message: 'Usage count updated',
			stack: {
				id: updatedStack._id,
				name: updatedStack.name,
				usageCount: updatedStack.usageCount,
			},
		});
	} catch (error) {
		console.error('Add usage error:', error);
		res.status(500).json({ error: 'Failed to add usage' });
	}
});

// Temporary endpoint to add sample activities
router.post('/add-sample-activities', verifyShopifyAuth, async (req, res) => {
	try {
		const { shop } = req.body;

		if (!shop) {
			return res.status(400).json({ error: 'shop is required' });
		}

		// Get existing stacks
		const stacks = await DiscountStack.find({ shop });
		console.log(`Found ${stacks.length} stacks for shop ${shop}`);

		if (stacks.length === 0) {
			return res.status(404).json({ error: 'No stacks found for shop' });
		}

		// Add sample activities for each stack
		for (const stack of stacks) {
			const activity = new Activity({
				shop,
				type: 'stack_created',
				message: `Discount stack "${stack.name}" was created`,
				stackId: stack._id,
				stackName: stack.name,
				timestamp: new Date(),
			});
			await activity.save();
		}

		res.json({
			message: 'Sample activities added',
			stacksProcessed: stacks.length,
		});
	} catch (error) {
		console.error('Sample activities error:', error);
		res.status(500).json({ error: 'Failed to add sample activities' });
	}
});

// Temporary migration endpoint to move shop data - now with safety checks
router.post('/migrate-shop', async (req, res) => {
	try {
		const { fromShop, toShop, confirmation, dryRun } = req.body;

		if (!fromShop || !toShop) {
			return res
				.status(400)
				.json({ error: 'fromShop and toShop are required' });
		}

		// Check if target shop already has data
		const existingStacks = await DiscountStack.find({ shop: toShop });
		const Activity = require('../models/Activity');
		const existingActivities = await Activity.find({ shop: toShop });

		if (existingStacks.length > 0 || existingActivities.length > 0) {
			if (!confirmation) {
				return res.status(409).json({
					error: 'Target shop already has data',
					existingStacks: existingStacks.length,
					existingActivities: existingActivities.length,
					message: 'Set confirmation: true to proceed with migration',
				});
			}
		}

		// Count source data
		const sourceStacks = await DiscountStack.find({ shop: fromShop });
		const sourceActivities = await Activity.find({ shop: fromShop });

		if (dryRun) {
			return res.json({
				message: 'Dry run completed',
				wouldUpdate: {
					stacks: sourceStacks.length,
					activities: sourceActivities.length,
				},
				existingInTarget: {
					stacks: existingStacks.length,
					activities: existingActivities.length,
				},
				fromShop,
				toShop,
			});
		}

		// Perform the migration
		const stackResult = await DiscountStack.updateMany(
			{ shop: fromShop },
			{ shop: toShop }
		);

		const activityResult = await Activity.updateMany(
			{ shop: fromShop },
			{ shop: toShop }
		).catch(() => ({ modifiedCount: 0 }));

		res.json({
			message: 'Migration completed',
			stacksUpdated: stackResult.modifiedCount,
			activitiesUpdated: activityResult.modifiedCount,
			fromShop,
			toShop,
		});
	} catch (error) {
		console.error('Migration error:', error);
		res.status(500).json({ error: 'Migration failed' });
	}
});

// Debug endpoint - now restricted to admin access and filtered by shop
router.get('/debug', async (req, res) => {
	try {
		const { shop } = req.query;

		// If shop parameter is provided, filter by that shop only
		const query = shop ? { shop } : {};
		const allStacks = await DiscountStack.find(query);
		const stacksByShop = {};

		allStacks.forEach((stack) => {
			if (!stacksByShop[stack.shop]) {
				stacksByShop[stack.shop] = [];
			}
			stacksByShop[stack.shop].push({
				id: stack._id,
				name: stack.name,
				isActive: stack.isActive,
				usageCount: stack.usageCount,
			});
		});

		res.json({
			totalStacks: allStacks.length,
			stacksByShop,
			filteredByShop: shop || 'all',
		});
	} catch (error) {
		console.error('Debug endpoint error:', error);
		res.status(500).json({ error: 'Failed to fetch debug data' });
	}
});

// Get dashboard metrics
router.get('/metrics', verifyShopifyAuth, async (req, res) => {
	try {
		const { shop } = req.query;

		if (!shop) {
			return res.status(400).json({ error: 'Shop parameter is required' });
		}

		// Get all discount stacks for the shop
		const discountStacks = await DiscountStack.find({ shop, isActive: true });
		console.log(
			`Dashboard metrics for shop ${shop}: found ${discountStacks.length} active stacks`
		);

		// Calculate metrics
		const activeStacks = discountStacks.length;

		// Calculate total savings from usage count and discount amounts
		const totalSavings = discountStacks.reduce((total, stack) => {
			return total + stack.usageCount * calculateStackSavings(stack);
		}, 0);

		// Count orders with discounts (sum of all usage counts)
		const ordersWithDiscounts = discountStacks.reduce((total, stack) => {
			return total + stack.usageCount;
		}, 0);

		// Mock data calculations - these would ideally come from Shopify order data analysis
		// TODO: Replace with actual Shopify order metrics when available
		const conversionRate =
			ordersWithDiscounts > 0
				? Math.min(100, Math.max(0, 15 + ordersWithDiscounts * 1.5)) // Cap at 100%
				: 0;
		const aovWithDiscount =
			ordersWithDiscounts > 0
				? 75 + (totalSavings / Math.max(ordersWithDiscounts, 1)) * 0.3 // More realistic AOV calculation
				: 0;

		res.json({
			activeStacks,
			totalSavings: Math.round(totalSavings * 100) / 100, // Round to 2 decimal places
			ordersWithDiscounts,
			conversionRate: Math.round(conversionRate * 10) / 10, // Round to 1 decimal place
			aovWithDiscount: Math.round(aovWithDiscount * 100) / 100,
		});
	} catch (error) {
		console.error('Dashboard metrics error:', error);
		res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
	}
});

// Get recent activity
router.get('/activity', verifyShopifyAuth, async (req, res) => {
	try {
		const { shop } = req.query;

		if (!shop) {
			return res.status(400).json({ error: 'Shop parameter is required' });
		}

		// Get recent activities using the ActivityService
		const activities = await ActivityService.getRecentActivities(shop, 10);

		res.json(activities);
	} catch (error) {
		console.error('Dashboard activity error:', error);
		res.status(500).json({ error: 'Failed to fetch recent activity' });
	}
});

// Get top performing stack
router.get('/top-performing', verifyShopifyAuth, async (req, res) => {
	try {
		const { shop } = req.query;

		if (!shop) {
			return res.status(400).json({ error: 'Shop parameter is required' });
		}

		// Find the stack with highest usage count
		const topStack = await DiscountStack.findOne({
			shop,
			isActive: true,
			usageCount: { $gt: 0 },
		}).sort({ usageCount: -1 });

		if (!topStack) {
			return res.json({
				name: 'No active stacks',
				orders: 0,
				savingsGenerated: 0,
				id: null,
			});
		}

		const savingsGenerated =
			topStack.usageCount * calculateStackSavings(topStack);

		res.json({
			name: topStack.name,
			orders: topStack.usageCount,
			savingsGenerated: Math.round(savingsGenerated * 100) / 100,
			id: topStack._id,
		});
	} catch (error) {
		console.error('Dashboard top performing error:', error);
		res.status(500).json({ error: 'Failed to fetch top performing stack' });
	}
});

// Helper function to calculate estimated savings for a stack
function calculateStackSavings(stack) {
	let savings = 0;

	if (!stack.discounts || !Array.isArray(stack.discounts)) {
		return savings;
	}

	stack.discounts.forEach((rule) => {
		switch (rule.type) {
			case 'percentage':
				// Estimate based on average order value of $75
				savings += (75 * rule.value) / 100;
				break;
			case 'fixed_amount':
				savings += rule.value;
				break;
			case 'buy_x_get_y':
				// Estimate BOGO savings based on product price (assume $25 average)
				if (rule.getQuantity > 0) {
					savings += 25 * rule.getQuantity * (rule.getDiscountPercentage / 100);
				}
				break;
			case 'free_shipping':
				// Average shipping cost savings
				savings += 8.99;
				break;
			default:
				savings += 5; // Default small savings estimate
		}
	});

	return savings;
}

module.exports = router;
