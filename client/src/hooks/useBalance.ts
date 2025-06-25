import { useState, useEffect, useCallback } from "react";
import { balanceApi, BalanceInfo } from "../services/balanceApi";

export const useBalance = () => {
  const [balance, setBalance] = useState<BalanceInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await balanceApi.getBalance();
      if (result.success && result.data) {
        setBalance(result.data);
        return result.data;
      } else {
        const errorMsg = result.error || "Failed to fetch balance";
        setError(errorMsg);
        // throw new Error(errorMsg);
      }
    } catch (err) {
      const errorMsg = "Failed to fetch balance";
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  const hasBalance = useCallback(
    (amount: number): boolean => {
      if (!balance) return false;
      return balance.balance >= amount;
    },
    [balance]
  );

  const formatBalance = useCallback((lamports: number): string => {
    return (lamports / 1e9).toFixed(4);
  }, []);

  const getAvailableBalance = useCallback((): number => {
    return balance?.balance || 0;
  }, [balance]);

  const getLockedBalance = useCallback((): number => {
    return balance?.lockedBalance || 0;
  }, [balance]);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    balance,
    loading,
    error,
    fetchBalance,
    refreshBalance,
    hasBalance,
    formatBalance,
    getAvailableBalance,
    getLockedBalance,
  };
};
