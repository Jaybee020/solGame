import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  balanceApi,
  BalanceInfo,
  BalanceTransaction,
} from "../services/balanceApi";
import { solanaService } from "../services/solanaService";
import { STAKING_TOKEN, MANAGER_WALLET_ADDRESS } from "../config/tokens";

interface BalanceManagerProps {
  onBalanceUpdate?: (balance: BalanceInfo) => void;
}

const BalanceManager: React.FC<BalanceManagerProps> = ({ onBalanceUpdate }) => {
  const wallet = useWallet();
  const { publicKey } = wallet;
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [history, setHistory] = useState<BalanceTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositing, setDepositing] = useState(false);

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawing, setWithdrawing] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<"balance" | "history">("balance");

  useEffect(() => {
    fetchBalance();
    fetchHistory();
  }, []);

  const fetchBalance = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await balanceApi.getBalance();
      if (result.success && result.data) {
        setBalance(result.data);
        onBalanceUpdate?.(result.data);
      } else {
        setError(result.error || "Failed to fetch balance");
      }
    } catch (err) {
      setError("Failed to fetch balance");
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const result = await balanceApi.getBalanceHistory(20);
      if (result.success && result.data) {
        setHistory(result.data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleDeposit = async () => {
    if (!publicKey || !depositAmount) {
      setError("Please connect wallet and enter deposit amount");
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid deposit amount");
      return;
    }

    setDepositing(true);
    setError(null);

    try {
      if (!wallet.signTransaction) {
        setError("Wallet does not support transaction signing");
        return;
      }

      // Send transaction using transferTokens method
      const txSignature = await solanaService.transferTokens(
        wallet,
        STAKING_TOKEN.mint,
        MANAGER_WALLET_ADDRESS,
        amount,
        STAKING_TOKEN.decimals
      );

      if (txSignature) {
        // Wait for confirmation
        const confirmed = await solanaService.waitForConfirmation(
          txSignature,
          30000
        );

        if (confirmed) {
          // Credit balance on server
          const depositResult = await balanceApi.deposit(
            txSignature,
            `deposit_${Date.now()}`
          );

          if (depositResult.success) {
            setDepositAmount("");
            await fetchBalance();
            await fetchHistory();
          } else {
            setError(depositResult.error || "Failed to credit deposit");
          }
        } else {
          setError("Transaction failed to confirm");
        }
      } else {
        setError("Failed to send transaction");
      }
    } catch (err: any) {
      setError(err.message || "Failed to process deposit");
      console.error("Deposit error:", err);
    } finally {
      setDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!publicKey || !withdrawAmount) {
      setError("Please connect wallet and enter withdrawal amount");
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid withdrawal amount");
      return;
    }

    if (balance && amount > balance.balance) {
      setError("Insufficient balance");
      return;
    }

    setWithdrawing(true);
    setError(null);

    try {
      // Convert to lamports
      const lamports = Math.floor(amount * 1e9);

      const withdrawResult = await balanceApi.withdraw(
        amount,
        publicKey.toString(),
        `withdraw_${Date.now()}`
      );

      if (withdrawResult.success) {
        setWithdrawAmount("");
        await fetchBalance();
        await fetchHistory();
      } else {
        setError("Failed to process withdrawal. Contact support for more info");
      }
    } catch (err) {
      setError("Failed to process withdrawal. Contact support for more info");
      console.error("Withdrawal error:", err);
    } finally {
      setWithdrawing(false);
    }
  };

  const formatBalance = (lamports: number) => {
    return lamports.toFixed(3);
  };

  const formatDate = (dateString: string) => {
    return (
      new Date(dateString).toLocaleDateString() +
      " " +
      new Date(dateString).toLocaleTimeString()
    );
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case "deposit":
        return "text-secondary";
      case "withdraw":
        return "text-warning";
      case "game_win":
        return "text-primary";
      case "game_loss":
        return "text-error";
      case "game_refund":
        return "text-primary";
      default:
        return "text-text-secondary";
    }
  };

  const truncateHash = (hash: string, startChars = 6, endChars = 4) => {
    if (hash.length <= startChars + endChars + 3) {
      return hash;
    }
    return `${hash.slice(0, startChars)}...${hash.slice(-endChars)}`;
  };

  if (loading && !balance) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading-spinner w-8 h-8"></div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-text-primary">
          Balance Manager
        </h2>
        <button
          onClick={fetchBalance}
          className="btn-secondary"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-error/20 border border-error/50 text-error px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex mb-6">
        <button
          onClick={() => setActiveTab("balance")}
          className={`px-6 py-2 font-medium rounded-l-lg transition-all duration-200 ${
            activeTab === "balance"
              ? "bg-primary text-black"
              : "bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80 hover:text-text-primary"
          }`}
        >
          Balance & Actions
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-6 py-2 font-medium rounded-r-lg transition-all duration-200 ${
            activeTab === "history"
              ? "bg-primary text-black"
              : "bg-background-tertiary text-text-secondary hover:bg-background-tertiary/80 hover:text-text-primary"
          }`}
        >
          Transaction History
        </button>
      </div>

      {activeTab === "balance" && (
        <div className="space-y-6">
          {/* Balance Display */}
          {balance && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-background-tertiary p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-secondary">
                  Available Balance
                </h3>
                <p className="text-2xl font-bold text-primary">
                  {formatBalance(balance.balance)} CASH
                </p>
              </div>
              <div className="bg-background-tertiary p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-secondary">
                  Locked Balance
                </h3>
                <p className="text-2xl font-bold text-warning">
                  {formatBalance(balance.lockedBalance)} CASH
                </p>
              </div>
              <div className="bg-background-tertiary p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-secondary">
                  Total Deposited
                </h3>
                <p className="text-2xl font-bold text-secondary">
                  {formatBalance(balance.totalDeposited)} CASH
                </p>
              </div>
              <div className="bg-background-tertiary p-4 rounded-lg">
                <h3 className="text-sm font-medium text-text-secondary">
                  Net Winnings
                </h3>
                <p className="text-2xl font-bold text-text-primary">
                  {formatBalance(
                    balance.totalGameWinnings - balance.totalGameLosses
                  )}{" "}
                  CASH
                </p>
              </div>
            </div>
          )}

          {/* Deposit Section */}
          <div className="bg-background-tertiary p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              💰 Deposit Tokens
            </h3>
            <div className="mb-4">
              <label className="block text-text-secondary text-sm mb-2">
                Amount (CASH)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setDepositAmount(
                      Math.max(
                        0,
                        parseFloat(depositAmount || "0") - 1
                      ).toString()
                    )
                  }
                  className="btn-secondary px-3 py-2"
                  disabled={depositing || parseFloat(depositAmount || "0") <= 0}
                >
                  -
                </button>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Enter amount to deposit"
                  step="0.0001"
                  min="0"
                  className="input-field flex-1 text-center"
                  disabled={depositing}
                />
                <button
                  onClick={() =>
                    setDepositAmount(
                      (parseFloat(depositAmount || "0") + 1).toString()
                    )
                  }
                  className="btn-secondary px-3 py-2"
                  disabled={depositing}
                >
                  +
                </button>
              </div>
            </div>
            <button
              onClick={handleDeposit}
              disabled={depositing || !depositAmount || !publicKey}
              className="btn-primary w-full"
            >
              {depositing ? "Depositing..." : "Deposit"}
            </button>
          </div>

          {/* Withdraw Section */}
          <div className="bg-background-tertiary p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              💸 Withdraw Tokens
            </h3>
            <div className="mb-4">
              <label className="block text-text-secondary text-sm mb-2">
                Amount (CASH)
              </label>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    setWithdrawAmount(
                      Math.max(
                        0,
                        parseFloat(withdrawAmount || "0") - 1
                      ).toString()
                    )
                  }
                  className="btn-secondary px-3 py-2"
                  disabled={
                    withdrawing || parseFloat(withdrawAmount || "0") <= 0
                  }
                >
                  -
                </button>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount to withdraw"
                  step="0.0001"
                  min="0"
                  max={balance ? formatBalance(balance.balance) : "0"}
                  className="input-field flex-1 text-center"
                  disabled={withdrawing}
                />
                <button
                  onClick={() =>
                    setWithdrawAmount(
                      (parseFloat(withdrawAmount || "0") + 1).toString()
                    )
                  }
                  className="btn-secondary px-3 py-2"
                  disabled={withdrawing}
                >
                  +
                </button>
              </div>
              {balance && (
                <div className="flex justify-between mt-2 text-xs text-text-secondary">
                  <span>Available: {formatBalance(balance.balance)} CASH</span>
                  <button
                    onClick={() =>
                      setWithdrawAmount(formatBalance(balance.balance))
                    }
                    className="text-primary hover:underline"
                    disabled={withdrawing}
                  >
                    Max
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleWithdraw}
              disabled={withdrawing || !withdrawAmount || !publicKey}
              className="btn-secondary w-full"
            >
              {withdrawing ? "Withdrawing..." : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-primary">
            Recent Transactions
          </h3>

          {history.length === 0 ? (
            <p className="text-text-secondary text-center py-8">
              No transactions found
            </p>
          ) : (
            <div className="space-y-2">
              {history.map((tx) => (
                <div
                  key={tx._id}
                  className="bg-background-tertiary p-4 rounded-lg"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span
                          className={`font-medium ${getTransactionTypeColor(
                            tx.type
                          )}`}
                        >
                          {tx.type.replace("_", " ").toUpperCase()}
                        </span>
                        <span className="text-lg font-semibold text-text-primary">
                          {tx.type === "withdraw" || tx.type === "game_loss"
                            ? "-"
                            : "+"}
                          {formatBalance(tx.amount)} CASH
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {tx.description}
                      </p>
                      <p className="text-xs text-text-secondary/75 mt-2">
                        {formatDate(tx.createdAt)}
                      </p>
                    </div>
                    <div className="text-right min-w-0 flex-shrink-0 w-32">
                      <p className="text-sm text-text-secondary">
                        Balance: {formatBalance(tx.balanceAfter)} CASH
                      </p>
                      {tx.metadata?.transactionHash && (
                        <p className="text-xs text-primary font-mono break-all">
                          {truncateHash(tx.metadata.transactionHash)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BalanceManager;
