export type GameType = 'blackjack' | 'dice' | 'slots' | 'shipcaptaincrew';

export interface GameConfig {
  minBet: number;
  maxBet: number;
  baseMultiplier: number;
  houseEdge: number;
}

export interface GameResult {
  isWin: boolean;
  multiplier: number;
  winAmount: number;
  gameData: any;
  outcome: any;
}

export interface GameState {
  gameType: GameType;
  status: 'created' | 'in_progress' | 'completed';
  currentData: any;
  history: any[];
}

export interface GameMove {
  action: string;
  data?: any;
  operationId: string;
}

export interface IGameProvider {
  gameType: GameType;
  config: GameConfig;
  
  initializeGame(betAmount: number, serverSeed: string, clientSeed?: string, nonce?: number): GameState;
  playGame(state: GameState, move?: GameMove): Promise<GameResult>;
  validateBet(betAmount: number): boolean;
  calculateWinnings(betAmount: number, multiplier: number): number;
}

export interface CreateGameRequest {
  gameType: GameType;
  betAmount: number;
  clientSeed?: string;
  deviceFingerprint?: string;
}

export interface PlayGameRequest {
  sessionId: string;
  move?: GameMove;
}

export interface GameResponse {
  sessionId: string;
  gameType: GameType;
  betAmount: number;
  status: string;
  result?: GameResult;
  gameState?: any;
  serverSeedHash: string;
}