import axios from "axios";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const API_BASE_URL = process.env.SERVER_API_URL || "http://localhost:8000";

export interface LoginResponse {
  success: boolean;
  message: string;
  id: string;
  publicAddress: string;
  authToken: string;
  firstTime: boolean;
}

export interface AuthService {
  login: (
    signature: string,
    publicAddress: string,
    message: string
  ) => Promise<LoginResponse>;
  logout: (authToken: string) => Promise<void>;
  getProfile: (authToken: string) => Promise<any>;
}

export const SERVER_API_KEY = process.env.SERVER_API_KEY || "server-key";
export class AuthServiceImpl implements AuthService {
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = SERVER_API_KEY;
  }

  async login(
    signature: string,
    publicAddress: string,
    message: string
  ): Promise<LoginResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        {
          signature,
          publicAddress,
          message,
        },
        {
          headers: {
            Authorization: this.apiKey,
            "Content-Type": "application/json",
          },
        }
      );

      return response.data;
    } catch (error) {
      throw new Error(`Login failed: ${error}`);
    }
  }

  async logout(authToken: string): Promise<void> {
    try {
      await axios.post(
        `${API_BASE_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: authToken,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (error) {
      throw new Error(`Logout failed: ${error}`);
    }
  }

  async getProfile(authToken: string): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: authToken,
          "Content-Type": "application/json",
        },
      });

      return response.data;
    } catch (error) {
      throw new Error(`Get profile failed: ${error}`);
    }
  }
}

export const authService = new AuthServiceImpl();

// Utility function to create a message for signing
export const createSignMessage = (): string => {
  return Date.now().toString();
};

// Utility function to sign a message
export const signMessage = async (
  message: string,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>
): Promise<string> => {
  const messageBytes = new TextEncoder().encode(message);
  const signature = await signMessage(messageBytes);
  return bs58.encode(signature);
};

// Utility function to verify a signature (for client-side verification if needed)
export const verifySignature = (
  message: string,
  signature: string,
  publicKey: string
): boolean => {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    const publicKeyBytes = new PublicKey(publicKey).toBytes();

    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    return false;
  }
};
