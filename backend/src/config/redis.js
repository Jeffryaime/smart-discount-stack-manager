const redis = require('redis');

// Configuration constants
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 2000; // 2 seconds

// Create Redis client instance
const redisClient = redis.createClient({
	url: process.env.REDIS_URL,
	socket: {
		connectTimeout: CONNECTION_TIMEOUT,
		commandTimeout: CONNECTION_TIMEOUT,
	},
});

// Graceful cleanup function
async function gracefulExit(exitCode = 0) {
	console.log('Performing graceful cleanup...');

	try {
		// Close Redis connection if it exists and is connected
		if (redisClient && redisClient.isOpen) {
			await redisClient.quit();
			console.log('Redis connection closed successfully');
		}
	} catch (error) {
		console.error('Error during Redis cleanup:', error);
	}

	// Exit with the specified code
	process.exit(exitCode);
}

// Retry connection with timeout
async function connectWithRetry(maxAttempts = MAX_RETRY_ATTEMPTS) {
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		console.log(`Redis connection attempt ${attempt}/${maxAttempts}...`);

		try {
			// Create a timeout promise with timer ID for cleanup
			let timeoutId;
			const timeoutPromise = new Promise((_, reject) => {
				timeoutId = setTimeout(() => {
					reject(new Error(`Connection timeout after ${CONNECTION_TIMEOUT}ms`));
				}, CONNECTION_TIMEOUT);
			});

			// Race between connection and timeout
			await Promise.race([redisClient.connect(), timeoutPromise]);

			// Clear the timeout timer since connection succeeded
			clearTimeout(timeoutId);

			console.log('Redis client connected successfully');
			return; // Success, exit the retry loop
		} catch (error) {
			console.error(
				`Redis connection attempt ${attempt} failed:`,
				error.message
			);

			// If this was the last attempt, exit gracefully
			if (attempt === maxAttempts) {
				console.error(
					`Failed to connect to Redis after ${maxAttempts} attempts`
				);
				await gracefulExit(1);
			}

			// Wait before retrying (except on the last attempt)
			if (attempt < maxAttempts) {
				console.log(`Retrying in ${RETRY_DELAY}ms...`);
				await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
			}
		}
	}
}

// Initialize Redis connection
async function initializeRedis() {
	// Validate REDIS_URL environment variable
	if (!process.env.REDIS_URL) {
		console.error('REDIS_URL environment variable is not defined');
		await gracefulExit(1);
	}

	// Validate that REDIS_URL is a valid URL
	try {
		new URL(process.env.REDIS_URL);
	} catch (error) {
		console.error('REDIS_URL is not a valid URL:', process.env.REDIS_URL);
		await gracefulExit(1);
	}

	// Initialize connection with retry logic
	try {
		await connectWithRetry();
	} catch (error) {
		console.error('Unexpected error during Redis connection:', error);
		await gracefulExit(1);
	}
}

// Handle Redis client errors
redisClient.on('error', (error) => {
	console.error('Redis client error:', error);
});

// Handle Redis client ready event
redisClient.on('ready', () => {
	console.log('Redis client ready');
});

// Handle Redis client end event
redisClient.on('end', () => {
	console.log('Redis client disconnected');
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
	console.log('Received SIGINT, closing Redis connection...');
	await gracefulExit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', async (error) => {
	console.error('Uncaught Exception:', error);
	await gracefulExit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', async (reason, promise) => {
	console.error('Unhandled Rejection at:', promise, 'reason:', reason);
	await gracefulExit(1);
});

// Start the initialization
initializeRedis().catch(async (error) => {
	console.error('Failed to initialize Redis:', error);
	await gracefulExit(1);
});

module.exports = redisClient;
