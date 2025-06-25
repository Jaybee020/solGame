import { Document, Model, Schema, Types, model } from "mongoose";

export interface IUserBalance {
  userId: Types.ObjectId;
  balance: number; // Balance in lamports (smallest unit)
  lockedBalance: number; // Balance locked in active games
  totalDeposited: number; // Lifetime deposits
  totalWithdrawn: number; // Lifetime withdrawals
  totalGameWinnings: number; // Lifetime game winnings
  totalGameLosses: number; // Lifetime game losses
  createdAt: Date;
  updatedAt: Date;
}

export interface IBalanceTransaction {
  userId: Types.ObjectId;
  type: 'deposit' | 'withdraw' | 'game_win' | 'game_loss' | 'game_refund';
  amount: number; // Amount in lamports
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata?: {
    gameSessionId?: Types.ObjectId;
    transactionHash?: string;
    gameType?: string;
    operationId?: string;
  };
  createdAt: Date;
}

export interface UserBalanceDocument extends IUserBalance, Document {
  // Instance methods
  deposit(amount: number, txHash: string, operationId?: string): Promise<UserBalanceDocument>;
  withdraw(amount: number, description: string, operationId?: string): Promise<UserBalanceDocument>;
  deductForGame(amount: number, gameSessionId: Types.ObjectId, gameType: string): Promise<UserBalanceDocument>;
  creditGameWin(amount: number, gameSessionId: Types.ObjectId, gameType: string): Promise<UserBalanceDocument>;
  refundGame(amount: number, gameSessionId: Types.ObjectId, gameType: string): Promise<UserBalanceDocument>;
  lockBalance(amount: number): Promise<UserBalanceDocument>;
  unlockBalance(amount: number): Promise<UserBalanceDocument>;
  hasAvailableBalance(amount: number): boolean;
}

export interface BalanceTransactionDocument extends IBalanceTransaction, Document {}

export interface UserBalanceModel extends Model<UserBalanceDocument> {
  findByUserId(userId: Types.ObjectId): Promise<UserBalanceDocument | null>;
  createForUser(userId: Types.ObjectId): Promise<UserBalanceDocument>;
}

export interface BalanceTransactionModel extends Model<BalanceTransactionDocument> {
  findByUserId(userId: Types.ObjectId, limit?: number): Promise<BalanceTransactionDocument[]>;
  recordTransaction(
    userId: Types.ObjectId,
    type: IBalanceTransaction['type'],
    amount: number,
    balanceBefore: number,
    balanceAfter: number,
    description: string,
    metadata?: IBalanceTransaction['metadata']
  ): Promise<BalanceTransactionDocument>;
}

const UserBalanceSchema = new Schema<UserBalanceDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: 0,
    },
    lockedBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDeposited: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalWithdrawn: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGameWinnings: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalGameLosses: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true }
);

const BalanceTransactionSchema = new Schema<BalanceTransactionDocument>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['deposit', 'withdraw', 'game_win', 'game_loss', 'game_refund'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    balanceBefore: {
      type: Number,
      required: true,
    },
    balanceAfter: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    metadata: {
      gameSessionId: {
        type: Schema.Types.ObjectId,
        ref: 'GameSession',
      },
      transactionHash: String,
      gameType: String,
      operationId: String,
    },
  },
  { timestamps: true }
);

// Indexes for performance
BalanceTransactionSchema.index({ userId: 1, createdAt: -1 });
BalanceTransactionSchema.index({ 'metadata.operationId': 1 }, { sparse: true });
BalanceTransactionSchema.index({ 'metadata.transactionHash': 1 }, { sparse: true });

// Static methods for UserBalance
UserBalanceSchema.statics.findByUserId = async function (userId: Types.ObjectId) {
  return this.findOne({ userId });
};

UserBalanceSchema.statics.createForUser = async function (userId: Types.ObjectId) {
  return this.create({ userId });
};

// Instance methods for UserBalance
UserBalanceSchema.methods.hasAvailableBalance = function (amount: number): boolean {
  return this.balance >= amount;
};

UserBalanceSchema.methods.deposit = async function (amount: number, txHash: string, operationId?: string) {
  const balanceBefore = this.balance;
  this.balance += amount;
  this.totalDeposited += amount;
  const balanceAfter = this.balance;
  
  await this.save();
  
  // Record transaction
  await BalanceTransactionModelInstance.recordTransaction(
    this.userId,
    'deposit',
    amount,
    balanceBefore,
    balanceAfter,
    `Deposit via transaction ${txHash}`,
    { transactionHash: txHash, operationId }
  );
  
  return this;
};

