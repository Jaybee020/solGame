import React, { useState, useEffect } from "react";
import { WalletContextProvider } from "./contexts/WalletProvider";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { gameApi } from "./services/gameApi";
import GameLobby from "./components/GameLobby";
import GameInterface from "./components/GameInterface";
import Header from "./components/Header";
import "./App.css";

// Main App Content
const AppContent: React.FC = () => {
  const { isAuthenticated, authToken, setAuthToken } = useAuth();
  const { connected, publicKey } = useWallet();
  const [currentGame, setCurrentGame] = useState<string | null>(null);

  // Set up API authentication when user logs in
  useEffect(() => {
    if (isAuthenticated && authToken) {
      const token = `${
        process.env.REACT_APP_SERVER_API_KEY || "dev_key"
      }:${authToken}`;
      setAuthToken(token);
    }
  }, [isAuthenticated]);

  // Auto-login when wallet connects
  useEffect(() => {
    if (connected && publicKey && !isAuthenticated) {
      handleWalletLogin();
    }
  }, [connected, publicKey, isAuthenticated]);

  const handleWalletLogin = async () => {
    try {
      if (!publicKey) return;
    } catch (error) {
      console.error("Auto-login failed:", error);
    }
  };

  const handleConnectWallet = () => {
    // The WalletMultiButton will handle the connection
    // Authentication happens automatically in the useEffect above
  };

  const handleGameSelect = (gameType: string) => {
    setCurrentGame(gameType);
  };

  const handleBackToLobby = () => {
    setCurrentGame(null);
  };

  const isWalletConnected = connected && isAuthenticated;

  return (
    <div className="min-h-screen bg-background-primary">
      <Header />
      {/* Wallet Connection Bar
      <div className="bg-background-secondary border-b border-white/10 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  isWalletConnected ? "bg-primary" : "bg-error"
                }`}
              />
              <span className="text-text-secondary text-sm">
                {isWalletConnected ? "Connected" : "Not Connected"}
              </span>
            </div>

            {connected && publicKey && (
              <div className="text-text-secondary text-sm">
                {publicKey.toString().slice(0, 4)}...
                {publicKey.toString().slice(-4)}
              </div>
            )}
          </div>

          <WalletMultiButton className="btn-primary" />
        </div>
      </div> */}
      {/* Main Content */}
      <main>
        {currentGame ? (
          <GameInterface
            gameType={currentGame}
            onBackToLobby={handleBackToLobby}
            isWalletConnected={isWalletConnected}
          />
        ) : (
          <GameLobby
            onGameSelect={handleGameSelect}
            isWalletConnected={isWalletConnected}
            onConnectWallet={handleConnectWallet}
          />
        )}
      </main>
      {/* Debug Info (only in development) */}
      {process.env.NODE_ENV === "development" && (
        <div className="fixed bottom-4 right-4 bg-background-secondary p-4 rounded-lg border border-white/10 text-xs text-text-secondary max-w-xs">
          <div>
            <strong>Debug Info:</strong>
          </div>
          <div>Wallet Connected: {connected ? "Yes" : "No"}</div>
          <div>Authenticated: {isAuthenticated ? "Yes" : "No"}</div>
          <div>Current Game: {currentGame || "None"}</div>
          <div>Auth Token: {authToken ? "Set" : "Not Set"}</div>
        </div>
      )}
    </div>
  );
};

function App() {
  return (
    <WalletContextProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </WalletContextProvider>
  );
}

export default App;
