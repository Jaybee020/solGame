import { GameType, GameConfig } from '../types/game';

export const GAME_CONFIGS: Record<GameType, GameConfig> = {
  blackjack: {
    minBet: 0.01,
    maxBet: 100,
    baseMultiplier: 2,
    houseEdge: 0.005
  },
  dice: {
    minBet: 0.001,
    maxBet: 100,
    baseMultiplier: 1,
    houseEdge: 0.01
  },
  slots: {
    minBet: 0.01,
    maxBet: 50,
    baseMultiplier: 1,
    houseEdge: 0.04
  },
  shipcaptaincrew: {
    minBet: 0.01,
    maxBet: 50,
    baseMultiplier: 2,
    houseEdge: 0.02
  }
};

export const GAME_SETTINGS = {
  maxActiveSessions: 10,
  sessionTimeoutMinutes: 30,
  maxBetHistory: 1000,
  suspiciousActivityThreshold: 5
};

export function getGameConfig(gameType: GameType): GameConfig {
  return GAME_CONFIGS[gameType];
}

export function validateGameConfig(gameType: GameType, betAmount: number): boolean {
  const config = getGameConfig(gameType);
  return betAmount >= config.minBet && betAmount <= config.maxBet;
}