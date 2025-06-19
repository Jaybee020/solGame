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
  target: number;
  isOver: boolean;
}

interface DiceResult {
  roll: number;
  target: number;
  isOver: boolean;
  isWin: boolean;
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
      target: 50,
      isOver: true,
    };

    return {
      gameType: this.gameType,
      status: "created",
      currentData: gameData,
      history: [],
    };
  }

  async playGame(state: GameState, move?: GameMove): Promise<GameResult> {
    const gameData = state.currentData as DiceGameData;

    if (move) {
      if (move.data?.target !== undefined) {
        gameData.target = Math.max(0.01, Math.min(99.99, move.data.target));
      }
      if (move.data?.isOver !== undefined) {
        gameData.isOver = move.data.isOver;
      }
    }

    const random = this.generateRandomNumber(
      gameData.serverSeed,
      gameData.clientSeed,
      gameData.nonce
    );
    const roll = Math.floor(random * 10000) / 100;

    const isWin = gameData.isOver
      ? roll > gameData.target
      : roll < gameData.target;

    const winChance = gameData.isOver
      ? (100 - gameData.target) / 100
      : gameData.target / 100;
    const payout = (1 - this.config.houseEdge) / winChance;

    const multiplier = isWin ? payout : 0;
    const winAmount = this.calculateWinnings(gameData.betAmount, multiplier);

    const result: DiceResult = {
      roll,
      target: gameData.target,
      isOver: gameData.isOver,
      isWin,
    };

    state.status = "completed";
    state.history.push(result);

    return {
      isWin,
      multiplier,
      winAmount,
      gameData: result,
      outcome: { roll, isWin, multiplier },
    };
  }
}
