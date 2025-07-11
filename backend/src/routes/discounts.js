const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const { verifyShopifyAuth } = require('../middleware/auth');

// Get all discount stacks
router.get('/', verifyShopifyAuth, discountController.getDiscountStacks);

// Create new discount stack
router.post('/', verifyShopifyAuth, discountController.createDiscountStack);

// Get all products (for product selector) - Must be before /:id route
router.get('/products', verifyShopifyAuth, discountController.getAllProducts);

// Get all collections - Must be before /:id route
router.get('/collections', verifyShopifyAuth, discountController.getAllCollections);

// Get all variants/SKUs - Must be before /:id route
router.get('/variants', verifyShopifyAuth, discountController.getAllVariants);

// Get filter metadata - Must be before /:id route
router.get('/filters', verifyShopifyAuth, discountController.getFilterMetadata);

// Search products (for product selector) - Must be before /:id route
router.get('/search/products', verifyShopifyAuth, discountController.searchProducts);

// Search collections - Must be before /:id route
router.get('/search/collections', verifyShopifyAuth, discountController.searchCollections);

// Search variants/SKUs - Must be before /:id route
router.get('/search/variants', verifyShopifyAuth, discountController.searchVariants);

// Get specific discount stack
router.get('/:id', verifyShopifyAuth, discountController.getDiscountStack);

// Update discount stack
router.put('/:id', verifyShopifyAuth, discountController.updateDiscountStack);

// Delete discount stack
router.delete('/:id', verifyShopifyAuth, discountController.deleteDiscountStack);

// Test discount stack
router.post('/:id/test', verifyShopifyAuth, discountController.testDiscountStack);

module.exports = router;