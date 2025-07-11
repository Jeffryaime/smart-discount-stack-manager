const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const DiscountStack = require('../../models/DiscountStack');
const discountRoutes = require('../../routes/discounts');

// Create test app
const app = express();
app.use(express.json());
app.use('/api/discounts', discountRoutes);

describe('BOGO API Integration Tests', () => {
  beforeAll(async () => {
    // Setup test database
    const mongoUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/test-discount-stack-integration';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await DiscountStack.deleteMany({});
  });

  const testShop = 'test-shop.myshopify.com';

  describe('POST /api/discounts - Create BOGO Discount Stack', () => {
    test('should create BOGO discount stack with specific mode', async () => {
      const discountStackData = {
        name: 'BOGO Specific Test',
        description: 'Buy 2 shirts, get 1 hat free',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['shirt123', 'shirt456'],
            freeProductIds: ['hat789'],
            limitPerOrder: 3,
            freeProductMode: 'specific'
          },
          conditions: {
            minimumAmount: 50
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .post(`/api/discounts?shop=${testShop}`)
        .send(discountStackData)
        .expect(201);

      expect(response.body.name).toBe('BOGO Specific Test');
      expect(response.body.discounts[0].bogoConfig.freeProductMode).toBe('specific');
      expect(response.body.discounts[0].bogoConfig.freeProductIds).toContain('hat789');
    });

    test('should create BOGO discount stack with cheapest mode', async () => {
      const discountStackData = {
        name: 'BOGO Cheapest Test',
        description: 'Buy 3, get cheapest free',
        discounts: [{
          type: 'buy_x_get_y',
          value: 3,
          bogoConfig: {
            buyQuantity: 3,
            getQuantity: 1,
            eligibleProductIds: ['product1', 'product2', 'product3'],
            freeProductIds: [],
            limitPerOrder: null,
            freeProductMode: 'cheapest'
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

      expect(response.body.discounts[0].bogoConfig.freeProductMode).toBe('cheapest');
      expect(response.body.discounts[0].bogoConfig.freeProductIds).toHaveLength(0);
    });

    test('should reject BOGO with invalid freeProductMode', async () => {
      const discountStackData = {
        name: 'Invalid BOGO Test',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['product1'],
            freeProductIds: [],
            freeProductMode: 'invalid_mode'
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
      expect(response.body.details).toContain("Discount 1: Invalid free product mode. Must be 'specific' or 'cheapest'");
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
            eligibleProductIds: [],
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

      expect(response.body.details).toContain('Discount 1: Auto-discount cheapest mode requires eligible products to be specified');
    });
  });

  describe('PUT /api/discounts/:id - Update BOGO Discount Stack', () => {
    test('should update BOGO mode from specific to cheapest', async () => {
      // Create initial discount stack
      const discountStack = new DiscountStack({
        name: 'Update Test',
        shop: testShop,
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['product1', 'product2'],
            freeProductIds: ['product3'],
            freeProductMode: 'specific'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      });

      const saved = await discountStack.save();

      // Update to cheapest mode
      const updateData = {
        name: 'Update Test',
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['product1', 'product2'],
            freeProductIds: [],
            freeProductMode: 'cheapest'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      };

      const response = await request(app)
        .put(`/api/discounts/${saved._id}?shop=${testShop}`)
        .send(updateData)
        .expect(200);

      expect(response.body.discounts[0].bogoConfig.freeProductMode).toBe('cheapest');
      expect(response.body.discounts[0].bogoConfig.freeProductIds).toHaveLength(0);
    });
  });

  describe('POST /api/discounts/:id/test - Test BOGO Calculation', () => {
    test('should test BOGO discount with specific mode', async () => {
      const discountStack = new DiscountStack({
        name: 'Test Calculation',
        shop: testShop,
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['product1'],
            freeProductIds: ['product2'],
            limitPerOrder: null,
            freeProductMode: 'specific'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      });

      const saved = await discountStack.save();

      const testData = {
        originalPrice: 100,
        quantity: 4,
        shippingCost: 10,
        productIds: ['product1', 'product2'],
        collectionIds: []
      };

      const response = await request(app)
        .post(`/api/discounts/${saved._id}/test?shop=${testShop}`)
        .send({ testData })
        .expect(200);

      expect(response.body).toHaveProperty('appliedDiscounts');
      expect(response.body).toHaveProperty('finalPrice');
      expect(response.body.appliedDiscounts).toHaveLength(1);
    });

    test('should handle BOGO with limit per order', async () => {
      const discountStack = new DiscountStack({
        name: 'Limited BOGO Test',
        shop: testShop,
        discounts: [{
          type: 'buy_x_get_y',
          value: 1,
          bogoConfig: {
            buyQuantity: 1,
            getQuantity: 1,
            eligibleProductIds: ['product1'],
            freeProductIds: ['product1'],
            limitPerOrder: 2,
            freeProductMode: 'specific'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      });

      const saved = await discountStack.save();

      const testData = {
        originalPrice: 200, // 10 items at $20 each
        quantity: 10,
        shippingCost: 0,
        productIds: ['product1']
      };

      const response = await request(app)
        .post(`/api/discounts/${saved._id}/test?shop=${testShop}`)
        .send({ testData })
        .expect(200);

      // Should get only 2 free items due to limit
      expect(response.body.appliedDiscounts[0]).toHaveProperty('calculationDetails');
    });
  });

  describe('GET /api/discounts - Retrieve BOGO Discount Stacks', () => {
    test('should retrieve BOGO discount stacks with all modes', async () => {
      // Create two different BOGO stacks
      const specificStack = new DiscountStack({
        name: 'Specific BOGO',
        shop: testShop,
        discounts: [{
          type: 'buy_x_get_y',
          value: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['product1'],
            freeProductIds: ['product2'],
            freeProductMode: 'specific'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      });

      const cheapestStack = new DiscountStack({
        name: 'Cheapest BOGO',
        shop: testShop,
        discounts: [{
          type: 'buy_x_get_y',
          value: 3,
          bogoConfig: {
            buyQuantity: 3,
            getQuantity: 1,
            eligibleProductIds: ['product1', 'product2', 'product3'],
            freeProductIds: [],
            freeProductMode: 'cheapest'
          },
          priority: 0,
          isActive: true
        }],
        isActive: true
      });

      await specificStack.save();
      await cheapestStack.save();

      const response = await request(app)
        .get(`/api/discounts?shop=${testShop}`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      
      const specific = response.body.find(stack => stack.name === 'Specific BOGO');
      const cheapest = response.body.find(stack => stack.name === 'Cheapest BOGO');
      
      expect(specific.discounts[0].bogoConfig.freeProductMode).toBe('specific');
      expect(cheapest.discounts[0].bogoConfig.freeProductMode).toBe('cheapest');
    });
  });
});