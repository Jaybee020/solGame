import { ShipCaptainCrewProvider } from "../../providers/ShipCaptainCrewProvider";
import { GameState } from "../../types/game";

describe("ShipCaptainCrewProvider", () => {
  let provider: ShipCaptainCrewProvider;

  beforeEach(() => {
    provider = new ShipCaptainCrewProvider();
  });

  describe("Game Configuration", () => {
    it("should have correct game type", () => {
      expect(provider.gameType).toBe("shipcaptaincrew");
    });

    it("should have correct configuration", () => {
      expect(provider.config.minBet).toBe(0.01);
      expect(provider.config.maxBet).toBe(100);
      expect(provider.config.baseMultiplier).toBe(1);
      expect(provider.config.houseEdge).toBe(0.05);
    });
  });

  describe("Game Initialization", () => {
    it("should initialize game with correct default values", () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);

      expect(gameState.gameType).toBe("shipcaptaincrew");
      expect(gameState.status).toBe("in_progress");
      expect(gameState.history).toEqual([]);

      const gameData = gameState.currentData;
      expect(gameData.betAmount).toBe(1);
      expect(gameData.serverSeed).toBe("test_server_seed");
      expect(gameData.clientSeed).toBe("test_client_seed");
      expect(gameData.nonce).toBe(12345);
      expect(gameData.rollNumber).toBe(0);
      expect(gameData.hasShip).toBe(false);
      expect(gameData.hasCaptain).toBe(false);
      expect(gameData.hasCrew).toBe(false);
      expect(gameData.cargoSum).toBe(0);
      expect(gameData.gamePhase).toBe("rolling");
      expect(gameData.maxRolls).toBe(3);
      expect(gameData.rolls).toEqual([]);
    });
  });

  describe("Game Logic", () => {
    it("should handle auto-play correctly", async () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);
      
      const result = await provider.playGame(gameState);

      expect(result).toBeDefined();
      expect(result.gameData).toBeDefined();
      expect(result.gameData.rolls).toBeDefined();
      expect(result.outcome).toBeDefined();
      expect(typeof result.isWin).toBe("boolean");
      expect(typeof result.multiplier).toBe("number");
      expect(typeof result.winAmount).toBe("number");
    });

    it("should validate bet amounts", () => {
      expect(provider.validateBet(0.01)).toBe(true);
      expect(provider.validateBet(100)).toBe(true);
      expect(provider.validateBet(0.005)).toBe(false);
      expect(provider.validateBet(101)).toBe(false);
    });

    it("should calculate winnings correctly", () => {
      expect(provider.calculateWinnings(10, 0)).toBe(0);
      expect(provider.calculateWinnings(10, 1)).toBe(10);
      expect(provider.calculateWinnings(10, 2)).toBe(20);
      expect(provider.calculateWinnings(10, 4)).toBe(40);
      expect(provider.calculateWinnings(10, 8)).toBe(80);
    });
  });

  describe("Multiplier Calculation", () => {
    it("should return 0 multiplier when missing ship, captain, or crew", () => {
      const testCases = [
        { hasShip: false, hasCaptain: false, hasCrew: false, cargoSum: 12, expected: 0 },
        { hasShip: true, hasCaptain: false, hasCrew: false, cargoSum: 12, expected: 0 },
        { hasShip: true, hasCaptain: true, hasCrew: false, cargoSum: 12, expected: 0 },
      ];

      testCases.forEach(({ hasShip, hasCaptain, hasCrew, cargoSum, expected }) => {
        const result = (provider as any).calculateMultiplier(cargoSum, hasShip, hasCaptain, hasCrew);
        expect(result).toBe(expected);
      });
    });

    it("should return correct multipliers for different cargo sums", () => {
      const testCases = [
        { cargoSum: 12, expected: 8 }, // Perfect score
        { cargoSum: 11, expected: 4 }, // High score
        { cargoSum: 10, expected: 4 }, // High score
        { cargoSum: 9, expected: 2 },  // Good score
        { cargoSum: 8, expected: 2 },  // Good score
        { cargoSum: 7, expected: 2 },  // Good score
        { cargoSum: 6, expected: 1 },  // Regular
        { cargoSum: 2, expected: 1 },  // Regular (minimum possible)
      ];

      testCases.forEach(({ cargoSum, expected }) => {
        const result = (provider as any).calculateMultiplier(cargoSum, true, true, true);
        expect(result).toBe(expected);
      });
    });
  });

  describe("Dice Rolling", () => {
    it("should generate consistent dice rolls with same seeds", () => {
      const dice1 = (provider as any).rollDice("test_seed", "client_seed", 1, 5);
      const dice2 = (provider as any).rollDice("test_seed", "client_seed", 1, 5);

      expect(dice1).toEqual(dice2);
      expect(dice1).toHaveLength(5);
      dice1.forEach((die: number) => {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      });
    });

    it("should generate different dice rolls with different seeds", () => {
      const dice1 = (provider as any).rollDice("test_seed_1", "client_seed", 1, 5);
      const dice2 = (provider as any).rollDice("test_seed_2", "client_seed", 1, 5);

      expect(dice1).not.toEqual(dice2);
    });

    it("should generate different dice rolls with different nonces", () => {
      const dice1 = (provider as any).rollDice("test_seed", "client_seed", 1, 5);
      const dice2 = (provider as any).rollDice("test_seed", "client_seed", 2, 5);

      expect(dice1).not.toEqual(dice2);
    });
  });

  describe("Game Flow", () => {
    it("should process rolls in correct order (ship, captain, crew)", () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);
      const gameData = gameState.currentData;

      // Mock a roll with ship, captain, crew, and cargo
      const mockDice = [6, 5, 4, 3, 2]; // Ship, Captain, Crew, and cargo dice
      (provider as any).processRoll(mockDice, gameData);

      expect(gameData.hasShip).toBe(true);
      expect(gameData.hasCaptain).toBe(true);
      expect(gameData.hasCrew).toBe(true);
      expect(gameData.cargoSum).toBe(5); // 3 + 2
    });

    it("should not assign captain without ship", () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);
      const gameData = gameState.currentData;

      // Mock a roll with captain but no ship
      const mockDice = [5, 4, 3, 2, 1]; // Captain, Crew, but no Ship
      (provider as any).processRoll(mockDice, gameData);

      expect(gameData.hasShip).toBe(false);
      expect(gameData.hasCaptain).toBe(false);
      expect(gameData.hasCrew).toBe(false);
      expect(gameData.cargoSum).toBe(0);
    });

    it("should not assign crew without captain", () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);
      const gameData = gameState.currentData;

      // First roll: get ship
      gameData.hasShip = true;
      
      // Mock a roll with crew but no captain
      const mockDice = [4, 3, 2, 1, 1]; // Crew, but no Captain
      (provider as any).processRoll(mockDice, gameData);

      expect(gameData.hasShip).toBe(true);
      expect(gameData.hasCaptain).toBe(false);
      expect(gameData.hasCrew).toBe(false);
      expect(gameData.cargoSum).toBe(0);
    });

    it("should track cargo sum correctly", () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);
      const gameData = gameState.currentData;

      // Setup with ship, captain, crew already obtained
      gameData.hasShip = true;
      gameData.hasCaptain = true;
      gameData.hasCrew = true;
      gameData.cargoSum = 5; // Previous cargo sum

      // Mock a roll with better cargo - all 5 dice will be used for cargo since ship/captain/crew are already obtained
      const mockDice = [1, 2, 3, 6, 6]; // All dice are cargo: 1 + 2 + 3 + 6 + 6 = 18
      (provider as any).processRoll(mockDice, gameData);

      expect(gameData.cargoSum).toBe(18); // Should update to better sum (all dice used as cargo)
    });
  });
});