#!/bin/bash

# Test database setup script for MongoDB
DB_NAME="solana-cash-machine-test"
MONGO_URI="mongodb://localhost:27017/$DB_NAME"

echo "🧪 Setting up test environment..."

# Check if MongoDB is running
if ! pgrep -x "mongod" > /dev/null; then
    echo "❌ MongoDB is not running. Please start MongoDB first."
    echo "   You can start it with: brew services start mongodb/brew/mongodb-community"
    echo "   Or: sudo systemctl start mongod"
    exit 1
fi

# Test MongoDB connection
echo "🔌 Testing MongoDB connection..."
if mongosh --eval "db.adminCommand('ping')" --quiet; then
    echo "✅ MongoDB connection successful"
else
    echo "❌ Failed to connect to MongoDB"
    exit 1
fi

# Create test database (will be created automatically on first write)
echo "🗄️  Preparing test database: $DB_NAME"

# Drop existing test database to start fresh
mongosh $MONGO_URI --eval "db.dropDatabase()" --quiet

echo "✅ Test database prepared"

# Set environment variables for testing
export NODE_ENV=test
export MONGO_TEST_URI=$MONGO_URI

echo "🌍 Environment variables set:"
echo "   NODE_ENV=$NODE_ENV"
echo "   MONGO_TEST_URI=$MONGO_TEST_URI"

echo "🎯 Test environment ready!"
echo ""
echo "You can now run tests with:"
echo "   npm test"
echo ""
echo "Or run specific test files with:"
echo "   npm test -- __tests__/providers/DiceProvider.test.ts"
echo "   npm test -- __tests__/services/GameEngine.test.ts"
echo "   npm test -- --testNamePattern=\"should create a new game session\""