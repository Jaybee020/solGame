import GameSessionService from "../../services/GameSession";
import { GameSession } from "../../models/GameSession";
import { UserModel } from "../../models/User";
import { gameSessionFactory } from "../factories/gameSession.factory";
import { userFactory } from "../factories/user.factory";
import { GameType, GameStatus } from "../../models/GameSession";

describe("GameSessionService", () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await UserModel.create(
      userFactory.build({
        walletAddress: "test_wallet_address",
      })
    );
  });

  describe("get", () => {
    it("should retrieve a game session by ID", async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
        gameType: "dice" as GameType,
        betAmount: 1.0,
      });

      const createdSession = await GameSession.create(sessionData);
      const retrievedSession = await GameSessionService.get(
        (createdSession._id as any).toString()
      );

      expect(retrievedSession).toBeDefined();
      expect((retrievedSession?._id as any).toString()).toBe(
        (createdSession._id as any).toString()
      );
      expect(retrievedSession?.gameType).toBe("dice");
      expect(retrievedSession?.betAmount).toBe(1.0);
      expect(retrievedSession?.userId).toBeDefined(); // Should be populated
    });

    it("should return null for non-existent session", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const result = await GameSessionService.get(nonExistentId);
      expect(result).toBeNull();
    });

    it("should populate user information", async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
      });

      const createdSession = await GameSession.create(sessionData);
      const retrievedSession = await GameSessionService.get(
        (createdSession._id as any).toString(),
        true
      );

      expect(retrievedSession?.userId).toBeDefined();
      // The populated user should have wallet address
      if (typeof retrievedSession?.userId === "object") {
        expect((retrievedSession.userId as any).walletAddress).toBe(
          testUser.walletAddress
        );
      }
    });
  });

  describe("getBySessionId", () => {
    it("should retrieve session by session ID", async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
        sessionId: "unique_session_123",
      });

      await GameSession.create(sessionData);
      const retrievedSession = await GameSessionService.getBySessionId(
        "unique_session_123"
      );

      expect(retrievedSession).toBeDefined();
      expect(retrievedSession?.sessionId).toBe("unique_session_123");
    });

    it("should return null for non-existent session ID", async () => {
      const result = await GameSessionService.getBySessionId(
        "non_existent_session"
      );
      expect(result).toBeNull();
    });
  });

  describe("getActiveSessionsByUserId", () => {
    beforeEach(async () => {
      // Create multiple sessions - some active, some expired, some completed
      const now = new Date();

      // Active session
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: false,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes from now
        })
      );

      // Expired session
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: false,
          expiresAt: new Date(now.getTime() - 60 * 1000), // 1 minute ago
        })
      );

      // Completed session
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: true,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000),
        })
      );
    });

    it("should return only active (non-completed, non-expired) sessions", async () => {
      const activeSessions = await GameSessionService.getActiveSessionsByUserId(
        (testUser._id as any).toString()
      );

      expect(activeSessions).toBeDefined();
      expect(Array.isArray(activeSessions)).toBe(true);
      expect(activeSessions.length).toBe(1);

      activeSessions.forEach((session) => {
        expect(session.completed).toBe(false);
        expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(
          new Date().getTime()
        );
      });
    });

    it("should return empty array for user with no active sessions", async () => {
      const newUser = await UserModel.create(
        userFactory.build({
          walletAddress: "new_user_wallet",
        })
      );

      const activeSessions = await GameSessionService.getActiveSessionsByUserId(
        (newUser._id as any).toString()
      );
      expect(activeSessions).toEqual([]);
    });
  });

  describe("getByUserIdAndGameType", () => {
    beforeEach(async () => {
      // Create sessions of different game types
      const gameTypes: GameType[] = ["dice", "slots", "blackjack"];

      for (const gameType of gameTypes) {
        for (let i = 0; i < 2; i++) {
          await GameSession.create(
            gameSessionFactory.build({
              userId: testUser._id,
              gameType,
            })
          );
        }
      }
    });

    it("should return sessions filtered by game type", async () => {
      const diceSessions = await GameSessionService.getByUserIdAndGameType(
        (testUser._id as any).toString(),
        "dice"
      );

      expect(diceSessions).toBeDefined();
      expect(Array.isArray(diceSessions)).toBe(true);
      expect(diceSessions.length).toBe(2);

      diceSessions.forEach((session) => {
        expect(session.gameType).toBe("dice");
        expect(session.userId.toString()).toBe(
          (testUser._id as any).toString()
        );
      });
    });

    it("should return empty array for non-existent game type combinations", async () => {
      const newUser = await UserModel.create(
        userFactory.build({
          walletAddress: "another_user",
        })
      );

      const sessions = await GameSessionService.getByUserIdAndGameType(
        (newUser._id as any).toString(),
        "dice"
      );
      expect(sessions).toEqual([]);
    });

    it("should order sessions by creation date (newest first)", async () => {
      const sessions = await GameSessionService.getByUserIdAndGameType(
        (testUser._id as any).toString(),
        "dice"
      );

      if (sessions.length > 1) {
        expect(
          new Date(sessions[0].createdAt).getTime()
        ).toBeGreaterThanOrEqual(new Date(sessions[1].createdAt).getTime());
      }
    });
  });

  describe("create", () => {
    it("should create a new game session", async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
        gameType: "blackjack" as GameType,
        betAmount: 5.0,
        bet: 5.0,
      });

      const createdSession = await GameSessionService.create(sessionData);

      expect(createdSession).toBeDefined();
      expect(createdSession._id).toBeDefined();
      expect(createdSession.gameType).toBe("blackjack");
      expect(createdSession.betAmount).toBe(5.0);
      expect(createdSession.userId.toString()).toBe(
        (testUser._id as any).toString()
      );
      expect(createdSession.sessionId).toBeDefined();
      expect(createdSession.serverSeed).toBeDefined();
      expect(createdSession.serverSeedHash).toBeDefined();
    });

    it("should generate unique session IDs", async () => {
      const session1Data = gameSessionFactory.build({ userId: testUser._id });
      const session2Data = gameSessionFactory.build({ userId: testUser._id });

      const session1 = await GameSessionService.create(session1Data);
      const session2 = await GameSessionService.create(session2Data);

      expect(session1.sessionId).not.toBe(session2.sessionId);
    });

    it("should set default values correctly", async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
        gameType: "dice" as GameType,
        betAmount: 1.0,
      });

      const createdSession = await GameSessionService.create(sessionData);

      expect(createdSession.completed).toBe(false);
      expect(createdSession.status).toBe("created");
      expect(createdSession.winAmount).toBe(0);
      expect(createdSession.payoutProcessed).toBe(false);
      expect(createdSession.actionSequence).toEqual([]);
      expect(createdSession.operationIds).toEqual([]);
    });
  });

  describe("update", () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
      });
      testSession = await GameSession.create(sessionData);
    });

    it("should update session successfully", async () => {
      const updateData = {
        status: "in_progress" as GameStatus,
        winAmount: 10.5,
      };

      const updatedSession = await GameSessionService.update(
        (testSession._id as any).toString(),
        updateData
      );

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.status).toBe("in_progress");
      expect(updatedSession?.winAmount).toBe(10.5);
      expect(updatedSession?.updatedAt).toBeDefined();
    });

    it("should return null for non-existent session", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const result = await GameSessionService.update(nonExistentId, {
        winAmount: 5,
      });
      expect(result).toBeNull();
    });

    it("should update timestamp automatically", async () => {
      const originalUpdatedAt = testSession.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise((resolve) => setTimeout(resolve, 10));

      const updatedSession = await GameSessionService.update(
        (testSession._id as any).toString(),
        { winAmount: 1 }
      );

      expect(new Date(updatedSession!.updatedAt).getTime()).toBeGreaterThan(
        new Date(originalUpdatedAt).getTime()
      );
    });
  });

  describe("completeSession", () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
        status: "in_progress" as GameStatus,
      });
      testSession = await GameSession.create(sessionData);
    });

    it("should complete session with result", async () => {
      const result = {
        winAmount: 15.5,
        multiplier: 3.1,
        gameData: { outcome: "win", details: "test_game_data" },
      };

      const completedSession = await GameSessionService.completeSession(
        (testSession._id as any).toString(),
        result
      );

      expect(completedSession).toBeDefined();
      expect(completedSession?.completed).toBe(true);
      expect(completedSession?.status).toBe("completed");
      expect(completedSession?.result?.winAmount).toBe(15.5);
      expect(completedSession?.result?.multiplier).toBe(3.1);
      expect(completedSession?.completedAt).toBeDefined();
    });

    it("should return null for non-existent session", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const result = await GameSessionService.completeSession(nonExistentId, {
        winAmount: 0,
        multiplier: 0,
        gameData: {},
      });
      expect(result).toBeNull();
    });
  });

  describe("cancelSession", () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
        status: "in_progress" as GameStatus,
      });
      testSession = await GameSession.create(sessionData);
    });

    it("should cancel session successfully", async () => {
      const reason = "User requested cancellation";
      const cancelledSession = await GameSessionService.cancelSession(
        (testSession._id as any).toString(),
        reason
      );

      expect(cancelledSession).toBeDefined();
      expect(cancelledSession?.status).toBe("cancelled");
      expect(cancelledSession?.suspiciousActivity).toBeDefined();

      const cancellationEntry = cancelledSession?.suspiciousActivity?.find(
        (activity: any) => activity.reason.includes("cancelled")
      );
      expect(cancellationEntry).toBeDefined();
      expect(cancellationEntry?.details?.cancellationReason).toBe(reason);
    });

    it("should cancel session without reason", async () => {
      const cancelledSession = await GameSessionService.cancelSession(
        (testSession._id as any).toString()
      );

      expect(cancelledSession).toBeDefined();
      expect(cancelledSession?.status).toBe("cancelled");
    });
  });

  describe("recordAction", () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
      });
      testSession = await GameSession.create(sessionData);
    });

    it("should record action successfully", async () => {
      const action = "hit";
      const operationId = "unique_operation_123";

      const success = await GameSessionService.recordAction(
        (testSession._id as any).toString(),
        action,
        operationId
      );

      expect(success).toBe(true);

      // Verify action was recorded
      const updatedSession = await GameSession.findById(testSession._id);
      expect(updatedSession?.actionSequence).toContain(action);
      expect(updatedSession?.operationIds).toContain(operationId);
    });

    it("should prevent duplicate operation IDs", async () => {
      const action = "stand";
      const operationId = "duplicate_operation_456";

      // First call should succeed
      const firstResult = await GameSessionService.recordAction(
        (testSession._id as any).toString(),
        action,
        operationId
      );
      expect(firstResult).toBe(true);

      // Second call with same operation ID should fail
      const secondResult = await GameSessionService.recordAction(
        (testSession._id as any).toString(),
        action,
        operationId
      );
      expect(secondResult).toBe(false);
    });

    it("should throw error for non-existent session", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";

      await expect(
        GameSessionService.recordAction(nonExistentId, "action", "op_id")
      ).rejects.toThrow("Session not found");
    });
  });

  describe("flagAsSuspicious", () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
      });
      testSession = await GameSession.create(sessionData);
    });

    it("should flag session as suspicious", async () => {
      const reason = "Unusual betting pattern";
      const details = { pattern: "rapid_fire", count: 10 };

      const flaggedSession = await GameSessionService.flagAsSuspicious(
        (testSession._id as any).toString(),
        reason,
        details
      );

      expect(flaggedSession).toBeDefined();
      expect(flaggedSession?.suspiciousActivity).toBeDefined();
      expect(flaggedSession?.suspiciousActivity?.length).toBe(1);

      const suspiciousEntry = flaggedSession?.suspiciousActivity?.[0];
      expect(suspiciousEntry?.reason).toBe(reason);
      expect(suspiciousEntry?.details).toEqual(details);
      expect(suspiciousEntry?.timestamp).toBeDefined();
    });

    it("should flag session without details", async () => {
      const reason = "Basic suspicious activity";

      const flaggedSession = await GameSessionService.flagAsSuspicious(
        (testSession._id as any).toString(),
        reason
      );

      expect(flaggedSession).toBeDefined();
      expect(flaggedSession?.suspiciousActivity?.length).toBe(1);
      expect(flaggedSession?.suspiciousActivity?.[0]?.reason).toBe(reason);
    });

    it("should allow multiple suspicious activity entries", async () => {
      await GameSessionService.flagAsSuspicious(
        (testSession._id as any).toString(),
        "First issue"
      );
      const flaggedSession = await GameSessionService.flagAsSuspicious(
        (testSession._id as any).toString(),
        "Second issue"
      );

      expect(flaggedSession?.suspiciousActivity?.length).toBe(2);
    });
  });

  describe("getExpiredSessions", () => {
    beforeEach(async () => {
      const now = new Date();

      // Create expired sessions
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: false,
          expiresAt: new Date(now.getTime() - 60 * 1000), // 1 minute ago
        })
      );

      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: false,
          expiresAt: new Date(now.getTime() - 2 * 60 * 1000), // 2 minutes ago
        })
      );

      // Create non-expired session
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: false,
          expiresAt: new Date(now.getTime() + 30 * 60 * 1000), // 30 minutes from now
        })
      );

      // Create completed session (should be excluded even if expired)
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: true,
          expiresAt: new Date(now.getTime() - 60 * 1000),
        })
      );
    });

    it("should return only expired, non-completed sessions", async () => {
      const expiredSessions = await GameSessionService.getExpiredSessions();

      expect(expiredSessions).toBeDefined();
      expect(Array.isArray(expiredSessions)).toBe(true);
      expect(expiredSessions.length).toBe(2);

      expiredSessions.forEach((session) => {
        expect(session.completed).toBe(false);
        expect(new Date(session.expiresAt).getTime()).toBeLessThan(
          new Date().getTime()
        );
      });
    });
  });

  describe("getSuspiciousSessions", () => {
    beforeEach(async () => {
      // Create sessions with suspicious activity
      const suspiciousSession1 = await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
        })
      );
      await GameSessionService.flagAsSuspicious(
        (suspiciousSession1._id as any).toString(),
        "Suspicious pattern 1"
      );

      const suspiciousSession2 = await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
        })
      );
      await GameSessionService.flagAsSuspicious(
        (suspiciousSession2._id as any).toString(),
        "Suspicious pattern 2"
      );

      // Create normal session
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
        })
      );
    });

    it("should return sessions with suspicious activity", async () => {
      const suspiciousSessions =
        await GameSessionService.getSuspiciousSessions();

      expect(suspiciousSessions).toBeDefined();
      expect(Array.isArray(suspiciousSessions)).toBe(true);
      expect(suspiciousSessions.length).toBe(2);

      suspiciousSessions.forEach((session) => {
        expect(session.suspiciousActivity).toBeDefined();
        expect(session.suspiciousActivity!.length).toBeGreaterThan(0);
      });
    });

    it("should respect limit parameter", async () => {
      const limitedSessions = await GameSessionService.getSuspiciousSessions(1);
      expect(limitedSessions.length).toBe(1);
    });
  });

  describe("getPendingPayouts", () => {
    beforeEach(async () => {
      // Create session with pending payout
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          status: "completed" as GameStatus,
          payoutProcessed: false,
          result: { winAmount: 10, multiplier: 2, gameData: {} },
        })
      );

      // Create session with no winnings
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          status: "completed" as GameStatus,
          payoutProcessed: false,
          result: { winAmount: 0, multiplier: 0, gameData: {} },
        })
      );

      // Create session with already processed payout
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          status: "completed" as GameStatus,
          payoutProcessed: true,
          result: { winAmount: 5, multiplier: 1.5, gameData: {} },
        })
      );
    });

    it("should return only sessions with pending payouts", async () => {
      const pendingPayouts = await GameSessionService.getPendingPayouts();

      expect(pendingPayouts).toBeDefined();
      expect(Array.isArray(pendingPayouts)).toBe(true);
      expect(pendingPayouts.length).toBe(1);

      const session = pendingPayouts[0];
      expect(session.status).toBe("completed");
      expect(session.payoutProcessed).toBe(false);
      expect(session.result?.winAmount).toBeGreaterThan(0);
    });
  });

  describe("markPayoutProcessed", () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
        status: "completed" as GameStatus,
        payoutProcessed: false,
        result: { winAmount: 15, multiplier: 3, gameData: {} },
      });
      testSession = await GameSession.create(sessionData);
    });

    it("should mark payout as processed", async () => {
      const transactionId = "tx_123456789";

      const updatedSession = await GameSessionService.markPayoutProcessed(
        (testSession._id as any).toString(),
        transactionId
      );

      expect(updatedSession).toBeDefined();
      expect(updatedSession?.payoutProcessed).toBe(true);
      expect(updatedSession?.payoutTransactionId).toBe(transactionId);
    });
  });

  describe("getSessionStats", () => {
    beforeEach(async () => {
      // Create multiple sessions with different outcomes
      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: true,
          betAmount: 10,
          winAmount: 20,
        })
      );

      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: true,
          betAmount: 5,
          winAmount: 0,
        })
      );

      await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
          completed: false,
          betAmount: 15,
          winAmount: 0,
        })
      );

      // Add suspicious activity to one session
      const suspiciousSession = await GameSession.create(
        gameSessionFactory.build({
          userId: testUser._id,
        })
      );
      await GameSessionService.flagAsSuspicious(
        (suspiciousSession._id as any).toString(),
        "Test suspicious activity"
      );
    });

    it("should return correct stats for specific user", async () => {
      const stats = await GameSessionService.getSessionStats(
        (testUser._id as any).toString()
      );

      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBe(4);
      expect(stats.completedSessions).toBe(2);
      expect(stats.totalBetAmount).toBe(30); // 10 + 5 + 15
      expect(stats.totalWinAmount).toBe(20); // 20 + 0 + 0
      expect(stats.suspiciousCount).toBe(1);
    });

    it("should return stats for all users when no user ID provided", async () => {
      const stats = await GameSessionService.getSessionStats();

      expect(stats).toBeDefined();
      expect(stats.totalSessions).toBeGreaterThanOrEqual(4);
      expect(stats.completedSessions).toBeGreaterThanOrEqual(2);
      expect(stats.totalBetAmount).toBeGreaterThanOrEqual(30);
    });

    it("should return zero stats for user with no sessions", async () => {
      const newUser = await UserModel.create(
        userFactory.build({
          walletAddress: "no_sessions_user",
        })
      );

      const stats = await GameSessionService.getSessionStats(
        (newUser._id as any).toString()
      );

      expect(stats.totalSessions).toBe(0);
      expect(stats.completedSessions).toBe(0);
      expect(stats.totalBetAmount).toBe(0);
      expect(stats.totalWinAmount).toBe(0);
      expect(stats.suspiciousCount).toBe(0);
    });
  });

  describe("delete", () => {
    let testSession: any;

    beforeEach(async () => {
      const sessionData = gameSessionFactory.build({
        userId: testUser._id,
      });
      testSession = await GameSession.create(sessionData);
    });

    it("should delete session successfully", async () => {
      const deletedSession = await GameSessionService.delete(
        (testSession._id as any).toString()
      );

      expect(deletedSession).toBeDefined();
      expect((deletedSession?._id as any).toString()).toBe(
        (testSession._id as any).toString()
      );

      // Verify session is actually deleted
      const foundSession = await GameSession.findById(testSession._id);
      expect(foundSession).toBeNull();
    });

    it("should return null for non-existent session", async () => {
      const nonExistentId = "507f1f77bcf86cd799439011";
      const result = await GameSessionService.delete(nonExistentId);
      expect(result).toBeNull();
    });
  });
});
