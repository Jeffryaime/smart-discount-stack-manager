const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const path = require('path');
const {
	connectDB,
	disconnectDB,
	clearTestDB,
} = require('../../config/database');
const discountController = require('../../controllers/discountController');
const redisClient = require('../../config/redis');
const DiscountStack = require('../../models/DiscountStack');

// Load test environment with absolute path
require('dotenv').config({ path: path.join(__dirname, '../../../.env.test') });

describe('API Endpoints Integration Tests', () => {
	let app;
	let authToken;

	beforeAll(async () => {
		await connectDB();

		// Setup Express app with routes
		app = express();
		app.use(express.json());

		// Mock auth middleware for testing
		app.use((req, res, next) => {
			if (req.headers.authorization) {
				const token = req.headers.authorization.split(' ')[1];
				try {
					req.user = jwt.verify(token, process.env.JWT_SECRET);
					// Only set session for authenticated requests
					req.session = {
						shop: 'test-shop.myshopify.com',
						accessToken: 'test-token',
					};
				} catch (error) {
					return res.status(401).json({ error: 'Invalid token' });
				}
			}
			next();
		});

		// Add API routes
		app.get('/api/discounts/collections', discountController.getAllCollections);
		app.get(
			'/api/discounts/collections/search',
			discountController.searchCollections
		);
		app.get('/api/discounts/variants', discountController.getAllVariants);
		app.get(
			'/api/discounts/variants/search',
			discountController.searchVariants
		);
		app.get(
			'/api/discounts/filter-metadata',
			discountController.getFilterMetadata
		);
		app.post('/api/discounts', discountController.createDiscountStack);
		app.get('/api/discounts', discountController.getDiscountStacks);

		// Generate test JWT token
		authToken = jwt.sign(
			{ shop: 'test-shop.myshopify.com', userId: 'test-user' },
			process.env.JWT_SECRET,
			{ expiresIn: '1h' }
		);
	});

	afterAll(async () => {
		await clearTestDB();
		await disconnectDB();
	});

	beforeEach(async () => {
		await clearTestDB();
		await redisClient.flushdb();
	});

	afterEach(() => {
		// Clean up any remaining mocks to prevent test interference
		jest.restoreAllMocks();
	});

	describe('Collections API', () => {
		it('should fetch all collections successfully', async () => {
			const response = await request(app)
				.get('/api/discounts/collections')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBeGreaterThanOrEqual(0);
		});

		it('should search collections with query parameter', async () => {
			const response = await request(app)
				.get('/api/discounts/collections/search?query=test')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			// Verify that returned items match the search criteria
			if (response.body.length > 0) {
				response.body.forEach((item) => {
					// Check if the item's title, handle, or description contains the search term
					const searchTerm = 'test';
					const itemText = [item.title, item.handle, item.description]
						.filter(Boolean)
						.join(' ')
						.toLowerCase();
					expect(itemText).toMatch(new RegExp(searchTerm, 'i'));
				});
			}
		});

		it('should handle search collections without query parameter', async () => {
			const response = await request(app)
				.get('/api/discounts/collections/search')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(400);

			expect(response.body.error).toBe('Query parameter is required');
		});
	});

	describe('Variants API', () => {
		it('should fetch all variants successfully', async () => {
			const response = await request(app)
				.get('/api/discounts/variants')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
		});

		it('should search variants with query parameter', async () => {
			const response = await request(app)
				.get('/api/discounts/variants/search?query=shirt')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			// Verify that returned items match the search criteria
			if (response.body.length > 0) {
				response.body.forEach((item) => {
					// Check if the item's title, product title, or variant title contains the search term
					const searchTerm = 'shirt';
					const itemText = [item.title, item.product_title, item.variant_title]
						.filter(Boolean)
						.join(' ')
						.toLowerCase();
					expect(itemText).toMatch(new RegExp(searchTerm, 'i'));
				});
			}
		});

		it('should handle search variants without query parameter', async () => {
			const response = await request(app)
				.get('/api/discounts/variants/search')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(400);

			expect(response.body.error).toBe('Query parameter is required');
		});
	});

	describe('Filter Metadata API', () => {
		it('should fetch filter metadata successfully', async () => {
			const response = await request(app)
				.get('/api/discounts/filter-metadata')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(response.body).toHaveProperty('vendors');
			expect(response.body).toHaveProperty('productTypes');
			expect(Array.isArray(response.body.vendors)).toBe(true);
			expect(Array.isArray(response.body.productTypes)).toBe(true);
		});
	});

	describe('Discount Stacks CRUD', () => {
		it('should create a BOGO discount stack successfully', async () => {
			const discountData = {
				name: 'Test BOGO Discount',
				description: 'Test discount for integration testing',
				shop: 'test-shop.myshopify.com',
				isActive: true,
				discounts: [
					{
						type: 'buy_x_get_y',
						value: 100,
						priority: 1,
						bogoConfig: {
							buyQuantity: 1,
							getQuantity: 1,
							eligibleProductIds: ['123', '456'],
							freeProductIds: ['123'],
							limitPerOrder: 1,
							freeProductMode: 'cheapest',
						},
						conditions: {
							minimumAmount: 0,
						},
					},
				],
			};

			const response = await request(app)
				.post('/api/discounts')
				.set('Authorization', `Bearer ${authToken}`)
				.send(discountData)
				.expect(201);

			expect(response.body).toHaveProperty('_id');
			expect(response.body.name).toBe(discountData.name);
			expect(response.body.discounts[0].type).toBe('buy_x_get_y');
			expect(response.body.discounts[0].bogoConfig).toBeDefined();
			expect(response.body.discounts[0].bogoConfig.buyQuantity).toBe(1);
		});

		it('should validate BOGO configuration on creation', async () => {
			const invalidDiscountData = {
				name: 'Invalid BOGO',
				shop: 'test-shop.myshopify.com',
				discounts: [
					{
						type: 'buy_x_get_y',
						value: 100,
						bogoConfig: {
							buyQuantity: 0, // Invalid: should be > 0
							getQuantity: 1,
							freeProductMode: 'cheapest',
						},
					},
				],
			};

			const response = await request(app)
				.post('/api/discounts')
				.set('Authorization', `Bearer ${authToken}`)
				.send(invalidDiscountData)
				.expect(400);

			expect(response.body.error).toContain(
				'buyQuantity must be greater than 0'
			);
		});

		it('should auto-set free products when not specified', async () => {
			const discountData = {
				name: 'Auto Free Products BOGO',
				shop: 'test-shop.myshopify.com',
				discounts: [
					{
						type: 'buy_x_get_y',
						value: 100,
						bogoConfig: {
							buyQuantity: 2,
							getQuantity: 1,
							eligibleProductIds: ['123', '456'],
							freeProductMode: 'cheapest',
							// No freeProductIds specified - should auto-set
						},
					},
				],
			};

			const response = await request(app)
				.post('/api/discounts')
				.set('Authorization', `Bearer ${authToken}`)
				.send(discountData)
				.expect(201);

			expect(response.body.discounts[0].bogoConfig.freeProductIds).toEqual([
				'123',
				'456',
			]);
		});

		it('should auto-set limit per order based on get quantity', async () => {
			const discountData = {
				name: 'Auto Limit BOGO',
				shop: 'test-shop.myshopify.com',
				discounts: [
					{
						type: 'buy_x_get_y',
						value: 100,
						bogoConfig: {
							buyQuantity: 3,
							getQuantity: 2,
							eligibleProductIds: ['123'],
							freeProductMode: 'cheapest',
						},
					},
				],
			};

			const response = await request(app)
				.post('/api/discounts')
				.set('Authorization', `Bearer ${authToken}`)
				.send(discountData)
				.expect(201);

			expect(response.body.discounts[0].bogoConfig.limitPerOrder).toBe(2);
		});

		it('should fetch discount stacks successfully', async () => {
			// First create a discount
			const discountData = {
				name: 'Fetch Test BOGO',
				shop: 'test-shop.myshopify.com',
				discounts: [
					{
						type: 'buy_x_get_y',
						value: 100,
						bogoConfig: {
							buyQuantity: 1,
							getQuantity: 1,
							eligibleProductIds: ['123'],
							freeProductMode: 'cheapest',
						},
					},
				],
			};

			await request(app)
				.post('/api/discounts')
				.set('Authorization', `Bearer ${authToken}`)
				.send(discountData);

			// Then fetch all discounts
			const response = await request(app)
				.get('/api/discounts')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			expect(Array.isArray(response.body)).toBe(true);
			expect(response.body.length).toBe(1);
			expect(response.body[0].name).toBe('Fetch Test BOGO');
		});
	});

	describe('Error Handling', () => {
		it('should handle database connection errors gracefully', async () => {
			// Mock DiscountStack.find to simulate database error
			const originalFind = DiscountStack.find;
			DiscountStack.find = jest
				.fn()
				.mockRejectedValue(new Error('Database connection error'));

			try {
				const response = await request(app)
					.get('/api/discounts')
					.set('Authorization', `Bearer ${authToken}`)
					.expect(500);

				expect(response.body.error).toBeDefined();
			} finally {
				// Restore original method even if test fails
				DiscountStack.find = originalFind;
			}
		});

		it('should handle unauthorized requests', async () => {
			const response = await request(app)
				.get('/api/discounts/collections')
				.expect(401);

			expect(response.body.error).toBe('Invalid token');
		});

		it('should handle malformed request data', async () => {
			const response = await request(app)
				.post('/api/discounts')
				.set('Authorization', `Bearer ${authToken}`)
				.set('Content-Type', 'application/json')
				.send(
					'{"name": "test", "shop": "test-shop.myshopify.com", "discounts": [{"type": "percentage", "value": 10}]'
				)
				.expect(400);

			expect(response.body.error).toBeDefined();
		});
	});

	describe('Performance Tests', () => {
		it('should handle concurrent requests efficiently', async () => {
			const promises = [];

			// Make 10 concurrent requests
			for (let i = 0; i < 10; i++) {
				promises.push(
					request(app)
						.get('/api/discounts/filter-metadata')
						.set('Authorization', `Bearer ${authToken}`)
				);
			}

			const responses = await Promise.all(promises);

			responses.forEach((response) => {
				expect(response.status).toBe(200);
				expect(response.body).toHaveProperty('vendors');
			});
		});

		it('should respond to collections API within reasonable time', async () => {
			const startTime = Date.now();

			await request(app)
				.get('/api/discounts/collections')
				.set('Authorization', `Bearer ${authToken}`)
				.expect(200);

			const endTime = Date.now();
			const responseTime = endTime - startTime;

			// Should respond within 5 seconds
			expect(responseTime).toBeLessThan(5000);
		});
	});
});
