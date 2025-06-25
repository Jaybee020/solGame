import React, { useState } from "react";
import { motion } from "framer-motion";
import BalanceManager from "./BalanceManager";
import BalanceDisplay from "./BalanceDisplay";
import { BalanceInfo } from "../services/balanceApi";

interface BalancePageProps {
  onBackToLobby: () => void;
}

const BalancePage: React.FC<BalancePageProps> = ({ onBackToLobby }) => {
  const [balanceRefreshTrigger, setBalanceRefreshTrigger] = useState(0);

  const handleBalanceUpdate = (balance: BalanceInfo) => {
    setBalanceRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={onBackToLobby}
              className="btn-ghost p-3 rounded-lg hover:bg-background-secondary transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Balance Management
                </span>
              </h1>
              <p className="text-text-secondary mt-2">
                Manage your platform balance for seamless gaming
              </p>
            </div>
          </div>
        </motion.div>

        {/* Balance Overview
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card mb-8"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-text-primary">Current Balance</h2>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-primary rounded-full animate-pulse" />
              <span className="text-sm text-text-secondary">Live Balance</span>
            </div>
          </div>
          
          <BalanceDisplay 
            refreshTrigger={balanceRefreshTrigger}
            className="justify-center"
          />
        </motion.div> */}

        {/* Balance Manager */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <BalanceManager onBalanceUpdate={handleBalanceUpdate} />
        </motion.div>

        {/* Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="card text-center">
            <div className="text-primary text-4xl mb-4">💰</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Instant Deposits
            </h3>
            <p className="text-text-secondary text-sm">
              Deposit tokens directly from your wallet for immediate gaming
            </p>
          </div>

          <div className="card text-center">
            <div className="text-secondary text-4xl mb-4">⚡</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Fast Withdrawals
            </h3>
            <p className="text-text-secondary text-sm">
              Withdraw your winnings back to your wallet at any time
            </p>
          </div>

          <div className="card text-center">
            <div className="text-primary text-4xl mb-4">🔒</div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              Secure Gaming
            </h3>
            <p className="text-text-secondary text-sm">
              Your balance is secured by blockchain technology
            </p>
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 card"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-4">
            <button onClick={onBackToLobby} className="btn-primary">
              🎮 Back to Games
            </button>
            <button
              onClick={() => setBalanceRefreshTrigger((prev) => prev + 1)}
              className="btn-secondary"
            >
              🔄 Refresh Balance
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default BalancePage;
