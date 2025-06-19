import mongoose, { Schema, Document, Types } from "mongoose";
import {
  secureRandomString,
  generateSecureSeed,
  createServerSeedHash,
} from "../utils/secureRandomness";

export type GameType = "slots" | "dice" | "blackjack" | "shipcaptaincrew";
export type GameStatus =
  | "created"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "error";

export interface IGameSession extends Document {
  userId: Types.ObjectId;
  gameType: GameType;
  sessionId: string;
  betAmount: number;
  initialState: any;
  currentState: any;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
  completed: boolean;
  serverSeed: string;
  clientSeed?: string;
  serverSeedHash: string;
  result?: {
    winAmount: number;
    multiplier: number;
    gameData: any;
  };
  bet: number;
  winAmount?: number;
  status: GameStatus;
  outcome?: any;
  nonce?: number;
  completedAt?: Date;

  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  actionSequence: string[];
  operationIds: string[];
  payoutProcessed: boolean;
  payoutTransactionId?: string;
  validationChecks: {
    [key: string]: boolean;
  };
  suspiciousActivity?: {
    reason: string;
    timestamp: Date;
    details: any;
  }[];
  recordAction(action: string, operationId?: string): boolean;
  flagAsSuspicious(reason: string, details?: any): void;
}

const GameSessionSchema: Schema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    gameType: {
      type: String,
      required: true,
      enum: ["slots", "dice", "blackjack", "shipcaptaincrew"],
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      default: () => secureRandomString(24),
      index: true,
    },
    betAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    initialState: {
      type: Schema.Types.Mixed,
      required: true,
    },
    currentState: {
      type: Schema.Types.Mixed,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400,
      index: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 60 * 1000),
      index: true,
    },
    completed: {
      type: Boolean,
      default: false,
      index: true,
    },
    serverSeed: {
      type: String,
      required: true,
      default: () => generateSecureSeed(32),
    },
    clientSeed: {
      type: String,
    },
    serverSeedHash: {
      type: String,
      required: true,
    },
    result: {
      winAmount: {
        type: Number,
        min: 0,
      },
      multiplier: {
        type: Number,
        min: 0,
      },
      gameData: Schema.Types.Mixed,
    },
    bet: {
      type: Number,
      required: true,
      min: 0,
    },
    winAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      required: true,
      enum: ["created", "in_progress", "completed", "cancelled", "error"],
      default: "created",
      index: true,
    },
    outcome: {
      type: Schema.Types.Mixed,
    },
    nonce: {
      type: Number,
      default: () => Math.floor(Math.random() * 1000000),
    },
    completedAt: {
      type: Date,
    },

    ipAddress: String,
    userAgent: String,
    deviceFingerprint: String,
    actionSequence: {
      type: [String],
      default: [],
    },
    operationIds: {
      type: [String],
      default: [],
    },
    payoutProcessed: {
      type: Boolean,
      default: false,
      index: true,
    },
    payoutTransactionId: String,
    validationChecks: {
      type: Schema.Types.Mixed,
      default: {},
    },
    depositTxHash: {
      type: String,
      required: false,
    },
    payoutTxHash: {
      type: String,
      required: false,
    },
    suspiciousActivity: [
      {
        reason: String,
        timestamp: {
          type: Date,
          default: Date.now,
        },
        details: Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    collection: "game_sessions",
  }
);

GameSessionSchema.index({ userId: 1, completed: 1, expiresAt: 1 });

GameSessionSchema.pre("save", function (this: IGameSession, next) {
  this.updatedAt = new Date();
  if (!this.serverSeedHash && this.serverSeed) {
    this.serverSeedHash = createServerSeedHash(this.serverSeed);
  }
  next();
});

GameSessionSchema.index({ userId: 1, gameType: 1, createdAt: -1 });
GameSessionSchema.index({ status: 1, createdAt: -1 });
GameSessionSchema.index({ payoutProcessed: 1, status: 1 });
GameSessionSchema.index({ "suspiciousActivity.timestamp": 1 });

GameSessionSchema.methods.recordAction = function (
  action: string,
  operationId: string
) {
  if (this.operationIds.includes(operationId)) {
    return false;
  }

  this.actionSequence.push(action);
  this.operationIds.push(operationId);
  return true;
};

GameSessionSchema.methods.flagAsSuspicious = function (
  reason: string,
  details: any = {}
) {
  if (!this.suspiciousActivity) {
    this.suspiciousActivity = [];
  }

  this.suspiciousActivity.push({
    reason,
    timestamp: new Date(),
    details,
  });
};

export const GameSession = mongoose.model<IGameSession>(
  "GameSession",
  GameSessionSchema
);

export default GameSession;
