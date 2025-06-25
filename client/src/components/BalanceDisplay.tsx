import React, { useState, useEffect } from "react";
import { balanceApi, BalanceInfo } from "../services/balanceApi";

interface BalanceDisplayProps {
  onBalanceUpdate?: (balance: BalanceInfo) => void;
  refreshTrigger?: number; // Change this to trigger refresh
  className?: string;
}

const BalanceDisplay: React.FC<BalanceDisplayProps> = ({
  onBalanceUpdate,
  refreshTrigger,
  className = "",
}) => {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    fetchBalance();
  }, [refreshTrigger]);

  const formatBalance = (lamports: number) => {
    return lamports.toFixed(4);
  };

  if (loading && !balance) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <button
          onClick={fetchBalance}
          className="text-red-600 hover:text-red-800 text-sm underline"
        >
          Error - Click to retry
        </button>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-600">Available:</span>
        <span className="text-lg font-bold text-green-600">
          {formatBalance(balance.balance)} CASH
        </span>
      </div>

      {balance.lockedBalance > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Locked:</span>
          <span className="text-sm font-semibold text-yellow-600">
            {formatBalance(balance.lockedBalance)} CASH
          </span>
        </div>
      )}

      <button
        onClick={fetchBalance}
        disabled={loading}
        className="text-blue-600 hover:text-blue-800 text-sm underline disabled:opacity-50"
        title="Refresh balance"
      >
        {loading ? "⟳" : "↻"}
      </button>
    </div>
  );
};

export default BalanceDisplay;
