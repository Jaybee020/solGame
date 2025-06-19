import { BaseGameProvider } from "./BaseGameProvider";
import {
  GameType,
  GameConfig,
  GameState,
  GameResult,
  GameMove,
} from "../types/game";

type CryptoTheme = "BTC" | "ETH" | "SOL";

interface SlotSymbol {
  id: string;
  name: string;
  weight: number;
  multipliers: { [key: number]: number };
  isCrypto?: boolean;
  theme?: CryptoTheme;
}

interface SlotsGameData {
  betAmount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  paylines: number;
  theme?: CryptoTheme;
}

interface SlotsResult {
  reels: string[][];
  paylines: Array<{ line: string[]; multiplier: number; symbolCount: number }>;
  totalMultiplier: number;
  isWin: boolean;
  theme?: CryptoTheme;
}

export class SlotsProvider extends BaseGameProvider {
  gameType: GameType = "slots";
  config: GameConfig = {
    minBet: 1,
    maxBet: 50,
    baseMultiplier: 1,
    houseEdge: 0.03, // Updated for 97% RTP
  };

  private readonly REEL_SIZE = 3;
  private readonly NUM_REELS = 5;

  private readonly SYMBOLS: SlotSymbol[] = [
    // Fruit symbols (common) - any fruit combo gives 1.5x
    {
      id: "cherry",
      name: "Cherry",
      weight: 150,
      multipliers: { 3: 1.5, 4: 3, 5: 6 },
    },
    {
      id: "lemon",
      name: "Lemon",
      weight: 150,
      multipliers: { 3: 1.5, 4: 3, 5: 6 },
    },
    {
      id: "orange",
      name: "Orange",
      weight: 150,
      multipliers: { 3: 1.5, 4: 3, 5: 6 },
    },
    {
      id: "plum",
      name: "Plum",
      weight: 150,
      multipliers: { 3: 1.5, 4: 3, 5: 6 },
    },

    // Mid-tier symbols
    {
      id: "bell",
      name: "Bell",
      weight: 100,
      multipliers: { 3: 2, 4: 5, 5: 10 },
    },
    { id: "bar", name: "Bar", weight: 80, multipliers: { 3: 3, 4: 8, 5: 15 } },
    {
      id: "seven",
      name: "Seven",
      weight: 60,
      multipliers: { 3: 5, 4: 12, 5: 20 },
    },

    // Crypto symbols (rare)
    {
      id: "btc",
      name: "Bitcoin",
      weight: 10,
      multipliers: { 3: 25, 4: 50, 5: 100 },
      isCrypto: true,
      theme: "BTC",
    },
    {
      id: "eth",
      name: "Ethereum",
      weight: 15,
      multipliers: { 3: 20, 4: 40, 5: 80 },
      isCrypto: true,
      theme: "ETH",
    },
    {
      id: "sol",
      name: "Solana",
      weight: 20,
      multipliers: { 3: 15, 4: 30, 5: 60 },
      isCrypto: true,
      theme: "SOL",
    },
  ];

  private getSymbolsForTheme(theme?: CryptoTheme): SlotSymbol[] {
    if (!theme) return this.SYMBOLS;

    return this.SYMBOLS.map((symbol) => {
      if (symbol.isCrypto && symbol.theme !== theme) {
        // Reduce weight of other crypto symbols
        return { ...symbol, weight: Math.floor(symbol.weight * 0.3) };
      }
      if (symbol.isCrypto && symbol.theme === theme) {
        // Increase weight of themed crypto symbol
        return { ...symbol, weight: Math.floor(symbol.weight * 2) };
      }
      return symbol;
    });
  }

  private createWeightedPool(symbols: SlotSymbol[]): string[] {
    const pool: string[] = [];
    for (const symbol of symbols) {
      for (let i = 0; i < symbol.weight; i++) {
        pool.push(symbol.id);
      }
    }
    return pool;
  }

  private getSymbolById(id: string): SlotSymbol | undefined {
    return this.SYMBOLS.find((symbol) => symbol.id === id);
  }

  initializeGame(
    betAmount: number,
    serverSeed: string,
    clientSeed: string = "",
    nonce: number = 0,
    theme?: CryptoTheme
  ): GameState {
    const gameData: SlotsGameData = {
      betAmount,
      serverSeed,
      clientSeed,
      nonce,
      paylines: 25,
      theme,
    };

    return {
      gameType: this.gameType,
      status: "created",
      currentData: gameData,
      history: [],
    };
  }

