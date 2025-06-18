import { BaseGameProvider } from './BaseGameProvider';
import { GameType, GameConfig, GameState, GameResult, GameMove } from '../types/game';

interface SlotsGameData {
  betAmount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  paylines: number;
}

interface SlotsResult {
  reels: number[][];
  paylines: Array<{line: number[], multiplier: number}>;
  totalMultiplier: number;
  isWin: boolean;
}

export class SlotsProvider extends BaseGameProvider {
  gameType: GameType = 'slots';
  config: GameConfig = {
    minBet: 0.01,
    maxBet: 50,
    baseMultiplier: 1,
    houseEdge: 0.04
  };

  private readonly SYMBOLS = [0, 1, 2, 3, 4, 5, 6, 7];
  private readonly REEL_SIZE = 3;
  private readonly NUM_REELS = 5;
  
  private readonly PAYOUTS = new Map([
    [7, [0, 0, 100, 500, 2000]],
    [6, [0, 0, 50, 200, 1000]],
    [5, [0, 0, 25, 100, 500]],
    [4, [0, 0, 15, 75, 300]],
    [3, [0, 0, 10, 50, 200]],
    [2, [0, 5, 25, 100]],
    [1, [0, 3, 15, 75]],
    [0, [0, 2, 10, 50]]
  ]);

  initializeGame(betAmount: number, serverSeed: string, clientSeed: string = '', nonce: number = 0): GameState {
    const gameData: SlotsGameData = {
      betAmount,
      serverSeed,
      clientSeed,
      nonce,
      paylines: 25
    };

    return {
      gameType: this.gameType,
      status: 'created',
      currentData: gameData,
      history: []
    };
  }

  async playGame(state: GameState, move?: GameMove): Promise<GameResult> {
    const gameData = state.currentData as SlotsGameData;
    
    const randoms = this.generateSecureRandoms(
      gameData.serverSeed, 
      gameData.clientSeed, 
      gameData.nonce, 
      this.NUM_REELS * this.REEL_SIZE
    );

    const reels: number[][] = [];
    let randomIndex = 0;

    for (let i = 0; i < this.NUM_REELS; i++) {
      const reel: number[] = [];
      for (let j = 0; j < this.REEL_SIZE; j++) {
        const symbolIndex = Math.floor(randoms[randomIndex] * this.SYMBOLS.length);
        reel.push(this.SYMBOLS[symbolIndex]);
        randomIndex++;
      }
      reels.push(reel);
    }

    const paylines = this.calculatePaylines(reels);
    const totalMultiplier = paylines.reduce((sum, line) => sum + line.multiplier, 0);
    const isWin = totalMultiplier > 0;
    
    const winAmount = this.calculateWinnings(gameData.betAmount, totalMultiplier);

    const result: SlotsResult = {
      reels,
      paylines,
      totalMultiplier,
      isWin
    };

    state.status = 'completed';
    state.history.push(result);

    return {
      isWin,
      multiplier: totalMultiplier,
      winAmount,
      gameData: result,
      outcome: { reels, totalMultiplier, isWin }
    };
  }

  private calculatePaylines(reels: number[][]): Array<{line: number[], multiplier: number}> {
    const paylines: Array<{line: number[], multiplier: number}> = [];
    
    for (let row = 0; row < this.REEL_SIZE; row++) {
      const line: number[] = [];
      for (let reel = 0; reel < this.NUM_REELS; reel++) {
        line.push(reels[reel][row]);
      }
      
      const multiplier = this.calculateLineMultiplier(line);
      if (multiplier > 0) {
        paylines.push({ line, multiplier });
      }
    }

    return paylines;
  }

  private calculateLineMultiplier(line: number[]): number {
    if (line.length < 3) return 0;

    const firstSymbol = line[0];
    let consecutiveCount = 1;
    
    for (let i = 1; i < line.length; i++) {
      if (line[i] === firstSymbol) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    if (consecutiveCount >= 3) {
      const payoutTable = this.PAYOUTS.get(firstSymbol);
      if (payoutTable && payoutTable[consecutiveCount - 1]) {
        return payoutTable[consecutiveCount - 1];
      }
    }

    return 0;
  }
}