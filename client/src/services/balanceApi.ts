import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

export interface BalanceInfo {
  balance: number;
  lockedBalance: number;
  availableBalance: number;
  totalDeposited: number;
  totalWithdrawn: number;
  totalGameWinnings: number;
  totalGameLosses: number;
}

export interface BalanceTransaction {
  _id: string;
  userId: string;
  type: "deposit" | "withdraw" | "game_win" | "game_loss" | "game_refund";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  metadata?: {
    gameSessionId?: string;
    transactionHash?: string;
    gameType?: string;
    operationId?: string;
  };
  createdAt: string;
}

export interface DepositResult {
  success: boolean;
  data?: {
    transactionHash: string;
    amount: number;
    balance: BalanceInfo;
  };
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  data?: {
    transactionHash?: string;
    amount: number;
    balance?: BalanceInfo;
  };
  error?: string;
}

class BalanceApi {
  private authToken: string | null = null;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.authToken) {
      headers["Authorization"] = this.authToken;
    }

    return headers;
  }

  async getBalance(): Promise<{
    success: boolean;
    data?: BalanceInfo;
    error?: string;
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/balance`, {
        headers: this.getHeaders(),
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching balance:", error);
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Unknown error",
      };
    }
  }

  async getBalanceHistory(limit: number = 50): Promise<{
    success: boolean;
    data?: BalanceTransaction[];
    error?: string;
  }> {
    try {
      const response = await axios.get(`${API_BASE_URL}/balance/history`, {
        headers: this.getHeaders(),
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching balance history:", error);
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Unknown error",
      };
    }
  }

  async deposit(
    transactionHash: string,
    operationId?: string
  ): Promise<DepositResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/balance/deposit`,
        { transactionHash, operationId },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error("Error processing deposit:", error);
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Unknown error",
      };
    }
  }

  async withdraw(
    amount: number,
    recipientAddress: string,
    operationId?: string
  ): Promise<WithdrawResult> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/balance/withdraw`,
        { amount, recipientAddress, operationId },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error("Error processing withdrawal:", error);
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Unknown error",
      };
    }
  }

  async checkBalance(amount: number): Promise<{
    success: boolean;
    data?: { hasBalance: boolean; amount: number };
    error?: string;
  }> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/balance/check`,
        { amount },
        { headers: this.getHeaders() }
      );
      return response.data;
    } catch (error) {
      console.error("Error checking balance:", error);
      return {
        success: false,
        error: axios.isAxiosError(error)
          ? error.response?.data?.error || error.message
          : "Unknown error",
      };
    }
  }
}

export const balanceApi = new BalanceApi();
