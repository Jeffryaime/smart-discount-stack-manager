const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();
const connectDB = require('./config/database');
const redisClient = require('./config/redis');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Routes
app.use('/api/webhooks', require('./routes/webhooks'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/auth', require('./routes/auth'));

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

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

module.exports = app;
