const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();
const { connectDB } = require('./config/database');
const redisClient = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for ngrok and other reverse proxies
app.set('trust proxy', true);

// Middleware
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "http://localhost:3003"],
			styleSrc: ["'self'", "'unsafe-inline'"],
			fontSrc: ["'self'", "data:"],
			imgSrc: ["'self'", "data:", "https:"],
			connectSrc: ["'self'", "http://localhost:3003", "https://*.ngrok-free.app"],
			frameAncestors: ["https://*.shopify.com", "https://*.myshopify.com"],
		},
	},
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting with proper trust proxy configuration
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
	standardHeaders: true,
	legacyHeaders: false,
	// Skip rate limiting validation in development mode
	skip: (req) => process.env.NODE_ENV === 'development',
});
app.use(limiter);

// Serve static React build files
const frontendBuildPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendBuildPath));

// Root route - serve React app for Shopify
app.get('/', (req, res) => {
	const shop = req.query.shop;

	if (shop) {
		// Serve the React app's index.html
		res.sendFile(path.join(frontendBuildPath, 'index.html'));
	} else {
		// Show general API information
		res.json({
			message: 'Smart Discount Stack Manager API',
			status: 'Server is running',
			endpoints: {
				health: '/health',
				redis: '/redis-test',
				webhooks: '/api/webhooks',
				discounts: '/api/discounts',
				auth: '/api/auth'
			},
			usage: 'Add ?shop=your-shop.myshopify.com to get shop-specific information',
			timestamp: new Date().toISOString()
		});
	}
});

// Routes
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/health', (req, res) => {
	res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Redis test endpoint
app.get('/redis-test', async (req, res) => {
	try {
		await redisClient.set('test', 'Hello Redis!');
		const value = await redisClient.get('test');

		res.json({
			status: 'Redis connected successfully!',
			testValue: value,
			timestamp: new Date().toISOString(),
		});
	} catch (error) {
		res.status(500).json({
			error: 'Redis operation failed',
			message: error.message,
		});
	}
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to database
connectDB().catch((error) => {
	console.error('Database connection failed:', error);
	process.exit(1);
});

// Only start server if this file is executed directly (not imported for testing)
if (require.main === module) {
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
}

module.exports = app;
