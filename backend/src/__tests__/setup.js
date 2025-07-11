// Jest setup file for backend tests
const mongoose = require('mongoose');

// Increase test timeout for database operations
jest.setTimeout(30000);

// Setup global test configuration
beforeAll(async () => {
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
});

afterAll(async () => {
  // Close all mongoose connections after tests
  await mongoose.disconnect();
});

// Mock Redis client for tests
// 
// IMPORTANT: The redis config uses module.exports = redisClient (default export)
// Usage: const redisClient = require('../config/redis'); redisClient.get(...)
// This mock simulates the Redis client API with realistic return values
jest.mock('../config/redis', () => ({
  // Core Redis operations used in the app
  get: jest.fn().mockResolvedValue(null),           // Returns null when key doesn't exist
  set: jest.fn().mockResolvedValue('OK'),           // Returns 'OK' on successful set
  setEx: jest.fn().mockResolvedValue('OK'),         // Returns 'OK' on successful setEx
  del: jest.fn().mockResolvedValue(1),              // Returns number of deleted keys
  quit: jest.fn().mockResolvedValue(undefined),     // Returns undefined on quit
  
  // Connection-related methods
  connect: jest.fn().mockResolvedValue(undefined),  // Returns undefined on connect
  isOpen: true,                                     // Mock connection state
  
  // Event handler methods
  on: jest.fn()                                     // Mock event listeners (error, ready, end)
}));

// Mock Shopify API for tests
jest.mock('../config/shopify', () => ({
  shopify: {
    auth: {
      begin: jest.fn(),
      callback: jest.fn()
    },
    webhooks: {
      addHandlers: jest.fn()
    }
  }
}));