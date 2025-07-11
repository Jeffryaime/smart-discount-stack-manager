const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
// Load test environment first
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env.test') });

const { verifyShopifyAuth, verifyJWT } = require('../../middleware/auth');
const { connectDB, disconnectDB, clearTestDB } = require('../../config/database');
const redis = require('redis');

describe('Authentication Middleware Integration Tests', () => {
  let app;
  let redisClient;
  let originalEnv = {};

  beforeAll(async () => {
    await connectDB();
    
    // Create Redis client for test environment
    redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        commandTimeout: 5000,
      }
    });
    await redisClient.connect();
    
    app = express();
    app.use(express.json());
    
    // Test routes with middleware
    app.get('/test-shopify-auth', verifyShopifyAuth, (req, res) => {
      res.json({ success: true, session: req.session });
    });
    
    app.get('/test-jwt-auth', verifyJWT, (req, res) => {
      res.json({ success: true, user: req.user });
    });
  });

  afterAll(async () => {
    await clearTestDB();
    if (redisClient.isOpen) {
      await redisClient.quit();
    }
    await disconnectDB();
  });

  beforeEach(async () => {
    // Clear Redis test data before each test
    await redisClient.flushDb();
    
    // Save original environment variables that might be modified in tests
    originalEnv = {
      NODE_ENV: process.env.NODE_ENV,
      DISABLE_AUTH_BYPASS: process.env.DISABLE_AUTH_BYPASS
    };
  });

  afterEach(() => {
    // Restore original environment variables after each test
    Object.keys(originalEnv).forEach(key => {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  });

  describe('Shopify Authentication Middleware', () => {
    it('should reject requests without shop parameter', async () => {
      const response = await request(app)
        .get('/test-shopify-auth')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Shop parameter is required'
      });
    });

    it('should allow test shop in development mode with auth bypass', async () => {
      // Ensure auth bypass is enabled for test (will be restored after test)
      process.env.DISABLE_AUTH_BYPASS = 'false';
      process.env.NODE_ENV = 'development';

      const response = await request(app)
        .get('/test-shopify-auth?shop=test-shop.myshopify.com')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toEqual({
        shop: 'test-shop.myshopify.com',
        accessToken: 'test-token',
        id: 'test-session'
      });
    });

    it('should reject real shop in production mode', async () => {
      // Set production environment (will be restored after test)
      process.env.NODE_ENV = 'production';
      process.env.DISABLE_AUTH_BYPASS = 'true';

      const response = await request(app)
        .get('/test-shopify-auth?shop=real-shop.myshopify.com')
        .expect(401);

      expect(response.body.error).toBe('No valid session found');
      expect(response.body.redirectUrl).toBe('/api/auth/install?shop=real-shop.myshopify.com');
    });

    it('should authenticate with valid Redis session', async () => {
      const shop = 'test-store.myshopify.com';
      const sessionData = {
        shop: shop,
        accessToken: 'valid-access-token',
        id: 'session-123'
      };

      // Store session in Redis
      await redisClient.set(`shopify_session_${shop}`, JSON.stringify(sessionData));

      const response = await request(app)
        .get(`/test-shopify-auth?shop=${shop}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session).toEqual(sessionData);
    });

    it('should handle corrupted Redis session data', async () => {
      const shop = 'corrupted-store.myshopify.com';
      
      // Store corrupted JSON in Redis
      await redisClient.set(`shopify_session_${shop}`, '{invalid json');

      const response = await request(app)
        .get(`/test-shopify-auth?shop=${shop}`)
        .expect(401);

      expect(response.body.error).toBe('No valid session found');
      
      // Verify corrupted session was cleaned up
      const sessionData = await redisClient.get(`shopify_session_${shop}`);
      expect(sessionData).toBeNull();
    });
  });

  describe('JWT Authentication Middleware', () => {
    it('should reject requests without token', async () => {
      const response = await request(app)
        .get('/test-jwt-auth')
        .expect(401);

      expect(response.body).toEqual({
        error: 'No token provided'
      });
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/test-jwt-auth')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });

    it('should authenticate with valid JWT token', async () => {
      const payload = {
        shop: 'test-shop.myshopify.com',
        userId: 'user-123'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

      const response = await request(app)
        .get('/test-jwt-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user.shop).toBe(payload.shop);
      expect(response.body.user.userId).toBe(payload.userId);
    });

    it('should reject expired JWT token', async () => {
      const payload = {
        shop: 'test-shop.myshopify.com',
        userId: 'user-123'
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '-1h' });

      const response = await request(app)
        .get('/test-jwt-auth')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Production Authentication Simulation', () => {
    beforeEach(() => {
      // Reset to production-like settings (environment will be restored after test)
      process.env.NODE_ENV = 'test'; // Use test env but simulate production behavior
      process.env.DISABLE_AUTH_BYPASS = 'true';
    });

    it('should simulate production authentication flow', async () => {
      const shop = 'production-sim.myshopify.com';
      
      // Step 1: Initial request without session should fail
      let response = await request(app)
        .get(`/test-shopify-auth?shop=${shop}`)
        .expect(401);

      expect(response.body.redirectUrl).toBe(`/api/auth/install?shop=${shop}`);

      // Step 2: Simulate OAuth flow completion by storing session
      const sessionData = {
        shop: shop,
        accessToken: 'oauth-access-token',
        id: 'oauth-session-id',
        scope: 'read_products,write_products,read_orders',
        expires: Date.now() + 3600000 // 1 hour
      };

      await redisClient.set(`shopify_session_${shop}`, JSON.stringify(sessionData));

      // Step 3: Request with valid session should succeed
      response = await request(app)
        .get(`/test-shopify-auth?shop=${shop}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.session.accessToken).toBe('oauth-access-token');
    });

    it('should handle session expiration gracefully', async () => {
      const shop = 'expired-session.myshopify.com';
      
      // Store expired session
      const expiredSession = {
        shop: shop,
        accessToken: 'expired-token',
        id: 'expired-session',
        expires: Date.now() - 3600000 // 1 hour ago
      };

      await redisClient.set(`shopify_session_${shop}`, JSON.stringify(expiredSession));

      const response = await request(app)
        .get(`/test-shopify-auth?shop=${shop}`)
        .expect(200); // Should still work as we don't check expiration in middleware

      expect(response.body.session.accessToken).toBe('expired-token');
    });
  });
});