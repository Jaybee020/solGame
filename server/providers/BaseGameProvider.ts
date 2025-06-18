import { IGameProvider, GameType, GameConfig, GameState, GameResult, GameMove } from '../types/game';
import * as crypto from 'crypto';

export abstract class BaseGameProvider implements IGameProvider {
  abstract gameType: GameType;
  abstract config: GameConfig;

  validateBet(betAmount: number): boolean {
    return betAmount >= this.config.minBet && betAmount <= this.config.maxBet;
  }

  calculateWinnings(betAmount: number, multiplier: number): number {
    return Math.floor(betAmount * multiplier);
  }

  protected generateRandomNumber(serverSeed: string, clientSeed: string = '', nonce: number = 0): number {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    const randomValue = parseInt(hash.substring(0, 8), 16);
    return randomValue / 0xffffffff;
  }

  protected generateSecureRandoms(serverSeed: string, clientSeed: string = '', nonce: number = 0, count: number = 1): number[] {
    const randoms: number[] = [];
    for (let i = 0; i < count; i++) {
      randoms.push(this.generateRandomNumber(serverSeed, clientSeed, nonce + i));
    }
    return randoms;
  }

  abstract initializeGame(betAmount: number, serverSeed: string, clientSeed?: string, nonce?: number): GameState;
  abstract playGame(state: GameState, move?: GameMove): Promise<GameResult>;
}