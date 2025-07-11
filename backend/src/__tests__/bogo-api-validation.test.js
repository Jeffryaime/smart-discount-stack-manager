const request = require('supertest');
const express = require('express');
const discountRoutes = require('../routes/discounts');

// Create test app with minimal auth middleware
const app = express();
app.use(express.json());

// Mock auth middleware for testing
app.use((req, res, next) => {
  req.session = { shop: req.query.shop };
  next();
});

app.use('/api/discounts', discountRoutes);

describe('BOGO API Validation Integration Tests', () => {
  const testShop = 'test-shop.myshopify.com';

  describe('POST /api/discounts - Validation Errors', () => {
    test('should reject BOGO specific mode with no products', async () => {
      const discountStackData = {
        name: 'Invalid BOGO Test',
        description: 'This should fail validation',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: [], // Empty
            freeProductIds: [], // Empty
            limitPerOrder: null,
            freeProductMode: 'specific'
          },
          conditions: {},
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(discountStackData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toContain(
        'Discount 1: BOGO with specific mode requires eligible products to be specified (free products will auto-default to eligible products if not specified)'
      );
    });

    test('should accept BOGO specific mode with eligible products', async () => {
      const discountStackData = {
        name: 'Valid BOGO Test',
        description: 'This should pass validation',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['12345', '67890'], // Has products
            freeProductIds: [],
            limitPerOrder: null,
            freeProductMode: 'specific'
          },
          conditions: {},
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(discountStackData)
        .expect(201);

      expect(response.body.name).toBe('Valid BOGO Test');
      expect(response.body.discounts[0].bogoConfig.eligibleProductIds).toEqual(['12345', '67890']);
    });

    test('should accept BOGO specific mode with free products only', async () => {
      const discountStackData = {
        name: 'Valid Free Products BOGO',
        description: 'Free products specified',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: [],
            freeProductIds: ['11111', '22222'], // Has free products
            limitPerOrder: null,
            freeProductMode: 'specific'
          },
          conditions: {},
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(discountStackData)
        .expect(201);

      expect(response.body.discounts[0].bogoConfig.freeProductIds).toEqual(['11111', '22222']);
    });

    test('should reject cheapest mode without eligible products', async () => {
      const discountStackData = {
        name: 'Invalid Cheapest BOGO',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: [], // Empty - should fail for cheapest mode
            freeProductIds: [],
            freeProductMode: 'cheapest'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(discountStackData)
        .expect(400);

      expect(response.body.details).toContain(
        'Discount 1: Auto-discount cheapest mode requires eligible products to be specified'
      );
    });

    test('should handle multiple validation errors', async () => {
      const discountStackData = {
        name: 'Multiple Errors Test',
        discounts: [{
          type: 'buy_x_get_y',
          value: -1, // Invalid value
          bogoConfig: {
            buyQuantity: 0, // Invalid buy quantity
            getQuantity: 1,
            eligibleProductIds: [], // Missing products
            freeProductIds: [],
            limitPerOrder: -5, // Invalid limit
            freeProductMode: 'specific'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(discountStackData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details.length).toBeGreaterThan(1);
      
      // Should include our new validation error
      expect(response.body.details).toContain(
        'Discount 1: BOGO with specific mode requires eligible products to be specified (free products will auto-default to eligible products if not specified)'
      );
    });

    test('should default undefined freeProductMode to specific and validate', async () => {
      const discountStackData = {
        name: 'Default Mode Test',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: [],
            freeProductIds: [],
            // freeProductMode: undefined (not set)
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(discountStackData)
        .expect(400);

      expect(response.body.details).toContain(
        'Discount 1: BOGO with specific mode requires eligible products to be specified (free products will auto-default to eligible products if not specified)'
      );
    });
  });

  describe('PUT /api/discounts/:id - Update Validation', () => {
    test('should reject update that makes BOGO configuration invalid', async () => {
      // First create a valid discount stack
      const validData = {
        name: 'Valid BOGO',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['12345'],
            freeProductIds: [],
            freeProductMode: 'specific'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const createResponse = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(validData)
        .expect(201);

      const discountId = createResponse.body._id;

      // Now try to update it to an invalid configuration
      const invalidUpdate = {
        name: 'Valid BOGO',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: [], // Remove products - should fail
            freeProductIds: [],
            freeProductMode: 'specific'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const updateResponse = await request(app)
        .put(`/api/discounts/${discountId}?shop=${testShop}`)
        .send(invalidUpdate)
        .expect(400);

      expect(updateResponse.body.error).toBe('Validation failed');
      expect(updateResponse.body.details).toContain(
        'Discount 1: BOGO with specific mode requires either eligible products or free products to be specified'
      );
    });
  });
});