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