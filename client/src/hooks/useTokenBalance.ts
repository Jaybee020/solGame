import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { solanaService } from '../services/solanaService';
import { STAKING_TOKEN } from '../config/tokens';

export interface UseTokenBalanceReturn {
  balance: number | null;
  formattedBalance: string;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useTokenBalance = (): UseTokenBalanceReturn => {
  const { publicKey, connected } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!publicKey || !connected) {
      setBalance(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const rawBalance = await solanaService.getTokenBalance(
        publicKey.toString(),
        STAKING_TOKEN.mint
      );

      if (rawBalance !== null) {
        // Convert from token units to display units
        const displayBalance = rawBalance / Math.pow(10, STAKING_TOKEN.decimals);
        setBalance(displayBalance);
      } else {
        setBalance(0);
      }
    } catch (err) {
      console.error('Error fetching token balance:', err);
      setError('Failed to fetch balance');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [publicKey, connected]);

  // Fetch balance when wallet connects/disconnects or publicKey changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Format balance for display
  const formattedBalance = balance !== null 
    ? `${balance.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${STAKING_TOKEN.symbol}`
    : '0 ' + STAKING_TOKEN.symbol;

  return {
    balance,
    formattedBalance,
    isLoading,
    error,
    refetch: fetchBalance,
  };
};