import Queue from "bull";
import { CronJob } from "cron";
import {
  MANAGER_KEYPAIR,
  PAYOUT_TOKEN,
  REDIS_URL,
  SOLANA_RPC_URL,
} from "../config/constants";
import { SolanaService } from "../services/SolanaService";
import GameSessionService from "../services/GameSession";
import User from "../services/User";

// queue that fetches transaction of an entity
export const payoutQueue = new Queue(
  "payout",
  `redis://${REDIS_URL || "127.0.0.1:6379"}`
);
payoutQueue.process(async function (job, done) {
  try {
    const payout = await new SolanaService(SOLANA_RPC_URL).initiateTokenPayout(
      job.data.amount,
      job.data.recipientAddress,
      job.data.tokenMintAddress,
      MANAGER_KEYPAIR
    );
    done();
  } catch (error: any) {
    console.error("Error at queue ", error);
    done(error);
  }
});

export const payOutWorker = new CronJob("*/1 * * * *", async function () {
  try {
    const pendingPayouts = await GameSessionService.getPendingPayouts();
    for (const session of pendingPayouts) {
      if (!session.result?.winAmount || session.result.winAmount <= 0) {
        return;
      }
      const user = await User.get(session.userId.toString());
      if (!user) {
        return;
      }

      payoutQueue.add({
        amount: session.result.winAmount,
        recipientAddress: user?.walletAddress,
        tokenMintAddress: PAYOUT_TOKEN.mint,
      });
    }
  } catch (error) {
    console.error(error);
  }
});
