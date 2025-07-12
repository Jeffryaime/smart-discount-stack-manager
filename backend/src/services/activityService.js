const Activity = require('../models/Activity');

class ActivityService {
	static async logActivity({
		shop,
		type,
		message,
		stackId,
		stackName,
		metadata,
		userId,
	}) {
		try {
			const activity = new Activity({
				shop,
				type,
				message,
				stackId,
				stackName,
				metadata,
				userId,
				timestamp: new Date(),
			});

			await activity.save();
			console.log(`Activity logged: ${type} for shop ${shop}`);
			return activity;
		} catch (error) {
			console.error('Failed to log activity:', error);

			// TODO: Integrate with error monitoring service (e.g., Sentry)
			// Example: Sentry.captureException(error);
			// This ensures critical errors are tracked and alerted appropriately

			// Don't throw error to prevent breaking main operations
			return null;
		}
	}

	static async getRecentActivities(shop, limit = 10) {
		try {
			const activities = await Activity.find({ shop })
				.sort({ timestamp: -1 })
				.limit(limit)
				.populate('stackId', 'name isActive')
				.lean();

			// Format timestamps for frontend display
			return activities.map((activity) => ({
				...activity,
				relativeTime: this.getRelativeTime(activity.timestamp),
			}));
		} catch (error) {
			console.error('Failed to fetch activities:', error);

			// TODO: Integrate with error monitoring service (e.g., Sentry)
			// Example: Sentry.captureException(error);
			// This ensures critical errors are tracked and alerted appropriately

			return [];
		}
	}

	static async logStackCreated(shop, stack, userId = null) {
		return this.logActivity({
			shop,
			type: 'stack_created',
			message: `Discount stack "${stack.name}" was created`,
			stackId: stack._id,
			stackName: stack.name,
			metadata: { stackType: stack.type, rulesCount: stack.discounts.length },
			userId,
		});
	}

	static async logStackUpdated(shop, stack, userId = null) {
		return this.logActivity({
			shop,
			type: 'stack_updated',
			message: `Discount stack "${stack.name}" was updated`,
			stackId: stack._id,
			stackName: stack.name,
			metadata: {
				isActive: stack.isActive,
				rulesCount: stack.discounts.length,
			},
			userId,
		});
	}

	static async logStackActivated(shop, stack, userId = null) {
		return this.logActivity({
			shop,
			type: 'stack_activated',
			message: `Discount stack "${stack.name}" was activated`,
			stackId: stack._id,
			stackName: stack.name,
			metadata: { previousState: 'inactive' },
			userId,
		});
	}

	static async logStackDeactivated(shop, stack, userId = null) {
		return this.logActivity({
			shop,
			type: 'stack_deactivated',
			message: `Discount stack "${stack.name}" was deactivated`,
			stackId: stack._id,
			stackName: stack.name,
			metadata: { previousState: 'active' },
			userId,
		});
	}

	static async logStackDeleted(shop, stackName, stackId, userId = null) {
		return this.logActivity({
			shop,
			type: 'stack_deleted',
			message: `Discount stack "${stackName}" was deleted`,
			stackId: stackId,
			stackName: stackName,
			metadata: { action: 'permanent_deletion' },
			userId,
		});
	}

	static async logStackUsed(shop, stack, orderData = null) {
		return this.logActivity({
			shop,
			type: 'stack_used',
			message: `Discount stack "${stack.name}" was applied to an order`,
			stackId: stack._id,
			stackName: stack.name,
			metadata: {
				usageCount: stack.usageCount,
				orderValue: orderData?.totalPrice,
				discountAmount: orderData?.totalDiscounts,
			},
		});
	}

	static getRelativeTime(date) {
		const now = new Date();
		const diffInSeconds = Math.floor((now - new Date(date)) / 1000);

		if (diffInSeconds < 60) {
			return 'Just now';
		} else if (diffInSeconds < 3600) {
			const minutes = Math.floor(diffInSeconds / 60);
			return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
		} else if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
		} else if (diffInSeconds < 2592000) {
			const days = Math.floor(diffInSeconds / 86400);
			return `${days} day${days !== 1 ? 's' : ''} ago`;
		} else {
			return new Date(date).toLocaleDateString();
		}
	}
}

module.exports = ActivityService;
