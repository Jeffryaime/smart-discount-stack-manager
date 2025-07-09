const jwt = require('jsonwebtoken');
const { shopify } = require('../config/shopify');

const verifyShopifyAuth = async (req, res, next) => {
  try {
    const { shop } = req.query;
    
    if (!shop) {
      return res.status(400).json({ error: 'Shop parameter is required' });
    }

    // Skip authentication in development mode for testing
    if (process.env.NODE_ENV === 'development' && shop === 'test-shop.myshopify.com') {
      console.log('Development mode: Skipping Shopify auth for test shop');
      req.session = {
        shop: shop,
        accessToken: 'test-token',
        id: 'test-session'
      };
      return next();
    }

    // Verify shop session
    const session = await shopify.session.findSessionsByShop(shop);
    
    if (!session || session.length === 0) {
      return res.status(401).json({ error: 'No valid session found' });
    }

    req.session = session[0];
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

const verifyJWT = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('JWT verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = {
  verifyShopifyAuth,
  verifyJWT
};