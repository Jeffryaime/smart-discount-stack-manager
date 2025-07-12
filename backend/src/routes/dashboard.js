const express = require('express');
const router = express.Router();

// Get dashboard metrics
router.get('/metrics', async (req, res) => {
	try {
		// Mock data for now - replace with actual database queries
		const metrics = {
			activeStacks: 12,
			totalSavings: 3247,
			ordersWithDiscounts: 847,
			conversionRate: 3.2,
			aovWithDiscount: 72,
		};

		res.json(metrics);
	} catch (error) {
		console.error('Error fetching dashboard metrics:', error);
		res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
	}
});

// Get recent activity
router.get('/activity', async (req, res) => {
	try {
		// Mock data for now - replace with actual database queries
		const activity = [
			{
				id: 'activity-1',
				message: 'Summer Sale Stack activated',
				timestamp: '2 hours ago',
				type: 'activated'
			},
			{
				id: 'activity-2',
				message: 'BOGO T-Shirts stack updated',
				timestamp: '5 hours ago',
				type: 'updated'
			},
			{
				id: 'activity-3',
				message: 'Weekend Flash Sale paused',
				timestamp: '1 day ago',
				type: 'paused'
			}
		];

		res.json(activity);
	} catch (error) {
		console.error('Error fetching recent activity:', error);
		res.status(500).json({ error: 'Failed to fetch recent activity' });
	}
});

// Get top performing stack
router.get('/top-performing', async (req, res) => {
	try {
		// Mock data for now - replace with actual database queries
		const topPerformingStack = {
			name: 'BOGO T-Shirts',
			orders: 310,
			savingsGenerated: 687,
			id: 'stack-12345'
		};

		res.json(topPerformingStack);
	} catch (error) {
		console.error('Error fetching top performing stack:', error);
		res.status(500).json({ error: 'Failed to fetch top performing stack' });
	}
});

module.exports = router;
