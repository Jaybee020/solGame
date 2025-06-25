import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameHistory, GameHistoryItem } from "../hooks/useGameHistory";

interface GameHistoryProps {
  gameType?: string;
  limit?: number;
  showTitle?: boolean;
  compact?: boolean;
}

interface GameDetailModalProps {
  game: GameHistoryItem | null;
  onClose: () => void;
}

const GameDetailModal: React.FC<GameDetailModalProps> = ({ game, onClose }) => {
  if (!game) return null;

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getGameTypeDisplay = (gameType: string) => {
    const gameTypeMap: Record<string, string> = {
      blackjack: "Blackjack",
      dice: "Dice",
      slots: "Slots",
      shipcaptaincrew: "Ship Captain Crew",
    };
    return (
      gameTypeMap[gameType] ||
      gameType.charAt(0).toUpperCase() + gameType.slice(1)
    );
  };

  const renderGameSpecificDetails = () => {
    const data = game.result?.outcome || game.result?.gameData;

    if (game.gameType === "slots" && data) {
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300">Slot Results</h4>
          {data.reels && (
            <div className="bg-gray-800 p-3 rounded">
              <p className="text-xs text-gray-400 mb-2">Final Reels:</p>
              <div className="grid grid-cols-5 gap-1 text-xs">
                {data.reels.map((reel: string[], index: number) => (
                  <div key={index} className="text-center">
                    {reel.map((symbol: string, i: number) => (
                      <div
                        key={i}
                        className="bg-gray-700 p-1 mb-1 rounded text-white"
                      >
                        {symbol.toUpperCase()}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.paylines && data.paylines.length > 0 && (
            <div className="bg-gray-800 p-3 rounded">
              <p className="text-xs text-gray-400 mb-2">Winning Lines:</p>
              {data.paylines.map((payline: any, index: number) => (
                <div key={index} className="text-xs text-green-400 mb-1">
                  Line {index + 1}: {payline.symbolCount} symbols,{" "}
                  {payline.multiplier}x multiplier
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }

    if (game.gameType === "blackjack" && data) {
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300">
            Blackjack Results
          </h4>

          {/* Player Hands */}
          {data.playerHands && (
            <div className="bg-gray-800 p-3 rounded">
              <p className="text-xs text-gray-400 mb-2">Player Hands:</p>
              {Object.entries(data.playerHands).map(
                ([hand, cards]: [string, any]) => (
                  <div key={hand} className="mb-2">
                    <span className="text-xs text-gray-300 capitalize">
                      {hand}:{" "}
                    </span>
                    <span className="text-xs text-white">
                      {Array.isArray(cards)
                        ? cards
                            .map((card: any) => `${card.rank}${card.suit}`)
                            .join(", ")
                        : "N/A"}
                    </span>
                    {data.playerValues && data.playerValues[hand] && (
                      <span className="text-xs text-blue-400 ml-2">
                        (Value: {data.playerValues[hand]})
                      </span>
                    )}
                  </div>
                )
              )}
            </div>
          )}

          {/* Dealer Hand */}
          {data.dealerHand && (
            <div className="bg-gray-800 p-3 rounded">
              <p className="text-xs text-gray-400 mb-2">Dealer Hand:</p>
              <span className="text-xs text-white">
                {data.dealerHand
                  .map((card: any) => `${card.rank}${card.suit}`)
                  .join(", ")}
              </span>
              {data.dealerValue && (
                <span className="text-xs text-blue-400 ml-2">
                  (Value: {data.dealerValue})
                </span>
              )}
            </div>
          )}

          {/* Actions Taken */}
          {data.actionHistory && data.actionHistory.length > 0 && (
            <div className="bg-gray-800 p-3 rounded">
              <p className="text-xs text-gray-400 mb-2">Actions:</p>
              {data.actionHistory
                .slice(-5)
                .map((action: any, index: number) => (
                  <div key={index} className="text-xs text-gray-300 mb-1">
                    {action.hand}: {action.action}{" "}
                    {action.result && `→ ${action.result}`}
                  </div>
                ))}
            </div>
          )}
        </div>
      );
    }

    if (game.gameType === "dice" && data) {
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300">Dice Results</h4>

          <div className="bg-gray-800 p-3 rounded">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-gray-400 mb-1">Target:</p>
                <p className="text-white">{data.target || "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Prediction:</p>
                <p className="text-white capitalize">
                  {data.isOver ? "Over" : "Under"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Rolled:</p>
                <p
                  className={`text-xl font-bold ${
                    game.result?.isWin ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {data.diceResult || data.roll || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-gray-400 mb-1">Multiplier:</p>
                <p className="text-blue-400">{game.result?.multiplier}x</p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (game.gameType === "shipcaptaincrew" && data) {
      return (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-300">
            Ship Captain Crew Results
          </h4>

          <div className="bg-gray-800 p-3 rounded">
            {/* Dice Rolls */}
            {(data.playerRolls || data.rolls) && (
              <div className="mb-3">
                <p className="text-xs text-gray-400 mb-2">Your Rolls:</p>
                <div className="flex gap-2">
                  {(data.playerRolls || data.rolls).map(
                    (roll: number, index: number) => (
                      <div
                        key={index}
                        className="w-8 h-8 bg-gray-700 rounded border-2 border-gray-600 flex items-center justify-center text-white font-bold"
                      >
                        {roll}
                      </div>
                    )
                  )}
                </div>
                {data.playerScore && (
                  <p className="text-xs text-blue-400 mt-1">
                    Score: {data.playerScore}
                  </p>
                )}
              </div>
            )}

            {/* Dealer Rolls */}
            {(data.dealerRolls || data.computerRolls) && (
              <div>
                <p className="text-xs text-gray-400 mb-2">Dealer Rolls:</p>
                <div className="flex gap-2">
                  {(data.dealerRolls || data.computerRolls).map(
                    (roll: number, index: number) => (
                      <div
                        key={index}
                        className="w-8 h-8 bg-gray-700 rounded border-2 border-gray-600 flex items-center justify-center text-white font-bold"
                      >
                        {roll}
                      </div>
                    )
                  )}
                </div>
                {data.dealerScore && (
                  <p className="text-xs text-blue-400 mt-1">
                    Score: {data.dealerScore}
                  </p>
                )}
              </div>
            )}

            {/* Game Result */}
            {data.winner && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <p className="text-xs text-gray-400">Winner:</p>
                <p
                  className={`text-sm font-semibold ${
                    data.winner === "player" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {data.winner === "player" ? "You!" : "Dealer"}
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback for any other game types
    return (
      <div className="bg-gray-800 p-3 rounded">
        <h4 className="text-sm font-semibold text-gray-300 mb-2">Game Data</h4>
        <pre className="text-xs text-gray-400 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Game Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Game Type</p>
              <p className="text-white font-semibold">
                {getGameTypeDisplay(game.gameType)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Date & Time</p>
              <p className="text-white">{formatDateTime(game.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Session ID</p>
              <p className="text-white font-mono text-sm">{game.sessionId}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-400">Bet Amount</p>
              <p className="text-white font-semibold">
                {formatCurrency(game.betAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Status</p>
              <span
                className={`px-2 py-1 rounded text-sm font-semibold capitalize ${
                  game.status === "completed"
                    ? "bg-green-600 text-white"
                    : game.status === "in_progress"
                    ? "bg-yellow-600 text-white"
                    : "bg-gray-600 text-white"
                }`}
              >
                {game.status}
              </span>
            </div>
            {game.result && (
              <>
                <div>
                  <p className="text-sm text-gray-400">Win Amount</p>
                  <p
                    className={`font-semibold ${
                      game.result.isWin || game.result?.gameData?.isWin
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatCurrency(game.result.winAmount || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Result</p>
                  <span
                    className={`px-2 py-1 rounded text-sm font-semibold ${
                      game.result.isWin || game.result?.gameData?.isWin
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {game.result.isWin || game.result?.gameData?.isWin
                      ? "WIN"
                      : "LOSS"}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        {game.status === "completed" && game.result ? (
          renderGameSpecificDetails()
        ) : (
          <div className="bg-gray-800 p-3 rounded">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">
              Game Status
            </h4>
            <p className="text-sm text-gray-400">
              {game.status === "in_progress"
                ? "This game is still in progress."
                : game.status === "created"
                ? "This game was created but not completed."
                : "This game has no result data available."}
            </p>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

const GameHistoryRow: React.FC<{
  game: GameHistoryItem;
  onClick: () => void;
  compact?: boolean;
}> = ({ game, onClick, compact = false }) => {
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    if (compact) {
      return date.toLocaleDateString();
    }
    return date.toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  const getGameTypeDisplay = (gameType: string) => {
    const gameTypeMap: Record<string, string> = {
      blackjack: "Blackjack",
      dice: "Dice",
      slots: "Slots",
      shipcaptaincrew: "Ship Captain Crew",
    };
    return (
      gameTypeMap[gameType] ||
      gameType.charAt(0).toUpperCase() + gameType.slice(1)
    );
  };

  return (
    <motion.tr
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="hover:bg-gray-800 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <td className="px-4 py-3 text-sm text-white">
        {getGameTypeDisplay(game.gameType)}
      </td>
      <td className="px-4 py-3 text-sm text-gray-300">
        {formatDateTime(game.createdAt)}
      </td>
      <td className="px-4 py-3 text-sm text-white font-semibold">
        {formatCurrency(game.betAmount)}
      </td>
      <td
        className={`px-4 py-3 text-sm font-semibold ${
          game.result.isWin || game.result?.gameData?.isWin
            ? "text-green-400"
            : game.result
            ? "text-red-400"
            : "text-gray-400"
        }`}
      >
        {game.result ? formatCurrency(game.result.winAmount || 0) : "-"}
      </td>
      <td className="px-4 py-3">
        {game.result ? (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              game.result.isWin || game.result?.gameData?.isWin
                ? "bg-green-600 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {game.result.isWin || game.result?.gameData?.isWin ? "WIN" : "LOSS"}
          </span>
        ) : (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
              game.status === "completed"
                ? "bg-gray-600 text-white"
                : game.status === "in_progress"
                ? "bg-yellow-600 text-white"
                : "bg-gray-600 text-white"
            }`}
          >
            {game.status}
          </span>
        )}
      </td>
      {!compact && (
        <td className="px-4 py-3 text-sm text-gray-400 font-mono">
          {game.sessionId.slice(0, 8)}...
        </td>
      )}
    </motion.tr>
  );
};

const GameHistory: React.FC<GameHistoryProps> = ({
  gameType,
  limit = 10,
  showTitle = true,
  compact = false,
}) => {
  const {
    history,
    loading,
    error,
    totalGames,
    totalWinnings,
    winRate,
    refreshHistory,
    loadMore,
    hasMore,
  } = useGameHistory({ gameType, limit });

  const [selectedGame, setSelectedGame] = useState<GameHistoryItem | null>(
    null
  );

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  if (loading && history.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2 text-gray-400">Loading game history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-red-400 mb-4">
            Error loading game history: {error}
          </p>
          <button
            onClick={refreshHistory}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No game history found</p>
          <p className="text-sm text-gray-500">
            {gameType
              ? `No ${gameType} games played yet`
              : "Start playing to see your game history"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-6">
      {showTitle && (
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">
            {gameType
              ? `${
                  gameType.charAt(0).toUpperCase() + gameType.slice(1)
                } History`
              : "Game History"}
          </h2>
          <button
            onClick={refreshHistory}
            className="px-3 py-1 bg-gray-700 text-gray-300 rounded text-sm hover:bg-gray-600 transition-colors"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Total Sessions</p>
          <p className="text-2xl font-bold text-white">{history.length}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Completed Games</p>
          <p className="text-2xl font-bold text-white">{totalGames}</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Total Winnings</p>
          <p
            className={`text-2xl font-bold ${
              totalWinnings >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {formatCurrency(totalWinnings)}
          </p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg">
          <p className="text-sm text-gray-400">Win Rate</p>
          <p className="text-2xl font-bold text-blue-400">
            {totalGames > 0 ? winRate.toFixed(1) : "0.0"}%
          </p>
        </div>
      </div>

      {/* History Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                Game
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                Date
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                Bet
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                Win
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                Status
              </th>
              {!compact && (
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">
                  Session
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {history.map((game) => (
              <GameHistoryRow
                key={game._id}
                game={game}
                onClick={() => setSelectedGame(game)}
                compact={compact}
              />
            ))}
          </tbody>
        </table>
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}

      {/* Game Detail Modal */}
      <AnimatePresence>
        {selectedGame && (
          <GameDetailModal
            game={selectedGame}
            onClose={() => setSelectedGame(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default GameHistory;
