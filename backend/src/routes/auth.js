const express = require('express');
const router = express.Router();
const { shopify } = require('../config/shopify');

// OAuth callback
router.get('/callback', async (req, res) => {
  try {
    const session = await shopify.auth.callback({
      rawRequest: req,
      rawResponse: res,
    });

    res.redirect(`${process.env.SHOPIFY_APP_URL}?shop=${session.shop}&host=${req.query.host}`);
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Install route
router.get('/install', async (req, res) => {
  try {
    const { shop } = req.query;
    const authUrl = await shopify.auth.begin({
      shop,
      callbackPath: '/api/auth/callback',
      isOnline: false,
    });

    res.redirect(authUrl);
  } catch (error) {
    console.error('Install error:', error);
    res.status(500).json({ error: 'Installation failed' });
  }
});

module.exports = router;