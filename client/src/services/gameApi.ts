import axios, { AxiosResponse } from "axios";

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Types for Game API
export interface GameConfig {
  minBet: number;
  maxBet: number;
  baseMultiplier: number;
  houseEdge: number;
}

export interface SupportedGame {
  gameType: string;
  config: GameConfig;
}

export interface CreateGameRequest {
  gameType: string;
  betAmount: number;
  clientSeed?: string;
  deviceFingerprint?: string;
  depositTxHash?: string;
}

export interface GameMove {
  action: string;
  data?: any;
  operationId: string;
}

export interface PlayGameRequest {
  sessionId: string;
  move?: GameMove;
}

export interface GameResult {
  isWin: boolean;
  multiplier: number;
  winAmount: number;
  gameData: any;
  outcome: any;
}

export interface GameResponse {
  sessionId: string;
  gameType: string;
  betAmount: number;
  status: string;
  result?: GameResult;
  gameState?: any;
  serverSeedHash: string;
}

export interface GameSession {
  sessionId: string;
  gameType: string;
  betAmount: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  result?: GameResult;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API Client with auth token management
class GameApiClient {
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

  private async request<T>(
    method: "GET" | "POST" | "PUT" | "DELETE",
    endpoint: string,
    data?: any
  ): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await axios({
        method,
        url: `${API_BASE_URL}${endpoint}`,
        data,
        headers: this.getHeaders(),
        timeout: 10000,
      });

      return response.data;
    } catch (error: any) {
      console.error(`API Error [${method} ${endpoint}]:`, error);

      if (error.response?.data) {
        return error.response.data;
      }

      return {
        success: false,
        error: error.message || "Network error occurred",
      };
    }
  }

  // Get supported games
  async getSupportedGames(): Promise<ApiResponse<SupportedGame[]>> {
    return this.request<SupportedGame[]>("GET", "/games/supported");
  }

  // Create a new game session
  async createGame(
    request: CreateGameRequest
  ): Promise<ApiResponse<GameResponse>> {
    return this.request<GameResponse>("POST", "/games/create", request);
  }

  // Play a game (make moves)
  async playGame(request: PlayGameRequest): Promise<ApiResponse<GameResponse>> {
    return this.request<GameResponse>("POST", "/games/play", request);
  }

  // Get game session details
  async getGameSession(sessionId: string): Promise<ApiResponse<GameSession>> {
    return this.request<GameSession>("GET", `/games/session/${sessionId}`);
  }

  // Get game history
  async getGameHistory(
    gameType?: string,
    limit?: number,
    offset?: number
  ): Promise<ApiResponse<GameSession[]>> {
    const params = new URLSearchParams();
    if (gameType) params.append("gameType", gameType);
    if (limit) params.append("limit", limit.toString());
    if (offset) params.append("offset", offset.toString());

    const queryString = params.toString();
    const endpoint = `/games/history${queryString ? `?${queryString}` : ""}`;

    return this.request<GameSession[]>("GET", endpoint);
  }

  // Cancel a game session
  async cancelGame(
    sessionId: string,
    reason?: string
  ): Promise<ApiResponse<{ cancelled: boolean }>> {
    return this.request<{ cancelled: boolean }>(
      "POST",
      `/games/cancel/${sessionId}`,
      {
        reason,
      }
    );
  }
}

// Create and export singleton instance
export const gameApi = new GameApiClient();

// Utility functions for game-specific operations
export const GameUtils = {
  // Generate unique operation ID for moves
  generateOperationId: (): string => {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  // Format bet amount for display
  formatBetAmount: (amount: number): string => {
    return amount.toFixed(2);
  },

  // Calculate potential winnings
  calculatePotentialWin: (betAmount: number, multiplier: number): number => {
    return betAmount * multiplier;
  },

  // Generate client seed for provably fair gaming
  generateClientSeed: (): string => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  },

  // Device fingerprint for security
  generateDeviceFingerprint: (): string => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("Device fingerprint", 2, 2);
    }

    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      // eslint-disable-next-line no-restricted-globals
      screen.width + "x" + screen.height,
      new Date().getTimezoneOffset(),
      canvas.toDataURL(),
    ].join("|");

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(36);
  },
};

export default gameApi;
