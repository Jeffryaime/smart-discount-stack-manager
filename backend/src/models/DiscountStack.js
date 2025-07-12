const mongoose = require('mongoose');

const discountRuleSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['percentage', 'fixed_amount', 'buy_x_get_y', 'free_shipping'],
    required: true
  },
  value: {
    type: Number,
    required: true
  },
  // Enhanced BOGO configuration
  bogoConfig: {
    buyQuantity: {
      type: Number
    },
    getQuantity: {
      type: Number,
      default: 1
    },
    eligibleProductIds: {
      type: [String],
      default: []
    },
    freeProductIds: {
      type: [String], 
      default: []
    },
    limitPerOrder: {
      type: Number,
      default: null
    },
    freeProductMode: {
      type: String,
      enum: ['specific', 'cheapest'],
      default: 'specific'
    }
  },
  conditions: {
    minimumAmount: Number,
    minimumQuantity: Number,
    productIds: [String],
    collectionIds: [String],
    customerSegments: [String]
  },
  priority: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const discountStackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  shop: {
    type: String,
    required: true
  },
  discounts: [discountRuleSchema],
  isActive: {
    type: Boolean,
    default: true
  },
  stopOnFirstFailure: {
    type: Boolean,
    default: false
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date
  },
  usageLimit: {
    type: Number
  },
  usageCount: {
    type: Number,
    default: 0
  },
  lastUsedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

discountStackSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DiscountStack', discountStackSchema);