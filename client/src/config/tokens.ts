export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  mint: string;
}

// Environment-based token configuration
const getTokenConfig = (): TokenConfig => {
  return {
    name: process.env.REACT_APP_STAKING_TOKEN_NAME || "Cash Token",
    symbol: process.env.REACT_APP_STAKING_TOKEN_SYMBOL || "CASH",
    decimals: parseInt(process.env.REACT_APP_STAKING_TOKEN_DECIMALS || "9"),
    mint:
      process.env.REACT_APP_STAKING_TOKEN_MINT ||
      "A7DRJdbf6zwjY3wwmecUpiGHqvzcWjcLsJWGe52rj7WL",
  };
};

const getPayoutTokenConfig = (): TokenConfig => {
  return {
    name: process.env.REACT_APP_PAYOUT_TOKEN_NAME || "Cash Token",
    symbol: process.env.REACT_APP_PAYOUT_TOKEN_SYMBOL || "CASH",
    decimals: parseInt(process.env.REACT_APP_PAYOUT_TOKEN_DECIMALS || "9"),
    mint:
      process.env.REACT_APP_PAYOUT_TOKEN_MINT ||
      "A7DRJdbf6zwjY3wwmecUpiGHqvzcWjcLsJWGe52rj7WL",
  };
};

export const STAKING_TOKEN: TokenConfig = getTokenConfig();
export const PAYOUT_TOKEN: TokenConfig = getPayoutTokenConfig();

// Manager wallet address for deposits
export const MANAGER_WALLET_ADDRESS =
  process.env.REACT_APP_MANAGER_WALLET_ADDRESS || "manager-wallet-address";
