import {
  GameSession,
  IGameSession,
  GameType,
  GameStatus,
} from "../models/GameSession";
import { Types } from "mongoose";

class GameSessionService {
  model: typeof GameSession;

  constructor() {
    this.model = GameSession;
  }

  async get(
    id: string,
    shouldPopulateUserId = false
  ): Promise<IGameSession | null> {
    try {
      if (shouldPopulateUserId) {
        return await this.model.findById(id).populate("userId");
      }
      return await this.model.findById(id);
    } catch (error) {
      throw new Error(`Failed to get game session: ${error}`);
    }
  }

  async getBySessionId(
    sessionId: string,
    shouldPopulateUserId = false
  ): Promise<IGameSession | null> {
    try {
      if (shouldPopulateUserId) {
        return await this.model.findOne({ sessionId }).populate("userId");
      }
      return await this.model.findOne({ sessionId });
    } catch (error) {
      throw new Error(`Failed to get game session by session ID: ${error}`);
    }
  }

  async getActiveSessionsByUserId(
    userId: string,
    shouldPopulateUserId = false
  ): Promise<IGameSession[]> {
    try {
      if (shouldPopulateUserId) {
        return await this.model
          .find({
            userId: new Types.ObjectId(userId),
            completed: false,
            expiresAt: { $gt: new Date() },
          })
          .populate("userId");
      }
      return await this.model.find({
        userId: new Types.ObjectId(userId),
        completed: false,
        expiresAt: { $gt: new Date() },
      });
    } catch (error) {
      throw new Error(`Failed to get active sessions for user: ${error}`);
    }
  }

  async getByUserIdAndGameType(
    userId: string,
    gameType: GameType,
    shouldPopulateUserId = false
  ): Promise<IGameSession[]> {
    try {
      if (shouldPopulateUserId) {
        return await this.model
          .find({
            userId: new Types.ObjectId(userId),
            gameType,
          })
          .populate("userId")
          .sort({ createdAt: -1 });
      }
      return await this.model
        .find({
          userId: new Types.ObjectId(userId),
          gameType,
        })
        .sort({ createdAt: -1 });
    } catch (error) {
      throw new Error(
        `Failed to get sessions by user ID and game type: ${error}`
      );
    }
  }

  async create(sessionData: Partial<IGameSession>): Promise<IGameSession> {
    try {
      const session = new this.model(sessionData);
      return await session.save();
    } catch (error) {
      throw new Error(`Failed to create game session: ${error}`);
    }
  }

  async update(
    id: string,
    updateData: Partial<IGameSession>,
    shouldPopulateUserId = false
  ): Promise<IGameSession | null> {
    try {
      if (shouldPopulateUserId) {
        return await this.model
          .findByIdAndUpdate(
            id,
            { ...updateData, updatedAt: new Date() },
            { new: true }
          )
          .populate("userId");
      }
      return await this.model.findByIdAndUpdate(
        id,
        { ...updateData, updatedAt: new Date() },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to update game session: ${error}`);
    }
  }

  async completeSession(
    id: string,
    result: any,
    shouldPopulateUserId = false
  ): Promise<IGameSession | null> {
    try {
      if (shouldPopulateUserId) {
        return await this.model
          .findByIdAndUpdate(
            id,
            {
              completed: true,
              status: "completed" as GameStatus,
              result,
              completedAt: new Date(),
              updatedAt: new Date(),
            },
            { new: true }
          )
          .populate("userId");
      }
      return await this.model.findByIdAndUpdate(
        id,
        {
          completed: true,
          status: "completed" as GameStatus,
          result,
          completedAt: new Date(),
          updatedAt: new Date(),
        },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to complete game session: ${error}`);
    }
  }

  async getWinningGames(): Promise<IGameSession[]> {
    try {
      const games = await GameSession.find({
        status: "completed",
      });
      games.filter((game) => (game.result?.winAmount || 0) > 0);

      return games;
    } catch (error) {
      throw new Error(`Failed to get winning games: ${error}`);
    }
  }

