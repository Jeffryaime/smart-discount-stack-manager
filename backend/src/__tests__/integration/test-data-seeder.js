// Load test environment first
require('dotenv').config({ path: require('path').join(__dirname, '../../../.env.test') });

const { connectDB, disconnectDB, clearTestDB } = require('../../config/database');
const DiscountStack = require('../../models/DiscountStack');
const redis = require('redis');

/**
 * Test data seeder for integration tests
 * Provides realistic test data for various scenarios
 */
class TestDataSeeder {
  constructor() {
    this.createdDiscounts = [];
    this.createdSessions = [];
    
    // Validate REDIS_URL environment variable
    if (!process.env.REDIS_URL) {
      const error = new Error('REDIS_URL environment variable is not defined. Please ensure .env.test is properly configured.');
      console.error('TestDataSeeder Error:', error.message);
      throw error;
    }
    
    // Create Redis client for test environment
    this.redisClient = redis.createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 5000,
        commandTimeout: 5000,
      }
    });
  }

  /**
   * Initialize test environment and clear existing data
   */
  async initialize() {
    // Safety check: Only allow data clearing in test environments
    if (process.env.NODE_ENV !== 'test') {
      const error = new Error(`Unsafe operation: Cannot initialize test data seeder in environment '${process.env.NODE_ENV}'. This operation is only allowed in 'test' environment to prevent accidental data loss.`);
      console.error('TestDataSeeder Safety Error:', error.message);
      throw error;
    }
    
    await connectDB();
    await clearTestDB();
    
    // Connect to Redis if not already connected
    if (!this.redisClient.isOpen) {
      await this.redisClient.connect();
    }
    
    // Additional safety check before flushing Redis
    console.log(`Clearing Redis data in ${process.env.NODE_ENV} environment...`);
    await this.redisClient.flushDb();
    console.log('Test environment initialized and cleared');
  }

  /**
   * Clean up all test data
   */
  async cleanup() {
    // Safety check: Only allow data clearing in test environments
    if (process.env.NODE_ENV !== 'test') {
      const error = new Error(`Unsafe operation: Cannot cleanup test data in environment '${process.env.NODE_ENV}'. This operation is only allowed in 'test' environment to prevent accidental data loss.`);
      console.error('TestDataSeeder Safety Error:', error.message);
      throw error;
    }
    
    const errors = [];
    
    try {
      // Clear test database
      console.log('Clearing test database...');
      await clearTestDB();
      console.log('✅ Test database cleared successfully');
    } catch (error) {
      console.error('❌ Error clearing test database:', error.message);
      errors.push(`Database cleanup failed: ${error.message}`);
    }
    
    try {
      // Clean up Redis
      if (this.redisClient && this.redisClient.isOpen) {
        console.log('Flushing Redis test data...');
        await this.redisClient.flushDb();
        console.log('✅ Redis test data flushed successfully');
        
        console.log('Closing Redis connection...');
        await this.redisClient.quit();
        console.log('✅ Redis connection closed successfully');
      } else {
        console.log('ℹ️ Redis client not connected, skipping Redis cleanup');
      }
    } catch (error) {
      console.error('❌ Error during Redis cleanup:', error.message);
      errors.push(`Redis cleanup failed: ${error.message}`);
      
      // Force close connection if quit fails
      try {
        if (this.redisClient && this.redisClient.isOpen) {
          await this.redisClient.disconnect();
          console.log('✅ Redis connection forcefully disconnected');
        }
      } catch (disconnectError) {
        console.error('❌ Error forcefully disconnecting Redis:', disconnectError.message);
        errors.push(`Redis disconnect failed: ${disconnectError.message}`);
      }
    }
    
    try {
      // Disconnect from database
      console.log('Disconnecting from database...');
      await disconnectDB();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Error disconnecting from database:', error.message);
      errors.push(`Database disconnect failed: ${error.message}`);
    }
    
    if (errors.length > 0) {
      const errorMessage = `Test environment cleanup completed with ${errors.length} error(s):\n${errors.join('\n')}`;
      console.error('⚠️ ', errorMessage);
      throw new Error(errorMessage);
    } else {
      console.log('✅ Test environment cleaned up successfully');
    }
  }

  /**
   * Seed basic BOGO discount configurations
   */
  async seedBogoDiscounts() {
    const bogoDiscounts = [
      {
        name: 'Buy 1 Get 1 Free - Shirts',
        description: 'Buy any shirt, get another shirt free',
        shop: 'test-shop.myshopify.com',
        isActive: true,
        discounts: [{
          type: 'buy_x_get_y',
          value: 100,
          priority: 1,
          bogoConfig: {
            buyQuantity: 1,
            getQuantity: 1,
            eligibleProductIds: ['123', '456', '789'],
            freeProductIds: ['123', '456', '789'],
            limitPerOrder: 2,
            freeProductMode: 'cheapest'
          },
          conditions: {
            minimumAmount: 0
          }
        }]
      },
      {
        name: 'Buy 2 Get 1 Free - Premium',
        description: 'Buy 2 premium items, get 1 free',
        shop: 'test-shop.myshopify.com',
        isActive: true,
        discounts: [{
          type: 'buy_x_get_y',
          value: 100,
          priority: 2,
          bogoConfig: {
            buyQuantity: 2,
            getQuantity: 1,
            eligibleProductIds: ['101', '102', '103'],
            freeProductIds: ['101', '102', '103'],
            limitPerOrder: 3,
            freeProductMode: 'cheapest'
          },
          conditions: {
            minimumAmount: 50
          }
        }]
      },
      {
        name: 'Buy 3 Get 2 Free - Bulk Discount',
        description: 'Bulk discount for large orders',
        shop: 'test-shop.myshopify.com',
        isActive: true,
        discounts: [{
          type: 'buy_x_get_y',
          value: 100,
          priority: 3,
          bogoConfig: {
            buyQuantity: 3,
            getQuantity: 2,
            eligibleProductIds: ['201', '202', '203', '204', '205'],
            freeProductIds: ['201', '202'],
            limitPerOrder: 10,
            freeProductMode: 'specific'
          },
          conditions: {
            minimumAmount: 100
          }
        }]
      },
      {
        name: 'Inactive BOGO Test',
        description: 'Disabled discount for testing',
        shop: 'test-shop.myshopify.com',
        isActive: false,
        discounts: [{
          type: 'buy_x_get_y',
          value: 100,
          priority: 10,
          bogoConfig: {
            buyQuantity: 1,
            getQuantity: 1,
            eligibleProductIds: ['999'],
            freeProductIds: ['999'],
            limitPerOrder: 1,
            freeProductMode: 'cheapest'
          },
          conditions: {
            minimumAmount: 0
          }
        }]
      }
    ];

    for (const discountData of bogoDiscounts) {
      const discount = new DiscountStack(discountData);
      const saved = await discount.save();
      this.createdDiscounts.push(saved._id);
    }

    console.log(`Seeded ${bogoDiscounts.length} BOGO discounts`);
    return this.createdDiscounts;
  }

  /**
   * Seed edge case BOGO configurations for testing
   */
  async seedEdgeCaseDiscounts() {
    const edgeCases = [
      {
        name: 'Zero Minimum Amount',
        shop: 'test-shop.myshopify.com',
        discounts: [{
          type: 'buy_x_get_y',
          value: 100,
          bogoConfig: {
            buyQuantity: 1,
            getQuantity: 1,
            eligibleProductIds: ['edge1'],
            freeProductIds: ['edge1'],
            limitPerOrder: 1,
            freeProductMode: 'cheapest'
          },
          conditions: {
            minimumAmount: 0
          }
        }]
      },
      {
        name: 'High Buy Quantity',
        shop: 'test-shop.myshopify.com',
        discounts: [{
          type: 'buy_x_get_y',
          value: 100,
          bogoConfig: {
            buyQuantity: 10,
            getQuantity: 1,
            eligibleProductIds: ['edge2'],
            freeProductIds: ['edge2'],
            limitPerOrder: 1,
            freeProductMode: 'cheapest'
          }
        }]
      },
      {
        name: 'Different Free Products',
        shop: 'test-shop.myshopify.com',
        discounts: [{
          type: 'buy_x_get_y',
          value: 100,
          bogoConfig: {
            buyQuantity: 1,
            getQuantity: 1,
            eligibleProductIds: ['buy1', 'buy2'],
            freeProductIds: ['free1', 'free2', 'free3'],
            limitPerOrder: 1,
            freeProductMode: 'specific'
          }
        }]
      }
    ];

    for (const discountData of edgeCases) {
      const discount = new DiscountStack(discountData);
      const saved = await discount.save();
      this.createdDiscounts.push(saved._id);
    }

    console.log(`Seeded ${edgeCases.length} edge case discounts`);
    return edgeCases.map(d => d.name);
  }

  /**
   * Seed Redis sessions for authentication testing
   */
  async seedTestSessions() {
    const sessions = [
      {
        shop: 'test-shop.myshopify.com',
        data: {
          shop: 'test-shop.myshopify.com',
          accessToken: 'test-access-token-123',
          id: 'session-123',
          scope: 'read_products,write_products,read_orders',
          expires: Date.now() + 3600000
        }
      },
      {
        shop: 'premium-shop.myshopify.com',
        data: {
          shop: 'premium-shop.myshopify.com',
          accessToken: 'premium-access-token-456',
          id: 'session-456',
          scope: 'read_products,write_products,read_orders,read_customers',
          expires: Date.now() + 7200000
        }
      },
      {
        shop: 'expired-shop.myshopify.com',
        data: {
          shop: 'expired-shop.myshopify.com',
          accessToken: 'expired-token-789',
          id: 'session-789',
          scope: 'read_products',
          expires: Date.now() - 3600000 // Expired 1 hour ago
        }
      }
    ];

    for (const session of sessions) {
      const sessionKey = `shopify_session_${session.shop}`;
      await this.redisClient.set(sessionKey, JSON.stringify(session.data));
      this.createdSessions.push(sessionKey);
    }

    console.log(`Seeded ${sessions.length} test sessions in Redis`);
    return sessions.map(s => s.shop);
  }

  /**
   * Seed mock product data for testing
   */
  getMockProductData() {
    return {
      collections: [
        {
          id: 'gid://shopify/Collection/123',
          handle: 'shirts',
          title: 'Shirts Collection',
          productsCount: 15
        },
        {
          id: 'gid://shopify/Collection/456',
          handle: 'premium',
          title: 'Premium Products',
          productsCount: 8
        },
        {
          id: 'gid://shopify/Collection/789',
          handle: 'sale',
          title: 'Sale Items',
          productsCount: 25
        }
      ],
      variants: [
        {
          id: 'gid://shopify/ProductVariant/123',
          title: 'Basic T-Shirt - Small',
          sku: 'SHIRT-S-001',
          price: '19.99',
          inventoryQuantity: 50,
          product: {
            id: 'gid://shopify/Product/1',
            title: 'Basic T-Shirt',
            vendor: 'TestBrand',
            productType: 'Apparel'
          }
        },
        {
          id: 'gid://shopify/ProductVariant/456',
          title: 'Premium Hoodie - Medium',
          sku: 'HOODIE-M-002',
          price: '59.99',
          inventoryQuantity: 25,
          product: {
            id: 'gid://shopify/Product/2',
            title: 'Premium Hoodie',
            vendor: 'PremiumBrand',
            productType: 'Apparel'
          }
        }
      ],
      filterMetadata: {
        vendors: ['TestBrand', 'PremiumBrand', 'BudgetBrand'],
        productTypes: ['Apparel', 'Accessories', 'Electronics']
      }
    };
  }

  /**
   * Get all seeded data for verification
   */
  async getSeededData() {
    const discounts = await DiscountStack.find({});
    const sessionKeys = await this.redisClient.keys('shopify_session_*');
    
    return {
      discountCount: discounts.length,
      sessionCount: sessionKeys.length,
      discountIds: this.createdDiscounts,
      sessionKeys: this.createdSessions
    };
  }

  /**
   * Seed complete test dataset
   */
  async seedAll() {
    // Safety check: Only allow data seeding in test environments
    if (process.env.NODE_ENV !== 'test') {
      const error = new Error(`Unsafe operation: Cannot seed test data in environment '${process.env.NODE_ENV}'. This operation is only allowed in 'test' environment to prevent accidental data corruption.`);
      console.error('TestDataSeeder Safety Error:', error.message);
      throw error;
    }
    
    await this.initialize();
    
    const discountIds = await this.seedBogoDiscounts();
    const edgeCaseNames = await this.seedEdgeCaseDiscounts();
    const sessionShops = await this.seedTestSessions();
    
    const summary = await this.getSeededData();
    
    console.log('=== Test Data Seeding Complete ===');
    console.log(`Total discounts: ${summary.discountCount}`);
    console.log(`Total sessions: ${summary.sessionCount}`);
    console.log(`BOGO discounts: ${discountIds.length}`);
    console.log(`Edge cases: ${edgeCaseNames.length}`);
    console.log(`Test sessions: ${sessionShops.length}`);
    
    return summary;
  }
}

module.exports = TestDataSeeder;

// If run directly, seed all test data
if (require.main === module) {
  const seeder = new TestDataSeeder();
  seeder.seedAll()
    .then(() => {
      console.log('Test data seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Test data seeding failed:', error);
      process.exit(1);
    });
}