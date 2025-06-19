import { config } from "dotenv";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Connection, Keypair } from "@solana/web3.js";

config();

export const MONGO_URI = "mongodb://localhost:27017/solGame";
export const REDIS_URL = process.env.REDIS_URL || "127.0.0.1:6379";
export const HELIUS_RPC_URL = `https://mainnet.helius-rpc.com/?api-key=d09a2fbb-81a4-49d6-b9ed-16d09a4ba09c`;
export const cluster = "mainnet";
export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL ||
  "https://mainnet.helius-rpc.com/?api-key=d09a2fbb-81a4-49d6-b9ed-16d09a4ba09c";
export const SOLANA_WS_URL =
  process.env.SOLANA_WS_URL || "wss://api.mainnet-beta.solana.com";
export const rpcConnection = new Connection(SOLANA_RPC_URL, "confirmed");
export const wallet = new NodeWallet(new Keypair()); //note this is not used
export const provider = new AnchorProvider(rpcConnection, wallet, {
  commitment: "finalized",
});

export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  mint?: string;
}

export const STAKING_TOKEN: TokenConfig = {
  name: "Cash Token",
  symbol: "CASH",
  decimals: 6,
  mint: "11111111111111111111111111111111" // Replace with actual mint address
};

export const PAYOUT_TOKEN: TokenConfig = {
  name: "Cash Token", 
  symbol: "CASH",
  decimals: 6,
  mint: "11111111111111111111111111111111" // Replace with actual mint address
};

export const SOL_MINT = "So11111111111111111111111111111111111111112";
export const SOL_DECIMALS = 9;
export const LOGIN_SECRET = process.env.LOGIN_SECRET || "login-secret";
export const SERVER_API_KEY = process.env.SERVER_API_KEY || "server-key";
