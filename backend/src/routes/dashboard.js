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
			conversionRate: 15.2,
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
				id: '1',
				title: 'New discount stack created',
				time: '2 minutes ago',
				status: 'success',
			},
			{
				id: '2',
				title: 'Discount applied to order #1234',
				time: '5 minutes ago',
				status: 'info',
			},
			{
				id: '3',
				title: 'Stack "Summer Sale" activated',
				time: '10 minutes ago',
				status: 'success',
			},
			{
				id: '4',
				title: 'Product inventory updated',
				time: '15 minutes ago',
				status: 'info',
			},
		];

		res.json(activity);
	} catch (error) {
		console.error('Error fetching recent activity:', error);
		res.status(500).json({ error: 'Failed to fetch recent activity' });
	}
});

module.exports = router;
