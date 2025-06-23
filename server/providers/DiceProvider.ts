import { BaseGameProvider } from "./BaseGameProvider";
import {
  GameType,
  GameConfig,
  GameState,
  GameResult,
  GameMove,
} from "../types/game";

interface DiceGameData {
  betAmount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  target?: number;
  isOver?: boolean;
  hasRolled?: boolean;
  targetSet?: boolean;
}

interface DiceResult {
  roll?: number;
  target?: number;
  isOver?: boolean;
  isWin?: boolean;
  diceResult?: number;
  prediction?: string;
  targetNumber?: number;
  hasRolled?: boolean;
  targetSet?: boolean;
}

export class DiceProvider extends BaseGameProvider {
  gameType: GameType = "dice";
  config: GameConfig = {
    minBet: 1,
    maxBet: 100,
    baseMultiplier: 1,
    houseEdge: 0.01,
  };

  initializeGame(
    betAmount: number,
    serverSeed: string,
    clientSeed: string = "",
    nonce: number = 0
  ): GameState {
    const gameData: DiceGameData = {
      betAmount,
      serverSeed,
      clientSeed,
      nonce,
      hasRolled: false,
      targetSet: false,
    };

    return {
      gameType: this.gameType,
      status: "in_progress",
      currentData: gameData,
      history: [],
    };
  }

  async playGame(state: GameState, move?: GameMove): Promise<GameResult> {
    const gameData = state.currentData as DiceGameData;

    if (!move) {
      // Return current state without rolling
      return {
        isWin: false,
        multiplier: 0,
        winAmount: 0,
        gameData: {
          hasRolled: gameData.hasRolled || false,
          targetSet: gameData.targetSet || false,
          target: gameData.target,
          isOver: gameData.isOver,
          prediction: gameData.isOver ? 'over' : 'under',
          targetNumber: gameData.target,
        },
        outcome: { status: 'waiting' },
      };
    }

    // Handle setting target
    if (move.action === 'set_target') {
      if (move.data?.target !== undefined) {
        gameData.target = Math.max(1, Math.min(99, move.data.target));
      }
      if (move.data?.isOver !== undefined) {
        gameData.isOver = move.data.isOver;
      }
      gameData.targetSet = true;

      return {
        isWin: false,
        multiplier: 0,
        winAmount: 0,
        gameData: {
          hasRolled: false,
          targetSet: true,
          target: gameData.target,
          isOver: gameData.isOver,
          prediction: gameData.isOver ? 'over' : 'under',
          targetNumber: gameData.target,
        },
        outcome: { status: 'target_set' },
      };
    }

    // Handle dice roll
    if (move.action === 'roll') {
      // Update target and prediction if provided
      if (move.data?.target !== undefined) {
        gameData.target = Math.max(1, Math.min(99, move.data.target));
      }
      if (move.data?.isOver !== undefined) {
        gameData.isOver = move.data.isOver;
      }

      // Ensure we have target and prediction
      if (gameData.target === undefined || gameData.isOver === undefined) {
        throw new Error('Target and prediction must be set before rolling');
      }

      const random = this.generateRandomNumber(
        gameData.serverSeed,
        gameData.clientSeed,
        gameData.nonce
      );
      const roll = Math.floor(random * 100) + 1; // 1-100 instead of 0.01-99.99

      const isWin = gameData.isOver
        ? roll > gameData.target
        : roll < gameData.target;

      const winChance = gameData.isOver
        ? (100 - gameData.target) / 100
        : gameData.target / 100;
      const payout = winChance > 0 ? (1 - this.config.houseEdge) / winChance : 0;

      const multiplier = isWin ? payout : 0;
      const winAmount = this.calculateWinnings(gameData.betAmount, multiplier);

      gameData.hasRolled = true;
      state.status = "completed";

      const result: DiceResult = {
        roll,
        diceResult: roll,
        target: gameData.target,
        targetNumber: gameData.target,
        isOver: gameData.isOver,
        prediction: gameData.isOver ? 'over' : 'under',
        isWin,
        hasRolled: true,
        targetSet: true,
      };

      state.history.push(result);

      return {
        isWin,
        multiplier,
        winAmount,
        gameData: result,
        outcome: { roll, isWin, multiplier },
      };
    }

    // Default case - return current state
    return {
      isWin: false,
      multiplier: 0,
      winAmount: 0,
      gameData: {
        hasRolled: gameData.hasRolled || false,
        targetSet: gameData.targetSet || false,
        target: gameData.target,
        isOver: gameData.isOver,
        prediction: gameData.isOver ? 'over' : 'under',
        targetNumber: gameData.target,
      },
      outcome: { status: 'waiting' },
    };
  }
}
