const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema(
	{
		shop: {
			type: String,
			required: true,
			index: true,
		},
		type: {
			type: String,
			required: true,
			enum: [
				'stack_created',
				'stack_updated',
				'stack_activated',
				'stack_deactivated',
				'stack_deleted',
				'stack_used',
			],
		},
		message: {
			type: String,
			required: true,
		},
		stackId: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'DiscountStack',
			required: false,
		},
		stackName: {
			type: String,
			required: false,
		},
		metadata: {
			type: mongoose.Schema.Types.Mixed,
			required: false,
		},
		userId: {
			type: String,
			required: false,
		},
		timestamp: {
			type: Date,
			default: Date.now,
			index: true,
		},
	},
	{
		timestamps: true,
	}
);

// Compound index for efficient querying by shop and timestamp
activitySchema.index({ shop: 1, timestamp: -1 });

// TTL index to automatically delete old activities after 365 days
activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 31536000 }); // 365 days in seconds

module.exports = mongoose.model('Activity', activitySchema);
