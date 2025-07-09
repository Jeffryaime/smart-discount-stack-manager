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
      const discountStack = new DiscountStack({
        ...req.body,
        shop
      });
      
      const savedStack = await discountStack.save();
      res.status(201).json(savedStack);
    } catch (error) {
      console.error('Error creating discount stack:', error);
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
      
      const discountStack = await DiscountStack.findOneAndUpdate(
        { _id: id, shop },
        req.body,
        { new: true }
      );
      
      if (!discountStack) {
        return res.status(404).json({ error: 'Discount stack not found' });
      }
      
      res.json(discountStack);
    } catch (error) {
      console.error('Error updating discount stack:', error);
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