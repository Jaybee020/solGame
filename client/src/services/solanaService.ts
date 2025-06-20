import {
  Connection,
  PublicKey,
  Transaction,
  TransactionSignature,
  ConfirmOptions,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TokenAccountNotFoundError,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";

export class SolanaService {
  private connection: Connection;

  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, "confirmed");
  }

  /**
   * Transfer tokens from user's wallet to manager wallet
   */
  async transferTokens(
    wallet: WalletContextState,
    tokenMintAddress: string,
    recipientAddress: string,
    amount: number,
    decimals: number
  ): Promise<string | null> {
    if (!wallet.publicKey || !wallet.signTransaction) {
      throw new Error(
        "Wallet not connected or does not support transaction signing"
      );
    }

    try {
      const tokenMint = new PublicKey(tokenMintAddress);
      const recipient = new PublicKey(recipientAddress);
      const payer = wallet.publicKey;

      // Get associated token accounts
      const payerTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        payer,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      console.log(
        tokenMint.toString(),
        payer.toString(),
        payerTokenAccount.toString()
      );
      const recipientTokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        recipient,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      // Check if payer has the token account
      try {
        await getAccount(
          this.connection,
          payerTokenAccount,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          throw new Error(
            `You don't have a ${tokenMintAddress} token account. Please create one first.`
          );
        }
        throw error;
      }

      // Create transaction
      const transaction = new Transaction();

      // Check if recipient token account exists
      try {
        await getAccount(
          this.connection,
          recipientTokenAccount,
          undefined,
          TOKEN_2022_PROGRAM_ID
        );
      } catch (error) {
        if (error instanceof TokenAccountNotFoundError) {
          // Add instruction to create recipient's associated token account
          transaction.add(
            createAssociatedTokenAccountInstruction(
              payer, // payer
              recipientTokenAccount, // associated token account
              recipient, // owner
              tokenMint, // token mint,
              TOKEN_2022_PROGRAM_ID
            )
          );
        }
      }

      // Calculate amount in token units (considering decimals)
      const tokenAmount = Math.floor(amount * Math.pow(10, decimals));

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          payerTokenAccount, // source
          recipientTokenAccount, // destination
          payer, // owner
          tokenAmount, // amount,
          undefined,
          TOKEN_2022_PROGRAM_ID
        )
      );

      // Get latest blockhash
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = payer;

      // Sign transaction
      const signedTransaction = await wallet.signTransaction(transaction);

      // Send transaction
      const signature = await this.connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      console.log("Transaction sent:", signature);
      return signature;
    } catch (error) {
      console.error("Error transferring tokens:", error);
      throw error;
    }
  }

  /**
   * Confirm a transaction
   */
  async confirmTransaction(
    signature: string,
    commitment: ConfirmOptions["commitment"] = "confirmed"
  ): Promise<boolean> {
    try {
      const confirmation = await this.connection.getParsedTransaction(
        signature,
        {
          maxSupportedTransactionVersion: 0,
        }
      );

      return !confirmation.meta.err;
    } catch (error) {
      console.error("Error confirming transaction:", error);
      return false;
    }
  }

  /**
   * Wait for transaction confirmation with timeout
   */
  async waitForConfirmation(
    signature: string,
    timeoutMs: number = 30000,
    commitment: ConfirmOptions["commitment"] = "confirmed"
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const confirmed = await this.confirmTransaction(signature, commitment);
        if (confirmed) {
          return true;
        }
      } catch (error) {
        console.error("Error checking confirmation:", error);
      }

      // Wait 1 second before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return false;
  }

  /**
   * Get token balance for a wallet
   */
  async getTokenBalance(
    walletAddress: string,
    tokenMintAddress: string
  ): Promise<number | null> {
    try {
      const wallet = new PublicKey(walletAddress);
      const tokenMint = new PublicKey(tokenMintAddress);

      const tokenAccount = await getAssociatedTokenAddress(
        tokenMint,
        wallet,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );
      const account = await getAccount(
        this.connection,
        tokenAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
      );

      return Number(account.amount);
    } catch (error) {
      console.error("Error getting token balance:", error);
      return null;
    }
  }

  /**
   * Verify a token transfer transaction
   */
  async verifyTokenTransfer(
    signature: string,
    expectedTokenMint: string,
    expectedRecipient: string,
    expectedAmount: number
  ): Promise<boolean> {
    try {
      const transaction = await this.connection.getTransaction(signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });

      if (!transaction || !transaction.meta) {
        return false;
      }

      const { preTokenBalances, postTokenBalances } = transaction.meta;

      if (!preTokenBalances || !postTokenBalances) {
        return false;
      }

      // Check if the expected token transfer occurred
      for (let i = 0; i < postTokenBalances.length; i++) {
        const postBalance = postTokenBalances[i];
        const preBalance = preTokenBalances.find(
          (balance) => balance.accountIndex === postBalance.accountIndex
        );

        if (
          postBalance.mint === expectedTokenMint &&
          postBalance.owner === expectedRecipient
        ) {
          const balanceChange =
            (postBalance.uiTokenAmount?.uiAmount || 0) -
            (preBalance?.uiTokenAmount?.uiAmount || 0);

          if (balanceChange >= expectedAmount) {
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      console.error("Error verifying token transfer:", error);
      return false;
    }
  }
}

// Create singleton instance
const RPC_URL =
  process.env.REACT_APP_SOLANA_RPC_URL || "https://api.devnet.solana.com";
export const solanaService = new SolanaService(RPC_URL);
