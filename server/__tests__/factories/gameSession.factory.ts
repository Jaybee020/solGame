import * as Factory from "factory.ts";
import { IGameSession, GameType, GameStatus } from "../../models/GameSession";
import { Types } from "mongoose";
import {
  secureRandomString,
  generateSecureSeed,
  createServerSeedHash,
} from "../../utils/secureRandomness";

export const gameSessionFactory = Factory.Sync.makeFactory<
  Partial<IGameSession>
>({
  _id: Factory.each((i) => new Types.ObjectId()),
  userId: Factory.each((i) => new Types.ObjectId()),
  gameType: Factory.each(
    (i) => (["blackjack", "dice", "slots"] as GameType[])[i % 3]
  ),
  sessionId: Factory.each((i) => secureRandomString(24)),
  betAmount: Factory.each((i) => 0.1 + i * 0.05),
  bet: Factory.each((i) => 0.1 + i * 0.05),
  initialState: {
    gameType: "dice",
    status: "created",
    currentData: { target: 50, isOver: true },
    history: [],
  },
  currentState: {
    gameType: "dice",
    status: "created",
    currentData: { target: 50, isOver: true },
    history: [],
  },
  createdAt: Factory.each(() => new Date()),
  updatedAt: Factory.each(() => new Date()),
  expiresAt: Factory.each(() => new Date(Date.now() + 30 * 60 * 1000)),
  completed: false,
  serverSeed: generateSecureSeed(32),
  clientSeed: Factory.each((i) => `client_seed_${i}`),
  serverSeedHash: Factory.each((i) =>
    createServerSeedHash(generateSecureSeed(32))
  ),
  winAmount: 0,
  status: "created" as GameStatus,
  nonce: Factory.each((i) => Math.floor(Math.random() * 1000000)),
  ipAddress: Factory.each((i) => `192.168.1.${(i % 255) + 1}`),
  userAgent: "Mozilla/5.0 (Test Browser)",
  deviceFingerprint: Factory.each((i) => `device_${i}`),
  actionSequence: [],
  operationIds: [],
  payoutProcessed: false,
  validationChecks: {},
  suspiciousActivity: [],
});