UserBalanceSchema.methods.withdraw = async function (amount: number, description: string, operationId?: string) {
  if (!this.hasAvailableBalance(amount)) {
    throw new Error('Insufficient balance');
  }
  
  const balanceBefore = this.balance;
  this.balance -= amount;
  this.totalWithdrawn += amount;
  const balanceAfter = this.balance;
  
  await this.save();
  
  // Record transaction
  await BalanceTransactionModelInstance.recordTransaction(
    this.userId,
    'withdraw',
    amount,
    balanceBefore,
    balanceAfter,
    description,
    { operationId }
  );
  
  return this;
};

UserBalanceSchema.methods.deductForGame = async function (amount: number, gameSessionId: Types.ObjectId, gameType: string) {
  if (!this.hasAvailableBalance(amount)) {
    throw new Error('Insufficient balance');
  }
  
  const balanceBefore = this.balance;
  this.balance -= amount;
  this.lockedBalance += amount;
  this.totalGameLosses += amount;
  const balanceAfter = this.balance;
  
  await this.save();
  
  // Record transaction
  await BalanceTransactionModelInstance.recordTransaction(
    this.userId,
    'game_loss',
    amount,
    balanceBefore,
    balanceAfter,
    `Game bet: ${gameType}`,
    { gameSessionId, gameType }
  );
  
  return this;
};

UserBalanceSchema.methods.creditGameWin = async function (amount: number, gameSessionId: Types.ObjectId, gameType: string) {
  const balanceBefore = this.balance;
  this.balance += amount;
  this.lockedBalance = Math.max(0, this.lockedBalance - amount);
  this.totalGameWinnings += amount;
  const balanceAfter = this.balance;
  
  await this.save();
  
  // Record transaction
  await BalanceTransactionModelInstance.recordTransaction(
    this.userId,
    'game_win',
    amount,
    balanceBefore,
    balanceAfter,
    `Game win: ${gameType}`,
    { gameSessionId, gameType }
  );
  
  return this;
};

UserBalanceSchema.methods.refundGame = async function (amount: number, gameSessionId: Types.ObjectId, gameType: string) {
  const balanceBefore = this.balance;
  this.balance += amount;
  this.lockedBalance = Math.max(0, this.lockedBalance - amount);
  this.totalGameLosses = Math.max(0, this.totalGameLosses - amount);
  const balanceAfter = this.balance;
  
  await this.save();
  
  // Record transaction
  await BalanceTransactionModelInstance.recordTransaction(
    this.userId,
    'game_refund',
    amount,
    balanceBefore,
    balanceAfter,
    `Game refund: ${gameType}`,
    { gameSessionId, gameType }
  );
  
  return this;
};

UserBalanceSchema.methods.lockBalance = async function (amount: number) {
  if (!this.hasAvailableBalance(amount)) {
    throw new Error('Insufficient balance to lock');
  }
  
  this.balance -= amount;
  this.lockedBalance += amount;
  await this.save();
  
  return this;
};

UserBalanceSchema.methods.unlockBalance = async function (amount: number) {
  const unlockAmount = Math.min(amount, this.lockedBalance);
  this.balance += unlockAmount;
  this.lockedBalance -= unlockAmount;
  await this.save();
  
  return this;
};

// Static methods for BalanceTransaction
BalanceTransactionSchema.statics.findByUserId = async function (userId: Types.ObjectId, limit: number = 50) {
  return this.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('metadata.gameSessionId');
};

BalanceTransactionSchema.statics.recordTransaction = async function (
  userId: Types.ObjectId,
  type: IBalanceTransaction['type'],
  amount: number,
  balanceBefore: number,
  balanceAfter: number,
  description: string,
  metadata?: IBalanceTransaction['metadata']
) {
  return this.create({
    userId,
    type,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    metadata: metadata || {},
  });
};

export const UserBalanceModel = model<UserBalanceDocument, UserBalanceModel>('UserBalance', UserBalanceSchema);
export const BalanceTransactionModel = model<BalanceTransactionDocument, BalanceTransactionModel>('BalanceTransaction', BalanceTransactionSchema);

// Export instance for use in methods
const BalanceTransactionModelInstance = BalanceTransactionModel;