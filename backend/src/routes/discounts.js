const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { verifyShopifyAuth } = require('../middleware/auth');

// Get all discount stacks
router.get('/', verifyShopifyAuth, discountController.getDiscountStacks);

// Create new discount stack
router.post('/', verifyShopifyAuth, discountController.createDiscountStack);

// Get specific discount stack
router.get('/:id', verifyShopifyAuth, discountController.getDiscountStack);

// Update discount stack
router.put('/:id', verifyShopifyAuth, discountController.updateDiscountStack);

// Delete discount stack
router.delete('/:id', verifyShopifyAuth, discountController.deleteDiscountStack);

// Test discount stack
router.post('/:id/test', verifyShopifyAuth, discountController.testDiscountStack);

module.exports = router;