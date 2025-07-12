const mongoose = require('mongoose');

const connectDB = async () => {
	try {
		const mongoUri = process.env.MONGODB_URI;
		const environment = process.env.NODE_ENV || 'development';

		if (!mongoUri) {
			throw new Error(
				`MONGODB_URI is not defined for environment: ${environment}`
			);
		}

		const conn = await mongoose.connect(mongoUri);

		const dbName = conn.connection.db.databaseName;
		console.log(
			`MongoDB Connected [${environment}]: ${conn.connection.host}/${dbName}`
		);

		// Log collection count for verification
		const collections = await conn.connection.db.listCollections().toArray();
		console.log(`Database collections: ${collections.length} found`);

		return conn;
	} catch (error) {
		console.error('Database connection error:', error);
		if (process.env.NODE_ENV !== 'test') {
			process.exit(1);
		}
		throw error;
	}
};

const disconnectDB = async () => {
	try {
		await mongoose.disconnect();
		console.log('MongoDB disconnected');
	} catch (error) {
		console.error('Database disconnection error:', error);
	}
};

const clearTestDB = async () => {
	if (process.env.NODE_ENV === 'test') {
		// Check if mongoose connection is ready before attempting database operations
		if (mongoose.connection.readyState !== 1) {
			console.log('MongoDB connection not ready, skipping test database clear');
			return;
		}

		try {
			const collections = await mongoose.connection.db
				.listCollections()
				.toArray();

			// Run all deleteMany operations in parallel for better performance
			const clearPromises = collections.map((collection) =>
				mongoose.connection.db.collection(collection.name).deleteMany({})
			);

			await Promise.all(clearPromises);

			console.log('Test database cleared');
		} catch (error) {
			console.error('Error clearing test database:', error);
			// Don't throw the error to avoid breaking tests
		}
	}
};

module.exports = {
	connectDB,
	disconnectDB,
	clearTestDB,
};
