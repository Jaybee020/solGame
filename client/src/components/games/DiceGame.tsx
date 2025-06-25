import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GameState } from "../../hooks/useGame";
import { PAYOUT_TOKEN } from "../../config/tokens";
import GameHistory from "../GameHistory";

interface DiceGameProps {
  gameState: GameState;
  playMove: (move: { action: string; data?: any }) => Promise<boolean>;
  autoPlay: () => Promise<boolean>;
  betAmount: number;
  onNewGame: () => void;
}

const DiceGame: React.FC<DiceGameProps> = ({
  gameState,
  playMove,
  autoPlay,
  betAmount,
  onNewGame,
}) => {
  const [prediction, setPrediction] = useState<"over" | "under">("over");
  const [targetNumber, setTargetNumber] = useState(50);
  const [isRolling, setIsRolling] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [rolledValue, setRolledValue] = useState<number | null>(null);

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === "playing";
  const isCompleted = gameState.status === "completed";

  // Remove auto-play - let user interact first
  useEffect(() => {
    // Only auto-setup initial state, don't auto-roll
    if (isPlaying && !gameData?.targetSet) {
      // Send initial target and prediction to server
      playMove({
        action: 'set_target',
        data: { target: targetNumber, isOver: prediction === 'over' }
      });
    }
  }, [isPlaying, gameData]);

  // Handle showing result when game completes or when we get game data
  useEffect(() => {
    // Try multiple ways to get the dice result from different possible locations
    const diceResult = 
      gameData?.diceResult || 
      gameData?.roll || 
      gameState.result?.gameData?.diceResult || 
      gameState.result?.gameData?.roll ||
      gameState.result?.outcome?.roll;
    
    if (diceResult && !showResult && (isCompleted || gameData)) {
      setRolledValue(diceResult);
      setShowResult(true);
      setIsRolling(false);
    }
  }, [isCompleted, gameData, gameState.result, showResult]);

  // Reset state when game starts
  useEffect(() => {
    if (isPlaying && !isCompleted) {
      setShowResult(false);
      setRolledValue(null);
      setIsRolling(false);
    }
  }, [isPlaying, isCompleted]);

  const handleRoll = async () => {
    if (!isPlaying) return;
    
    setIsRolling(true);
    setShowResult(false);
    setRolledValue(null);

    // Start rolling animation for 2 seconds, then make the API call
    setTimeout(async () => {
      try {
        // Make the actual roll
        const success = await playMove({
          action: 'roll',
          data: { target: targetNumber, isOver: prediction === 'over' }
        });
        
        // The useEffect will handle showing the result when gameData updates
      } catch (error) {
        console.error('Error rolling dice:', error);
        setIsRolling(false);
      }
    }, 2000);
  };

  const calculateMultiplier = () => {
    const winChance =
      prediction === "over" ? (100 - targetNumber) / 100 : targetNumber / 100;

    return winChance > 0 ? 0.99 / winChance : 1;
  };

  const renderDice = (value?: number) => {
    const shouldAnimate = isRolling && !isCompleted && !showResult;
    
    return (
      <div className="flex justify-center">
        <motion.div
          key={`dice-${gameState.sessionId}-${showResult ? 'result' : 'rolling'}`}
          animate={shouldAnimate ? { 
            rotateX: [0, 180, 360, 540, 720],
            rotateY: [0, 180, 360, 540, 720],
            scale: [1, 1.1, 1, 1.1, 1]
          } : {
            rotateX: 0,
            rotateY: 0,
            scale: 1
          }}
          transition={{ 
            duration: shouldAnimate ? 1.5 : 0.5, 
            repeat: shouldAnimate ? Infinity : 0,
            ease: shouldAnimate ? "easeInOut" : "easeOut"
          }}
          className="relative"
        >
          {/* Main dice container */}
          <div className={`
            w-24 h-24 rounded-xl shadow-2xl border-2 relative transform-gpu
            ${value ? 'bg-gradient-to-br from-white to-gray-100 border-gray-300' : 'bg-gradient-to-br from-primary/20 to-primary/10 border-primary/30'}
            ${shouldAnimate ? 'animate-pulse' : ''}
          `}>
            {/* Dice value display */}
            {value ? (
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <span className="text-3xl font-bold text-gray-800 drop-shadow-sm">
                  {value}
                </span>
              </motion.div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                {shouldAnimate ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.5, repeat: Infinity, ease: "linear" }}
                    className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full"
                  />
                ) : (
                  <span className="text-2xl text-primary/60">?</span>
                )}
              </div>
            )}
            
            {/* Gloss effect */}
            <div className="absolute top-2 left-2 w-4 h-4 bg-white/30 rounded-full blur-sm" />
            
            {/* Edge highlighting */}
            <div className="absolute inset-0 rounded-xl border border-white/20" />
          </div>
          
          {/* Shadow */}
          <div className="absolute top-2 left-2 w-24 h-24 bg-black/10 rounded-xl blur-sm -z-10" />
        </motion.div>
      </div>
    );
  };

  const renderNumberPicker = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-text-secondary text-sm mb-2">
          Target Number: {targetNumber}
        </label>
        <input
          type="range"
          min="1"
          max="99"
          value={targetNumber}
          onChange={(e) => setTargetNumber(parseInt(e.target.value))}
          className="w-full h-2 bg-background-tertiary rounded-lg appearance-none cursor-pointer slider"
          disabled={isRolling || showResult || isCompleted}
        />
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>1</span>
          <span>50</span>
          <span>99</span>
        </div>
      </div>

      <div>
        <label className="block text-text-secondary text-sm mb-2">
          Prediction
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setPrediction("under")}
            disabled={isRolling || showResult || isCompleted}
            className={`py-2 px-4 rounded-lg font-medium transition-all ${
              prediction === "under"
                ? "bg-error text-white"
                : "bg-background-tertiary text-text-secondary hover:bg-error/20"
            }`}
          >
            Under {targetNumber}
          </button>
          <button
            onClick={() => setPrediction("over")}
            disabled={isRolling || showResult || isCompleted}
            className={`py-2 px-4 rounded-lg font-medium transition-all ${
              prediction === "over"
                ? "bg-primary text-black"
                : "bg-background-tertiary text-text-secondary hover:bg-primary/20"
            }`}
          >
            Over {targetNumber}
          </button>
        </div>
      </div>
    </div>
  );

  if (!isPlaying && !isCompleted) {
    return (
      <div className="text-center py-12">
        <div className="loading-spinner w-16 h-16 mx-auto mb-4" />
        <p className="text-text-secondary">Setting up your dice game...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Game Board */}
      <div className="card text-center">
        <h2 className="text-2xl font-bold text-text-primary mb-6">Dice Roll</h2>

        {/* Dice Display */}
        <div className="mb-8">
          <div className="flex justify-center mb-4">
            {renderDice((showResult || isCompleted) ? (rolledValue || gameData?.diceResult) : undefined)}
          </div>

          {showResult && rolledValue && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-center"
            >
              <div className="mb-4 p-4 bg-background-tertiary rounded-lg">
                <div className="text-sm text-text-secondary mb-2">Result</div>
                <div className="text-4xl font-bold text-primary mb-3">
                  {rolledValue}
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-text-secondary">Target</div>
                    <div className="font-semibold text-text-primary">{targetNumber}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-text-secondary">Prediction</div>
                    <div className={`font-semibold capitalize ${
                      prediction === 'over' ? 'text-primary' : 'text-error'
                    }`}>
                      {prediction}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-text-secondary">Outcome</div>
                    <div className={`font-semibold ${
                      gameState.result?.isWin ? 'text-primary' : 'text-error'
                    }`}>
                      {gameState.result?.isWin ? 'Win' : 'Loss'}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Win/Loss indicator */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 300 }}
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${
                  gameState.result?.isWin 
                    ? 'bg-primary/20 text-primary border border-primary/30' 
                    : 'bg-error/20 text-error border border-error/30'
                }`}
              >
                <span className="mr-2">
                  {gameState.result?.isWin ? '🎉' : '💔'}
                </span>
                {gameState.result?.isWin 
                  ? `You won ${gameState.result.winAmount?.toFixed(2)} tokens!`
                  : 'Better luck next time!'
                }
              </motion.div>
            </motion.div>
          )}
        </div>

        {/* Game Settings - Always show when playing */}
        {isPlaying && !isCompleted && (
          <div className="max-w-md mx-auto">
            {renderNumberPicker()}

            <div className="mt-6 p-4 bg-background-tertiary rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-text-secondary">Win Chance:</span>
                <span className="text-primary font-semibold">
                  {prediction === "over" ? 100 - targetNumber : targetNumber}%
                </span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-text-secondary">Multiplier:</span>
                <span className="text-primary font-semibold">
                  {calculateMultiplier().toFixed(2)}x
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary">Potential Win:</span>
                <span className="text-primary font-semibold">
                  {(betAmount * calculateMultiplier()).toFixed(2)} ${PAYOUT_TOKEN.symbol}
                </span>
              </div>
            </div>

            <button
              onClick={handleRoll}
              disabled={isRolling || showResult || isCompleted}
              className="w-full mt-6 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRolling ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-spinner w-5 h-5" />
                  <span>Rolling...</span>
                </div>
              ) : showResult || isCompleted ? (
                "Game Complete"
              ) : (
                "Roll Dice"
              )}
            </button>
          </div>
        )}
      </div>

      {/* Game History */}
      {gameData?.history && gameData.history.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            Recent Rolls
          </h3>
          <div className="grid grid-cols-5 gap-2">
            {gameData.history.slice(-10).map((roll: any, index: number) => (
              <div
                key={index}
                className="text-center p-2 bg-background-tertiary rounded"
              >
                <div className="text-lg font-bold text-primary">
                  {roll.result}
                </div>
                <div
                  className={`text-xs ${
                    roll.won ? "text-primary" : "text-error"
                  }`}
                >
                  {roll.won ? "Win" : "Loss"}
                </div>
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
          <div
            className={`text-4xl mb-4 ${
              gameState.result?.isWin ? "text-primary" : "text-error"
            }`}
          >
            {gameState.result?.isWin ? "🎉" : "🎲"}
          </div>

          <h3
            className={`text-xl font-bold mb-2 ${
              gameState.result?.isWin ? "text-primary" : "text-error"
            }`}
          >
            {gameState.result?.isWin ? "You Won!" : "Better luck next time!"}
          </h3>

          <div className="bg-background-tertiary rounded-lg p-4 mb-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-center">
                <div className="text-text-secondary">You Rolled</div>
                <div className="text-2xl font-bold text-primary">
                  {rolledValue || gameData?.diceResult || '?'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-text-secondary">Your Prediction</div>
                <div className="text-lg font-semibold text-text-primary capitalize">
                  {gameData?.prediction || prediction} {gameData?.targetNumber || targetNumber}
                </div>
              </div>
            </div>
            {gameState.result?.winAmount && gameState.result.winAmount > 0 && (
              <div className="text-center mt-3 pt-3 border-t border-primary/20">
                <div className="text-text-secondary text-sm">Winnings</div>
                <div className="text-xl font-bold text-primary">
                  +{gameState.result.winAmount.toFixed(2)} {PAYOUT_TOKEN.symbol}
                </div>
              </div>
            )}
          </div>

          <button onClick={onNewGame} className="btn-primary">
            Roll Again
          </button>
        </motion.div>
      )}

      {/* Recent Games Section */}
      <div className="mt-8">
        <GameHistory 
          gameType="dice" 
          limit={5} 
          showTitle={true}
          compact={true}
        />
      </div>
    </div>
  );
};

export default DiceGame;
