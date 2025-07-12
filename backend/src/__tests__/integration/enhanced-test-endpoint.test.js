const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const DiscountStack = require('../../models/DiscountStack');

describe('Enhanced Test Discount Endpoint', () => {
  let testStackId;
  const testShop = 'test-shop.myshopify.com';

  beforeAll(async () => {
    // Connect to test database
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/smart-discount-stack-manager-test');
    }
  });

  beforeEach(async () => {
    // Clear test data
    await DiscountStack.deleteMany({ shop: testShop });

    // Create test discount stack
    const testStack = new DiscountStack({
      name: 'Enhanced Test Stack',
      shop: testShop,
      isActive: true,
      discounts: [
        {
          type: 'buy_x_get_y',
          value: 1,
          isActive: true,
          conditions: {
            productIds: ['gid://shopify/Product/123'],
            minimumAmount: 50
          },
          bogoConfig: {
            buyQuantity: 1,
            getQuantity: 1,
            eligibleProductIds: ['gid://shopify/Product/123'],
            freeProductIds: ['gid://shopify/Product/123'],
            limitPerOrder: 2,
            freeProductMode: 'specific'
          }
        }
      ]
    });

    const saved = await testStack.save();
    testStackId = saved._id;
  });

  afterEach(async () => {
    await DiscountStack.deleteMany({ shop: testShop });
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('New Unified Payload Format', () => {
    test('handles new format with eligible/ineligible separation', async () => {
      const newFormatPayload = {
        testData: {
          eligibleSubtotal: 100.00,
          ineligibleSubtotal: 50.00,
          originalPrice: 150.00, // Total of eligible + ineligible
          eligibleItems: [
            {
              productId: 'gid://shopify/Product/123',
              quantity: 2,
              price: 50.00,
              title: 'Test Product'
            }
          ],
          ineligibleItems: [
            {
              productId: 'gid://shopify/Product/456',
              quantity: 1,
              price: 50.00,
              title: 'Ineligible Product'
            }
          ],
          productIds: ['gid://shopify/Product/123'],
          quantity: 2,
          customerSegment: '',
          shippingCost: 10.00,
          taxRate: 0.08,
          cartTotal: 168.00
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(newFormatPayload)
        .expect(200);

      // Should use new format processing
      expect(response.body.isNewFormat).toBe(true);
      expect(response.body.eligibleSubtotal).toBe(100.00);
      expect(response.body.ineligibleSubtotal).toBe(50.00);
      expect(response.body.finalPrice).toBe(100.00); // After BOGO discount applied to eligible items plus ineligible unchanged
      
      // Should apply BOGO discount to eligible items only
      expect(response.body.appliedDiscounts.length).toBe(1);
      expect(response.body.appliedDiscounts[0].type).toBe('buy_x_get_y');
      expect(response.body.appliedDiscounts[0].appliedAmount).toBeGreaterThan(0);
    });

    test('provides detailed BOGO calculation results', async () => {
      const newFormatPayload = {
        testData: {
          eligibleSubtotal: 200.00,
          ineligibleSubtotal: 0,
          eligibleItems: [
            {
              productId: 'gid://shopify/Product/123',
              quantity: 4,
              price: 50.00,
              title: 'Test Product'
            }
          ],
          productIds: ['gid://shopify/Product/123'],
          quantity: 4,
          shippingCost: 0,
          taxRate: 0
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(newFormatPayload)
        .expect(200);

      const appliedDiscount = response.body.appliedDiscounts[0];
      
      // Should include enhanced BOGO details
      expect(appliedDiscount.bogoConfig).toBeDefined();
      expect(appliedDiscount.bogoConfig.buyQuantity).toBe(1);
      expect(appliedDiscount.bogoConfig.getQuantity).toBe(1);
      expect(appliedDiscount.bogoConfig.limitPerOrder).toBe(2);

      // Should include calculation details
      expect(appliedDiscount.calculationDetails).toBeDefined();
      expect(appliedDiscount.calculationDetails.setsQualified).toBe(4);
      expect(appliedDiscount.calculationDetails.freeItemsCount).toBe(2); // Limited by limitPerOrder
      expect(appliedDiscount.calculationDetails.limitApplied).toBe(true);
    });

    test('correctly calculates taxes on final total including ineligible items', async () => {
      const newFormatPayload = {
        testData: {
          eligibleSubtotal: 100.00, // Will get discount
          ineligibleSubtotal: 50.00, // No discount
          eligibleItems: [
            {
              productId: 'gid://shopify/Product/123',
              quantity: 2,
              price: 50.00,
              title: 'Test Product'
            }
          ],
          ineligibleItems: [
            {
              productId: 'gid://shopify/Product/456',
              quantity: 1,
              price: 50.00,
              title: 'Ineligible Product'
            }
          ],
          productIds: ['gid://shopify/Product/123'],
          quantity: 2,
          shippingCost: 10.00,
          taxRate: 0.10 // 10% tax
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(newFormatPayload)
        .expect(200);

      // Tax should be calculated on (discounted eligible + ineligible + shipping)
      const expectedTaxableAmount = response.body.finalEligiblePrice + response.body.ineligibleSubtotal + response.body.shippingCost;
      const expectedTax = expectedTaxableAmount * 0.10;
      
      expect(response.body.taxAmount).toBeCloseTo(expectedTax, 2);
      expect(response.body.finalTotal).toBeCloseTo(expectedTaxableAmount + expectedTax, 2);
    });
  });

  describe('Legacy Payload Compatibility', () => {
    test('still handles legacy format correctly', async () => {
      const legacyPayload = {
        testData: {
          originalPrice: 100.00,
          quantity: 2,
          productIds: ['gid://shopify/Product/123'],
          shippingCost: 10.00,
          taxRate: 0.08
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(legacyPayload)
        .expect(200);

      // Should use legacy format processing
      expect(response.body.isNewFormat).toBe(false);
      expect(response.body.originalPrice).toBe(100.00);
      expect(response.body.appliedDiscounts).toHaveLength(1);
    });
  });

  describe('Discount Condition Validation', () => {
    test('respects minimum amount condition on eligible items only', async () => {
      const payloadBelowMinimum = {
        testData: {
          eligibleSubtotal: 30.00, // Below minimum of 50
          ineligibleSubtotal: 100.00, // This shouldn't count toward minimum
          eligibleItems: [
            {
              productId: 'gid://shopify/Product/123',
              quantity: 1,
              price: 30.00,
              title: 'Test Product'
            }
          ],
          productIds: ['gid://shopify/Product/123'],
          quantity: 1
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(payloadBelowMinimum)
        .expect(200);

      // Should skip discount due to minimum amount on eligible items
      expect(response.body.appliedDiscounts).toHaveLength(0);
      expect(response.body.skippedDiscounts).toHaveLength(1);
      expect(response.body.skippedDiscounts[0].skippedReason).toContain('Minimum amount not met');
    });

    test('applies discount when eligible items meet minimum', async () => {
      const payloadAboveMinimum = {
        testData: {
          eligibleSubtotal: 60.00, // Above minimum of 50
          ineligibleSubtotal: 20.00,
          eligibleItems: [
            {
              productId: 'gid://shopify/Product/123',
              quantity: 2,
              price: 30.00,
              title: 'Test Product'
            }
          ],
          productIds: ['gid://shopify/Product/123'],
          quantity: 2
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(payloadAboveMinimum)
        .expect(200);

      // Should apply discount
      expect(response.body.appliedDiscounts).toHaveLength(1);
      expect(response.body.skippedDiscounts).toHaveLength(0);
    });
  });

  describe('Multiple Discount Types', () => {
    beforeEach(async () => {
      // Create stack with multiple discount types
      await DiscountStack.deleteMany({ shop: testShop });

      const multiDiscountStack = new DiscountStack({
        name: 'Multi Discount Stack',
        shop: testShop,
        isActive: true,
        discounts: [
          {
            type: 'buy_x_get_y',
            value: 1,
            isActive: true,
            priority: 1,
            conditions: {
              productIds: ['gid://shopify/Product/123']
            },
            bogoConfig: {
              buyQuantity: 1,
              getQuantity: 1,
              eligibleProductIds: ['gid://shopify/Product/123'],
              limitPerOrder: 1
            }
          },
          {
            type: 'percentage',
            value: 10,
            isActive: true,
            priority: 2,
            conditions: {
              minimumAmount: 20
            }
          }
        ]
      });

      const saved = await multiDiscountStack.save();
      testStackId = saved._id;
    });

    test('applies multiple discounts in priority order', async () => {
      const payload = {
        testData: {
          eligibleSubtotal: 100.00,
          ineligibleSubtotal: 0,
          eligibleItems: [
            {
              productId: 'gid://shopify/Product/123',
              quantity: 2,
              price: 50.00,
              title: 'Test Product'
            }
          ],
          productIds: ['gid://shopify/Product/123'],
          quantity: 2
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(payload)
        .expect(200);

      // Should apply both discounts
      expect(response.body.appliedDiscounts).toHaveLength(2);
      
      // Check priority order
      expect(response.body.appliedDiscounts[0].type).toBe('buy_x_get_y');
      expect(response.body.appliedDiscounts[0].priority).toBe(1);
      
      expect(response.body.appliedDiscounts[1].type).toBe('percentage');
      expect(response.body.appliedDiscounts[1].priority).toBe(2);

      // Total discount should be cumulative
      expect(response.body.totalDiscountAmount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('handles invalid discount stack ID', async () => {
      const invalidId = new mongoose.Types.ObjectId();
      
      await request(app)
        .post(`/api/discounts/${invalidId}/test`)
        .query({ shop: testShop })
        .send({ testData: { originalPrice: 100 } })
        .expect(404);
    });

    test('handles inactive discount stack', async () => {
      await DiscountStack.findByIdAndUpdate(testStackId, { isActive: false });

      await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send({ testData: { originalPrice: 100 } })
        .expect(400);
    });

    test('handles malformed test data', async () => {
      const malformedPayload = {
        testData: {
          // Missing required fields
          invalidField: 'invalid'
        }
      };

      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(malformedPayload)
        .expect(200);

      // Should handle gracefully with no discounts applied
      expect(response.body.appliedDiscounts).toHaveLength(0);
    });
  });

  describe('Performance', () => {
    test('handles large product lists efficiently', async () => {
      const largePayload = {
        testData: {
          eligibleSubtotal: 1000.00,
          ineligibleSubtotal: 0,
          eligibleItems: Array.from({ length: 100 }, (_, i) => ({
            productId: 'gid://shopify/Product/123',
            quantity: 1,
            price: 10.00,
            title: `Test Product ${i}`
          })),
          productIds: ['gid://shopify/Product/123'],
          quantity: 100
        }
      };

      const startTime = Date.now();
      
      const response = await request(app)
        .post(`/api/discounts/${testStackId}/test`)
        .query({ shop: testShop })
        .send(largePayload)
        .expect(200);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (2 seconds)
      expect(duration).toBeLessThan(2000);
      expect(response.body.appliedDiscounts).toHaveLength(1);
    });
  });
});