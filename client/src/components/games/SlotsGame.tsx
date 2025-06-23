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
  const [showResult, setShowResult] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);

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

  // Remove auto-play - let user interact first
  useEffect(() => {
    // Only setup initial state, don't auto-spin
    if (isPlaying && !gameData?.gameStarted) {
      // Initialize game state
      playMove({
        action: 'initialize',
        data: {}
      });
    }
  }, [isPlaying, gameData]);

  // Handle showing result when game completes or when we get game data
  useEffect(() => {
    // Try to get the spin results from different possible locations
    const reels = gameData?.reels || gameState.result?.gameData?.reels;
    
    if (reels && !showResult && (isCompleted || gameData)) {
      setSpinResult(gameData || gameState.result?.gameData);
      setShowResult(true);
      setIsSpinning(false);
    }
  }, [isCompleted, gameData, gameState.result, showResult]);

  // Reset state when game starts
  useEffect(() => {
    if (isPlaying && !isCompleted) {
      setShowResult(false);
      setSpinResult(null);
      setIsSpinning(false);
    }
  }, [isPlaying, isCompleted]);

  const handleSpin = async () => {
    if (!isPlaying) return;
    
    setIsSpinning(true);
    setShowResult(false);
    setSpinResult(null);

    // Start spinning animation for 3 seconds, then make the API call
    setTimeout(async () => {
      try {
        // Make the actual spin
        await playMove({
          action: 'spin',
          data: { paylines: selectedLines }
        });
        
        // The useEffect will handle showing the result when gameData updates
      } catch (error) {
        console.error('Error spinning slots:', error);
        setIsSpinning(false);
      }
    }, 3000);
  };

  const renderSymbol = (symbolId: string, isAnimated = false, index = 0) => {
    const symbol = symbols.find(s => s.id === symbolId) || symbols[0];
    const shouldAnimate = isAnimated && isSpinning && !showResult && !isCompleted;
    
    return (
      <motion.div
        key={`symbol-${gameState.sessionId}-${showResult ? 'result' : 'spinning'}-${index}`}
        animate={shouldAnimate ? { 
          y: [-30, 30, -30],
          rotateX: [0, 360],
          scale: [1, 1.1, 1]
        } : {
          y: 0,
          rotateX: 0,
          scale: 1
        }}
        transition={{ 
          duration: shouldAnimate ? 0.4 : 0.3, 
          repeat: shouldAnimate ? Infinity : 0,
          ease: shouldAnimate ? "easeInOut" : "easeOut",
          delay: shouldAnimate ? index * 0.1 : 0
        }}
        className={`text-4xl flex items-center justify-center h-20 w-20 rounded-lg border-2 shadow-lg transform-gpu
          ${symbol ? 'border-primary/50 bg-gradient-to-br from-background-secondary to-background-tertiary' : 'border-primary/30 bg-background-tertiary'}
          ${shouldAnimate ? 'animate-pulse' : ''}
        `}
        style={{ color: symbol.color }}
      >
        {shouldAnimate ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
            className="text-2xl text-primary"
          >
            🎰
          </motion.div>
        ) : (
          symbol.symbol
        )}
      </motion.div>
    );
  };

  const renderSlotMachine = () => {
    // Use spin result if available, otherwise show default or spinning state
    const reels = (showResult || isCompleted) && spinResult?.reels ? 
      spinResult.reels : 
      gameData?.reels || [
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
                  {renderSymbol(symbolId, true, reelIndex * 3 + symbolIndex)}
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
        {isPlaying && !isCompleted && (
          <div className="space-y-4">
            {/* Game Status */}
            <div className="text-center p-3 bg-background-tertiary rounded-lg">
              <div className="text-sm text-text-secondary mb-1">Current Bet</div>
              <div className="text-lg font-semibold text-primary">${(betAmount * selectedLines).toFixed(2)}</div>
              <div className="text-xs text-text-secondary mt-1">
                {selectedLines} paylines active
              </div>
            </div>

            <button
              onClick={handleSpin}
              disabled={isSpinning || showResult || gameData?.hasSpun}
              className="w-full btn-primary text-xl py-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSpinning ? (
                <div className="flex items-center justify-center space-x-2">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
                  />
                  <span>Spinning...</span>
                </div>
              ) : (showResult || gameData?.hasSpun) ? (
                'Spin Complete'
              ) : (
                '🎰 SPIN'
              )}
            </button>
          </div>
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
      {isPlaying && !isCompleted && (
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
              disabled={isSpinning || showResult || gameData?.hasSpun}
            />
            <div className="flex justify-between text-xs text-text-secondary mt-1">
              <span>1 Line</span>
              <span>5 Lines</span>
            </div>
          </div>
        </div>
      )}

      {/* Spin Result Info */}
      {showResult && spinResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="card text-center"
        >
          <h3 className="text-lg font-semibold text-text-primary mb-4">Spin Result</h3>
          
          {spinResult.paylines && spinResult.paylines.length > 0 ? (
            <div className="space-y-3">
              <div className="text-2xl font-bold text-primary mb-2">
                🎰 WINNING SPIN! 🎰
              </div>
              <div className="text-xl text-primary font-semibold">
                Multiplier: {spinResult.totalMultiplier}x
              </div>
              {gameState.result?.winAmount && (
                <div className="text-lg text-primary">
                  Won: ${gameState.result.winAmount.toFixed(2)} {PAYOUT_TOKEN.symbol}
                </div>
              )}
              <div className="mt-3 p-3 bg-primary/10 rounded-lg">
                <div className="text-sm text-text-secondary mb-1">Winning combinations found!</div>
                <div className="text-xs text-text-secondary">
                  {spinResult.paylines.length} payline{spinResult.paylines.length > 1 ? 's' : ''} matched
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-xl text-text-secondary">
                No winning combinations this time
              </div>
              <div className="text-sm text-text-secondary">
                Try adjusting your paylines for better odds!
              </div>
            </div>
          )}
        </motion.div>
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
            <div className="space-y-2 mb-4">
              <div className="text-lg text-primary font-semibold">
                Won: ${gameState.result.winAmount.toFixed(2)} {PAYOUT_TOKEN.symbol}
              </div>
              {spinResult && (
                <div className="text-sm text-text-secondary">
                  Multiplier: {spinResult.totalMultiplier}x | 
                  Paylines: {spinResult.paylines?.filter((p: any) => p.multiplier > 0).length || 0}
                </div>
              )}
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