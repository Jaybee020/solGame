# Testing Guide

This project includes comprehensive tests for all gaming features using Jest and MongoDB integration tests.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up test environment:**
   ```bash
   ./scripts/test-setup.sh
   ```

3. **Run all tests:**
   ```bash
   npm test
   ```

## 📁 Test Structure

```
__tests__/
├── setup.ts                     # Test configuration and database setup
├── factories/                   # Data factories for test fixtures
│   ├── user.factory.ts
│   ├── gameSession.factory.ts
│   ├── gameRequest.factory.ts
│   └── GameFactory.test.ts
├── providers/                   # Game provider tests
│   ├── DiceProvider.test.ts
│   ├── SlotsProvider.test.ts
│   └── BlackjackProvider.test.ts
├── services/                    # Service layer tests
│   ├── GameEngine.test.ts
│   └── GameSession.test.ts
├── routes/                      # API endpoint tests
│   └── games.test.ts
└── utils/                       # Utility function tests
    └── secureRandomness.test.ts
```

## 🎯 Test Categories

### Game Provider Tests
- **DiceProvider**: Tests dice game logic, bet validation, random generation
- **SlotsProvider**: Tests slot machine mechanics, paylines, symbol generation
- **BlackjackProvider**: Tests card dealing, game actions (hit/stand/double), dealer logic

### Service Tests
- **GameEngine**: Tests game creation, session management, user authorization
- **GameSession**: Tests CRUD operations, session lifecycle, security features

### API Tests
- **Game Routes**: Tests all REST endpoints with authentication and validation

### Utility Tests
- **Security Functions**: Tests cryptographic random generation and hashing

## 🔧 Running Specific Tests

```bash
# Run tests for a specific provider
npm test -- __tests__/providers/DiceProvider.test.ts

# Run tests for a specific service
npm test -- __tests__/services/GameEngine.test.ts

# Run tests matching a pattern
npm test -- --testNamePattern="should create"

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

## 🗄️ Database Setup

Tests use a real MongoDB instance for integration testing:

- **Test Database**: `solana-cash-machine-test`
- **Auto-cleanup**: Database is cleaned before each test
- **Isolation**: Each test runs in isolation with fresh data

### Requirements

- MongoDB running on `localhost:27017`
- Test database will be created automatically
- All collections are cleaned between tests

## 📊 Test Data

Tests use factories to generate realistic test data:

```typescript
// Create a test user
const user = userFactory.build({
  walletAddress: 'custom_wallet_address'
});

// Create a game session
const session = gameSessionFactory.build({
  userId: user._id,
  gameType: 'dice',
  betAmount: 1.0
});

// Create game requests
const request = createGameRequestFactory.build({
  gameType: 'blackjack',
  betAmount: 5.0
});
```

## 🔐 Authentication Testing

API tests include full authentication flow:

```typescript
// Create authenticated user
const testUser = await UserModel.create(userFactory.build());

// Generate auth token
testUser.generatetoken((err, token) => {
  authToken = token;
});

// Use in requests
await request(app)
  .post('/games/create')
  .set('Authorization', `Bearer ${authToken}`)
  .send(gameRequest);
```

## 🎲 Game Logic Testing

### Dice Game Tests
- Random number generation with seeds
- Win/loss calculation based on target
- Payout multiplier validation
- Edge cases (extreme targets)

### Slots Game Tests
- Reel generation and symbol distribution
- Payline calculation
- Multiple winning combinations
- Deterministic results with same seeds

### Blackjack Game Tests
- Card dealing and shuffling
- Hand value calculation (including aces)
- Player actions (hit, stand, double)
- Dealer logic and outcomes
- Blackjack detection

## 🛡️ Security Testing

- **Replay Protection**: Tests duplicate operation prevention
- **Session Security**: Tests unauthorized access prevention
- **Random Generation**: Tests cryptographic randomness quality
- **Hash Verification**: Tests deterministic hash generation

## 📈 Coverage Goals

Target coverage levels:
- **Overall**: 90%+
- **Critical paths**: 95%+
- **Game logic**: 100%
- **Security functions**: 100%

## 🐛 Debugging Tests

```bash
# Run with verbose output
npm test -- --verbose

# Run single test file
npm test -- __tests__/providers/DiceProvider.test.ts

# Debug specific test
npm test -- --testNamePattern="should validate bet amounts"

# Run with Node debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 🔄 Continuous Integration

Tests are designed to run in CI environments:

- No external dependencies (except MongoDB)
- Deterministic results
- Proper cleanup
- Fast execution (< 30 seconds typical)

## 📝 Test Configuration

Jest configuration in `jest.config.js`:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  testTimeout: 30000,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'services/**/*.ts',
    'providers/**/*.ts',
    'factories/**/*.ts',
    'utils/**/*.ts',
    'routes/**/*.ts'
  ]
};
```

## ⚡ Performance Testing

Some tests include performance validations:

- Random generation speed
- Database operation timing
- Memory usage patterns
- Concurrent request handling

## 🤝 Contributing

When adding new features:

1. Write tests first (TDD approach)
2. Ensure 90%+ coverage
3. Include edge cases
4. Test error conditions
5. Validate security aspects

Example test template:

```typescript
describe('NewFeature', () => {
  beforeEach(async () => {
    // Setup test data
  });

  describe('happy path', () => {
    it('should work correctly', async () => {
      // Test implementation
    });
  });

  describe('edge cases', () => {
    it('should handle edge case', async () => {
      // Edge case testing
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Error testing
    });
  });
});
```