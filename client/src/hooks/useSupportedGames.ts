import { useState, useEffect, useCallback } from 'react';
import { gameApi, SupportedGame } from '../services/gameApi';

export interface UseSupportedGamesReturn {
  games: SupportedGame[];
  isLoading: boolean;
  error: string | null;
  refreshGames: () => Promise<void>;
  getGameConfig: (gameType: string) => SupportedGame | undefined;
}

export const useSupportedGames = (): UseSupportedGamesReturn => {
  const [games, setGames] = useState<SupportedGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await gameApi.getSupportedGames();

      if (response.success && response.data) {
        setGames(response.data);
      } else {
        setError(response.error || response.message || 'Failed to fetch supported games');
      }
    } catch (err: any) {
      console.error('Error fetching supported games:', err);
      setError(err.message || 'Failed to fetch supported games');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshGames = useCallback(async () => {
    await fetchGames();
  }, [fetchGames]);

  const getGameConfig = useCallback((gameType: string): SupportedGame | undefined => {
    return games.find(game => game.gameType === gameType);
  }, [games]);

  useEffect(() => {
    fetchGames();
  }, [fetchGames]);

  return {
    games,
    isLoading,
    error,
    refreshGames,
    getGameConfig,
  };
};