  async playGame(state: GameState, move?: GameMove): Promise<GameResult> {
    const gameData = state.currentData as SlotsGameData;

    const symbols = this.getSymbolsForTheme(gameData.theme);
    const weightedPool = this.createWeightedPool(symbols);

    const randoms = this.generateSecureRandoms(
      gameData.serverSeed,
      gameData.clientSeed,
      gameData.nonce,
      this.NUM_REELS * this.REEL_SIZE
    );

    const reels: string[][] = [];
    let randomIndex = 0;

    for (let i = 0; i < this.NUM_REELS; i++) {
      const reel: string[] = [];
      for (let j = 0; j < this.REEL_SIZE; j++) {
        const poolIndex = Math.floor(
          randoms[randomIndex] * weightedPool.length
        );
        reel.push(weightedPool[poolIndex]);
        randomIndex++;
      }
      reels.push(reel);
    }

    const paylines = this.calculatePaylines(reels);
    const totalMultiplier = paylines.reduce(
      (sum, line) => sum + line.multiplier,
      0
    );
    const isWin = totalMultiplier > 0;

    const winAmount = this.calculateWinnings(
      gameData.betAmount,
      totalMultiplier
    );

    const result: SlotsResult = {
      reels,
      paylines,
      totalMultiplier,
      isWin,
      theme: gameData.theme,
    };

    state.status = "completed";
    state.history.push(result);

    return {
      isWin,
      multiplier: totalMultiplier,
      winAmount,
      gameData: result,
      outcome: { reels, totalMultiplier, isWin, theme: gameData.theme },
    };
  }

  private calculatePaylines(
    reels: string[][]
  ): Array<{ line: string[]; multiplier: number; symbolCount: number }> {
    const paylines: Array<{
      line: string[];
      multiplier: number;
      symbolCount: number;
    }> = [];

    // Check horizontal paylines
    for (let row = 0; row < this.REEL_SIZE; row++) {
      const line: string[] = [];
      for (let reel = 0; reel < this.NUM_REELS; reel++) {
        line.push(reels[reel][row]);
      }

      const result = this.calculateLineMultiplier(line);
      if (result.multiplier > 0) {
        paylines.push({
          line,
          multiplier: result.multiplier,
          symbolCount: result.count,
        });
      }
    }

    // Check diagonal paylines (top-left to bottom-right and top-right to bottom-left)
    if (this.REEL_SIZE >= 3) {
      const diagonalLine1: string[] = [];
      const diagonalLine2: string[] = [];

      for (let i = 0; i < Math.min(this.NUM_REELS, this.REEL_SIZE); i++) {
        diagonalLine1.push(reels[i][i]);
        diagonalLine2.push(reels[i][this.REEL_SIZE - 1 - i]);
      }

      const diagonal1Result = this.calculateLineMultiplier(diagonalLine1);
      if (diagonal1Result.multiplier > 0) {
        paylines.push({
          line: diagonalLine1,
          multiplier: diagonal1Result.multiplier,
          symbolCount: diagonal1Result.count,
        });
      }

      const diagonal2Result = this.calculateLineMultiplier(diagonalLine2);
      if (diagonal2Result.multiplier > 0) {
        paylines.push({
          line: diagonalLine2,
          multiplier: diagonal2Result.multiplier,
          symbolCount: diagonal2Result.count,
        });
      }
    }

    return paylines;
  }

  private calculateLineMultiplier(line: string[]): {
    multiplier: number;
    count: number;
  } {
    if (line.length < 3) return { multiplier: 0, count: 0 };

    const firstSymbol = line[0];
    let consecutiveCount = 1;

    for (let i = 1; i < line.length; i++) {
      if (line[i] === firstSymbol) {
        consecutiveCount++;
      } else {
        break;
      }
    }

    // Check for any fruit combination (different fruits)
    if (consecutiveCount < 3) {
      const fruitSymbols = ["cherry", "lemon", "orange", "plum"];
      const fruitCount = line.filter((symbol) =>
        fruitSymbols.includes(symbol)
      ).length;

      if (fruitCount >= 3) {
        return { multiplier: 1.5, count: fruitCount };
      }
    }

    if (consecutiveCount >= 3) {
      const symbol = this.getSymbolById(firstSymbol);
      if (symbol && symbol.multipliers[consecutiveCount]) {
        return {
          multiplier: symbol.multipliers[consecutiveCount],
          count: consecutiveCount,
        };
      }
    }

    return { multiplier: 0, count: 0 };
  }

  // Public method to support themed games
  initializeThemedGame(
    betAmount: number,
    serverSeed: string,
    theme: CryptoTheme,
    clientSeed: string = "",
    nonce: number = 0
  ): GameState {
    return this.initializeGame(betAmount, serverSeed, clientSeed, nonce, theme);
  }

  // Method to get available themes
  getAvailableThemes(): CryptoTheme[] {
    return ["BTC", "ETH", "SOL"];
  }

  // Method to get symbol information for a theme
  getThemeSymbols(theme?: CryptoTheme): SlotSymbol[] {
    return this.getSymbolsForTheme(theme);
  }

  // Calculate theoretical RTP
  calculateTheoreticalRTP(): number {
    return (1 - this.config.houseEdge) * 100;
  }

  // Get all available symbols
  getAllSymbols(): SlotSymbol[] {
    return this.SYMBOLS;
  }
}
