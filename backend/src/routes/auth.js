const express = require('express');
const router = express.Router();
const { shopify } = require('../config/shopify');
const redisClient = require('../config/redis');

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    // Extract the actual session from the response
    const actualSession = session.session || session;
    
    // Store session in Redis
    const shopName = actualSession.shop;
    const sessionKey = `shopify_session_${shopName}`;
    
    try {
      await redisClient.setEx(sessionKey, 86400, JSON.stringify(actualSession)); // 24 hour expiry
      console.log('Session stored for shop:', shopName);
    } catch (redisError) {
      console.error('Failed to store session in Redis:', {
        shop: shopName,
        error: redisError.message,
        stack: redisError.stack
      });
      // Continue execution - session creation succeeded even if Redis storage failed
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3003';
    res.redirect(`${frontendUrl}?shop=${shopName}&host=${req.query.host}`);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Install route
router.get('/install', async (req, res) => {
  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    console.log('Starting OAuth for shop:', shop);
    console.log('Request headers:', req.headers);

    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: false,
      rawRequest: req,
      rawResponse: res,
    });

    console.log('Generated auth URL:', authUrl);
    
    // Only redirect if authUrl is valid and response hasn't been sent
    if (authUrl && !res.headersSent) {
      return res.redirect(authUrl);
    }
    
    // If we get here, something went wrong but no error was thrown
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Failed to generate authorization URL' });
    }
  } catch (error) {
    console.error('Install error details:', {
      message: error.message,
      stack: error.stack,
      shop: req.query.shop
    });
    
    // Only send error response if headers haven't been sent
    if (!res.headersSent) {
      res.status(500).json({ error: 'Installation failed', details: error.message });
    }
  }
});

module.exports = router;