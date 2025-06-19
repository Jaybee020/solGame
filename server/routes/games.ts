import express, { Request, Response } from "express";
import Joi from "joi";
import { authenticatetoken, Req } from "../services/api/auth/auth";
import GameEngine from "../services/GameEngine";
import { CreateGameRequest, PlayGameRequest, GameType } from "../types/game";

const gameRouter = express.Router();

/**
 * @openapi
 * /games/supported:
 *   get:
 *     tags:
 *       - "Games"
 *     security:
 *       - bearerAuth: []
 *     description: Get list of supported games and their configurations
 *     responses:
 *       200:
 *         description: List of supported games
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       gameType:
 *                         type: string
 *                         enum: [blackjack, dice, slots]
 *                       config:
 *                         type: object
 */
gameRouter.get("/supported", async (req: Req, res: Response): Promise<void> => {
  try {
    const supportedGames = await GameEngine.getSupportedGames();
    res.status(200).json({
      success: true,
      data: supportedGames,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * @openapi
 * /games/create:
 *   post:
 *     tags:
 *       - "Games"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - gameType
 *               - betAmount
 *             properties:
 *               gameType:
 *                 type: string
 *                 enum: [blackjack, dice, slots]
 *               betAmount:
 *                 type: number
 *                 minimum: 0.001
 *               clientSeed:
 *                 type: string
 *               deviceFingerprint:
 *                 type: string
 *     description: Create a new game session
 *     responses:
 *       201:
 *         description: Game session created successfully
 *       400:
 *         description: Invalid request or bet amount
 *       422:
 *         description: Validation error
 */
gameRouter.post(
  "/create",
  authenticatetoken,
  async (req: Req, res: Response): Promise<void> => {
    try {
      const {
        gameType,
        betAmount,
        clientSeed,
        deviceFingerprint,
        depositTxHash,
      } = req.body;

      const schema = Joi.object({
        gameType: Joi.string()
          .valid("blackjack", "dice", "slots", "shipcaptaincrew")
          .required(),
        betAmount: Joi.number().positive().required(),
        clientSeed: Joi.string().optional(),
        deviceFingerprint: Joi.string().optional(),
        depositTxHash: Joi.string().required(),
      });

      const { error } = schema.validate({
        gameType,
        betAmount,
        clientSeed,
        deviceFingerprint,
        depositTxHash,
      });
      if (error) {
        res.status(422).json({
          success: false,
          message: "Invalid request",
          error: error.details[0].message,
        });
        return;
      }

      const userId = req.user?._id?.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });

        return;
      }

      const createGameRequest: CreateGameRequest = {
        gameType: gameType as GameType,
        betAmount,
        clientSeed,
        deviceFingerprint,
      };

      const clientInfo = {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
      };

      const gameResponse = await GameEngine.createGame(
        userId,
        createGameRequest,
        depositTxHash,
        clientInfo
      );

      res.status(201).json({
        success: true,
        data: gameResponse,
      });
      return;
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @openapi
 * /games/play:
 *   post:
 *     tags:
 *       - "Games"
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sessionId
 *             properties:
 *               sessionId:
 *                 type: string
 *               move:
 *                 type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                   data:
 *                     type: object
 *                   operationId:
 *                     type: string
 *     description: Make a move in an existing game session
 *     responses:
 *       200:
 *         description: Move processed successfully
 *       400:
 *         description: Invalid move or session
 *       404:
 *         description: Session not found
 */
gameRouter.post("/play", authenticatetoken, async (req: Req, res: Response) => {
  try {
    const { sessionId, move } = req.body;

    const schema = Joi.object({
      sessionId: Joi.string().required(),
      move: Joi.object({
        action: Joi.string().required(),
        data: Joi.object().optional(),
        operationId: Joi.string().optional(),
      }).optional(),
    });

    const { error } = schema.validate({ sessionId, move });
    if (error) {
      res.status(422).json({
        success: false,
        message: "Invalid request",
        error: error.details[0].message,
      });
      return;
    }

    const userId = req.user?._id?.toString();
    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated",
      });
      return;
    }

    const playGameRequest: PlayGameRequest = {
      sessionId,
      move,
    };

    const gameResponse = await GameEngine.playGame(userId, playGameRequest);

    res.status(200).json({
      success: true,
      data: gameResponse,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

/**
 * @openapi
 * /games/session/{sessionId}:
 *   get:
 *     tags:
 *       - "Games"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     description: Get game session details
 *     responses:
 *       200:
 *         description: Game session details
 *       404:
 *         description: Session not found
 */
gameRouter.get(
  "/session/:sessionId",
  authenticatetoken,
  async (req: Req, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;

      if (!sessionId) {
        res.status(422).json({
          success: false,
          message: "Session ID is required",
        });
        return;
      }

      const userId = req.user?._id?.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const gameSession = await GameEngine.getGameSession(userId, sessionId);

      if (!gameSession) {
        res.status(404).json({
          success: false,
          message: "Game session not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: gameSession,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @openapi
 * /games/history:
 *   get:
 *     tags:
 *       - "Games"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: gameType
 *         schema:
 *           type: string
 *           enum: [blackjack, dice, slots]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     description: Get user's game history
 *     responses:
 *       200:
 *         description: User's game history
 */
gameRouter.get(
  "/history",
  authenticatetoken,
  async (req: Req, res: Response): Promise<void> => {
    try {
      const { gameType, limit } = req.query;

      const schema = Joi.object({
        gameType: Joi.string()
          .valid("blackjack", "dice", "slots", "shipcaptaincrew")
          .optional(),
        limit: Joi.number().integer().min(1).max(100).optional(),
      });

      const { error } = schema.validate({ gameType, limit });
      if (error) {
        res.status(422).json({
          success: false,
          message: "Invalid request",
          error: error.details[0].message,
        });
        return;
      }

      const userId = req.user?._id?.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const gameHistory = await GameEngine.getUserGameHistory(
        userId,
        gameType as GameType,
        limit ? parseInt(limit as string) : 50
      );

      res.status(200).json({
        success: true,
        data: gameHistory,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

/**
 * @openapi
 * /games/cancel/{sessionId}:
 *   post:
 *     tags:
 *       - "Games"
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *     description: Cancel a game session
 *     responses:
 *       200:
 *         description: Game session cancelled successfully
 *       404:
 *         description: Session not found
 */
gameRouter.post(
  "/cancel/:sessionId",
  authenticatetoken,
  async (req: Req, res: Response): Promise<void> => {
    try {
      const { sessionId } = req.params;
      const { reason } = req.body;

      if (!sessionId) {
        res.status(422).json({
          success: false,
          message: "Session ID is required",
        });
        return;
      }

      const userId = req.user?._id?.toString();
      if (!userId) {
        res.status(401).json({
          success: false,
          message: "User not authenticated",
        });
        return;
      }

      const cancelled = await GameEngine.cancelGame(userId, sessionId, reason);

      res.status(200).json({
        success: true,
        data: { cancelled },
        message: "Game session cancelled successfully",
      });
      return;
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      return;
    }
  }
);

export default gameRouter;
