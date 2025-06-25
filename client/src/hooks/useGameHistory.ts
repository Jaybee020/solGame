import { useState, useEffect, useCallback, useRef } from "react";
import { gameApi, GameSession } from "../services/gameApi";

export type GameHistoryItem = GameSession;

interface UseGameHistoryProps {
  gameType?: string;
  limit?: number;
  autoFetch?: boolean;
}

interface UseGameHistoryReturn {
  history: GameHistoryItem[];
  loading: boolean;
  error: string | null;
  totalGames: number;
  totalWinnings: number;
  winRate: number;
  refreshHistory: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;
}

export const useGameHistory = ({
  gameType,
  limit = 10,
  autoFetch = true,
}: UseGameHistoryProps = {}): UseGameHistoryReturn => {
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchHistory = useCallback(
    async (isLoadMore = false) => {
      try {
        setLoading(true);
        setError(null);

        const offsetToUse = isLoadMore ? offsetRef.current : 0;
        const response = await gameApi.getGameHistory(
          gameType,
          limit,
          offsetToUse
        );

        if (response.success && response.data) {
          const newHistory = response.data || [];

          if (isLoadMore) {
            setHistory((prev) => [...prev, ...newHistory]);
          } else {
            setHistory(newHistory);
          }

          offsetRef.current = offsetToUse + newHistory.length;
          setHasMore(newHistory.length === limit);
        } else {
          setError("Failed to fetch game history");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error occurred");
      } finally {
        setLoading(false);
      }
    },
    [gameType, limit]
  );

  const refreshHistory = useCallback(async () => {
    offsetRef.current = 0;
    setHasMore(true);
    await fetchHistory(false);
  }, [fetchHistory]);

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchHistory(true);
    }
  }, [fetchHistory, loading, hasMore]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      refreshHistory();
    }
  }, [gameType, autoFetch]); // Don't include refreshHistory to avoid infinite loops

  // Calculate statistics - only for completed games
  const completedGames = history.filter(
    (game) => game.status === "completed" && game.result
  );
  const totalGames = completedGames.length;
  const totalWinnings = completedGames.reduce(
    (sum, game) => sum + (game.result?.winAmount || 0),
    0
  );
  const winCount = completedGames.filter(
    (game) => game.result.isWin || game.result?.gameData?.isWin
  ).length;

  const winRate = totalGames > 0 ? (winCount / totalGames) * 100 : 0;

  return {
    history,
    loading,
    error,
    totalGames,
    totalWinnings,
    winRate,
    refreshHistory,
    loadMore,
    hasMore,
  };
};
