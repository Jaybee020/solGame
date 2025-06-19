import { BaseGameProvider } from "./BaseGameProvider";
import {
  GameType,
  GameConfig,
  GameState,
  GameResult,
  GameMove,
} from "../types/game";

interface ShipCaptainCrewGameData {
  betAmount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  rolls: number[];
  rollNumber: number;
  hasShip: boolean;
  hasCaptain: boolean;
  hasCrew: boolean;
  cargoSum: number;
  gamePhase: "rolling" | "finished";
  maxRolls: number;
}

interface ShipCaptainCrewResult {
  rolls: number[];
  hasShip: boolean;
  hasCaptain: boolean;
  hasCrew: boolean;
  cargoSum: number;
  outcome: "win" | "lose";
  isWin: boolean;
  multiplier: number;
}

export class ShipCaptainCrewProvider extends BaseGameProvider {
  gameType: GameType = "shipcaptaincrew" as GameType;
  config: GameConfig = {
    minBet: 1,
    maxBet: 100,
    baseMultiplier: 1,
    houseEdge: 0.05,
  };

  private rollDice(
    serverSeed: string,
    clientSeed: string,
    nonce: number,
    count: number = 5
  ): number[] {
    const randoms = this.generateSecureRandoms(
      serverSeed,
      clientSeed,
      nonce,
      count
    );
    return randoms.map((random) => Math.floor(random * 6) + 1);
  }

  private calculateMultiplier(
    cargoSum: number,
    hasShip: boolean,
    hasCaptain: boolean,
    hasCrew: boolean
  ): number {
    if (!hasShip || !hasCaptain || !hasCrew) {
      return 0;
    }

    if (cargoSum === 12) {
      return 8;
    } else if (cargoSum >= 10) {
      return 4;
    } else if (cargoSum >= 7) {
      return 2;
    } else {
      return 1;
    }
  }

  private processRoll(dice: number[], gameData: ShipCaptainCrewGameData): void {
    const availableDice = [...dice];
    let cargoIndices: number[] = [];

    if (!gameData.hasShip && availableDice.includes(6)) {
      gameData.hasShip = true;
      const index = availableDice.indexOf(6);
      availableDice.splice(index, 1);
    }

    if (gameData.hasShip && !gameData.hasCaptain && availableDice.includes(5)) {
      gameData.hasCaptain = true;
      const index = availableDice.indexOf(5);
      availableDice.splice(index, 1);
    }

    if (gameData.hasCaptain && !gameData.hasCrew && availableDice.includes(4)) {
      gameData.hasCrew = true;
      const index = availableDice.indexOf(4);
      availableDice.splice(index, 1);
    }

    if (gameData.hasShip && gameData.hasCaptain && gameData.hasCrew) {
      gameData.cargoSum = Math.max(
        gameData.cargoSum,
        availableDice.reduce((sum, die) => sum + die, 0)
      );
    }
  }

  initializeGame(
    betAmount: number,
    serverSeed: string,
    clientSeed: string = "",
    nonce: number = 0
  ): GameState {
    const gameData: ShipCaptainCrewGameData = {
      betAmount,
      serverSeed,
      clientSeed,
      nonce,
      rolls: [],
      rollNumber: 0,
      hasShip: false,
      hasCaptain: false,
      hasCrew: false,
      cargoSum: 0,
      gamePhase: "rolling",
      maxRolls: 3,
    };

    return {
      gameType: this.gameType,
      status: "in_progress",
      currentData: gameData,
      history: [],
    };
  }

  async playGame(state: GameState, move?: GameMove): Promise<GameResult> {
    const gameData = state.currentData as ShipCaptainCrewGameData;

    if (gameData.gamePhase === "finished") {
      throw new Error("Game already finished");
    }

    if (!move || !move.action) {
      return this.autoPlay(gameData, state);
    }

    switch (move.action) {
      case "roll":
        return this.handleRoll(gameData, state);
      case "stop":
        return this.handleStop(gameData, state);
      default:
        return this.autoPlay(gameData, state);
    }
  }

  private async autoPlay(
    gameData: ShipCaptainCrewGameData,
    state: GameState
  ): Promise<GameResult> {
    while (
      gameData.rollNumber < gameData.maxRolls &&
      gameData.gamePhase === "rolling"
    ) {
      const dice = this.rollDice(
        gameData.serverSeed,
        gameData.clientSeed,
        gameData.nonce + gameData.rollNumber,
        5
      );
      gameData.rolls.push(...dice);
      gameData.rollNumber++;

      this.processRoll(dice, gameData);

      if (
        gameData.hasShip &&
        gameData.hasCaptain &&
        gameData.hasCrew &&
        gameData.cargoSum === 12
      ) {
        break;
      }
    }

    return this.finishGame(gameData, state);
  }

  private async handleRoll(
    gameData: ShipCaptainCrewGameData,
    state: GameState
  ): Promise<GameResult> {
    if (gameData.rollNumber >= gameData.maxRolls) {
      return this.finishGame(gameData, state);
    }

    const dice = this.rollDice(
      gameData.serverSeed,
      gameData.clientSeed,
      gameData.nonce + gameData.rollNumber,
      5
    );
    gameData.rolls.push(...dice);
    gameData.rollNumber++;

    this.processRoll(dice, gameData);

    if (
      gameData.rollNumber >= gameData.maxRolls ||
      (gameData.hasShip &&
        gameData.hasCaptain &&
        gameData.hasCrew &&
        gameData.cargoSum === 12)
    ) {
      return this.finishGame(gameData, state);
    }

    state.currentData = gameData;
    return {
      isWin: false,
      multiplier: 0,
      winAmount: 0,
      gameData: {
        rolls: gameData.rolls.slice(-5),
        rollNumber: gameData.rollNumber,
        hasShip: gameData.hasShip,
        hasCaptain: gameData.hasCaptain,
        hasCrew: gameData.hasCrew,
        cargoSum: gameData.cargoSum,
        gamePhase: gameData.gamePhase,
      },
      outcome: {
        action: "roll",
        rollNumber: gameData.rollNumber,
        status: "continue",
      },
    };
  }

  private async handleStop(
    gameData: ShipCaptainCrewGameData,
    state: GameState
  ): Promise<GameResult> {
    return this.finishGame(gameData, state);
  }

  private finishGame(
    gameData: ShipCaptainCrewGameData,
    state: GameState
  ): GameResult {
    gameData.gamePhase = "finished";
    state.status = "completed";

    const multiplier = this.calculateMultiplier(
      gameData.cargoSum,
      gameData.hasShip,
      gameData.hasCaptain,
      gameData.hasCrew
    );
    const isWin = multiplier > 0;
    const winAmount = this.calculateWinnings(gameData.betAmount, multiplier);

    const result: ShipCaptainCrewResult = {
      rolls: gameData.rolls,
      hasShip: gameData.hasShip,
      hasCaptain: gameData.hasCaptain,
      hasCrew: gameData.hasCrew,
      cargoSum: gameData.cargoSum,
      outcome: isWin ? "win" : "lose",
      isWin,
      multiplier,
    };

    state.history.push(result);

    return {
      isWin,
      multiplier,
      winAmount,
      gameData: result,
      outcome: {
        hasShip: gameData.hasShip,
        hasCaptain: gameData.hasCaptain,
        hasCrew: gameData.hasCrew,
        cargoSum: gameData.cargoSum,
        multiplier,
        totalRolls: gameData.rollNumber,
      },
    };
  }
}
