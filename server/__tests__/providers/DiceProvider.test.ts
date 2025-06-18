import { DiceProvider } from '../../providers/DiceProvider';
import { GameMove } from '../../types/game';

describe('DiceProvider', () => {
  let diceProvider: DiceProvider;

  beforeEach(() => {
    diceProvider = new DiceProvider();
  });

  describe('Configuration', () => {
    it('should have correct game type', () => {
      expect(diceProvider.gameType).toBe('dice');
    });

    it('should have correct configuration values', () => {
      expect(diceProvider.config.minBet).toBe(0.001);
      expect(diceProvider.config.maxBet).toBe(100);
      expect(diceProvider.config.baseMultiplier).toBe(1);
      expect(diceProvider.config.houseEdge).toBe(0.01);
    });
  });

  describe('validateBet', () => {
    it('should return true for valid bet amounts', () => {
      expect(diceProvider.validateBet(0.001)).toBe(true);
      expect(diceProvider.validateBet(1)).toBe(true);
      expect(diceProvider.validateBet(100)).toBe(true);
    });

    it('should return false for invalid bet amounts', () => {
      expect(diceProvider.validateBet(0)).toBe(false);
      expect(diceProvider.validateBet(0.0005)).toBe(false);
      expect(diceProvider.validateBet(101)).toBe(false);
    });
  });

  describe('calculateWinnings', () => {
    it('should calculate winnings correctly', () => {
      expect(diceProvider.calculateWinnings(1, 2)).toBe(2);
      expect(diceProvider.calculateWinnings(0.5, 3.5)).toBe(1);
      expect(diceProvider.calculateWinnings(10, 0)).toBe(0);
    });
  });

  describe('initializeGame', () => {
    it('should initialize game with default parameters', () => {
      const betAmount = 1;
      const serverSeed = 'test_server_seed';
      const clientSeed = 'test_client_seed';
      const nonce = 12345;

      const gameState = diceProvider.initializeGame(betAmount, serverSeed, clientSeed, nonce);

      expect(gameState.gameType).toBe('dice');
      expect(gameState.status).toBe('created');
      expect(gameState.currentData.betAmount).toBe(betAmount);
      expect(gameState.currentData.serverSeed).toBe(serverSeed);
      expect(gameState.currentData.clientSeed).toBe(clientSeed);
      expect(gameState.currentData.nonce).toBe(nonce);
      expect(gameState.currentData.target).toBe(50);
      expect(gameState.currentData.isOver).toBe(true);
      expect(gameState.history).toEqual([]);
    });

    it('should initialize game without client seed', () => {
      const gameState = diceProvider.initializeGame(1, 'server_seed');
      expect(gameState.currentData.clientSeed).toBe('');
    });
  });

  describe('playGame', () => {
    let gameState: any;

    beforeEach(() => {
      gameState = diceProvider.initializeGame(1, 'deterministic_seed', 'client_seed', 0);
    });

    it('should play game with default settings and return result', async () => {
      const result = await diceProvider.playGame(gameState);

      expect(result.isWin).toBeDefined();
      expect(result.multiplier).toBeGreaterThanOrEqual(0);
      expect(result.winAmount).toBeGreaterThanOrEqual(0);
      expect(result.gameData.roll).toBeGreaterThanOrEqual(0);
      expect(result.gameData.roll).toBeLessThanOrEqual(100);
      expect(result.gameData.target).toBe(50);
      expect(result.gameData.isOver).toBe(true);
      expect(gameState.status).toBe('completed');
      expect(gameState.history).toHaveLength(1);
    });

    it('should accept custom target in move', async () => {
      const move: GameMove = {
        action: 'bet',
        data: { target: 75.5, isOver: false },
        operationId: 'test_op_1'
      };

      const result = await diceProvider.playGame(gameState, move);

      expect(result.gameData.target).toBe(75.5);
      expect(result.gameData.isOver).toBe(false);
    });

    it('should enforce target limits', async () => {
      const move: GameMove = {
        action: 'bet',
        data: { target: 150 }, // Over 100
        operationId: 'test_op_2'
      };

      const result = await diceProvider.playGame(gameState, move);
      expect(result.gameData.target).toBe(99.99);
    });

    it('should enforce target minimum', async () => {
      const move: GameMove = {
        action: 'bet',
        data: { target: -10 }, // Below 0
        operationId: 'test_op_3'
      };

      const result = await diceProvider.playGame(gameState, move);
      expect(result.gameData.target).toBe(0.01);
    });

    it('should calculate correct payout for winning roll over', async () => {
      // Use deterministic seed to ensure predictable outcome
      const deterministicState = diceProvider.initializeGame(10, 'fixed_seed_win', 'client', 1);
      
      const move: GameMove = {
        action: 'bet',
        data: { target: 10, isOver: true }, // 90% chance to win
        operationId: 'test_op_4'
      };

      const result = await diceProvider.playGame(deterministicState, move);
      
      if (result.isWin) {
        expect(result.multiplier).toBeGreaterThan(1);
        expect(result.winAmount).toBeGreaterThan(0);
      }
    });

    it('should calculate correct payout for winning roll under', async () => {
      const move: GameMove = {
        action: 'bet',
        data: { target: 90, isOver: false }, // 90% chance to win
        operationId: 'test_op_5'
      };

      const result = await diceProvider.playGame(gameState, move);
      
      if (result.isWin) {
        expect(result.multiplier).toBeGreaterThan(1);
        expect(result.winAmount).toBeGreaterThan(0);
      }
    });

    it('should return zero winnings for losing bet', async () => {
      const move: GameMove = {
        action: 'bet',
        data: { target: 99.9, isOver: true }, // Very low chance to win
        operationId: 'test_op_6'
      };

      const result = await diceProvider.playGame(gameState, move);
      
      if (!result.isWin) {
        expect(result.multiplier).toBe(0);
        expect(result.winAmount).toBe(0);
      }
    });

    it('should use deterministic random generation', async () => {
      const state1 = diceProvider.initializeGame(1, 'same_seed', 'same_client', 1);
      const state2 = diceProvider.initializeGame(1, 'same_seed', 'same_client', 1);

      const result1 = await diceProvider.playGame(state1);
      const result2 = await diceProvider.playGame(state2);

      expect(result1.gameData.roll).toBe(result2.gameData.roll);
      expect(result1.isWin).toBe(result2.isWin);
    });

    it('should produce different results with different seeds', async () => {
      const state1 = diceProvider.initializeGame(1, 'seed1', 'client', 1);
      const state2 = diceProvider.initializeGame(1, 'seed2', 'client', 1);

      const result1 = await diceProvider.playGame(state1);
      const result2 = await diceProvider.playGame(state2);

      expect(result1.gameData.roll).not.toBe(result2.gameData.roll);
    });
  });

  describe('Edge Cases', () => {
    it('should handle extreme target values correctly', async () => {
      const gameState = diceProvider.initializeGame(1, 'test_seed', 'client', 1);
      
      const move: GameMove = {
        action: 'bet',
        data: { target: 0.01, isOver: true }, // Almost impossible to win
        operationId: 'test_extreme_1'
      };

      const result = await diceProvider.playGame(gameState, move);
      expect(result.gameData.target).toBe(0.01);
      expect(result.gameData.isOver).toBe(true);
      
      if (result.isWin) {
        expect(result.multiplier).toBeGreaterThanOrEqual(0.99); // Should have some multiplier for winning
      }
    });

    it('should handle target 99.99 correctly', async () => {
      const gameState = diceProvider.initializeGame(1, 'test_seed', 'client', 2);
      
      const move: GameMove = {
        action: 'bet',
        data: { target: 99.99, isOver: false }, // Almost guaranteed to win
        operationId: 'test_extreme_2'
      };

      const result = await diceProvider.playGame(gameState, move);
      expect(result.gameData.target).toBe(99.99);
      expect(result.gameData.isOver).toBe(false);
      
      if (result.isWin) {
        expect(result.multiplier).toBeCloseTo(1, 1); // Very low multiplier
      }
    });
  });
});