  async cancelSession(
    id: string,
    reason?: string,
    shouldPopulateUserId = false
  ): Promise<IGameSession | null> {
    try {
      const updateData: any = {
        status: "cancelled" as GameStatus,
        updatedAt: new Date(),
      };

      if (reason) {
        updateData.$push = {
          suspiciousActivity: {
            reason: `Session cancelled: ${reason}`,
            timestamp: new Date(),
            details: { cancellationReason: reason },
          },
        };
      }

      if (shouldPopulateUserId) {
        return await this.model
          .findByIdAndUpdate(id, updateData, { new: true })
          .populate("userId");
      }
      return await this.model.findByIdAndUpdate(id, updateData, { new: true });
    } catch (error) {
      throw new Error(`Failed to cancel game session: ${error}`);
    }
  }

  async recordAction(
    id: string,
    action: string,
    operationId: string
  ): Promise<boolean> {
    try {
      const session = await this.model.findById(id);
      if (!session) {
        throw new Error("Session not found");
      }

      const success = session.recordAction(action, operationId);
      if (success) {
        await session.save();
      }
      return success;
    } catch (error) {
      throw new Error(`Failed to record action: ${error}`);
    }
  }

  async flagAsSuspicious(
    id: string,
    reason: string,
    details?: any
  ): Promise<IGameSession | null> {
    try {
      const session = await this.model.findById(id);
      if (!session) {
        throw new Error("Session not found");
      }

      session.flagAsSuspicious(reason, details);
      return await session.save();
    } catch (error) {
      throw new Error(`Failed to flag session as suspicious: ${error}`);
    }
  }

  async getExpiredSessions(): Promise<IGameSession[]> {
    try {
      return await this.model.find({
        completed: false,
        expiresAt: { $lt: new Date() },
      });
    } catch (error) {
      throw new Error(`Failed to get expired sessions: ${error}`);
    }
  }

  async getSuspiciousSessions(limit: number = 50): Promise<IGameSession[]> {
    try {
      return await this.model
        .find({
          "suspiciousActivity.0": { $exists: true },
        })
        .populate("userId")
        .sort({ "suspiciousActivity.timestamp": -1 })
        .limit(limit);
    } catch (error) {
      throw new Error(`Failed to get suspicious sessions: ${error}`);
    }
  }

  async getPendingPayouts(): Promise<IGameSession[]> {
    try {
      return await this.model.find({
        status: "completed",
        payoutProcessed: false,
        "result.winAmount": { $gt: 0 },
      });
    } catch (error) {
      throw new Error(`Failed to get pending payouts: ${error}`);
    }
  }

  async markPayoutProcessed(
    id: string,
    transactionId: string
  ): Promise<IGameSession | null> {
    try {
      return await this.model
        .findByIdAndUpdate(
          id,
          {
            payoutProcessed: true,
            payoutTransactionId: transactionId,
            updatedAt: new Date(),
          },
          { new: true }
        )
        .populate("userId");
    } catch (error) {
      throw new Error(`Failed to mark payout as processed: ${error}`);
    }
  }

  async getSessionStats(userId?: string): Promise<any> {
    try {
      const matchStage: any = {};
      if (userId) {
        matchStage.userId = new Types.ObjectId(userId);
      }

      const stats = await this.model.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalSessions: { $sum: 1 },
            completedSessions: {
              $sum: { $cond: [{ $eq: ["$completed", true] }, 1, 0] },
            },
            totalBetAmount: { $sum: "$betAmount" },
            totalWinAmount: { $sum: "$winAmount" },
            suspiciousCount: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      { $size: { $ifNull: ["$suspiciousActivity", []] } },
                      0,
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      return (
        stats[0] || {
          totalSessions: 0,
          completedSessions: 0,
          totalBetAmount: 0,
          totalWinAmount: 0,
          suspiciousCount: 0,
        }
      );
    } catch (error) {
      throw new Error(`Failed to get session stats: ${error}`);
    }
  }

  async getGameSessionByDepositTxHash(
    depositTxHash: string
  ): Promise<IGameSession | null> {
    try {
      const session = await this.model.findOne({
        depositTxHash,
      });
      return session;
    } catch (error) {
      throw new Error(
        `Failed to get game session by deposit tx hash: ${error}`
      );
    }
  }

  async delete(id: string): Promise<IGameSession | null> {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw new Error(`Failed to delete game session: ${error}`);
    }
  }
}

export default new GameSessionService();
