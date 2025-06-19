import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameState } from '../../hooks/useGame';
import { PAYOUT_TOKEN } from '../../config/tokens';

interface SlotsGameProps {
  gameState: GameState;
  playMove: (move: { action: string; data?: any }) => Promise<boolean>;
  autoPlay: () => Promise<boolean>;
  betAmount: number;
  onNewGame: () => void;
}

const SlotsGame: React.FC<SlotsGameProps> = ({
  gameState,
  playMove,
  autoPlay,
  betAmount,
  onNewGame,
}) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [selectedLines, setSelectedLines] = useState(3);

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === 'playing';
  const isCompleted = gameState.status === 'completed';

  // Crypto-themed symbols
  const symbols = [
    { id: 'btc', symbol: '₿', name: 'Bitcoin', color: '#F7931A' },
    { id: 'eth', symbol: 'Ξ', name: 'Ethereum', color: '#627EEA' },
    { id: 'sol', symbol: '◎', name: 'Solana', color: '#00FFA3' },
    { id: 'ada', symbol: '₳', name: 'Cardano', color: '#0033AD' },
    { id: 'dot', symbol: '●', name: 'Polkadot', color: '#E6007A' },
    { id: 'link', symbol: '🔗', name: 'Chainlink', color: '#375BD2' },
    { id: 'wild', symbol: '💎', name: 'Diamond Wild', color: '#00FFFF' },
    { id: 'scatter', symbol: '⭐', name: 'Star Scatter', color: '#FFD700' },
  ];

  useEffect(() => {
    // Auto-spin slots game once it's created
    if (isPlaying && !gameData?.hasSpun) {
      handleSpin();
    }
  }, [isPlaying, gameData]);

  const handleSpin = async () => {
    setIsSpinning(true);
    
    // Add spinning animation delay
    setTimeout(async () => {
      await autoPlay();
      setIsSpinning(false);
    }, 3000);
  };

  const renderSymbol = (symbolId: string, isAnimated = false) => {
    const symbol = symbols.find(s => s.id === symbolId) || symbols[0];
    
    return (
      <motion.div
        animate={isAnimated && isSpinning ? { y: [-20, 0, -20] } : {}}
        transition={{ 
          duration: 0.3, 
          repeat: isAnimated && isSpinning ? Infinity : 0,
          ease: "easeInOut" 
        }}
        className="text-4xl flex items-center justify-center h-20 w-20 rounded-lg border-2 border-primary/30 bg-background-tertiary"
        style={{ color: symbol.color }}
      >
        {symbol.symbol}
      </motion.div>
    );
  };

  const renderSlotMachine = () => {
    const reels = gameData?.reels || [
      ['btc', 'eth', 'sol'],
      ['eth', 'sol', 'ada'],
      ['sol', 'ada', 'dot'],
      ['ada', 'dot', 'link'],
      ['dot', 'link', 'btc']
    ];

    return (
      <div className="bg-gradient-to-b from-background-secondary to-background-tertiary p-6 rounded-xl border-2 border-primary/30">
        {/* Slot Display */}
        <div className="grid grid-cols-5 gap-2 mb-6">
          {reels.map((reel: string[], reelIndex: number) => (
            <div key={reelIndex} className="space-y-2">
              {reel.map((symbolId: string, symbolIndex: number) => (
                <div key={`${reelIndex}-${symbolIndex}`}>
                  {renderSymbol(symbolId, isSpinning)}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Paylines Indicator */}
        <div className="flex justify-center mb-4">
          <div className="flex space-x-2">
            {Array.from({ length: selectedLines }, (_, i) => (
              <div
                key={i}
                className="w-2 h-2 bg-primary rounded-full"
              />
            ))}
          </div>
        </div>

        {/* Spin Button */}
        {!gameData?.hasSpun && !isCompleted && (
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="w-full btn-primary text-xl py-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSpinning ? (
              <div className="flex items-center justify-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-6 h-6 border-2 border-black/20 border-t-black rounded-full"
                />
                <span>Spinning...</span>
              </div>
            ) : (
              'SPIN'
            )}
          </button>
        )}
      </div>
    );
  };

  const renderPaytable = () => (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Paytable</h3>
      <div className="grid grid-cols-2 gap-4">
        {symbols.slice(0, 6).map((symbol) => (
          <div key={symbol.id} className="flex items-center space-x-3 p-2 bg-background-tertiary rounded">
            <div 
              className="text-2xl"
              style={{ color: symbol.color }}
            >
              {symbol.symbol}
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">{symbol.name}</div>
              <div className="text-xs text-text-secondary">5x = 100:1</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!isPlaying && !isCompleted) {
    return (
      <div className="text-center py-12">
        <div className="loading-spinner w-16 h-16 mx-auto mb-4" />
        <p className="text-text-secondary">Setting up your slot machine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Info */}
      <div className="card">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">${betAmount.toFixed(2)}</div>
            <div className="text-sm text-text-secondary">Bet Amount</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{selectedLines}</div>
            <div className="text-sm text-text-secondary">Paylines</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              ${(betAmount * selectedLines * 50).toFixed(2)}
            </div>
            <div className="text-sm text-text-secondary">Max Win</div>
          </div>
        </div>
      </div>

      {/* Slot Machine */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Crypto Slots</h2>
        {renderSlotMachine()}
      </div>

      {/* Game Settings */}
      {!gameData?.hasSpun && !isCompleted && (
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Game Settings</h3>
          
          <div>
            <label className="block text-text-secondary text-sm mb-2">
              Paylines: {selectedLines}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={selectedLines}
              onChange={(e) => setSelectedLines(parseInt(e.target.value))}
              className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer"
              disabled={isSpinning}
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>1 Line</span>
              <span>5 Lines</span>
            </div>
          </div>
        </div>
      )}

      {/* Winning Lines */}
      {gameData?.winningLines && gameData.winningLines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card"
        >
          <h3 className="text-lg font-semibold text-primary mb-4">Winning Lines!</h3>
          <div className="space-y-2">
            {gameData.winningLines.map((line: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-primary/10 rounded"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-primary font-semibold">Line {line.lineNumber}:</span>
                  <div className="flex space-x-1">
                    {line.symbols.map((symbolId: string, i: number) => (
                      <span key={i} style={{ color: symbols.find(s => s.id === symbolId)?.color }}>
                        {symbols.find(s => s.id === symbolId)?.symbol}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="text-primary font-bold">
                  +{line.payout.toFixed(2)} ${PAYOUT_TOKEN.symbol}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Paytable */}
      {renderPaytable()}

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
            {gameState.result?.isWin ? '🎰💰' : '🎰'}
          </div>
          
          <h3 className={`text-xl font-bold mb-2 ${
            gameState.result?.isWin ? 'text-primary' : 'text-error'
          }`}>
            {gameState.result?.isWin ? 'Big Win!' : 'No win this time'}
          </h3>

          {gameState.result?.isWin && (
            <div className="text-lg text-primary font-semibold mb-4">
              Won: ${gameState.result.winAmount.toFixed(2)}
            </div>
          )}

          <button
            onClick={onNewGame}
            className="btn-primary"
          >
            Spin Again
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default SlotsGame;