import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameState } from '../../hooks/useGame';

interface Card {
  suit: number;
  rank: number;
  value: number;
}

interface BlackjackGameProps {
  gameState: GameState;
  playMove: (move: { action: string; data?: any }) => Promise<boolean>;
  autoPlay: () => Promise<boolean>;
  betAmount: number;
  onNewGame: () => void;
}

const BlackjackGame: React.FC<BlackjackGameProps> = ({
  gameState,
  playMove,
  autoPlay,
  betAmount,
  onNewGame,
}) => {
  const [isDealing, setIsDealing] = useState(false);

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === 'playing';
  const isCompleted = gameState.status === 'completed';

  // Auto-play if no moves are available (for automatic games like dice/slots)
  useEffect(() => {
    if (isPlaying && gameData && !gameData.canDoubleDown && !gameData.canSplit && !gameData.canSurrender) {
      // This is for games that complete automatically
    }
  }, [isPlaying, gameData, autoPlay]);

  const handleMove = async (action: string, data?: any) => {
    setIsDealing(true);
    await playMove({ action, data });
    setIsDealing(false);
  };

  const renderCard = (card: Card, index: number, isHidden = false) => {
    const suits = ['♠', '♥', '♦', '♣'];
    const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
    
    return (
      <motion.div
        key={`${card.suit}-${card.rank}-${index}`}
        initial={{ opacity: 0, y: -50, rotateY: 180 }}
        animate={{ opacity: 1, y: 0, rotateY: 0 }}
        transition={{ delay: index * 0.2 }}
        className={`relative w-20 h-28 rounded-lg border-2 shadow-lg ${
          isHidden 
            ? 'bg-background-tertiary border-primary/30' 
            : 'bg-white border-gray-300'
        }`}
        style={{ marginLeft: index > 0 ? '-10px' : '0' }}
      >
        {isHidden ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
              <span className="text-primary font-bold">?</span>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 p-2 flex flex-col justify-between">
            <div className={`text-sm font-bold ${
              card.suit === 1 || card.suit === 2 ? 'text-red-500' : 'text-black'
            }`}>
              {ranks[card.rank - 1]}
              <div className="text-lg leading-none">
                {suits[card.suit]}
              </div>
            </div>
            <div className={`text-sm font-bold self-end rotate-180 ${
              card.suit === 1 || card.suit === 2 ? 'text-red-500' : 'text-black'
            }`}>
              {ranks[card.rank - 1]}
              <div className="text-lg leading-none">
                {suits[card.suit]}
              </div>
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  const calculateHandValue = (hand: Card[]): number => {
    let value = 0;
    let aces = 0;

    for (const card of hand) {
      if (card.rank === 1) {
        aces++;
        value += 11;
      } else {
        value += card.value;
      }
    }

    while (value > 21 && aces > 0) {
      value -= 10;
      aces--;
    }

    return value;
  };

  if (!isPlaying && !isCompleted) {
    return (
      <div className="text-center py-12">
        <div className="loading-spinner w-16 h-16 mx-auto mb-4" />
        <p className="text-text-secondary">Setting up your game...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Table */}
      <div className="card relative overflow-hidden">
        {/* Table Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/10" />
        
        <div className="relative z-10 p-6">
          {/* Dealer Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Dealer</h3>
              {gameData?.dealerHand && (
                <div className="text-text-secondary">
                  Total: {gameData.dealerTotal || '?'}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 min-h-32">
              {gameData?.dealerHand ? (
                gameData.dealerHand.map((card: Card, index: number) => 
                  renderCard(card, index, card.faceDown)
                )
              ) : (
                <div className="flex items-center justify-center w-20 h-28 border-2 border-dashed border-primary/30 rounded-lg">
                  <span className="text-primary/50 text-xs">Dealer</span>
                </div>
              )}
            </div>
          </div>

          {/* Player Section */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Your Hand</h3>
              {gameData?.playerHand && (
                <div className="text-text-secondary">
                  Total: {gameData.playerTotal}
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-2 min-h-32">
              {gameData?.playerHand ? (
                gameData.playerHand.map((card: Card, index: number) => 
                  renderCard(card, index)
                )
              ) : (
                <div className="flex items-center justify-center w-20 h-28 border-2 border-dashed border-primary/30 rounded-lg">
                  <span className="text-primary/50 text-xs">Player</span>
                </div>
              )}
            </div>

            {/* Split Hand */}
            {gameData?.splitHand && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">Split Hand</h3>
                  <div className="text-text-secondary">
                    Total: {gameData.splitTotal}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 min-h-32">
                  {gameData.splitHand.map((card: Card, index: number) => 
                    renderCard(card, index)
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Game Actions */}
      {isPlaying && gameData && (
        <div className="card">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary">Current Bet:</span>
              <span className="text-primary font-semibold">${betAmount.toFixed(2)}</span>
            </div>
            {gameData.currentHand && (
              <div className="flex items-center justify-between mb-2">
                <span className="text-text-secondary">Playing Hand:</span>
                <span className="text-text-primary capitalize">{gameData.currentHand}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => handleMove('hit')}
              disabled={isDealing || !isPlaying}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDealing ? 'Dealing...' : 'Hit'}
            </button>
            
            <button
              onClick={() => handleMove('stand')}
              disabled={isDealing || !isPlaying}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Stand
            </button>
          </div>

          {/* Advanced Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {gameData.canDoubleDown && (
              <button
                onClick={() => handleMove('double')}
                disabled={isDealing}
                className="btn-ghost border border-primary/30 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Double Down
              </button>
            )}
            
            {gameData.canSplit && (
              <button
                onClick={() => handleMove('split')}
                disabled={isDealing}
                className="btn-ghost border border-primary/30 hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Split
              </button>
            )}
            
            {gameData.canSurrender && (
              <button
                onClick={() => handleMove('surrender')}
                disabled={isDealing}
                className="btn-ghost border border-error/30 hover:bg-error/10 text-error disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Surrender
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action History */}
      {gameData?.actionHistory && gameData.actionHistory.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Action History</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {gameData.actionHistory.slice(-10).map((action: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between text-sm p-2 bg-background-tertiary rounded"
              >
                <span className="text-text-secondary capitalize">
                  {action.hand} {action.action}
                </span>
                <span className="text-text-primary">
                  {action.result && action.result}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Result */}
      {isCompleted && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center"
        >
          <div className={`text-4xl mb-4 ${
            gameState.result?.isWin ? 'text-primary' : 'text-error'
          }`}>
            {gameState.result?.isWin ? '🎉' : '💔'}
          </div>
          
          <h3 className={`text-xl font-bold mb-4 ${
            gameState.result?.isWin ? 'text-primary' : 'text-error'
          }`}>
            {gameState.result?.isWin ? 'Congratulations!' : 'Better luck next time!'}
          </h3>

          <button
            onClick={onNewGame}
            className="btn-primary"
          >
            Play Again
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default BlackjackGame;