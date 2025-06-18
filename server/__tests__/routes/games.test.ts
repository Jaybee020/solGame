import request from "supertest";
import express from "express";
import { json, urlencoded } from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import gameRouter from "../../routes/games";
import authRouter from "../../routes/auth";
import { UserModel } from "../../models/User";
import { GameSession } from "../../models/GameSession";
import { userFactory } from "../factories/user.factory";
import { createGameRequestFactory } from "../factories/gameRequest.factory";
import { SERVER_API_KEY } from "../../config/constants";

// Create a test app
const createTestApp = () => {
  const app = express();
  app.use(cors());
  app.use(urlencoded({ extended: true }));
  app.use(json({ limit: "50mb" }));
  app.use(cookieParser());
  app.use("/auth", authRouter);
  app.use("/games", gameRouter);
  return app;
};

describe("Games API Routes", () => {
  let app: express.Application;
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    app = createTestApp();

    // Create test user
    testUser = await UserModel.create(
      userFactory.build({
        walletAddress: "test_wallet_address_games_api",
        telegramId: 123456789,
      })
    );

    // Generate auth token for the user
    testUser.generatetoken((err: Error, token: string) => {
      if (!err) {
        authToken = `${token}`;
        testUser.token = token;
        testUser.save();
      }
    });

    // Wait a bit for token generation
    await new Promise((resolve) => setTimeout(resolve, 100));
    const updatedUser = await UserModel.findById(testUser._id);
    authToken = SERVER_API_KEY + `:${updatedUser?.token || ""}`;
  });

  describe("GET /games/supported", () => {
    it("should return supported games list", async () => {
      const response = await request(app)
        .get("/games/supported")
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      // Check structure of each game
      response.body.data.forEach((game: any) => {
        expect(game.gameType).toBeDefined();
        expect(game.config).toBeDefined();
        expect(game.config.minBet).toBeDefined();
        expect(game.config.maxBet).toBeDefined();
        expect(["blackjack", "dice", "slots", "shipcaptaincrew"]).toContain(
          game.gameType
        );
      });
    });

    it("should require authentication", async () => {
      await request(app).get("/games/supported").expect(401);
    });

    it("should reject invalid authentication", async () => {
      await request(app)
        .get("/games/supported")
        .set("Authorization", SERVER_API_KEY + ":invalid_token")
        .expect(500);
    });
  });

  describe("POST /games/create", () => {
    it("should create a new game session", async () => {
      const gameRequest = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
        clientSeed: "test_client_seed",
      });

      const response = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(gameRequest)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.gameType).toBe("dice");
      expect(response.body.data.betAmount).toBe(1.0);
      expect(response.body.data.status).toBe("created");
      expect(response.body.data.serverSeedHash).toBeDefined();
    });

    it("should create games for all supported types", async () => {
      const gameTypes = ["blackjack", "dice", "slots"];

      for (const gameType of gameTypes) {
        const gameRequest = {
          gameType,
          betAmount: 1.0,
        };

        const response = await request(app)
          .post("/games/create")
          .set("Authorization", authToken)
          .send(gameRequest)
          .expect(201);

        expect(response.body.data.gameType).toBe(gameType);
      }
    });

    it("should validate required fields", async () => {
      const invalidRequest = {
        // Missing gameType and betAmount
        clientSeed: "test_seed",
      };

      const response = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(invalidRequest)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it("should validate game type", async () => {
      const invalidRequest = {
        gameType: "invalid_game",
        betAmount: 1.0,
      };

      const response = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(invalidRequest)
        .expect(422);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain("gameType");
    });

    it("should validate bet amount", async () => {
      const invalidRequest = {
        gameType: "dice",
        betAmount: -1, // Negative amount
      };

      const response = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(invalidRequest)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it("should reject requests without authentication", async () => {
      const gameRequest = createGameRequestFactory.build();

      await request(app).post("/games/create").send(gameRequest).expect(401);
    });

    it("should handle bet amount validation from game provider", async () => {
      const invalidBetRequest = {
        gameType: "dice",
        betAmount: 1000, // Above maximum
      };

      const response = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(invalidBetRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Invalid bet amount");
    });
  });

  describe("POST /games/play", () => {
    let gameSessionId: string;

    beforeEach(async () => {
      // Create a game session for testing
      const gameRequest = createGameRequestFactory.build({
        gameType: "dice",
        betAmount: 1.0,
      });

      const createResponse = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(gameRequest);

      gameSessionId = createResponse.body.data.sessionId;
    });

    it("should play a game without moves", async () => {
      const playRequest = {
        sessionId: gameSessionId,
      };

      const response = await request(app)
        .post("/games/play")
        .set("Authorization", authToken)
        .send(playRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBe(gameSessionId);
      expect(response.body.data.status).toBe("completed");
      expect(response.body.data.result).toBeDefined();
    });

    it("should play a blackjack game with moves", async () => {
      // Create a blackjack game
      const bjRequest = {
        gameType: "blackjack",
        betAmount: 1.0,
      };

      const createResponse = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(bjRequest);

      const bjSessionId = createResponse.body.data.sessionId;

      const playRequest = {
        sessionId: bjSessionId,
        move: {
          action: "hit",
          operationId: "test_hit_operation",
        },
      };

      const response = await request(app)
        .post("/games/play")
        .set("Authorization", authToken)
        .send(playRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(["in_progress", "completed"]).toContain(response.body.data.status);
    });

    it("should validate required session ID", async () => {
      const playRequest = {
        // Missing sessionId
        move: { action: "hit" },
      };

      const response = await request(app)
        .post("/games/play")
        .set("Authorization", authToken)
        .send(playRequest)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it("should reject play on non-existent session", async () => {
      const playRequest = {
        sessionId: "non_existent_session_id",
      };

      const response = await request(app)
        .post("/games/play")
        .set("Authorization", authToken)
        .send(playRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Game session not found");
    });

    it("should reject unauthorized access", async () => {
      const otherUser = await UserModel.create(
        userFactory.build({
          walletAddress: "other_user_wallet",
        })
      );

      let otherAuthToken = "";
      otherUser.generatetoken((err: Error, token: string) => {
        if (!err) {
          otherAuthToken = SERVER_API_KEY + `:${token}`;
          otherUser.token = token;
          otherUser.save();
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      const updatedOtherUser = await UserModel.findById(otherUser._id);
      otherAuthToken = SERVER_API_KEY + `:${updatedOtherUser?.token || ""}`;

      const playRequest = {
        sessionId: gameSessionId,
      };

      const response = await request(app)
        .post("/games/play")
        .set("Authorization", otherAuthToken)
        .send(playRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Unauthorized access");
    });

    it("should reject play on already completed session", async () => {
      // Play the game to completion first
      await request(app)
        .post("/games/play")
        .set("Authorization", authToken)
        .send({ sessionId: gameSessionId });

      // Try to play again
      const response = await request(app)
        .post("/games/play")
        .set("Authorization", authToken)
        .send({ sessionId: gameSessionId })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("already completed");
    });
  });

  describe("GET /games/session/:sessionId", () => {
    let gameSessionId: string;

    beforeEach(async () => {
      const gameRequest = createGameRequestFactory.build({
        gameType: "slots",
        betAmount: 2.0,
      });

      const createResponse = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(gameRequest);

      gameSessionId = createResponse.body.data.sessionId;
    });

    it("should retrieve game session details", async () => {
      const response = await request(app)
        .get(`/games/session/${gameSessionId}`)
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.sessionId).toBe(gameSessionId);
      expect(response.body.data.gameType).toBe("slots");
      expect(response.body.data.betAmount).toBe(2.0);
    });

    it("should return 404 for non-existent session", async () => {
      const response = await request(app)
        .get("/games/session/non_existent_session")
        .set("Authorization", authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("not found");
    });

    it("should require session ID parameter", async () => {
      const response = await request(app)
        .get("/games/session/")
        .set("Authorization", authToken)
        .expect(404); // Express will return 404 for missing route parameter
    });

    it("should reject unauthorized access", async () => {
      const otherUser = await UserModel.create(
        userFactory.build({
          walletAddress: "unauthorized_user",
        })
      );

      let otherToken = "";
      otherUser.generatetoken((err: Error, token: string) => {
        if (!err) {
          otherToken = SERVER_API_KEY + `:${token}`;
          otherUser.token = token;
          otherUser.save();
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      const updatedUser = await UserModel.findById(otherUser._id);
      otherToken = SERVER_API_KEY + `:${updatedUser?.token || ""}`;

      const response = await request(app)
        .get(`/games/session/${gameSessionId}`)
        .set("Authorization", otherToken)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Unauthorized access");
    });
  });

  describe("GET /games/history", () => {
    beforeEach(async () => {
      // Create multiple game sessions with different types
      const gameTypes = ["dice", "slots", "blackjack"];

      for (let i = 0; i < 3; i++) {
        for (const gameType of gameTypes) {
          const gameRequest = {
            gameType,
            betAmount: 1.0 + i,
          };

          const createResponse = await request(app)
            .post("/games/create")
            .set("Authorization", authToken)
            .send(gameRequest);

          // Complete some games
          if (i % 2 === 0) {
            await request(app)
              .post("/games/play")
              .set("Authorization", authToken)
              .send({ sessionId: createResponse.body.data.sessionId });
          }
        }
      }
    });

    it("should return user game history", async () => {
      const response = await request(app)
        .get("/games/history")
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      response.body.data.forEach((game: any) => {
        expect(game.sessionId).toBeDefined();
        expect(game.gameType).toBeDefined();
        expect(game.betAmount).toBeDefined();
        expect(game.status).toBeDefined();
      });
    });

    it("should filter by game type", async () => {
      const response = await request(app)
        .get("/games/history?gameType=dice")
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      response.body.data.forEach((game: any) => {
        expect(game.gameType).toBe("dice");
      });
    });

    it("should respect limit parameter", async () => {
      const response = await request(app)
        .get("/games/history?limit=2")
        .set("Authorization", authToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
    });

    it("should validate game type filter", async () => {
      const response = await request(app)
        .get("/games/history?gameType=invalid_game")
        .set("Authorization", authToken)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it("should validate limit parameter", async () => {
      const response = await request(app)
        .get("/games/history?limit=200") // Above maximum
        .set("Authorization", authToken)
        .expect(422);

      expect(response.body.success).toBe(false);
    });

    it("should return empty array for user with no games", async () => {
      const newUser = await UserModel.create(
        userFactory.build({
          walletAddress: "no_games_user",
        })
      );

      let newUserToken = "";
      newUser.generatetoken((err: Error, token: string) => {
        if (!err) {
          newUserToken = SERVER_API_KEY + `:${token}`;
          newUser.token = token;
          newUser.save();
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      const updatedNewUser = await UserModel.findById(newUser._id);
      newUserToken = SERVER_API_KEY + `:${updatedNewUser?.token || ""}`;

      const response = await request(app)
        .get("/games/history")
        .set("Authorization", newUserToken)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe("POST /games/cancel/:sessionId", () => {
    let gameSessionId: string;

    beforeEach(async () => {
      const gameRequest = createGameRequestFactory.build({
        gameType: "blackjack",
        betAmount: 1.0,
      });

      const createResponse = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(gameRequest);

      gameSessionId = createResponse.body.data.sessionId;
    });

    it("should cancel game session successfully", async () => {
      const response = await request(app)
        .post(`/games/cancel/${gameSessionId}`)
        .set("Authorization", authToken)
        .send({ reason: "User requested cancellation" })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cancelled).toBe(true);
      expect(response.body.message).toContain("cancelled successfully");

      // Verify session was cancelled in database
      const session = await GameSession.findOne({ sessionId: gameSessionId });
      expect(session?.status).toBe("cancelled");
    });

    it("should cancel without reason", async () => {
      const response = await request(app)
        .post(`/games/cancel/${gameSessionId}`)
        .set("Authorization", authToken)
        .send({})
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cancelled).toBe(true);
    });

    it("should require session ID parameter", async () => {
      const response = await request(app)
        .post("/games/cancel/")
        .set("Authorization", authToken)
        .send({})
        .expect(404); // Express will return 404 for missing route parameter
    });

    it("should reject cancellation of non-existent session", async () => {
      const response = await request(app)
        .post("/games/cancel/non_existent_session")
        .set("Authorization", authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Game session not found");
    });

    it("should reject unauthorized cancellation", async () => {
      const otherUser = await UserModel.create(
        userFactory.build({
          walletAddress: "unauthorized_cancel_user",
        })
      );

      let otherToken = "";
      otherUser.generatetoken((err: Error, token: string) => {
        if (!err) {
          otherToken = SERVER_API_KEY + `:${token}`;
          otherUser.token = token;
          otherUser.save();
        }
      });

      await new Promise((resolve) => setTimeout(resolve, 100));
      const updatedUser = await UserModel.findById(otherUser._id);
      otherToken = SERVER_API_KEY + `:${updatedUser?.token || ""}`;

      const response = await request(app)
        .post(`/games/cancel/${gameSessionId}`)
        .set("Authorization", otherToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Unauthorized access");
    });

    it("should reject cancellation of completed game", async () => {
      // Complete the game first
      await request(app)
        .post("/games/play")
        .set("Authorization", authToken)
        .send({ sessionId: gameSessionId });

      const response = await request(app)
        .post(`/games/cancel/${gameSessionId}`)
        .set("Authorization", authToken)
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain("Cannot cancel completed game");
    });
  });

  describe("Authentication and Authorization", () => {
    it("should reject all endpoints without authentication", async () => {
      const endpoints = [
        { method: "get", path: "/games/supported" },
        { method: "post", path: "/games/create" },
        { method: "post", path: "/games/play" },
        { method: "get", path: "/games/session/test_session" },
        { method: "get", path: "/games/history" },
        { method: "post", path: "/games/cancel/test_session" },
      ];

      for (const endpoint of endpoints) {
        //@ts-ignore
        await request(app)
          [
            //@ts-ignore

            endpoint.method as keyof typeof request
          ](endpoint.path)
          .expect(401);
      }
    });

    it("should reject endpoints with invalid token", async () => {
      const invalidToken = "invalid_bearer_token";

      await request(app)
        .get("/games/supported")
        .set("Authorization", SERVER_API_KEY + `:${invalidToken}`)
        .expect(500);
    });

    it("should handle malformed authorization header", async () => {
      await request(app)
        .get("/games/supported")
        .set("Authorization", "Malformed header")
        .expect(401);
    });
  });

  describe("Error Handling", () => {
    it("should handle malformed JSON in request body", async () => {
      const response = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .set("Content-Type", "application/json")
        .send('{"invalid": json}')
        .expect(400);
    });

    it("should handle large request bodies", async () => {
      const largeData = {
        gameType: "dice",
        betAmount: 1.0,
        largeField: "x".repeat(60 * 1024 * 1024), // 60MB - above the 50MB limit
      };

      const response = await request(app)
        .post("/games/create")
        .set("Authorization", authToken)
        .send(largeData)
        .expect(413); // Payload too large
    });

    it("should handle database connection errors gracefully", async () => {
      // This test would ideally mock database failures
      // For now, we ensure error responses have consistent structure
      const response = await request(app)
        .get("/games/session/definitely_non_existent_session_id")
        .set("Authorization", authToken)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBeDefined();
    });
  });

  describe("CORS and Headers", () => {
    it("should include CORS headers", async () => {
      const response = await request(app)
        .options("/games/supported")
        .expect(204);

      expect(response.headers["access-control-allow-origin"]).toBeDefined();
    });

    it("should handle preflight requests", async () => {
      await request(app)
        .options("/games/create")
        .set("Origin", "https://example.com")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "Authorization, Content-Type")
        .expect(204);
    });
  });
});
