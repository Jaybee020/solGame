import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { GameState } from "../../hooks/useGame";
import { PAYOUT_TOKEN } from "../../config/tokens";

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

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === "playing";
  const isCompleted = gameState.status === "completed";

  useEffect(() => {
    // Auto-play dice game once it's created
    if (isPlaying && !gameData?.hasRolled) {
      handleRoll();
    }
  }, [isPlaying, gameData]);

  const handleRoll = async () => {
    setIsRolling(true);

    // Add a delay for dice rolling animation
    setTimeout(async () => {
      await autoPlay();
      setIsRolling(false);
    }, 2000);
  };

  const calculateMultiplier = () => {
    const winChance =
      prediction === "over" ? (100 - targetNumber) / 100 : targetNumber / 100;

    return winChance > 0 ? 0.99 / winChance : 1;
  };

  const renderDice = (value?: number) => {
    const dots = [
      [],
      [4], // 1
      [0, 8], // 2
      [0, 4, 8], // 3
      [0, 2, 6, 8], // 4
      [0, 2, 4, 6, 8], // 5
      [0, 2, 3, 5, 6, 8], // 6
    ];

    return (
      <motion.div
        animate={isRolling ? { rotateX: 360, rotateY: 360 } : {}}
        transition={{ duration: 0.5, repeat: isRolling ? Infinity : 0 }}
        className="w-20 h-20 bg-white rounded-lg shadow-lg border-2 border-gray-300 relative"
      >
        <div className="absolute inset-0 grid grid-cols-3 gap-1 p-2">
          {Array.from({ length: 9 }, (_, i) => (
            <div
              key={i}
              className={`rounded-full ${
                value && dots[value].includes(i)
                  ? "bg-gray-800"
                  : "bg-transparent"
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
          disabled={isPlaying}
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
            disabled={isPlaying}
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
            disabled={isPlaying}
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
            {renderDice(gameData?.diceResult)}
          </div>

          {gameData?.diceResult && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center"
            >
              <div className="text-4xl font-bold text-primary mb-2">
                {gameData.diceResult}
              </div>
              <div className="text-text-secondary">
                You predicted: {gameData.prediction} {gameData.targetNumber}
              </div>
            </motion.div>
          )}
        </div>

        {/* Game Settings */}
        {!gameData?.hasRolled && !isCompleted && (
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
              disabled={isRolling}
              className="w-full mt-6 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRolling ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="loading-spinner w-5 h-5" />
                  <span>Rolling...</span>
                </div>
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

          <div className="text-text-secondary mb-4">
            Rolled: {gameData?.diceResult} | Target: {gameData?.prediction}{" "}
            {gameData?.targetNumber}
          </div>

          <button onClick={onNewGame} className="btn-primary">
            Roll Again
          </button>
        </motion.div>
      )}
    </div>
  );
};

export default DiceGame;
