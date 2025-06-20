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
  ): Promise<boolean> {
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

      const tokenMintPubkey = new PublicKey(expectedTokenMint);
      const recipientPubkey = new PublicKey(expectedRecipient);

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

          if (balanceChange >= expectedAmount) {
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
    } catch (error) {
      consoleLogger.error(`Error verifying token transfer: ${error}`);
      return false;
    }
  }

  async initiateTokenPayout(
    amount: number,
    recipientAddress: string,
    tokenMintAddress: string,
    payerKeypair: Keypair
  ): Promise<string | null> {
    try {
      const tokenMint = new PublicKey(tokenMintAddress);
      const recipient = new PublicKey(recipientAddress);
      const payer = payerKeypair.publicKey;

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
        [payerKeypair],
        { commitment: "confirmed" }
      );

      consoleLogger.info(
        `Token payout successful. Transaction signature: ${signature}`
      );
      return signature;
    } catch (error) {
      console.log(error);
      consoleLogger.error(`Error initiating token payout: ${error}`);
      return null;
    }
  }
}
