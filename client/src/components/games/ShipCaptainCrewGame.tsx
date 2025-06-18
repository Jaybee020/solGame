import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameState } from '../../hooks/useGame';

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

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === 'playing';
  const isCompleted = gameState.status === 'completed';

  useEffect(() => {
    // Auto-play ship captain crew game once it's created
    if (isPlaying && !gameData?.hasRolled) {
      handleRoll();
    }
  }, [isPlaying, gameData]);

  const handleRoll = async () => {
    setIsRolling(true);
    
    // Add rolling animation delay
    setTimeout(async () => {
      await autoPlay();
      setIsRolling(false);
    }, 3000);
  };

  const renderDice = (value?: number, label?: string) => {
    const dots = [
      [],
      [4], // 1
      [0, 8], // 2
      [0, 4, 8], // 3
      [0, 2, 6, 8], // 4
      [0, 2, 4, 6, 8], // 5
      [0, 2, 3, 5, 6, 8] // 6
    ];

    return (
      <div className="text-center">
        <motion.div
          animate={isRolling ? { rotateX: 360, rotateY: 360 } : {}}
          transition={{ 
            duration: 0.5, 
            repeat: isRolling ? Infinity : 0,
            delay: Math.random() * 0.5 // Stagger the animations
          }}
          className="w-20 h-20 bg-white rounded-lg shadow-lg border-2 border-gray-300 relative mx-auto mb-2"
        >
          <div className="absolute inset-0 grid grid-cols-3 gap-1 p-2">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className={`rounded-full ${
                  value && dots[value].includes(i) 
                    ? 'bg-gray-800' 
                    : 'bg-transparent'
                }`}
              />
            ))}
          </div>
          {!value && isRolling && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-3 h-3 bg-gray-800 rounded-full animate-bounce" />
            </div>
          )}
        </motion.div>
        {label && (
          <div className="text-sm text-text-secondary">{label}</div>
        )}
      </div>
    );
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
              {gameData.cargoValue || 0}
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
          {gameData?.currentRoll ? (
            gameData.currentRoll.map((value: number, index: number) => (
              <div key={index}>
                {renderDice(value, `Die ${index + 1}`)}
              </div>
            ))
          ) : (
            Array.from({ length: 5 }, (_, i) => (
              <div key={i}>
                {renderDice(undefined, `Die ${i + 1}`)}
              </div>
            ))
          )}
        </div>

        {/* Roll Information */}
        {gameData?.rollNumber && (
          <div className="text-center text-text-secondary mb-4">
            Roll {gameData.rollNumber} of {gameData.maxRolls || 3}
          </div>
        )}

        {/* Roll Button */}
        {!gameData?.isComplete && !isCompleted && (
          <button
            onClick={handleRoll}
            disabled={isRolling}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRolling ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="loading-spinner w-5 h-5" />
                <span>Rolling...</span>
              </div>
            ) : (
              'Roll Dice'
            )}
          </button>
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
      {isCompleted && (
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
            {gameData?.hasShip && gameData?.hasCaptain && gameData?.hasCrew ? (
              <>
                ⚓ Ship, 👨‍✈️ Captain, 👥 Crew found!<br />
                💰 Cargo Value: {gameData.cargoValue}
              </>
            ) : (
              'Could not find Ship, Captain, and Crew in time'
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
    </div>
  );
};

export default ShipCaptainCrewGame;