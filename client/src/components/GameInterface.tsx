import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGame } from '../hooks/useGame';
import { useSupportedGames } from '../hooks/useSupportedGames';
import BlackjackGame from './games/BlackjackGame';
import DiceGame from './games/DiceGame';
import SlotsGame from './games/SlotsGame';
import ShipCaptainCrewGame from './games/ShipCaptainCrewGame';

interface GameInterfaceProps {
  gameType: string;
  onBackToLobby: () => void;
  isWalletConnected: boolean;
}

const GameInterface: React.FC<GameInterfaceProps> = ({
  gameType,
  onBackToLobby,
  isWalletConnected,
}) => {
  const { gameState, createGame, playMove, autoPlay, resetGame } = useGame();
  const { getGameConfig } = useSupportedGames();
  const [betAmount, setBetAmount] = useState(1);
  const [showResult, setShowResult] = useState(false);

  const gameConfig = getGameConfig(gameType);

  useEffect(() => {
    if (gameState.status === 'completed' && gameState.result) {
      setShowResult(true);
    }
  }, [gameState.status, gameState.result]);

  const handleStartGame = async () => {
    if (!isWalletConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!gameConfig) {
      alert('Game configuration not found');
      return;
    }

    if (betAmount < gameConfig.config.minBet || betAmount > gameConfig.config.maxBet) {
      alert(`Bet amount must be between $${gameConfig.config.minBet} and $${gameConfig.config.maxBet}`);
      return;
    }

    const success = await createGame({
      gameType,
      betAmount,
    });

    if (!success) {
      console.error('Failed to create game');
    }
  };

  const handleNewGame = () => {
    resetGame();
    setShowResult(false);
  };

  const renderGameComponent = () => {
    const commonProps = {
      gameState,
      playMove,
      autoPlay,
      betAmount,
      onNewGame: handleNewGame,
    };

    switch (gameType) {
      case 'blackjack':
        return <BlackjackGame {...commonProps} />;
      case 'dice':
        return <DiceGame {...commonProps} />;
      case 'slots':
        return <SlotsGame {...commonProps} />;
      case 'shipcaptaincrew':
        return <ShipCaptainCrewGame {...commonProps} />;
      default:
        return (
          <div className="text-center py-12">
            <div className="text-error text-6xl mb-4">🚧</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              Game Not Available
            </h3>
            <p className="text-text-secondary">
              The game "{gameType}" is not yet implemented
            </p>
          </div>
        );
    }
  };

  if (!gameConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-error text-6xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Game Not Found
          </h2>
          <p className="text-text-secondary mb-4">
            The game "{gameType}" is not available
          </p>
          <button onClick={onBackToLobby} className="btn-primary">
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div className="flex items-center space-x-4">
            <button
              onClick={onBackToLobby}
              className="btn-ghost p-2 rounded-lg"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-text-primary capitalize">
                {gameType.replace('shipcaptaincrew', 'Ship Captain Crew')}
              </h1>
              <p className="text-text-secondary">
                Min: ${gameConfig.config.minBet} | Max: ${gameConfig.config.maxBet} | House Edge: {(gameConfig.config.houseEdge * 100).toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Wallet Status */}
          <div className="hidden md:flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isWalletConnected ? 'bg-primary' : 'bg-error'}`} />
            <span className="text-sm text-text-secondary">
              {isWalletConnected ? 'Wallet Connected' : 'Wallet Disconnected'}
            </span>
          </div>
        </motion.div>

        {/* Game Content */}
        <AnimatePresence mode="wait">
          {gameState.status === 'idle' ? (
            <motion.div
              key="setup"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card max-w-md mx-auto"
            >
              <h2 className="text-xl font-semibold text-text-primary mb-4">
                Set Your Bet
              </h2>

              <div className="mb-6">
                <label className="block text-text-secondary text-sm mb-2">
                  Bet Amount ($)
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setBetAmount(Math.max(gameConfig.config.minBet, betAmount - 1))}
                    className="btn-secondary px-3 py-2"
                    disabled={betAmount <= gameConfig.config.minBet}
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={betAmount}
                    onChange={(e) => setBetAmount(Math.max(gameConfig.config.minBet, Math.min(gameConfig.config.maxBet, parseFloat(e.target.value) || gameConfig.config.minBet)))}
                    className="input-field flex-1 text-center"
                    min={gameConfig.config.minBet}
                    max={gameConfig.config.maxBet}
                    step="0.01"
                  />
                  <button
                    onClick={() => setBetAmount(Math.min(gameConfig.config.maxBet, betAmount + 1))}
                    className="btn-secondary px-3 py-2"
                    disabled={betAmount >= gameConfig.config.maxBet}
                  >
                    +
                  </button>
                </div>
                <div className="flex justify-between mt-2 text-xs text-text-secondary">
                  <span>Min: ${gameConfig.config.minBet}</span>
                  <span>Max: ${gameConfig.config.maxBet}</span>
                </div>
              </div>

              <div className="mb-6 p-4 bg-background-tertiary rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-text-secondary">Potential Win:</span>
                  <span className="text-primary font-semibold">
                    ${(betAmount * gameConfig.config.baseMultiplier).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">Base Multiplier:</span>
                  <span className="text-text-primary">{gameConfig.config.baseMultiplier}x</span>
                </div>
              </div>

              <button
                onClick={handleStartGame}
                disabled={!isWalletConnected || gameState.isLoading}
                className={`w-full py-3 font-semibold rounded-lg transition-all duration-200 ${
                  !isWalletConnected || gameState.isLoading
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'btn-primary hover:shadow-glow'
                }`}
              >
                {gameState.isLoading ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="loading-spinner w-5 h-5" />
                    <span>Creating Game...</span>
                  </div>
                ) : !isWalletConnected ? (
                  'Connect Wallet to Play'
                ) : (
                  `Start Game - $${betAmount.toFixed(2)}`
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="game"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {renderGameComponent()}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Result Modal */}
        <AnimatePresence>
          {showResult && gameState.result && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
              onClick={() => setShowResult(false)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="card max-w-md w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center">
                  <div className={`text-6xl mb-4 ${gameState.result.isWin ? 'text-primary' : 'text-error'}`}>
                    {gameState.result.isWin ? '🎉' : '😔'}
                  </div>
                  
                  <h3 className={`text-2xl font-bold mb-2 ${gameState.result.isWin ? 'text-primary' : 'text-error'}`}>
                    {gameState.result.isWin ? 'You Won!' : 'Better Luck Next Time'}
                  </h3>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Bet Amount:</span>
                      <span className="text-text-primary">${betAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Multiplier:</span>
                      <span className="text-text-primary">{gameState.result.multiplier}x</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span className="text-text-secondary">
                        {gameState.result.isWin ? 'Winnings:' : 'Loss:'}
                      </span>
                      <span className={gameState.result.isWin ? 'text-primary' : 'text-error'}>
                        ${gameState.result.winAmount.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setShowResult(false)}
                      className="flex-1 btn-ghost"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        setShowResult(false);
                        handleNewGame();
                      }}
                      className="flex-1 btn-primary"
                    >
                      Play Again
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Display */}
        {gameState.error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-error/20 border border-error/50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <span className="text-error">⚠️</span>
              <span className="text-error font-medium">Error:</span>
              <span className="text-text-primary">{gameState.error}</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default GameInterface;