import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  const [showResult, setShowResult] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [spinSound] = useState(() => {
    try {
      const audio = new Audio('/assets/sounds/spin.mp3');
      audio.onerror = () => console.log('Spin sound not available');
      return audio;
    } catch {
      return null;
    }
  });
  const [winSound] = useState(() => {
    try {
      const audio = new Audio('/assets/sounds/win.mp3');
      audio.onerror = () => console.log('Win sound not available');
      return audio;
    } catch {
      return null;
    }
  });
  const [bigWinSound] = useState(() => {
    try {
      const audio = new Audio('/assets/sounds/big-win.mp3');
      audio.onerror = () => console.log('Big win sound not available');
      return audio;
    } catch {
      return null;
    }
  });

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === 'playing';
  const isCompleted = gameState.status === 'completed';

  // Crypto-themed symbols with images
  const symbols = [
    { id: 'btc', symbol: '₿', name: 'Bitcoin', color: '#F7931A', image: '/assets/crypto-logos/btc.png', payout: 100, glow: '#F7931A' },
    { id: 'eth', symbol: 'Ξ', name: 'Ethereum', color: '#627EEA', image: '/assets/crypto-logos/eth.png', payout: 80, glow: '#627EEA' },
    { id: 'sol', symbol: '◎', name: 'Solana', color: '#00FFA3', image: '/assets/crypto-logos/sol.png', payout: 60, glow: '#00FFA3' },
    { id: 'ada', symbol: '₳', name: 'Cardano', color: '#0033AD', image: '/assets/crypto-logos/ada.png', payout: 40, glow: '#0033AD' },
    { id: 'dot', symbol: '●', name: 'Polkadot', color: '#E6007A', image: '/assets/crypto-logos/dot.png', payout: 30, glow: '#E6007A' },
    { id: 'link', symbol: '🔗', name: 'Chainlink', color: '#375BD2', image: '/assets/crypto-logos/link.png', payout: 25, glow: '#375BD2' },
    { id: 'wild', symbol: '💎', name: 'Diamond Wild', color: '#00FFFF', image: null, payout: 200, glow: '#00FFFF', special: 'wild' },
    { id: 'scatter', symbol: '⭐', name: 'Star Scatter', color: '#FFD700', image: null, payout: 150, glow: '#FFD700', special: 'scatter' },
  ];

  // Win lines configuration
  const winLines = [
    { id: 0, positions: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]], color: '#FF0000', name: 'Center' },
    { id: 1, positions: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]], color: '#00FF00', name: 'Top' },
    { id: 2, positions: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]], color: '#0000FF', name: 'Bottom' },
    { id: 3, positions: [[0, 0], [1, 1], [2, 2], [1, 3], [0, 4]], color: '#FFFF00', name: 'Zigzag' },
    { id: 4, positions: [[2, 0], [1, 1], [0, 2], [1, 3], [2, 4]], color: '#FF00FF', name: 'Inverted' },
  ];

  // Refs and state for win line animations
  const reelContainerRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [enabledLines, setEnabledLines] = useState<boolean[]>([true, true, true, false, false]);

  // Window resize handler for responsive win lines
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize game state
  useEffect(() => {
    if (isPlaying && !gameData?.gameStarted) {
      playMove({
        action: 'initialize',
        data: {}
      });
    }
  }, [isPlaying, gameData]);

  // Handle showing result when game completes
  useEffect(() => {
    const reels = gameData?.reels || gameState.result?.gameData?.reels;
    
    if (reels && !showResult && (isCompleted || gameData)) {
      const result = gameData || gameState.result?.gameData;
      setSpinResult(result);
      setShowResult(true);
      setIsSpinning(false);
      
      // Update winning lines
      if (result?.winningLines) {
        setWinningLines(result.winningLines);
      }
      
      // Play sound effects
      try {
        if (gameState.result?.isWin) {
          const winAmount = gameState.result.winAmount || 0;
          const soundToPlay = winAmount > betAmount * 10 ? bigWinSound : winSound;
          if (soundToPlay) {
            const playPromise = soundToPlay.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                console.log('Could not play win sound:', error);
              });
            }
          }
        }
      } catch (error) {
        console.log('Could not play win sound:', error);
      }
    }
  }, [isCompleted, gameData, gameState.result, showResult, betAmount, winSound, bigWinSound]);

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
    setWinningLines([]);

    // Play spin sound
    try {
      if (spinSound) {
        const playPromise = spinSound.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Could not play spin sound:', error);
          });
        }
      }
    } catch (error) {
      console.log('Could not play spin sound:', error);
    }

    // Start spinning animation for 3 seconds, then make the API call
    setTimeout(async () => {
      try {
        const activeLineCount = enabledLines.filter(Boolean).length;
        await playMove({
          action: 'spin',
          data: { paylines: activeLineCount }
        });
      } catch (error) {
        console.error('Error spinning slots:', error);
        setIsSpinning(false);
      }
    }, 3000);
  };

  // Toggle payline function
  const togglePayline = (index: number) => {
    if (isSpinning) return;
    const newEnabledLines = [...enabledLines];
    newEnabledLines[index] = !newEnabledLines[index];
    // Ensure at least one line is enabled
    if (newEnabledLines.every(line => !line)) {
      newEnabledLines[0] = true;
    }
    setEnabledLines(newEnabledLines);
  };

  // Calculate win line paths
  const calculateWinLinePath = useCallback((lineIndex: number) => {
    if (!reelContainerRef.current) return '';
    
    const line = winLines[lineIndex];
    const reelContainer = reelContainerRef.current;
    const symbolPositions = new Map();
    const containerRect = reelContainer.getBoundingClientRect();
    
    reelContainer.querySelectorAll('.symbol-container').forEach((symbolEl) => {
      const reelIndexAttr = symbolEl.getAttribute('data-reel-index');
      const posIndexAttr = symbolEl.getAttribute('data-pos-index');
      
      if (reelIndexAttr !== null && posIndexAttr !== null) {
        const reelIndex = parseInt(reelIndexAttr, 10);
        const posIndex = parseInt(posIndexAttr, 10);
        symbolPositions.set(`${posIndex}-${reelIndex}`, symbolEl);
      }
    });
    
    return line.positions.map(([row, col], i) => {
      const symbolEl = symbolPositions.get(`${row}-${col}`);
      
      if (!symbolEl) {
        return i === 0 ? 'M 0 0' : 'L 0 0';
      }
      
      const symbolRect = symbolEl.getBoundingClientRect();
      const x = symbolRect.left - containerRect.left + (symbolRect.width / 2);
      const y = symbolRect.top - containerRect.top + (symbolRect.height / 2);
      
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    }).join(' ');
  }, [windowSize, winningLines]);

  const renderSymbol = (symbolId: string, reelIndex: number, posIndex: number, isAnimated = false) => {
    const symbol = symbols.find(s => s.id === symbolId) || symbols[0];
    const shouldAnimate = isAnimated && isSpinning && !showResult && !isCompleted;
    const isWinningSymbol = winningLines.some(lineIndex => {
      const line = winLines[lineIndex];
      return line.positions.some(([row, col]) => row === posIndex && col === reelIndex);
    });
    
    return (
      <div
        className="symbol-container"
        data-reel-index={reelIndex}
        data-pos-index={posIndex}
      >
        <motion.div
          key={`symbol-${gameState.sessionId}-${showResult ? 'result' : 'spinning'}-${reelIndex}-${posIndex}`}
          animate={shouldAnimate ? { 
            y: [-40, 40, -40],
            rotateY: [0, 180, 360],
            scale: [1, 1.1, 1]
          } : isWinningSymbol ? {
            scale: [1, 1.15, 1],
            boxShadow: [`0 0 5px ${symbol.glow}`, `0 0 20px ${symbol.glow}`, `0 0 5px ${symbol.glow}`]
          } : {
            y: 0,
            rotateY: 0,
            scale: 1
          }}
          transition={{ 
            duration: shouldAnimate ? 0.6 : 0.5, 
            repeat: shouldAnimate ? Infinity : (isWinningSymbol ? Infinity : 0),
            ease: shouldAnimate ? "easeInOut" : "easeOut",
            delay: shouldAnimate ? reelIndex * 0.15 : 0
          }}
          className={`relative flex flex-col items-center justify-center h-20 w-20 rounded-lg border-2 shadow-lg transform-gpu overflow-hidden
            ${isWinningSymbol ? 'border-white shadow-xl' : 'border-primary/30'}
            ${shouldAnimate ? 'animate-pulse' : ''}
          `}
          style={{ 
            background: isWinningSymbol 
              ? `radial-gradient(circle, ${symbol.color}40, ${symbol.color}20)` 
              : `linear-gradient(135deg, ${symbol.color}20, ${symbol.color}10)`,
            borderColor: isWinningSymbol ? symbol.glow : undefined
          }}
        >
          {shouldAnimate ? (
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="text-3xl"
            >
              🎰
            </motion.div>
          ) : (
            <>
              {symbol.image ? (
                <img 
                  src={symbol.image} 
                  alt={symbol.name}
                  className={`w-12 h-12 object-contain ${isWinningSymbol ? 'brightness-125' : ''}`}
                  style={{
                    filter: isWinningSymbol ? `drop-shadow(0 0 8px ${symbol.glow})` : 'none'
                  }}
                />
              ) : (
                <div 
                  className={`text-3xl ${isWinningSymbol ? 'animate-pulse' : ''}`}
                  style={{ 
                    color: symbol.color,
                    textShadow: isWinningSymbol ? `0 0 10px ${symbol.glow}` : 'none'
                  }}
                >
                  {symbol.symbol}
                </div>
              )}
              <div 
                className={`text-xs font-bold px-1 rounded mt-1 ${isWinningSymbol ? 'bg-white text-black' : 'bg-black/70 text-white'}`}
              >
                {symbol.id.toUpperCase()}
              </div>
            </>
          )}
        </motion.div>
      </div>
    );
  };

  const renderSlotMachine = () => {
    const reels = (showResult || isCompleted) && spinResult?.reels ? 
      spinResult.reels : 
      gameData?.reels || [
        ['btc', 'eth', 'sol'],
        ['eth', 'sol', 'ada'],
        ['sol', 'ada', 'dot'],
        ['ada', 'dot', 'link'],
        ['dot', 'link', 'btc']
      ];

    const activeLineCount = enabledLines.filter(Boolean).length;

    return (
      <div className="relative">
        {/* ATM-Style Slot Machine Container */}
        <div className="bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900 p-6 rounded-xl border-4 border-yellow-500 shadow-2xl">
          {/* Gold corner decorations */}
          <div className="absolute top-0 left-0 w-6 h-6 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-br-lg"></div>
          <div className="absolute top-0 right-0 w-6 h-6 bg-gradient-to-bl from-yellow-400 to-yellow-600 rounded-bl-lg"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 bg-gradient-to-tr from-yellow-400 to-yellow-600 rounded-tr-lg"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 bg-gradient-to-tl from-yellow-400 to-yellow-600 rounded-tl-lg"></div>
          
          {/* Slot Display */}
          <div 
            ref={reelContainerRef}
            className="relative bg-black rounded-lg p-4 mb-6 shadow-inner"
            style={{ 
              background: 'linear-gradient(to bottom, #000000, #1a1a2e)',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
            }}
          >
            <div className="grid grid-cols-5 gap-3">
              {reels.map((reel: string[], reelIndex: number) => (
                <div key={reelIndex} className="space-y-2">
                  {reel.map((symbolId: string, symbolIndex: number) => (
                    <div key={`${reelIndex}-${symbolIndex}`}>
                      {renderSymbol(symbolId, reelIndex, symbolIndex, true)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            {/* Win lines overlay */}
            {winningLines.map((lineIndex) => {
              const line = winLines[lineIndex];
              const linePath = calculateWinLinePath(lineIndex);
              
              return (
                <div 
                  key={`line-${lineIndex}`}
                  className="absolute inset-0 pointer-events-none"
                  style={{ zIndex: 10 }}
                >
                  <svg className="w-full h-full">
                    <path
                      d={linePath}
                      stroke={line.color}
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray="8,4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        animation: 'dash 1s linear infinite',
                      }}
                    />
                    {/* Add circles at connection points */}
                    {line.positions.map(([row, col], idx) => {
                      const symbolEl = document.querySelector(`[data-pos-index="${row}"][data-reel-index="${col}"]`);
                      if (!symbolEl || !reelContainerRef.current) return null;
                      
                      const containerRect = reelContainerRef.current.getBoundingClientRect();
                      const symbolRect = symbolEl.getBoundingClientRect();
                      const x = symbolRect.left - containerRect.left + (symbolRect.width / 2);
                      const y = symbolRect.top - containerRect.top + (symbolRect.height / 2);
                      
                      return (
                        <circle
                          key={`point-${lineIndex}-${idx}`}
                          cx={x}
                          cy={y}
                          r={3}
                          fill={line.color}
                          style={{ filter: `drop-shadow(0 0 4px ${line.color})` }}
                        />
                      );
                    })}
                  </svg>
                </div>
              );
            })}
            
            {/* Spinning overlay */}
            {isSpinning && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-lg">
                <motion.div 
                  className="text-white text-2xl font-bold text-center"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity
                  }}
                >
                  🎰 SPINNING... 🎰
                </motion.div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Bet and Spin Controls */}
            {isPlaying && !isCompleted && (
              <div className="bg-gray-800 rounded-lg p-4 space-y-3">
                {/* Current Bet Display */}
                <div className="text-center p-3 bg-gray-900 rounded-lg border border-yellow-500/30">
                  <div className="text-sm text-gray-400 mb-1">Total Bet</div>
                  <div className="text-2xl font-bold text-yellow-400">
                    ${(betAmount * activeLineCount).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {activeLineCount} line{activeLineCount !== 1 ? 's' : ''} × ${betAmount.toFixed(2)}
                  </div>
                </div>

                {/* Spin Button */}
                <motion.button
                  onClick={handleSpin}
                  disabled={isSpinning || showResult || gameData?.hasSpun}
                  className="w-full bg-gradient-to-r from-red-600 to-red-800 text-white text-2xl font-bold py-4 rounded-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-red-400"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {isSpinning ? (
                    <div className="flex items-center justify-center space-x-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full"
                      />
                      <span>SPINNING...</span>
                    </div>
                  ) : (showResult || gameData?.hasSpun) ? (
                    '🎰 SPIN COMPLETE 🎰'
                  ) : (
                    '🎰 SPIN TO WIN 🎰'
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </div>
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
            <div className="text-2xl font-bold text-primary">{enabledLines.filter(Boolean).length}</div>
            <div className="text-sm text-text-secondary">Paylines</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">
              ${(betAmount * enabledLines.filter(Boolean).length * 50).toFixed(2)}
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

      {/* Paylines Control */}
      {isPlaying && !isCompleted && (
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Active Paylines</h3>
          
          <div className="grid grid-cols-5 gap-2">
            {winLines.map((line, index) => (
              <button
                key={`payline-${index}`}
                onClick={() => togglePayline(index)}
                disabled={isSpinning || showResult || gameData?.hasSpun}
                className={`
                  p-3 rounded-lg text-sm font-bold transition-all duration-200
                  ${enabledLines[index] 
                    ? 'text-white shadow-lg transform scale-105' 
                    : 'text-gray-400 bg-gray-700 opacity-70'
                  }
                  disabled:cursor-not-allowed
                `}
                style={{ 
                  backgroundColor: enabledLines[index] ? line.color : undefined,
                  borderColor: line.color,
                  borderWidth: '2px',
                  boxShadow: enabledLines[index] ? `0 0 10px ${line.color}40` : 'none'
                }}
              >
                <div className="text-xs">{line.name}</div>
                <div className="text-lg font-bold">{index + 1}</div>
              </button>
            ))}
          </div>
          
          <div className="mt-3 text-center text-sm text-text-secondary">
            {enabledLines.filter(Boolean).length} of {winLines.length} lines active
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

      {/* Enhanced Paytable */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Paytable</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {symbols.map((symbol) => (
            <div key={symbol.id} className="flex items-center space-x-3 p-3 bg-background-tertiary rounded-lg border border-primary/20">
              <div className="flex-shrink-0">
                {symbol.image ? (
                  <img 
                    src={symbol.image} 
                    alt={symbol.name}
                    className="w-10 h-10 object-contain"
                  />
                ) : (
                  <div 
                    className="text-2xl w-10 h-10 flex items-center justify-center"
                    style={{ color: symbol.color }}
                  >
                    {symbol.symbol}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-text-primary">{symbol.name}</div>
                <div className="text-xs text-text-secondary">5x = {symbol.payout}:1</div>
                {symbol.special && (
                  <div className="text-xs text-primary font-semibold capitalize">
                    {symbol.special}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Add CSS for animations */}
      <style>
        {`
          @keyframes dash {
            to {
              stroke-dashoffset: 24;
            }
          }
        `}
      </style>

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
                  Lines: {winningLines.length}
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