const jwt = require('jsonwebtoken');
const { shopify } = require('../config/shopify');
const redisClient = require('../config/redis');

const verifyShopifyAuth = async (req, res, next) => {
	try {
		const { shop } = req.query;

		if (!shop) {
			return res.status(400).json({ error: 'Shop parameter is required' });
		}

		// Only log debug information in non-production environments
		if (process.env.NODE_ENV !== 'production') {
			console.log('Auth middleware debug:', {
				NODE_ENV: process.env.NODE_ENV,
				DISABLE_AUTH_BYPASS: process.env.DISABLE_AUTH_BYPASS,
				shop: shop,
				shopMatches: shop === 'test-shop.myshopify.com',
			});
		}

		// Skip authentication in development/test mode for testing (only for test shop, not real store)
		if (
			(process.env.NODE_ENV === 'development' ||
				process.env.NODE_ENV === 'test') &&
			shop === 'test-shop.myshopify.com' &&
			!process.env.DISABLE_AUTH_BYPASS
		) {
			console.log('Development mode: Skipping Shopify auth for test shop');
			req.session = {
				shop: shop,
				accessToken: 'test-token',
				id: 'test-session',
			};
			return next();
		}

		// Try to find session in Redis
		try {
			const sessionKey = `shopify_session_${shop}`;
			const sessionData = await redisClient.get(sessionKey);

			if (sessionData) {
				try {
					req.session = JSON.parse(sessionData);
					return next();
				} catch (parseError) {
					console.error('Failed to parse session data from Redis:', {
						shop: shop,
						sessionKey: sessionKey,
						error: parseError.message,
						rawData: sessionData?.substring(0, 100) + '...', // Log first 100 chars for debugging
					});
					// Clear corrupted session data
					await redisClient.del(sessionKey).catch((delError) => {
						console.error('Failed to delete corrupted session:', delError);
					});
				}
			}
		} catch (redisError) {
			console.error('Redis session lookup error:', redisError);
		}

		// If no session found, require re-authentication
		return res.status(401).json({
			error: 'No valid session found',
			redirectUrl: `/api/auth/install?shop=${shop}`,
		});
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
	verifyJWT,
};
