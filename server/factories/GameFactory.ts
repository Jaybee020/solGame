import { IGameProvider, GameType } from "../types/game";
import { BlackjackProvider } from "../providers/BlackjackProvider";
import { DiceProvider } from "../providers/DiceProvider";
import { SlotsProvider } from "../providers/SlotsProvider";
import { ShipCaptainCrewProvider } from "../providers/ShipCaptainCrewProvider";

export class GameFactory {
  private static providers: Map<GameType, IGameProvider> = new Map();

  static {
    GameFactory.registerProvider(new BlackjackProvider());
    GameFactory.registerProvider(new DiceProvider());
    GameFactory.registerProvider(new SlotsProvider());
    GameFactory.registerProvider(new ShipCaptainCrewProvider());
  }

  static registerProvider(provider: IGameProvider): void {
    if (!provider || !provider.gameType || !provider.config) {
      throw new Error("Invalid game provider");
    }
    GameFactory.providers.set(provider.gameType, provider);
  }

  static getProvider(gameType: GameType): IGameProvider {
    const provider = GameFactory.providers.get(gameType);
    if (!provider) {
      throw new Error(`Game provider not found for type: ${gameType}`);
    }
    return provider;
  }

  static getSupportedGames(): GameType[] {
    return Array.from(GameFactory.providers.keys());
  }

  static validateGameType(gameType: string): gameType is GameType {
    return GameFactory.providers.has(gameType as GameType);
  }

  static getGameConfig(gameType: GameType) {
    const provider = GameFactory.getProvider(gameType);
    return provider.config;
  }
}

export default GameFactory;
