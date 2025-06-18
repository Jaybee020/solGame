import * as Factory from "factory.ts";
import {
  CreateGameRequest,
  PlayGameRequest,
  GameType,
  GameMove,
} from "../../types/game";
import { secureRandomString } from "../../utils/secureRandomness";

export const createGameRequestFactory =
  Factory.Sync.makeFactory<CreateGameRequest>({
    gameType: Factory.each(
      (i) => (["blackjack", "dice", "slots"] as GameType[])[i % 3]
    ),
    betAmount: Factory.each((i) => 0.1 + i * 0.05),
    clientSeed: Factory.each((i) => `client_seed_${i}`),

    deviceFingerprint: Factory.each((i) => `device_${i}`),
  });

export const gameMoveFactory = Factory.Sync.makeFactory<GameMove>({
  action: Factory.each((i) => ["hit", "stand", "double"][i % 3]),
  data: {},
  operationId: Factory.each((i) => secureRandomString(16)),
});

export const playGameRequestFactory = Factory.Sync.makeFactory<PlayGameRequest>(
  {
    sessionId: Factory.each((i) => secureRandomString(24)),
    move: Factory.each((i) => gameMoveFactory.build()),
  }
);
