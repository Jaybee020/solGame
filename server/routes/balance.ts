import express from 'express';
import Joi from 'joi';
import { BalanceService } from '../services/BalanceService';
import { authenticatetoken, Req } from '../services/api/auth/auth';
import { Types } from 'mongoose';

const router = express.Router();
const balanceService = new BalanceService();

// Validation schemas
const depositSchema = Joi.object({
  transactionHash: Joi.string().required(),
  operationId: Joi.string().optional(),
});

const withdrawSchema = Joi.object({
  amount: Joi.number().positive().required(),
  recipientAddress: Joi.string().required(),
  operationId: Joi.string().optional(),
});

/**
 * Get user balance information
 */
router.get('/', authenticatetoken, async (req: Req, res): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }
    
    const userId = new Types.ObjectId(req.user._id.toString());
    const balanceInfo = await balanceService.getBalanceInfo(userId);
    
    res.json({
      success: true,
      data: balanceInfo,
    });
  } catch (error) {
    console.error('Error getting balance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Get user balance history
 */
router.get('/history', authenticatetoken, async (req: Req, res): Promise<void> => {
  try {
    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }
    
    const userId = new Types.ObjectId(req.user._id.toString());
    const limit = parseInt(req.query.limit as string) || 50;
    
    const history = await balanceService.getBalanceHistory(userId, limit);
    
    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error('Error getting balance history:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Credit balance from deposit transaction
 */
router.post('/deposit', authenticatetoken, async (req: Req, res): Promise<void> => {
  try {
    const { error, value } = depositSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
      return;
    }

    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const userId = new Types.ObjectId(req.user._id.toString());
    const { transactionHash, operationId } = value;

    const result = await balanceService.processDeposit(
      userId,
      transactionHash,
      operationId
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        transactionHash: result.transactionHash,
        amount: result.amount,
        balance: {
          balance: result.balance.balance,
          lockedBalance: result.balance.lockedBalance,
          totalDeposited: result.balance.totalDeposited,
          totalWithdrawn: result.balance.totalWithdrawn,
          totalGameWinnings: result.balance.totalGameWinnings,
          totalGameLosses: result.balance.totalGameLosses,
        },
      },
    });
  } catch (error) {
    console.error('Error processing deposit:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Process withdrawal
 */
router.post('/withdraw', authenticatetoken, async (req: Req, res): Promise<void> => {
  try {
    const { error, value } = withdrawSchema.validate(req.body);
    if (error) {
      res.status(400).json({
        success: false,
        error: error.details[0].message,
      });
      return;
    }

    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const userId = new Types.ObjectId(req.user._id.toString());
    const { amount, recipientAddress, operationId } = value;

    const result = await balanceService.processWithdraw(
      userId,
      amount,
      recipientAddress,
      operationId
    );

    if (!result.success) {
      res.status(400).json({
        success: false,
        error: result.error,
      });
      return;
    }

    res.json({
      success: true,
      data: {
        transactionHash: result.transactionHash,
        amount: result.amount,
        balance: result.balance ? {
          balance: result.balance.balance,
          lockedBalance: result.balance.lockedBalance,
          totalDeposited: result.balance.totalDeposited,
          totalWithdrawn: result.balance.totalWithdrawn,
          totalGameWinnings: result.balance.totalGameWinnings,
          totalGameLosses: result.balance.totalGameLosses,
        } : undefined,
      },
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * Check if user has sufficient balance
 */
router.post('/check', authenticatetoken, async (req: Req, res): Promise<void> => {
  try {
    const { amount } = req.body;
    
    if (!amount || amount <= 0) {
      res.status(400).json({
        success: false,
        error: 'Valid amount is required',
      });
      return;
    }

    if (!req.user?._id) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated',
      });
      return;
    }

    const userId = new Types.ObjectId(req.user._id.toString());
    const hasBalance = await balanceService.hasBalance(userId, amount);
    
    res.json({
      success: true,
      data: {
        hasBalance,
        amount,
      },
    });
  } catch (error) {
    console.error('Error checking balance:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;