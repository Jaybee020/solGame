import {
  Connection,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
  Keypair,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { consoleLogger } from "./logger/pinoLogger";
import { STAKING_TOKEN, MANAGER_WALLET_ADDRESS, MANAGER_KEYPAIR } from "../config/constants";

export class SolanaService {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  async verifyTokenTransfer(
    txHash: string,
    expectedTokenMint: string,
    expectedRecipient: string,
    expectedAmount: number
  ): Promise<boolean>;
  
  async verifyTokenTransfer(
    txHash: string,
    userId: string
  ): Promise<{isValid: boolean, amount: number}>;
  
  async verifyTokenTransfer(
    txHash: string,
    expectedTokenMintOrUserId: string,
    expectedRecipient?: string,
    expectedAmount?: number
  ): Promise<boolean | {isValid: boolean, amount: number}> {
    try {
      const transaction = await this.connection.getTransaction(txHash, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction) {
        consoleLogger.info(`Transaction ${txHash} not found or not confirmed`);
        return false;
      }

      if (
        !transaction.meta?.postTokenBalances ||
        !transaction.meta?.preTokenBalances
      ) {
        consoleLogger.info(
          `Transaction ${txHash} does not contain token balance information`
        );
        return false;
      }

      // Determine if this is the new balance-based verification (2 params) or old transaction-based (4 params)
      const isBalanceVerification = arguments.length === 2;
      
      if (isBalanceVerification) {
        // New balance-based verification - check for transfer to manager wallet
        const expectedTokenMint = STAKING_TOKEN.mint;
        const expectedRecipient = MANAGER_WALLET_ADDRESS;
        
        for (let i = 0; i < transaction.meta.postTokenBalances.length; i++) {
          const postBalance = transaction.meta.postTokenBalances[i];
          const preBalance = transaction.meta.preTokenBalances.find(
            (balance) => balance.accountIndex === postBalance.accountIndex
          );

          if (
            postBalance?.mint === expectedTokenMint &&
            postBalance?.owner === expectedRecipient
          ) {
            const balanceChange =
              (postBalance.uiTokenAmount?.uiAmount || 0) -
              (preBalance?.uiTokenAmount?.uiAmount || 0);

            if (balanceChange > 0) {
              consoleLogger.info(
                `Token transfer verified: ${balanceChange} tokens deposited to manager wallet`
              );
              return { isValid: true, amount: balanceChange };
            }
          }
        }

        consoleLogger.info(
          `Token transfer verification failed for transaction ${txHash} - no valid deposit found`
        );
        return { isValid: false, amount: 0 };
      } else {
        // Old transaction-based verification
        const expectedTokenMint = expectedTokenMintOrUserId;
        
        for (let i = 0; i < transaction.meta.postTokenBalances.length; i++) {
          const postBalance = transaction.meta.postTokenBalances[i];
          const preBalance = transaction.meta.preTokenBalances.find(
            (balance) => balance.accountIndex === postBalance.accountIndex
          );

          if (
            postBalance?.mint === expectedTokenMint &&
            postBalance?.owner === expectedRecipient
          ) {
            const balanceChange =
              (postBalance.uiTokenAmount?.uiAmount || 0) -
              (preBalance?.uiTokenAmount?.uiAmount || 0);

            if (balanceChange >= expectedAmount!) {
              consoleLogger.info(
                `Token transfer verified: ${balanceChange} tokens sent to ${expectedRecipient}`
              );
              return true;
            }
          }
        }

        consoleLogger.info(
          `Token transfer verification failed for transaction ${txHash}`
        );
        return false;
      }
    } catch (error) {
      consoleLogger.error(`Error verifying token transfer: ${error}`);
      const isBalanceVerification = arguments.length === 2;
      return isBalanceVerification ? { isValid: false, amount: 0 } : false;
    }
  }

  async initiateTokenPayout(
    amount: number,
    recipientAddress: string,
    tokenMintAddress: string,
    payerKeypair: Keypair
  ): Promise<string | null>;
  
  async initiateTokenPayout(
    recipientAddress: string,
    amount: number,
    userId: string
  ): Promise<{success: boolean, transactionHash?: string, error?: string}>;
  
  async initiateTokenPayout(
    amountOrRecipient: number | string,
    recipientOrAmount: string | number,
    tokenMintOrUserId: string,
    payerKeypair?: Keypair
  ): Promise<string | null | {success: boolean, transactionHash?: string, error?: string}> {
    try {
      // Determine if this is the new balance-based payout (3 params) or old transaction-based (4 params)
      const isBalancePayout = arguments.length === 3;
      
      if (isBalancePayout) {
        // New balance-based payout
        const recipientAddress = amountOrRecipient as string;
        const amount = recipientOrAmount as number;
        const userId = tokenMintOrUserId;
        
        const tokenMint = new PublicKey(STAKING_TOKEN.mint);
        const recipient = new PublicKey(recipientAddress);
        const payer = MANAGER_KEYPAIR.publicKey;
        
        const payerTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          payer,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const recipientTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          recipient,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const tokenAccountInfo = await this.connection.getAccountInfo(
          recipientTokenAccount
        );

        const transaction = new Transaction();

        if (!tokenAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              payer,
              recipientTokenAccount,
              recipient,
              tokenMint,
              TOKEN_2022_PROGRAM_ID
            )
          );
        }

        transaction.add(
          createTransferInstruction(
            payerTokenAccount,
            recipientTokenAccount,
            payer,
            amount * Math.pow(10, STAKING_TOKEN.decimals),
            [],
            TOKEN_2022_PROGRAM_ID
          )
        );

        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [MANAGER_KEYPAIR],
          { commitment: "confirmed" }
        );

        consoleLogger.info(`Token payout completed: ${signature}`);
        return {
          success: true,
          transactionHash: signature
        };
      } else {
        // Old transaction-based payout
        const amount = amountOrRecipient as number;
        const recipientAddress = recipientOrAmount as string;
        const tokenMintAddress = tokenMintOrUserId;
        const payerKeypair = arguments[3] as Keypair;
        
        const tokenMint = new PublicKey(tokenMintAddress);
        const recipient = new PublicKey(recipientAddress);
        const payer = payerKeypair!.publicKey;

        const payerTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          payer,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const recipientTokenAccount = await getAssociatedTokenAddress(
          tokenMint,
          recipient,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        const tokenAccountInfo = await this.connection.getAccountInfo(
          recipientTokenAccount
        );

        const transaction = new Transaction();

        if (!tokenAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              payer,
              recipientTokenAccount,
              recipient,
              tokenMint,
              TOKEN_2022_PROGRAM_ID
            )
          );
        }

        const transferInstruction = createTransferInstruction(
          payerTokenAccount,
          recipientTokenAccount,
          payer,
          amount,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );

        transaction.add(transferInstruction);

        const signature = await sendAndConfirmTransaction(
          this.connection,
          transaction,
          [payerKeypair!],
          { commitment: "confirmed" }
        );

        consoleLogger.info(
          `Token payout successful. Transaction signature: ${signature}`
        );
        return signature;
      }
    } catch (error) {
      console.log(error);
      consoleLogger.error(`Error initiating token payout: ${error}`);
      const isBalancePayout = arguments.length === 3;
      return isBalancePayout ? {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      } : null;
    }
  }
}
