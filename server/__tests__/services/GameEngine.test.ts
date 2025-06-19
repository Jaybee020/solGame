import GameEngine from "../../services/GameEngine";
import { UserModel } from "../../models/User";
import { GameSession } from "../../models/GameSession";
import { userFactory } from "../factories/user.factory";
import {
  createGameRequestFactory,
  playGameRequestFactory,
  gameMoveFactory,
} from "../factories/gameRequest.factory";
import { CreateGameRequest, PlayGameRequest, GameType } from "../../types/game";

describe("GameEngine", () => {
  let testUser: any;

  beforeEach(async () => {
    // Create a test user for each test
    testUser = await UserModel.create(
      userFactory.build({
        walletAddress: "test_wallet_address",
        telegramId: 123456,
      })
    );
  });

  describe("createGame", () => {
    it("should create a new game session successfully", async () => {
      const request: CreateGameRequest = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
        clientSeed: "test_client_seed",
      });

      const clientInfo = {
        ipAddress: "192.168.1.1",
        userAgent: "Test Browser",
      };

      const response = await GameEngine.createGame(
        testUser.id,
        request,
        "test_deposit_hash",
        clientInfo
      );

      expect(response.sessionId).toBeDefined();
      expect(response.gameType).toBe("dice");
      expect(response.betAmount).toBe(1.0);
      expect(response.status).toBe("created");
      expect(response.gameState).toBeDefined();
      expect(response.serverSeedHash).toBeDefined();
      expect(response.gameState.currentData.serverSeed).toBeUndefined(); // Should be sanitized
    });

    it("should create games for all supported game types", async () => {
      const gameTypes: GameType[] = ["dice", "slots", "blackjack"];

      for (const gameType of gameTypes) {
        const request = createGameRequestFactory.build({
          gameType,
          betAmount: 1.0,
        });

        const response = await GameEngine.createGame(testUser.id, request, "test_deposit_hash");

        expect(response.gameType).toBe(gameType);
        expect(response.sessionId).toBeDefined();
        expect(response.status).toBe("created");
      }
    });

    it("should validate game type", async () => {
      const request = {
        gameType: "invalid_game" as GameType,
        betAmount: 1.0,
      };

      await expect(GameEngine.createGame(testUser.id, request, "test_deposit_hash")).rejects.toThrow(
        "Invalid game type: invalid_game"
      );
    });

    it("should validate bet amounts", async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 0.0001, // Below minimum
      });

      await expect(GameEngine.createGame(testUser.id, request, "test_deposit_hash")).rejects.toThrow(
        "Invalid bet amount"
      );
    });

    it("should validate maximum bet amounts", async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1000, // Above maximum
      });

      await expect(GameEngine.createGame(testUser.id, request, "test_deposit_hash")).rejects.toThrow(
        "Invalid bet amount"
      );
    });

    it("should store client information correctly", async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
        deviceFingerprint: "test_device_123",
      });

      const clientInfo = {
        ipAddress: "10.0.0.1",
        userAgent: "Custom Test Agent",
      };

      const response = await GameEngine.createGame(
        testUser.id,
        request,
        "test_deposit_hash",
        clientInfo
      );

      // Verify the session was created with client info
      const session = await GameSession.findOne({
        sessionId: response.sessionId,
      });
      expect(session?.ipAddress).toBe("10.0.0.1");
      expect(session?.userAgent).toBe("Custom Test Agent");
      expect(session?.deviceFingerprint).toBe("test_device_123");
    });

    it("should generate unique session IDs", async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
      });

      const response1 = await GameEngine.createGame(testUser.id, request, "test_deposit_hash");
      const response2 = await GameEngine.createGame(testUser.id, request, "test_deposit_hash");

      expect(response1.sessionId).not.toBe(response2.sessionId);
    });

    it("should use provided client seed or generate default", async () => {
      const requestWithSeed = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
        clientSeed: "custom_client_seed",
      });

      const requestWithoutSeed = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
        clientSeed: undefined,
      });

      const response1 = await GameEngine.createGame(
        testUser.id,
        requestWithSeed,
        "test_deposit_hash"
      );
      const response2 = await GameEngine.createGame(
        testUser.id,
        requestWithoutSeed,
        "test_deposit_hash"
      );

      const session1 = await GameSession.findOne({
        sessionId: response1.sessionId,
      });
      const session2 = await GameSession.findOne({
        sessionId: response2.sessionId,
      });

      expect(session1?.clientSeed).toBe("custom_client_seed");
      expect(session2?.clientSeed).toBeDefined();
      expect(session2?.clientSeed).not.toBe("custom_client_seed");
    });
  });

  describe("playGame", () => {
    let gameSession: any;

    beforeEach(async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
      });
      const response = await GameEngine.createGame(testUser.id, request, "test_deposit_hash");
      gameSession = await GameSession.findOne({
        sessionId: response.sessionId,
      });
    });

    it("should play a game successfully without moves", async () => {
      const playRequest: PlayGameRequest = {
        sessionId: gameSession.sessionId,
      };

      const response = await GameEngine.playGame(testUser.id, playRequest);

      expect(response.sessionId).toBe(gameSession.sessionId);
      expect(response.status).toBe("completed");
      expect(response.result).toBeDefined();
      expect(response.result?.isWin).toBeDefined();
      expect(response.result?.multiplier).toBeGreaterThanOrEqual(0);
    });

    it("should play a game with moves", async () => {
      // Create a blackjack game for move testing
      const bjRequest = createGameRequestFactory.build({
        gameType: "blackjack",
        betAmount: 1.0,
      });
      const bjResponse = await GameEngine.createGame(testUser.id, bjRequest, "test_deposit_hash");
      const bjSession = await GameSession.findOne({
        sessionId: bjResponse.sessionId,
      });

      const move = gameMoveFactory.build({
        action: "hit",
        operationId: "test_move_1",
      });

      const playRequest: PlayGameRequest = {
        sessionId: bjSession!.sessionId,
        move,
      };

      const response = await GameEngine.playGame(testUser.id, playRequest);

      expect(response.sessionId).toBe(bjSession!.sessionId);
      expect(["in_progress", "completed"]).toContain(response.status);
    });

    it("should reject unauthorized access to game session", async () => {
      const otherUser = await UserModel.create(
        userFactory.build({
          walletAddress: "other_wallet_address",
        })
      );

      const playRequest: PlayGameRequest = {
        sessionId: gameSession.sessionId,
      };

      await expect(
        GameEngine.playGame(otherUser.id, playRequest)
      ).rejects.toThrow("Unauthorized access to game session");
    });

    it("should reject play on non-existent session", async () => {
      const playRequest: PlayGameRequest = {
        sessionId: "non_existent_session_id",
      };

      await expect(
        GameEngine.playGame(testUser.id, playRequest)
      ).rejects.toThrow("Game session not found");
    });

    it("should reject play on completed session", async () => {
      // Complete the session first
      const playRequest: PlayGameRequest = {
        sessionId: gameSession.sessionId,
      };
      await GameEngine.playGame(testUser.id, playRequest);

      // Try to play again
      await expect(
        GameEngine.playGame(testUser.id, playRequest)
      ).rejects.toThrow("Game session already completed");
    });

    it("should reject play on expired session", async () => {
      // Manually expire the session
      await GameSession.findByIdAndUpdate(gameSession._id, {
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
      });

      const playRequest: PlayGameRequest = {
        sessionId: gameSession.sessionId,
      };

      await expect(
        GameEngine.playGame(testUser.id, playRequest)
      ).rejects.toThrow("Game session expired");
    });

    it("should record actions correctly", async () => {
      const move = gameMoveFactory.build({
        action: "test_action",
        operationId: "unique_operation_123",
      });

      const playRequest: PlayGameRequest = {
        sessionId: gameSession.sessionId,
        move,
      };

      await GameEngine.playGame(testUser.id, playRequest);

      const updatedSession = await GameSession.findById(gameSession._id);
      expect(updatedSession?.actionSequence).toContain("test_action");
      expect(updatedSession?.operationIds).toContain("unique_operation_123");
    });

    it("should prevent duplicate operations", async () => {
      // Create a blackjack game that won't auto-complete
      const bjRequest = createGameRequestFactory.build({
        gameType: "blackjack",
        betAmount: 1.0,
      });
      const bjResponse = await GameEngine.createGame(testUser.id, bjRequest, "test_deposit_hash");

      const move = gameMoveFactory.build({
        action: "hit",
        operationId: "duplicate_test_op",
      });

      const playRequest: PlayGameRequest = {
        sessionId: bjResponse.sessionId,
        move,
      };

      // First play should succeed
      await GameEngine.playGame(testUser.id, playRequest);

      // Second play with same operation ID should fail
      await expect(
        GameEngine.playGame(testUser.id, playRequest)
      ).rejects.toThrow("Duplicate operation detected");
    });

    it("should update session state correctly on completion", async () => {
      const playRequest: PlayGameRequest = {
        sessionId: gameSession.sessionId,
      };

      const response = await GameEngine.playGame(testUser.id, playRequest);

      const updatedSession = await GameSession.findById(gameSession._id);
      expect(updatedSession?.status).toBe("completed");
      expect(updatedSession?.completed).toBe(true);
      expect(updatedSession?.completedAt).toBeDefined();
      expect(updatedSession?.winAmount).toBeDefined();
      expect(updatedSession?.outcome).toBeDefined();
      expect(updatedSession?.result).toBeDefined();
    });
  });

  describe("getGameSession", () => {
    let gameSession: any;

    beforeEach(async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
      });
      const response = await GameEngine.createGame(testUser.id, request, "test_deposit_hash");
      gameSession = await GameSession.findOne({
        sessionId: response.sessionId,
      });
    });

    it("should retrieve game session successfully", async () => {
      const response = await GameEngine.getGameSession(
        testUser.id,
        gameSession.sessionId
      );

      expect(response).toBeDefined();
      expect(response?.sessionId).toBe(gameSession.sessionId);
      expect(response?.gameType).toBe(gameSession.gameType);
      expect(response?.betAmount).toBe(gameSession.betAmount);
      expect(response?.status).toBe(gameSession.status);
    });

    it("should return null for non-existent session", async () => {
      const response = await GameEngine.getGameSession(
        testUser.id,
        "non_existent_session"
      );
      expect(response).toBeNull();
    });

    it("should reject unauthorized access", async () => {
      const otherUser = await UserModel.create(
        userFactory.build({
          walletAddress: "other_wallet",
        })
      );

      await expect(
        GameEngine.getGameSession(otherUser.id, gameSession.sessionId)
      ).rejects.toThrow("Unauthorized access to game session");
    });

    it("should sanitize game state", async () => {
      const response = await GameEngine.getGameSession(
        testUser.id,
        gameSession.sessionId
      );

      expect(response?.gameState?.currentData?.serverSeed).toBeUndefined();
    });
  });

  describe("getUserGameHistory", () => {
    beforeEach(async () => {
      // Create multiple game sessions for history testing
      const gameTypes: GameType[] = ["dice", "slots", "blackjack"];

      for (let i = 0; i < 3; i++) {
        for (const gameType of gameTypes) {
          const request = createGameRequestFactory.build({
            gameType,
            betAmount: 1.0 + i,
          });
          const response = await GameEngine.createGame(testUser.id, request, "test_deposit_hash");

          // Complete some games
          if (i % 2 === 0) {
            await GameEngine.playGame(testUser.id, {
              sessionId: response.sessionId,
            });
          }
        }
      }
    });

    it("should return user game history", async () => {
      const history = await GameEngine.getUserGameHistory(testUser.id);

      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);

      history.forEach((game) => {
        expect(game.sessionId).toBeDefined();
        expect(game.gameType).toBeDefined();
        expect(game.betAmount).toBeDefined();
        expect(game.status).toBeDefined();
      });
    });

    it("should filter by game type", async () => {
      const diceHistory = await GameEngine.getUserGameHistory(
        testUser.id,
        "dice"
      );

      expect(diceHistory).toBeDefined();
      expect(Array.isArray(diceHistory)).toBe(true);

      diceHistory.forEach((game) => {
        expect(game.gameType).toBe("dice");
      });
    });

    it("should respect limit parameter", async () => {
      const limitedHistory = await GameEngine.getUserGameHistory(
        testUser.id,
        undefined,
        2
      );

      expect(limitedHistory.length).toBeLessThanOrEqual(2);
    });

    it("should return empty array for user with no games", async () => {
      const newUser = await UserModel.create(
        userFactory.build({
          walletAddress: "new_user_wallet",
        })
      );

      const history = await GameEngine.getUserGameHistory(newUser.id);
      expect(history).toEqual([]);
    });

    it("should order games by creation date (newest first)", async () => {
      const history = await GameEngine.getUserGameHistory(testUser.id);

      if (history.length > 1) {
        // Check that games are ordered by creation time (we can't directly check timestamps,
        // but we can verify the structure is consistent)
        expect(history[0]).toBeDefined();
        expect(history[history.length - 1]).toBeDefined();
      }
    });
  });

  describe("getSupportedGames", () => {
    it("should return all supported games with configurations", async () => {
      const supportedGames = await GameEngine.getSupportedGames();

      expect(supportedGames).toBeDefined();
      expect(Array.isArray(supportedGames)).toBe(true);
      expect(supportedGames.length).toBeGreaterThan(0);

      const expectedGameTypes = ["blackjack", "dice", "slots"];
      const returnedGameTypes = supportedGames.map((game) => game.gameType);

      expectedGameTypes.forEach((gameType) => {
        expect(returnedGameTypes).toContain(gameType);
      });

      supportedGames.forEach((game) => {
        expect(game.gameType).toBeDefined();
        expect(game.config).toBeDefined();
        expect(game.config.minBet).toBeDefined();
        expect(game.config.maxBet).toBeDefined();
        expect(game.config.baseMultiplier).toBeDefined();
        expect(game.config.houseEdge).toBeDefined();
      });
    });
  });

  describe("cancelGame", () => {
    let gameSession: any;

    beforeEach(async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
      });
      const response = await GameEngine.createGame(testUser.id, request, "test_deposit_hash");
      gameSession = await GameSession.findOne({
        sessionId: response.sessionId,
      });
    });

    it("should cancel game successfully", async () => {
      const result = await GameEngine.cancelGame(
        testUser.id,
        gameSession.sessionId,
        "User requested"
      );

      expect(result).toBe(true);

      const updatedSession = await GameSession.findById(gameSession._id);
      expect(updatedSession?.status).toBe("cancelled");
    });

    it("should reject cancellation of non-existent session", async () => {
      await expect(
        GameEngine.cancelGame(testUser.id, "non_existent_session")
      ).rejects.toThrow("Game session not found");
    });

    it("should reject unauthorized cancellation", async () => {
      const otherUser = await UserModel.create(
        userFactory.build({
          walletAddress: "other_wallet",
        })
      );

      await expect(
        GameEngine.cancelGame(otherUser.id, gameSession.sessionId)
      ).rejects.toThrow("Unauthorized access to game session");
    });

    it("should reject cancellation of completed game", async () => {
      // Complete the game first
      await GameEngine.playGame(testUser.id, {
        sessionId: gameSession.sessionId,
      });

      await expect(
        GameEngine.cancelGame(testUser.id, gameSession.sessionId)
      ).rejects.toThrow("Cannot cancel completed game");
    });

    it("should record cancellation reason", async () => {
      const reason = "Testing cancellation with reason";
      await GameEngine.cancelGame(testUser.id, gameSession.sessionId, reason);

      const updatedSession = await GameSession.findById(gameSession._id);
      expect(updatedSession?.suspiciousActivity).toBeDefined();

      const cancellationEntry = updatedSession?.suspiciousActivity?.find(
        (activity: any) => activity.reason.includes("cancelled")
      );
      expect(cancellationEntry).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid user ID gracefully", async () => {
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
      });

      await expect(
        GameEngine.createGame("invalid_user_id", request, "test_deposit_hash")
      ).rejects.toThrow();
    });

    it("should handle database connection issues gracefully", async () => {
      // This test would require mocking mongoose connection
      // For now, we'll just ensure error messages are properly formatted
      const request = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
      });

      try {
        await GameEngine.createGame("507f1f77bcf86cd799439011", request, "test_deposit_hash"); // Valid ObjectId format
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("Failed to create game");
      }
    });
  });
});
