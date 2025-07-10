const DiscountStack = require('../models/DiscountStack');
const { shopify } = require('../config/shopify');

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
      const validationErrors = [];
      
      if (!name || name.trim().length === 0) {
        validationErrors.push('Name is required');
      }
      
      if (!discounts || discounts.length === 0) {
        validationErrors.push('At least one discount rule is required');
      } else {
        // Validate each discount rule
        discounts.forEach((discount, index) => {
          if (!discount.type) {
            validationErrors.push(`Discount ${index + 1}: Type is required`);
          }
          
          if (discount.value === undefined || discount.value === null) {
            validationErrors.push(`Discount ${index + 1}: Value is required`);
          } else {
            if (discount.type === 'percentage' && (discount.value < 0 || discount.value > 100)) {
              validationErrors.push(`Discount ${index + 1}: Percentage must be between 0 and 100`);
            }
            if ((discount.type === 'fixed_amount' || discount.type === 'buy_x_get_y') && discount.value < 0) {
              validationErrors.push(`Discount ${index + 1}: Amount must be greater than 0`);
            }
          }
        });
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationErrors 
        });
      }
      
      // Remove _id from discounts array to let MongoDB generate ObjectIds
      const discountData = {
        ...req.body,
        shop,
        discounts: req.body.discounts?.map(discount => {
          const { _id, id, ...discountWithoutId } = discount;
          return discountWithoutId;
        }) || []
      };
      
      const discountStack = new DiscountStack(discountData);
      
      const savedStack = await discountStack.save();
      res.status(201).json(savedStack);
    } catch (error) {
      console.error('Error creating discount stack:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: Object.values(error.errors).map(e => e.message) 
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
      
      // Validation (same as create)
      const validationErrors = [];
      
      if (!name || name.trim().length === 0) {
        validationErrors.push('Name is required');
      }
      
      if (!discounts || discounts.length === 0) {
        validationErrors.push('At least one discount rule is required');
      } else {
        // Validate each discount rule
        discounts.forEach((discount, index) => {
          if (!discount.type) {
            validationErrors.push(`Discount ${index + 1}: Type is required`);
          }
          
          if (discount.value === undefined || discount.value === null) {
            validationErrors.push(`Discount ${index + 1}: Value is required`);
          } else {
            if (discount.type === 'percentage' && (discount.value < 0 || discount.value > 100)) {
              validationErrors.push(`Discount ${index + 1}: Percentage must be between 0 and 100`);
            }
            if ((discount.type === 'fixed_amount' || discount.type === 'buy_x_get_y') && discount.value < 0) {
              validationErrors.push(`Discount ${index + 1}: Amount must be greater than 0`);
            }
          }
        });
      }
      
      if (validationErrors.length > 0) {
        return res.status(400).json({ 
          error: 'Validation failed', 
          details: validationErrors 
        });
      }
      
      // Remove _id from discounts array to let MongoDB generate ObjectIds
      const updateData = {
        ...req.body,
        discounts: req.body.discounts?.map(discount => {
          const { _id, id, ...discountWithoutId } = discount;
          return discountWithoutId;
        }) || []
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
          details: Object.values(error.errors).map(e => e.message) 
        });
      }
      res.status(500).json({ error: 'Failed to update discount stack' });
    }
  },

  async deleteDiscountStack(req, res) {
    try {
      const { id } = req.params;
      const { shop } = req.query;
      
      const discountStack = await DiscountStack.findOneAndDelete({ _id: id, shop });
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
        savings: testData.originalPrice * 0.2
      };
      
      res.json(result);
    } catch (error) {
      console.error('Error testing discount stack:', error);
      res.status(500).json({ error: 'Failed to test discount stack' });
    }
  }
};

module.exports = discountController;