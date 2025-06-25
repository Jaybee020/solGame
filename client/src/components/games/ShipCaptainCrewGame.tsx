import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameState } from '../../hooks/useGame';
import GameHistory from '../GameHistory';

interface ShipCaptainCrewGameProps {
  gameState: GameState;
  playMove: (move: { action: string; data?: any }) => Promise<boolean>;
  autoPlay: () => Promise<boolean>;
  betAmount: number;
  onNewGame: () => void;
}

const ShipCaptainCrewGame: React.FC<ShipCaptainCrewGameProps> = ({
  gameState,
  playMove,
  autoPlay,
  betAmount,
  onNewGame,
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [rolledDice, setRolledDice] = useState<number[]>([]);

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === 'playing';
  const isCompleted = gameState.status === 'completed';

  // Remove auto-play - let user interact first
  useEffect(() => {
    // Only setup initial state, don't auto-roll
    if (isPlaying && !gameData?.gameStarted) {
      // Initialize game state if needed
      playMove({
        action: 'initialize',
        data: {}
      });
    }
  }, [isPlaying, gameData]);

  // Handle showing result when game completes or when we get game data
  useEffect(() => {
    // Get dice results from the most reliable source
    let diceResults: number[] = [];
    
    // Priority order: current roll, then game result data, then stored rolls
    if (gameData?.currentRoll && Array.isArray(gameData.currentRoll)) {
      diceResults = gameData.currentRoll;
    } else if (gameState.result?.gameData?.rolls && Array.isArray(gameState.result.gameData.rolls)) {
      diceResults = gameState.result.gameData.rolls;
    } else if (gameData?.rolls && Array.isArray(gameData.rolls)) {
      // For rolls array, get the last 5 dice (most recent roll)
      const totalRolls = gameData.rolls.length;
      diceResults = gameData.rolls.slice(Math.max(0, totalRolls - 5));
    }
    
    // Show result if we have dice and game is completed or we have a final result
    if (diceResults.length > 0 && !showResult && (isCompleted || gameState.result)) {
      setRolledDice(diceResults);
      setShowResult(true);
    }
  }, [isCompleted, gameData, gameState.result, showResult]);

  // Reset state when game starts
  useEffect(() => {
    if (isPlaying && !isCompleted) {
      setShowResult(false);
      setRolledDice([]);
      setIsRolling(false);
    }
  }, [isPlaying, isCompleted]);

  const handleRoll = async () => {
    if (!isPlaying) return;
    
    setIsRolling(true);
    setShowResult(false);
    setRolledDice([]);

    // Start rolling animation for 3 seconds, then make the API call
    setTimeout(async () => {
      try {
        // Make the actual roll
        const success = await playMove({
          action: 'roll',
          data: {}
        });
        
        // Always stop rolling after API call completes
        setIsRolling(false);
        
        if (!success) {
          console.error('Roll move failed');
        }
      } catch (error) {
        console.error('Error rolling dice:', error);
        setIsRolling(false);
      }
    }, 3000);
  };

  const renderDice = (value?: number, label?: string, index: number = 0) => {
    const shouldAnimate = isRolling && !isCompleted && !showResult;
    
    return (
      <div className="text-center">
        <motion.div
          key={`dice-${gameState.sessionId}-${showResult ? 'result' : 'rolling'}-${index}`}
          animate={shouldAnimate ? { 
            rotateX: [0, 180, 360, 540, 720],
            rotateY: [0, 180, 360, 540, 720],
            scale: [1, 1.05, 1, 1.05, 1]
          } : {
            rotateX: 0,
            rotateY: 0,
            scale: 1
          }}
          transition={{ 
            duration: shouldAnimate ? 1.5 : 0.5, 
            repeat: shouldAnimate ? Infinity : 0,
            ease: shouldAnimate ? "easeInOut" : "easeOut",
            delay: shouldAnimate ? index * 0.1 : 0 // Stagger the animations
          }}
          className="relative mx-auto mb-2"
        >
          {/* Main dice container */}
          <div className={`
            w-16 h-16 rounded-lg shadow-xl border-2 relative transform-gpu
            ${value ? 'bg-gradient-to-br from-white to-gray-100 border-gray-300' : 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30'}
            ${shouldAnimate ? 'animate-pulse' : ''}
          `}>
            {/* Dice value display with dots */}
            {value ? (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute inset-0 p-1"
              >
                <div className="grid grid-cols-3 gap-0.5 h-full">
                  {Array.from({ length: 9 }, (_, i) => (
                    <div
                      key={i}
                      className={`rounded-full ${
                        getDotPattern(value).includes(i) 
                          ? 'bg-gray-800' 
                          : 'bg-transparent'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {shouldAnimate ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                    className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full"
                  />
                ) : (
                  <span className="text-lg text-primary/60">?</span>
                )}
              </div>
            )}
            
            {/* Gloss effect */}
            <div className="absolute top-1 left-1 w-3 h-3 bg-white/30 rounded-full blur-sm" />
            
            {/* Edge highlighting */}
            <div className="absolute inset-0 rounded-lg border border-white/20" />
          </div>
          
          {/* Shadow */}
          <div className="absolute top-1 left-1 w-16 h-16 bg-black/10 rounded-lg blur-sm -z-10" />
        </motion.div>
        {label && (
          <div className="text-xs text-text-secondary font-medium">{label}</div>
        )}
      </div>
    );
  };

  const getDotPattern = (value: number): number[] => {
    const patterns = [
      [],
      [4], // 1
      [0, 8], // 2
      [0, 4, 8], // 3
      [0, 2, 6, 8], // 4
      [0, 2, 4, 6, 8], // 5
      [0, 2, 3, 5, 6, 8] // 6
    ];
    return patterns[value] || [];
  };

  const renderGameRules = () => (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">How to Play</h3>
      <div className="space-y-3 text-sm text-text-secondary">
        <div className="flex items-start space-x-2">
          <span className="text-primary">⚓</span>
          <div>
            <strong className="text-text-primary">Ship (6):</strong> Must be rolled first
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <span className="text-primary">👨‍✈️</span>
          <div>
            <strong className="text-text-primary">Captain (5):</strong> Must be rolled second
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <span className="text-primary">👥</span>
          <div>
            <strong className="text-text-primary">Crew (4):</strong> Must be rolled third
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <span className="text-primary">💰</span>
          <div>
            <strong className="text-text-primary">Cargo:</strong> Sum of remaining dice
          </div>
        </div>
        <div className="mt-4 p-3 bg-background-tertiary rounded">
          <strong className="text-text-primary">Goal:</strong> Get Ship, Captain, and Crew in order, 
          then maximize your cargo value!
        </div>
      </div>
    </div>
  );

  const renderGameProgress = () => {
    if (!gameData) return null;

    const requirements = [
      { name: 'Ship', value: 6, icon: '⚓', achieved: gameData.hasShip },
      { name: 'Captain', value: 5, icon: '👨‍✈️', achieved: gameData.hasCaptain },
      { name: 'Crew', value: 4, icon: '👥', achieved: gameData.hasCrew },
    ];

    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4">Progress</h3>
        <div className="grid grid-cols-3 gap-4">
          {requirements.map((req) => (
            <div
              key={req.name}
              className={`text-center p-4 rounded-lg border-2 transition-all ${
                req.achieved
                  ? 'border-primary bg-primary/10'
                  : 'border-background-tertiary bg-background-tertiary'
              }`}
            >
              <div className="text-2xl mb-2">{req.icon}</div>
              <div className={`font-semibold ${req.achieved ? 'text-primary' : 'text-text-secondary'}`}>
                {req.name}
              </div>
              <div className={`text-sm ${req.achieved ? 'text-primary' : 'text-text-secondary'}`}>
                ({req.value})
              </div>
              {req.achieved && (
                <div className="text-xs text-primary mt-1">✓ Found</div>
              )}
            </div>
          ))}
        </div>

        {gameData.hasShip && gameData.hasCaptain && gameData.hasCrew && (
          <div className="mt-4 p-4 bg-primary/10 border border-primary rounded-lg text-center">
            <div className="text-primary text-2xl mb-2">💰</div>
            <div className="text-primary font-semibold">Cargo Value</div>
            <div className="text-2xl font-bold text-primary">
              {gameData.cargoSum || gameData.cargoValue || 0}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isPlaying && !isCompleted) {
    return (
      <div className="text-center py-12">
        <div className="loading-spinner w-16 h-16 mx-auto mb-4" />
        <p className="text-text-secondary">Setting up your Ship Captain Crew game...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-text-primary mb-2">Ship Captain Crew</h2>
        <p className="text-text-secondary">Roll to find your Ship, Captain, and Crew!</p>
      </div>

      {/* Current Roll */}
      <div className="card">
        <h3 className="text-lg font-semibold text-text-primary mb-4 text-center">
          {isRolling ? 'Rolling Dice...' : 'Current Roll'}
        </h3>
        
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* Show rolled dice based on game state priority */}
          {(() => {
            // Priority: completed game result dice > current roll dice > rolled dice > empty dice
            let dicesToShow: number[] = [];
            
            if ((isCompleted || gameState.result) && rolledDice.length > 0) {
              dicesToShow = rolledDice;
            } else if (gameData?.currentRoll && Array.isArray(gameData.currentRoll)) {
              dicesToShow = gameData.currentRoll;
            } else if (gameData?.rolls && Array.isArray(gameData.rolls) && gameData.rolls.length > 0) {
              // Get last 5 dice from rolls array
              const totalRolls = gameData.rolls.length;
              dicesToShow = gameData.rolls.slice(Math.max(0, totalRolls - 5));
            }
            
            if (dicesToShow.length > 0) {
              return dicesToShow.map((value: number, index: number) => (
                <div key={index}>
                  {renderDice(value, `Die ${index + 1}`, index)}
                </div>
              ));
            } else {
              return Array.from({ length: 5 }, (_, i) => (
                <div key={i}>
                  {renderDice(undefined, `Die ${i + 1}`, i)}
                </div>
              ));
            }
          })()}
        </div>

        {/* Roll Information */}
        {gameData?.rollNumber && (
          <div className="text-center text-text-secondary mb-4">
            Roll {gameData.rollNumber} of {gameData.maxRolls || 3}
          </div>
        )}

        {/* Roll Button */}
        {isPlaying && !isCompleted && !gameState.result && (
          <div className="space-y-4">
            {/* Game Status */}
            <div className="text-center p-3 bg-background-tertiary rounded-lg">
              <div className="text-sm text-text-secondary mb-1">Current Bet</div>
              <div className="text-lg font-semibold text-primary">${betAmount.toFixed(2)}</div>
              {gameData?.rollNumber && (
                <div className="text-xs text-text-secondary mt-1">
                  Roll {gameData.rollNumber} of {gameData.maxRolls || 3}
                </div>
              )}
            </div>

            <button
              onClick={handleRoll}
              disabled={isRolling || isCompleted || gameState.result || (gameData?.rollNumber >= (gameData?.maxRolls || 3))}
              className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRolling ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-spinner w-5 h-5" />
                  <span>Rolling Dice...</span>
                </div>
              ) : (isCompleted || gameState.result) ? (
                'Game Complete'
              ) : (gameData?.rollNumber >= (gameData?.maxRolls || 3)) ? (
                'Max Rolls Reached'
              ) : (
                `Roll Dice ${gameData?.rollNumber ? `(${gameData.rollNumber}/${gameData.maxRolls || 3})` : ''}`
              )}
            </button>
          </div>
        )}
      </div>

      {/* Game Progress */}
      {gameData && renderGameProgress()}

      {/* Roll History */}
      {gameData?.rollHistory && gameData.rollHistory.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">Roll History</h3>
          <div className="space-y-2">
            {gameData.rollHistory.map((roll: any, index: number) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-background-tertiary rounded"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-text-secondary">Roll {index + 1}:</span>
                  <div className="flex space-x-1">
                    {roll.dice.map((value: number, i: number) => (
                      <span key={i} className="text-primary font-mono">
                        {value}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-text-secondary">
                  {roll.foundItems?.join(', ') || 'No progress'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Rules */}
      {renderGameRules()}

      {/* Game Result */}
      {(isCompleted || gameState.result) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center"
        >
          <div className={`text-4xl mb-4 ${
            gameState.result?.isWin ? 'text-primary' : 'text-error'
          }`}>
            {gameState.result?.isWin ? '🏴‍☠️💰' : '⚓😔'}
          </div>
          
          <h3 className={`text-xl font-bold mb-2 ${
            gameState.result?.isWin ? 'text-primary' : 'text-error'
          }`}>
            {gameState.result?.isWin ? 'Successful Voyage!' : 'Lost at Sea!'}
          </h3>

          <div className="text-text-secondary mb-4">
            {(gameData?.hasShip && gameData?.hasCaptain && gameData?.hasCrew) || 
             (gameState.result?.gameData?.hasShip && gameState.result?.gameData?.hasCaptain && gameState.result?.gameData?.hasCrew) ? (
              <>
                ⚓ Ship, 👨‍✈️ Captain, 👥 Crew found!<br />
                💰 Cargo Value: {gameData?.cargoSum || gameData?.cargoValue || gameState.result?.gameData?.cargoSum || gameState.result?.outcome?.cargoSum || 0}
                {rolledDice.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm">Final Roll: {rolledDice.join(', ')}</div>
                  </div>
                )}
              </>
            ) : (
              <>
                Could not find Ship, Captain, and Crew in time
                {rolledDice.length > 0 && (
                  <div className="mt-2">
                    <div className="text-sm">Final Roll: {rolledDice.join(', ')}</div>
                  </div>
                )}
              </>
            )}
          </div>

          {gameState.result?.isWin && (
            <div className="text-lg text-primary font-semibold mb-4">
              Won: ${gameState.result.winAmount.toFixed(2)}
            </div>
          )}

          <button
            onClick={onNewGame}
            className="btn-primary"
          >
            Set Sail Again
          </button>
        </motion.div>
      )}

      {/* Recent Games Section */}
      <div className="mt-8">
        <GameHistory 
          gameType="shipcaptaincrew" 
          limit={5} 
          showTitle={true}
          compact={true}
        />
      </div>
    </div>
  );
};

export default ShipCaptainCrewGame;