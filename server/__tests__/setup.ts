import mongoose from 'mongoose';
import dotenv from 'dotenv';
import 'jest-extended';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// MongoDB Memory Server or test database setup
const MONGO_TEST_URI = process.env.MONGO_TEST_URI || 'mongodb://localhost:27017/solana-cash-machine-test';

beforeAll(async () => {
  // Connect to test database
  await mongoose.connect(MONGO_TEST_URI);
});

beforeEach(async () => {
  // Clean up all collections before each test
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

afterAll(async () => {
  // Close database connection after all tests
  await mongoose.connection.close();
});

// Increase timeout for database operations
jest.setTimeout(30000);