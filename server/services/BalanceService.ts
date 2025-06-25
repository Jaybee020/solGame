import { Types } from "mongoose";
import { UserBalanceModel, BalanceTransactionModel, UserBalanceDocument } from "../models/UserBalance";
import { SolanaService } from "./SolanaService";

export interface DepositResult {
  success: boolean;
  balance: UserBalanceDocument;
  transactionHash: string;
  amount: number;
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  balance?: UserBalanceDocument;
  transactionHash?: string;
  amount: number;
  error?: string;
}

export interface BalanceInfo {
  balance: number;
  lockedBalance: number;
  availableBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalGameWinnings: number;
  totalGameLosses: number;
}

export class BalanceService {
  private solanaService: SolanaService;

  constructor() {
    this.solanaService = new SolanaService(process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com");
  }

  /**
   * Get or create user balance
   */
  async getUserBalance(userId: Types.ObjectId): Promise<UserBalanceDocument> {
    let userBalance = await UserBalanceModel.findByUserId(userId);
    
    if (!userBalance) {
      userBalance = await UserBalanceModel.createForUser(userId);
    }
    
    return userBalance;
  }

  /**
   * Get user balance info
   */
  async getBalanceInfo(userId: Types.ObjectId): Promise<BalanceInfo> {
    const userBalance = await this.getUserBalance(userId);
    
    return {
      balance: userBalance.balance,
      lockedBalance: userBalance.lockedBalance,
      availableBalance: userBalance.balance,
      totalDeposited: userBalance.totalDeposited,
      totalWithdrawn: userBalance.totalWithdrawn,
      totalGameWinnings: userBalance.totalGameWinnings,
      totalGameLosses: userBalance.totalGameLosses,
    };
  }

  /**
   * Process deposit from transaction hash
   */
  async processDeposit(
    userId: Types.ObjectId,
    transactionHash: string,
    operationId?: string
  ): Promise<DepositResult> {
    try {
      // Check if this transaction has already been processed
      const existingTransaction = await BalanceTransactionModel.findOne({
        'metadata.transactionHash': transactionHash,
      });

      if (existingTransaction) {
        return {
          success: false,
          balance: await this.getUserBalance(userId),
          transactionHash,
          amount: 0,
          error: 'Transaction already processed',
        };
      }

      // Check if operationId already exists to prevent duplicate processing
      if (operationId) {
        const existingOperation = await BalanceTransactionModel.findOne({
          'metadata.operationId': operationId,
        });

        if (existingOperation) {
          return {
            success: false,
            balance: await this.getUserBalance(userId),
            transactionHash,
            amount: 0,
            error: 'Operation already processed',
          };
        }
      }

      // Verify the transaction and get deposit amount
      const verificationResult = await this.solanaService.verifyTokenTransfer(
        transactionHash,
        userId.toString()
      );

      if (!verificationResult.isValid) {
        return {
          success: false,
          balance: await this.getUserBalance(userId),
          transactionHash,
          amount: 0,
          error: 'Invalid transaction',
        };
      }

      // Get user balance and process deposit
      const userBalance = await this.getUserBalance(userId);
      await userBalance.deposit(verificationResult.amount, transactionHash, operationId);

      return {
        success: true,
        balance: userBalance,
        transactionHash,
        amount: verificationResult.amount,
      };
    } catch (error) {
      console.error('Error processing deposit:', error);
      return {
        success: false,
        balance: await this.getUserBalance(userId),
        transactionHash,
        amount: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process withdrawal
   */
  async processWithdraw(
    userId: Types.ObjectId,
    amount: number,
    recipientAddress: string,
    operationId?: string
  ): Promise<WithdrawResult> {
    try {
      // Check if operationId already exists to prevent duplicate processing
      if (operationId) {
        const existingOperation = await BalanceTransactionModel.findOne({
          'metadata.operationId': operationId,
        });

        if (existingOperation) {
          return {
            success: false,
            amount: 0,
            error: 'Operation already processed',
          };
        }
      }

      const userBalance = await this.getUserBalance(userId);

      // Check if user has sufficient balance
      if (!userBalance.hasAvailableBalance(amount)) {
        return {
          success: false,
          amount,
          error: 'Insufficient balance',
        };
      }

      // Process withdrawal through Solana service
      const payoutResult = await this.solanaService.initiateTokenPayout(
        recipientAddress,
        amount,
        userId.toString()
      );

      if (!payoutResult.success) {
        return {
          success: false,
          amount,
          error: payoutResult.error || 'Payout failed',
        };
      }

      // Update user balance
      await userBalance.withdraw(
        amount,
        `Withdrawal to ${recipientAddress}`,
        operationId
      );

      return {
        success: true,
        balance: userBalance,
        transactionHash: payoutResult.transactionHash,
        amount,
      };
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      return {
        success: false,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Deduct balance for game
   */
  async deductForGame(
    userId: Types.ObjectId,
    amount: number,
    gameSessionId: Types.ObjectId,
    gameType: string
  ): Promise<{ success: boolean; balance?: UserBalanceDocument; error?: string }> {
    try {
      const userBalance = await this.getUserBalance(userId);

      if (!userBalance.hasAvailableBalance(amount)) {
        return {
          success: false,
          error: 'Insufficient balance',
        };
      }

      await userBalance.deductForGame(amount, gameSessionId, gameType);

      return {
        success: true,
        balance: userBalance,
      };
    } catch (error) {
      console.error('Error deducting balance for game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Credit balance for game win
   */
  async creditGameWin(
    userId: Types.ObjectId,
    amount: number,
    gameSessionId: Types.ObjectId,
    gameType: string
  ): Promise<{ success: boolean; balance?: UserBalanceDocument; error?: string }> {
    try {
      const userBalance = await this.getUserBalance(userId);
      await userBalance.creditGameWin(amount, gameSessionId, gameType);

      return {
        success: true,
        balance: userBalance,
      };
    } catch (error) {
      console.error('Error crediting game win:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Refund game amount
   */
  async refundGame(
    userId: Types.ObjectId,
    amount: number,
    gameSessionId: Types.ObjectId,
    gameType: string
  ): Promise<{ success: boolean; balance?: UserBalanceDocument; error?: string }> {
    try {
      const userBalance = await this.getUserBalance(userId);
      await userBalance.refundGame(amount, gameSessionId, gameType);

      return {
        success: true,
        balance: userBalance,
      };
    } catch (error) {
      console.error('Error refunding game:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user balance history
   */
  async getBalanceHistory(userId: Types.ObjectId, limit: number = 50) {
    return BalanceTransactionModel.findByUserId(userId, limit);
  }

  /**
   * Check if user has sufficient balance
   */
  async hasBalance(userId: Types.ObjectId, amount: number): Promise<boolean> {
    const userBalance = await this.getUserBalance(userId);
    return userBalance.hasAvailableBalance(amount);
  }

  /**
   * Lock balance (for active games)
   */
  async lockBalance(
    userId: Types.ObjectId,
    amount: number
  ): Promise<{ success: boolean; balance?: UserBalanceDocument; error?: string }> {
    try {
      const userBalance = await this.getUserBalance(userId);
      await userBalance.lockBalance(amount);

      return {
        success: true,
        balance: userBalance,
      };
    } catch (error) {
      console.error('Error locking balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Unlock balance (when games are completed/cancelled)
   */
  async unlockBalance(
    userId: Types.ObjectId,
    amount: number
  ): Promise<{ success: boolean; balance?: UserBalanceDocument; error?: string }> {
    try {
      const userBalance = await this.getUserBalance(userId);
      await userBalance.unlockBalance(amount);

      return {
        success: true,
        balance: userBalance,
      };
    } catch (error) {
      console.error('Error unlocking balance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}