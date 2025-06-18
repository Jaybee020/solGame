import GameFactory from "../../factories/GameFactory";
import { GameType } from "../../types/game";
import { BlackjackProvider } from "../../providers/BlackjackProvider";
import { DiceProvider } from "../../providers/DiceProvider";
import { SlotsProvider } from "../../providers/SlotsProvider";
import { ShipCaptainCrewProvider } from "../../providers/ShipCaptainCrewProvider";

describe("GameFactory", () => {
  describe("getProvider", () => {
    it("should return correct provider for each game type", () => {
      const blackjackProvider = GameFactory.getProvider("blackjack");
      const diceProvider = GameFactory.getProvider("dice");
      const slotsProvider = GameFactory.getProvider("slots");
      const shipCaptainCrewProvider = GameFactory.getProvider("shipcaptaincrew");

      expect(blackjackProvider).toBeInstanceOf(BlackjackProvider);
      expect(diceProvider).toBeInstanceOf(DiceProvider);
      expect(slotsProvider).toBeInstanceOf(SlotsProvider);
      expect(shipCaptainCrewProvider).toBeInstanceOf(ShipCaptainCrewProvider);

      expect(blackjackProvider.gameType).toBe("blackjack");
      expect(diceProvider.gameType).toBe("dice");
      expect(slotsProvider.gameType).toBe("slots");
      expect(shipCaptainCrewProvider.gameType).toBe("shipcaptaincrew");
    });

    it("should throw error for invalid game type", () => {
      expect(() => {
        GameFactory.getProvider("invalid_game" as GameType);
      }).toThrow("Game provider not found for type: invalid_game");
    });

    it("should return same instance on multiple calls", () => {
      const provider1 = GameFactory.getProvider("blackjack");
      const provider2 = GameFactory.getProvider("blackjack");

      expect(provider1).toBe(provider2);
    });
  });

  describe("getSupportedGames", () => {
    it("should return all supported game types", () => {
      const supportedGames = GameFactory.getSupportedGames();

      expect(supportedGames).toContain("blackjack");
      expect(supportedGames).toContain("dice");
      expect(supportedGames).toContain("slots");
      expect(supportedGames).toContain("shipcaptaincrew");
      expect(supportedGames).toHaveLength(4);
    });

    it("should return array of valid game types", () => {
      const supportedGames = GameFactory.getSupportedGames();

      supportedGames.forEach((gameType) => {
        expect(["blackjack", "dice", "slots", "shipcaptaincrew"]).toContain(gameType);
      });
    });
  });

  describe("validateGameType", () => {
    it("should return true for valid game types", () => {
      expect(GameFactory.validateGameType("blackjack")).toBe(true);
      expect(GameFactory.validateGameType("dice")).toBe(true);
      expect(GameFactory.validateGameType("slots")).toBe(true);
      expect(GameFactory.validateGameType("shipcaptaincrew")).toBe(true);
    });

    it("should return false for invalid game types", () => {
      expect(GameFactory.validateGameType("poker")).toBe(false);
      expect(GameFactory.validateGameType("roulette")).toBe(false);
      expect(GameFactory.validateGameType("invalid")).toBe(false);
      expect(GameFactory.validateGameType("")).toBe(false);
      expect(GameFactory.validateGameType("BLACKJACK")).toBe(false); // Case sensitive
    });

    it("should handle edge cases", () => {
      expect(GameFactory.validateGameType(null as any)).toBe(false);
      expect(GameFactory.validateGameType(undefined as any)).toBe(false);
      expect(GameFactory.validateGameType(123 as any)).toBe(false);
      expect(GameFactory.validateGameType({} as any)).toBe(false);
    });
  });

  describe("getGameConfig", () => {
    it("should return correct config for each game type", () => {
      const blackjackConfig = GameFactory.getGameConfig("blackjack");
      const diceConfig = GameFactory.getGameConfig("dice");
      const slotsConfig = GameFactory.getGameConfig("slots");
      const shipCaptainCrewConfig = GameFactory.getGameConfig("shipcaptaincrew");

      // Test blackjack config
      expect(blackjackConfig.minBet).toBe(0.01);
      expect(blackjackConfig.maxBet).toBe(100);
      expect(blackjackConfig.baseMultiplier).toBe(2);
      expect(blackjackConfig.houseEdge).toBe(0.005);

      // Test dice config
      expect(diceConfig.minBet).toBe(0.001);
      expect(diceConfig.maxBet).toBe(100);
      expect(diceConfig.baseMultiplier).toBe(1);
      expect(diceConfig.houseEdge).toBe(0.01);

      // Test slots config
      expect(slotsConfig.minBet).toBe(0.01);
      expect(slotsConfig.maxBet).toBe(50);
      expect(slotsConfig.baseMultiplier).toBe(1);
      expect(slotsConfig.houseEdge).toBe(0.03); // Updated for 97% RTP

      // Test shipcaptaincrew config
      expect(shipCaptainCrewConfig.minBet).toBe(0.01);
      expect(shipCaptainCrewConfig.maxBet).toBe(100);
      expect(shipCaptainCrewConfig.baseMultiplier).toBe(1);
      expect(shipCaptainCrewConfig.houseEdge).toBe(0.05);
    });

    it("should throw error for invalid game type", () => {
      expect(() => {
        GameFactory.getGameConfig("invalid_game" as GameType);
      }).toThrow("Game provider not found for type: invalid_game");
    });

    it("should return config with all required properties", () => {
      const supportedGames = GameFactory.getSupportedGames();

      supportedGames.forEach((gameType) => {
        const config = GameFactory.getGameConfig(gameType);

        expect(config).toHaveProperty("minBet");
        expect(config).toHaveProperty("maxBet");
        expect(config).toHaveProperty("baseMultiplier");
        expect(config).toHaveProperty("houseEdge");

        expect(typeof config.minBet).toBe("number");
        expect(typeof config.maxBet).toBe("number");
        expect(typeof config.baseMultiplier).toBe("number");
        expect(typeof config.houseEdge).toBe("number");

        expect(config.minBet).toBeGreaterThan(0);
        expect(config.maxBet).toBeGreaterThan(config.minBet);
        expect(config.baseMultiplier).toBeGreaterThan(0);
        expect(config.houseEdge).toBeGreaterThanOrEqual(0);
        expect(config.houseEdge).toBeLessThan(1);
      });
    });
  });

  describe("registerProvider", () => {
    it("should be able to register a new provider", () => {
      // Create a mock provider
      const mockProvider = {
        gameType: "test_game" as GameType,
        config: {
          minBet: 0.1,
          maxBet: 10,
          baseMultiplier: 1.5,
          houseEdge: 0.02,
        },
        validateBet: jest.fn(),
        calculateWinnings: jest.fn(),
        initializeGame: jest.fn(),
        playGame: jest.fn(),
      };

      // Register the provider
      GameFactory.registerProvider(mockProvider);

      // Verify it was registered
      expect(GameFactory.validateGameType("test_game")).toBe(true);
      expect(GameFactory.getSupportedGames()).toContain("test_game");

      const retrievedProvider = GameFactory.getProvider(
        "test_game" as GameType
      );
      expect(retrievedProvider).toBe(mockProvider);

      const retrievedConfig = GameFactory.getGameConfig(
        "test_game" as GameType
      );
      expect(retrievedConfig).toEqual(mockProvider.config);
    });

    it("should overwrite existing provider when registering with same game type", () => {
      const originalProvider = GameFactory.getProvider("dice");

      // Create new provider with same game type
      const newProvider = {
        gameType: "dice" as GameType,
        config: {
          minBet: 1,
          maxBet: 50,
          baseMultiplier: 2,
          houseEdge: 0.05,
        },
        validateBet: jest.fn(),
        calculateWinnings: jest.fn(),
        initializeGame: jest.fn(),
        playGame: jest.fn(),
      };

      GameFactory.registerProvider(newProvider);

      const retrievedProvider = GameFactory.getProvider("dice");
      expect(retrievedProvider).toBe(newProvider);
      expect(retrievedProvider).not.toBe(originalProvider);

      // Cleanup - restore original provider
      GameFactory.registerProvider(new DiceProvider());
    });
  });

  describe("Integration", () => {
    it("should have all providers properly initialized on startup", () => {
      const supportedGames = GameFactory.getSupportedGames();

      // Should have exactly the expected games
      expect(supportedGames).toHaveLength(5);
      expect(supportedGames).toEqual(
        expect.arrayContaining(["blackjack", "dice", "slots", "shipcaptaincrew", "test_game"])
      );

      // Each provider should be properly configured
      supportedGames.forEach((gameType) => {
        const provider = GameFactory.getProvider(gameType);
        const config = GameFactory.getGameConfig(gameType);

        // Provider should have all required methods
        expect(typeof provider.validateBet).toBe("function");
        expect(typeof provider.calculateWinnings).toBe("function");
        expect(typeof provider.initializeGame).toBe("function");
        expect(typeof provider.playGame).toBe("function");

        // Provider's gameType should match
        expect(provider.gameType).toBe(gameType);

        // Provider's config should match retrieved config
        expect(provider.config).toEqual(config);
      });
    });

    it("should provide consistent interface across all providers", () => {
      const supportedGames = GameFactory.getSupportedGames();

      supportedGames
        .filter((games) => games !== ("test_game" as any))
        .forEach((gameType) => {
          const provider = GameFactory.getProvider(gameType);

          // Test bet validation
          expect(provider.validateBet(provider.config.minBet)).toBe(true);
          expect(provider.validateBet(provider.config.maxBet)).toBe(true);
          expect(provider.validateBet(provider.config.minBet - 0.001)).toBe(
            false
          );
          expect(provider.validateBet(provider.config.maxBet + 0.001)).toBe(
            false
          );

          // Test winnings calculation
          expect(provider.calculateWinnings(10, 2)).toBe(20);
          expect(provider.calculateWinnings(5, 0)).toBe(0);

          // Test game initialization
          const gameState = provider.initializeGame(
            1,
            "test_seed",
            "client_seed",
            12345
          );
          expect(gameState.gameType).toBe(gameType);
          expect(gameState.status).toMatch(/created|in_progress/);
          expect(gameState.currentData).toBeDefined();
          expect(gameState.history).toEqual([]);
        });
    });

    it("should handle concurrent access correctly", () => {
      // Simulate multiple concurrent requests for providers
      const promises = [];
      const gameTypes: GameType[] = ["blackjack", "dice", "slots", "shipcaptaincrew"];

      for (let i = 0; i < 100; i++) {
        const gameType = gameTypes[i % gameTypes.length];
        promises.push(Promise.resolve(GameFactory.getProvider(gameType)));
      }

      return Promise.all(promises).then((providers) => {
        // All providers should be valid
        providers.forEach((provider, index) => {
          const expectedGameType = gameTypes[index % gameTypes.length];
          expect(provider.gameType).toBe(expectedGameType);
        });

        // Providers of same type should be identical instances
        const blackjackProviders = providers.filter(
          (p) => p.gameType === "blackjack"
        );
        const firstBlackjackProvider = blackjackProviders[0];
        blackjackProviders.forEach((provider) => {
          expect(provider).toBe(firstBlackjackProvider);
        });
      });
    });
  });

  describe("Error Handling", () => {
    it("should fail to initialise for invalid providers", () => {
      const invalidProviders = [
        null,
        undefined,
        {},
        { gameType: "invalid" }, // Missing required methods
        { config: {} }, // Missing gameType
      ];

      invalidProviders.forEach((invalidProvider) => {
        expect(() => {
          GameFactory.registerProvider(invalidProvider as any);
        }).toThrow(); // Should not crash the factory
      });
    });

    it("should maintain state integrity after errors", () => {
      const originalSupportedGames = GameFactory.getSupportedGames();

      try {
        GameFactory.registerProvider(null as any);
      } catch (error) {
        // Should not affect existing providers
      }

      const currentSupportedGames = GameFactory.getSupportedGames();
      expect(currentSupportedGames).toEqual(originalSupportedGames);

      // Original providers should still work
      currentSupportedGames.forEach((gameType) => {
        expect(() => GameFactory.getProvider(gameType)).not.toThrow();
      });
    });
  });
});
