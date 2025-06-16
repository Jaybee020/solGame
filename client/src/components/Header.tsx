import React, { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletDisconnectButton, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useAuth } from '../contexts/AuthContext';
import { authService, createSignMessage } from '../services/authService';
import bs58 from 'bs58';
import './Header.css';

const Header: React.FC = () => {
  const { wallet, publicKey, signMessage, connected, disconnect } = useWallet();
  const { walletAddress, authToken, isAuthenticated, setWalletAddress, setAuthToken, logout } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (connected && publicKey) {
      setWalletAddress(publicKey.toString());
    } else {
      setWalletAddress(null);
      setAuthToken(null);
    }
  }, [connected, publicKey, setWalletAddress, setAuthToken]);

  const handleAuthenticate = async () => {
    if (!publicKey || !signMessage) {
      setError('Wallet not connected or does not support signing');
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
        setAuthToken(response.authToken);
        console.log('Authentication successful:', response.message);
      } else {
        setError('Authentication failed');
      }
    } catch (err) {
      setError(`Authentication error: ${err}`);
      console.error('Authentication error:', err);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (authToken) {
        await authService.logout(authToken);
      }
      logout();
      disconnect();
    } catch (err) {
      console.error('Logout error:', err);
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
                {isAuthenticated && (
                  <span className="auth-status">✓ Authenticated</span>
                )}
              </div>
              <div className="wallet-actions">
                {!isAuthenticated ? (
                  <button 
                    className="auth-button"
                    onClick={handleAuthenticate}
                    disabled={isAuthenticating}
                  >
                    {isAuthenticating ? 'Authenticating...' : 'Sign & Authenticate'}
                  </button>
                ) : (
                  <button 
                    className="logout-button"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                )}
                <WalletDisconnectButton />
              </div>
            </div>
          )}
        </div>
      </div>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </header>
  );
};

export default Header;