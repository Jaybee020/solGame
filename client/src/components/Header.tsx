import React, { useCallback, useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useAuth } from "../contexts/AuthContext";
import {
  authService,
  createSignMessage,
  SERVER_API_KEY,
} from "../services/authService";
import bs58 from "bs58";
import "./Header.css";
import gameApi from "../services/gameApi";
import { useTokenBalance } from "../hooks/useTokenBalance";
import { balanceApi } from "../services/balanceApi";
import { useBalance } from "../hooks/useBalance";

interface HeaderProps {
  onNavigateToBalance?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onNavigateToBalance }) => {
  const { publicKey, signMessage, connected, disconnect } = useWallet();
  const {
    walletAddress,
    authToken,
    isAuthenticated,
    setWalletAddress,
    setAuthToken,
    logout,
  } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { formattedBalance, isLoading: isBalanceLoading } = useTokenBalance();
  const { balance: platformBalance, formatBalance } = useBalance();

  const handleAuthenticate = useCallback(async () => {
    if (!publicKey || !signMessage) {
      setError("Wallet not connected or does not support signing");
      return;
    }

    setIsAuthenticating(true);
    setError(null);

    try {
      const message = createSignMessage();
      const messageBytes = new TextEncoder().encode(message);
      const signature = await signMessage(messageBytes);
      const signatureBase58 = bs58.encode(signature);

      const response = await authService.login(
        signatureBase58,
        publicKey.toString(),
        message
      );

      if (response.success) {
        setAuthToken(`${SERVER_API_KEY}:${response.authToken}`);
        gameApi.setAuthToken(`${SERVER_API_KEY}:${response.authToken}`);
        balanceApi.setAuthToken(`${SERVER_API_KEY}:${response.authToken}`);
        console.log("Authentication successful:", response.message);
      } else {
        setError("Authentication failed");
      }
    } catch (err) {
      setError(`Authentication error: ${err}`);
      console.error("Authentication error:", err);
    } finally {
      setIsAuthenticating(false);
    }
  }, [publicKey, signMessage, setAuthToken]);

  useEffect(() => {
    if (connected && publicKey) {
      setWalletAddress(publicKey.toString());
      if (!isAuthenticated) {
        handleAuthenticate();
      }
    } else {
      setWalletAddress(null);
      setAuthToken(null);
    }
  }, [
    connected,
    publicKey,
    setWalletAddress,
    setAuthToken,
    isAuthenticated,
    handleAuthenticate,
  ]);

  useEffect(() => {
    if (!connected && isAuthenticated && authToken) {
      const performLogout = async () => {
        try {
          await authService.logout(authToken);
        } catch (err) {
          console.error("Logout error during wallet disconnect:", err);
        } finally {
          logout();
        }
      };
      performLogout();
    }
  }, [connected, isAuthenticated, authToken, logout]);

  const handleLogout = async () => {
    try {
      if (authToken) {
        await authService.logout(authToken);
      }
      logout();
      disconnect();
    } catch (err) {
      console.error("Logout error:", err);
      // Still perform local logout even if server logout fails
      logout();
      disconnect();
    }
  };

  return (
    <header className="header">
      <div className="header-content">
        <h1 className="app-title">Solana Cash Machine</h1>
        <div className="wallet-section">
          {!connected ? (
            <WalletMultiButton />
          ) : (
            <div className="wallet-connected">
              <div className="wallet-info">
                <span className="wallet-address">
                  {walletAddress?.slice(0, 4)}...{walletAddress?.slice(-4)}
                </span>
                <div className="balance-info">
                  <span className="wallet-balance" title="Wallet Balance">
                    💼 {isBalanceLoading ? "Loading..." : formattedBalance}
                  </span>
                  {isAuthenticated && platformBalance && (
                    <span className="platform-balance" title="Platform Balance">
                      🎮 {formatBalance(platformBalance.balance)} CASH
                    </span>
                  )}
                </div>
                {isAuthenticated && (
                  <span className="auth-status">✓ Authenticated</span>
                )}
              </div>
              <div className="wallet-actions">
                {!isAuthenticated && isAuthenticating && (
                  <span className="auth-status">Authenticating...</span>
                )}
                {isAuthenticated && onNavigateToBalance && (
                  <button
                    onClick={onNavigateToBalance}
                    className="balance-button"
                    title="Manage Balance"
                  >
                    💰 Balance
                  </button>
                )}
                <WalletDisconnectButton />
              </div>
            </div>
          )}
        </div>
      </div>
      {error && <div className="error-message">{error}</div>}
    </header>
  );
};

export default Header;
