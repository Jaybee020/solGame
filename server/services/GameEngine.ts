import { Types } from "mongoose";
import GameSessionService from "./GameSession";
import GameFactory from "../factories/GameFactory";
import {
  CreateGameRequest,
  PlayGameRequest,
  GameResponse,
  GameType,
  GameMove,
} from "../types/game";
import { IGameSession } from "../models/GameSession";
import { secureRandomString } from "../utils/secureRandomness";
import { SolanaService } from "./SolanaService";
import { BalanceService } from "./BalanceService";
import {
  MANAGER_WALLET_ADDRESS,
  SOLANA_RPC_URL,
  STAKING_TOKEN,
} from "../config/constants";

export class GameEngine {
  private sessionService = GameSessionService;
  private balanceService = new BalanceService();

  async createGame(
    userId: string,
    request: CreateGameRequest,
    depositTxHash: string,
    clientInfo?: any
  ): Promise<GameResponse> {
    try {
      if (!GameFactory.validateGameType(request.gameType)) {
        throw new Error(`Invalid game type: ${request.gameType}`);
      }

      if (!depositTxHash) {
        throw new Error("Deposit transaction hash is required");
      }

      const solanaService = new SolanaService(SOLANA_RPC_URL);

      const existingSession =
        await this.sessionService.getGameSessionByDepositTxHash(depositTxHash);

      if (existingSession) {
        throw new Error("Deposit transaction already used");
      }

      const depositVerified = await solanaService.verifyTokenTransfer(
        depositTxHash,
        STAKING_TOKEN.mint,
        MANAGER_WALLET_ADDRESS,
        request.betAmount
      );

      if (!depositVerified) {
        throw new Error("Deposit transaction not verified");
      }

      const provider = GameFactory.getProvider(request.gameType);

      if (!provider.validateBet(request.betAmount)) {
        const config = provider.config;
        throw new Error(
          `Invalid bet amount. Min: ${config.minBet}, Max: ${config.maxBet}`
        );
      }

      const serverSeed = require("crypto").randomBytes(32).toString("hex");
      const clientSeed = request.clientSeed || secureRandomString(16);
      const nonce = Math.floor(Math.random() * 1000000);

      const gameState = provider.initializeGame(
        request.betAmount,
        serverSeed,
        clientSeed,
        nonce
      );

      const sessionData: Partial<IGameSession> = {
        userId: new Types.ObjectId(userId),
        gameType: request.gameType,
        betAmount: request.betAmount,
        bet: request.betAmount,
        initialState: gameState,
        currentState: gameState,
        serverSeed,
        clientSeed,
        nonce,
        status: "created",
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        serverSeedHash: new TextEncoder().encode(serverSeed).toString(),
        deviceFingerprint: request.deviceFingerprint,
      };

      const session = await this.sessionService.create(sessionData);

      return {
        sessionId: session.sessionId,
        gameType: request.gameType,
        betAmount: request.betAmount,
        status: session.status,
        gameState: this.sanitizeGameData(gameState.currentData),
        serverSeedHash: session.serverSeedHash,
      };
    } catch (error) {
      throw new Error(
        `Failed to create game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async createGameWithBalance(
    userId: string,
    request: CreateGameRequest,
    clientInfo?: any
  ): Promise<GameResponse> {
    try {
      if (!GameFactory.validateGameType(request.gameType)) {
        throw new Error(`Invalid game type: ${request.gameType}`);
      }

      const provider = GameFactory.getProvider(request.gameType);

      if (!provider.validateBet(request.betAmount)) {
        const config = provider.config;
        throw new Error(
          `Invalid bet amount. Min: ${config.minBet}, Max: ${config.maxBet}`
        );
      }

      // First check if user has sufficient balance
      const userObjectId = new Types.ObjectId(userId);
      const hasBalance = await this.balanceService.hasBalance(
        userObjectId,
        request.betAmount
      );

      if (!hasBalance) {
        throw new Error("Insufficient balance");
      }

      const serverSeed = require("crypto").randomBytes(32).toString("hex");
      const clientSeed = request.clientSeed || secureRandomString(16);
      const nonce = Math.floor(Math.random() * 1000000);

      const gameState = provider.initializeGame(
        request.betAmount,
        serverSeed,
        clientSeed,
        nonce
      );

      const sessionData: Partial<IGameSession> = {
        userId: userObjectId,
        gameType: request.gameType,
        betAmount: request.betAmount,
        bet: request.betAmount,
        initialState: gameState,
        currentState: gameState,
        serverSeed,
        clientSeed,
        nonce,
        status: "created",
        ipAddress: clientInfo?.ipAddress,
        userAgent: clientInfo?.userAgent,
        serverSeedHash: new TextEncoder().encode(serverSeed).toString(),
        deviceFingerprint: request.deviceFingerprint,
        useBalance: true, // Flag to indicate this game uses balance system
      };

      const session = await this.sessionService.create(sessionData);

      // Now deduct balance with the actual session ID
      const balanceResult = await this.balanceService.deductForGame(
        userObjectId,
        request.betAmount,
        session._id as any,
        request.gameType
      );

      if (!balanceResult.success) {
        // If balance deduction fails, cancel the session
        await this.sessionService.cancelSession(
          session.id,
          "Balance deduction failed"
        );
        throw new Error(balanceResult.error || "Failed to deduct balance");
      }

      return {
        sessionId: session.sessionId,
        gameType: request.gameType,
        betAmount: request.betAmount,
        status: session.status,
        gameState: this.sanitizeGameData(gameState.currentData),
        serverSeedHash: session.serverSeedHash,
      };
    } catch (error) {
      throw new Error(
        `Failed to create game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async playGame(
    userId: string,
    request: PlayGameRequest
  ): Promise<GameResponse> {
    try {
      const session = await this.sessionService.getBySessionId(
        request.sessionId,
        false
      );

      if (!session) {
        throw new Error("Game session not found");
      }

      if (session.userId.toString() !== userId) {
        throw new Error("Unauthorized access to game session");
      }

      if (session.completed || session.status === "completed") {
        throw new Error("Game session already completed");
      }

      if (new Date() > session.expiresAt) {
        await this.sessionService.cancelSession(session.id, "Session expired");
        throw new Error("Game session expired");
      }

      const provider = GameFactory.getProvider(session.gameType);
      const currentState = session.currentState;

      if (request.move) {
        const operationId = request.move.operationId || secureRandomString(16);
        const actionRecorded = await this.sessionService.recordAction(
          session.id,
          request.move.action,
          operationId
        );

        if (!actionRecorded) {
          throw new Error("Duplicate operation detected");
        }
      }

      const result = await provider.playGame(currentState, request.move);

      await this.sessionService.update(session.id, {
        currentState,
        status:
          currentState.status === "completed" ? "completed" : "in_progress",
      });

      if (currentState.status === "completed") {
        await this.sessionService.completeSession(session.id, {
          winAmount: result.winAmount,
          multiplier: result.multiplier,
          gameData: result.gameData,
        });

        await this.sessionService.update(session.id, {
          winAmount: result.winAmount,
          outcome: result.outcome,
          completedAt: new Date(),
        });

        // Handle balance-based games
        if (session.useBalance && result.winAmount > 0) {
          await this.balanceService.creditGameWin(
            session.userId,
            result.winAmount,
            session._id as any,
            session.gameType
          );
        }
      }

      return {
        sessionId: session.sessionId,
        gameType: session.gameType,
        betAmount: session.betAmount,
        status:
          currentState.status === "completed" ? "completed" : "in_progress",
        result: currentState.status === "completed" ? result : undefined,
        gameState: this.sanitizeGameData(currentState.currentData),
        serverSeedHash: session.serverSeedHash,
      };
    } catch (error) {
      throw new Error(
        `Failed to play game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getGameSession(
    userId: string,
    sessionId: string
  ): Promise<GameResponse | null> {
    try {
      const session = await this.sessionService.getBySessionId(
        sessionId,
        false
      );

      if (!session) {
        return null;
      }

      if (session.userId.toString() !== userId) {
        throw new Error("Unauthorized access to game session");
      }

      return {
        sessionId: session.sessionId,
        gameType: session.gameType,
        betAmount: session.betAmount,
        status: session.status,
        result: session.result as any,
        gameState: this.sanitizeGameData(session.currentState?.currentData),
        serverSeedHash: session.serverSeedHash,
      };
    } catch (error) {
      throw new Error(
        `Failed to get game session: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getUserGameHistory(
    userId: string,
    gameType?: GameType,
    limit: number = 50,
    offset: number = 0
  ): Promise<GameResponse[]> {
    try {
      let sessions;

      if (gameType) {
        sessions = await this.sessionService.getByUserIdAndGameType(
          userId,
          gameType,
          false,
          limit,
          offset
        );
      } else {
        sessions = await this.sessionService.model
          .find({
            userId: new Types.ObjectId(userId),
          })
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit);
      }

      return sessions.map((session) => ({
        sessionId: session.sessionId,
        gameType: session.gameType,
        betAmount: session.betAmount,
        status: session.status,
        result: session.result
          ? {
              isWin: session.outcome === "win",
              multiplier: session.result.multiplier,
              winAmount: session.result.winAmount,
              gameData: session.result.gameData,
              outcome: session.outcome,
            }
          : undefined,
        gameState: session.completed
          ? this.sanitizeGameData(session.currentState?.currentData)
          : undefined,
        serverSeedHash: session.serverSeedHash,
        updatedAt: session.updatedAt,
        createdAt: session.createdAt,
      }));
    } catch (error) {
      throw new Error(
        `Failed to get user game history: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  async getSupportedGames(): Promise<{ gameType: GameType; config: any }[]> {
    const supportedGames = GameFactory.getSupportedGames();
    return supportedGames.map((gameType) => ({
      gameType,
      config: GameFactory.getGameConfig(gameType),
    }));
  }

  private sanitizeGameState(gameState: any): any {
    if (!gameState) return null;

    const sanitized = { ...gameState };

    if (sanitized.currentData) {
      const currentData = { ...sanitized.currentData };
      delete currentData.serverSeed;
      sanitized.currentData = currentData;
    }

    return sanitized;
  }

  private sanitizeGameData(gameData: any): any {
    if (!gameData) return null;

    const sanitized = { ...gameData };
    delete sanitized.serverSeed;
    delete sanitized.deck;

    return sanitized;
  }

  async cancelGame(
    userId: string,
    sessionId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      const session = await this.sessionService.getBySessionId(
        sessionId,
        false
      );

      if (!session) {
        throw new Error("Game session not found");
      }

      if (session.userId.toString() !== userId) {
        throw new Error("Unauthorized access to game session");
      }

      if (session.completed) {
        throw new Error("Cannot cancel completed game");
      }

      await this.sessionService.cancelSession(session.id, reason);

      // Handle balance refund for balance-based games
      if (session.useBalance) {
        await this.balanceService.refundGame(
          session.userId,
          session.betAmount,
          session._id as any,
          session.gameType
        );
      }

      return true;
    } catch (error) {
      throw new Error(
        `Failed to cancel game: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }
}

export default new GameEngine();
