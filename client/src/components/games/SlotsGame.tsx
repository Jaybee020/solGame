import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState } from "../../hooks/useGame";
import { PAYOUT_TOKEN } from "../../config/tokens";
import GameHistory from "../GameHistory";

// Crypto data interfaces and configuration
const COIN_IDS = [
  "solana",
  "bitcoin",
  "ethereum",
  "ripple",
  "cardano",
  "dogecoin",
];

interface CryptoData {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
}

const coinMeta: {
  [key: string]: { symbol: string; name: string; image: string };
} = {
  solana: {
    symbol: "SOL",
    name: "Solana",
    image: "https://assets.coingecko.com/coins/images/4128/large/solana.png",
  },
  bitcoin: {
    symbol: "BTC",
    name: "Bitcoin",
    image: "https://assets.coingecko.com/coins/images/1/large/bitcoin.png",
  },
  ethereum: {
    symbol: "ETH",
    name: "Ethereum",
    image: "https://assets.coingecko.com/coins/images/279/large/ethereum.png",
  },
  ripple: {
    symbol: "XRP",
    name: "XRP",
    image:
      "https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png",
  },
  cardano: {
    symbol: "ADA",
    name: "Cardano",
    image: "https://assets.coingecko.com/coins/images/975/large/cardano.png",
  },
  dogecoin: {
    symbol: "DOGE",
    name: "Dogecoin",
    image: "https://assets.coingecko.com/coins/images/5/large/dogecoin.png",
  },
};

// Font families
const ElegantFont = `'Playfair Display', serif`;
const DigitalFont = `'Orbitron', sans-serif`;

// Symbol data for the game - updated to match example format
const symbolData = {
  sol: {
    id: "sol",
    name: "Solana",
    image: "/assets/crypto-logos/sol.png",
    multiplier: 2,
    isWild: true,
  },
  btc: {
    id: "btc",
    name: "Bitcoin",
    image: "/assets/crypto-logos/btc.png",
    multiplier: 5,
    isWild: false,
  },
  eth: {
    id: "eth",
    name: "Ethereum",
    image: "/assets/crypto-logos/eth.png",
    multiplier: 1.6,
    isWild: false,
  },
  ada: {
    id: "ada",
    name: "Cardano",
    image: "/assets/crypto-logos/ada.png",
    multiplier: 1.2,
    isWild: false,
  },
  matic: {
    id: "matic",
    name: "Polygon",
    image: "/assets/crypto-logos/polygon.png",
    multiplier: 0.9,
    isWild: false,
  },
};

// Helper Components
const CryptoPriceTicker = ({ data }: { data: CryptoData[] | null }) => {
  const formatPrice = (price: number) => {
    return price.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: price < 1 ? 6 : 2,
    });
  };

  const TickerContent = () => (
    <div className="flex">
      {(data || []).map((coin) => (
        <div
          key={coin.id}
          className="flex items-center space-x-4 mx-6 flex-shrink-0"
        >
          <img src={coin.image} alt={coin.name} className="w-8 h-8" />
          <div>
            <span className="font-bold text-white text-lg">{coin.symbol}</span>
            <span className="ml-2 text-gray-400 text-lg">
              {formatPrice(coin.price)}
            </span>
          </div>
          <div
            className={`text-lg font-semibold ${
              coin.change24h >= 0 ? "text-green-400" : "text-red-400"
            }`}
          >
            {coin.change24h >= 0 ? "▲" : "▼"} {coin.change24h?.toFixed(2)}%
          </div>
        </div>
      ))}
    </div>
  );

  if (!data) {
    return (
      <div
        className="w-full max-w-lg h-16 bg-black/50 rounded-lg flex items-center justify-center text-gray-400"
        style={{ fontFamily: DigitalFont }}
      >
        LOADING LIVE PRICES...
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg h-16 bg-gradient-to-b from-gray-800 to-black rounded-lg border-2 border-yellow-700/50 shadow-lg overflow-hidden flex items-center">
      <motion.div
        className="flex"
        animate={{ x: ["0%", "-100%"] }}
        transition={{
          ease: "linear",
          duration: 30,
          repeat: Infinity,
        }}
      >
        <TickerContent />
        <TickerContent />
      </motion.div>
    </div>
  );
};

const DigitalDisplay = ({
  label,
  value,
  isCurrency = false,
}: {
  label: string;
  value: string | number;
  isCurrency?: boolean;
}) => (
  <div className="bg-black/80 rounded-md p-2 text-center border-t-2 border-black/50 shadow-inner">
    <div
      className="text-sm text-yellow-600 font-semibold tracking-wider"
      style={{ fontFamily: ElegantFont }}
    >
      {label}
    </div>
    <div
      className="text-2xl text-green-400 glow-text-green"
      style={{ fontFamily: DigitalFont }}
    >
      {isCurrency && "$"}
      {value}
    </div>
  </div>
);

const SymbolCard = ({ symbolId }: { symbolId: string }) => {
  const symbol =
    symbolData[symbolId as keyof typeof symbolData] || symbolData.sol;
  return (
    <div className="relative w-28 h-28 bg-damask-pattern bg-cover bg-center rounded-lg flex items-center justify-center p-2 border-2 border-yellow-700/50 shadow-lg">
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg"></div>
      <img
        src={symbol.image}
        alt={symbol.name}
        className="w-16 h-16 object-contain drop-shadow-lg"
      />
      {symbol.isWild && (
        <div className="absolute top-1 left-1 text-yellow-300 text-2xl drop-shadow-md">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          >
            ★
          </motion.div>
        </div>
      )}
    </div>
  );
};

interface SlotsGameProps {
  gameState: GameState;
  playMove: (move: { action: string; data?: any }) => Promise<boolean>;
  autoPlay: () => Promise<boolean>;
  betAmount: number;
  onNewGame: () => void;
}

const Reel = ({
  symbols,
  delay,
  isSpinning,
  reelIndex,
}: {
  symbols: string[];
  delay: number;
  isSpinning: boolean;
  reelIndex: number;
}) => {
  const allSymbols = Object.keys(symbolData);
  const spinningReelSymbols = [...Array(20)].flatMap(() =>
    allSymbols.sort(() => Math.random() - 0.5)
  );

  return (
    <div className="h-[360px] w-[120px] overflow-hidden">
      <motion.div
        animate={{ y: isSpinning ? "-2400px" : "0px" }}
        transition={{
          duration: isSpinning ? 2.5 + delay : 0.8,
          ease: isSpinning ? [0.33, 1, 0.68, 1] : "circOut",
        }}
      >
        {isSpinning
          ? spinningReelSymbols.map((s, i) => (
              <div key={i} className="py-2">
                <SymbolCard symbolId={s} />
              </div>
            ))
          : symbols.map((s, i) => (
              <div
                key={i}
                className="py-2 symbol-container"
                data-reel-index={reelIndex}
                data-pos-index={i}
              >
                <SymbolCard symbolId={s} />
              </div>
            ))}
      </motion.div>
    </div>
  );
};

const SlotsGame: React.FC<SlotsGameProps> = ({
  gameState,
  playMove,
  autoPlay,
  betAmount,
  onNewGame,
}) => {
  const [cryptoData, setCryptoData] = useState<CryptoData[] | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
  const [persistentReels, setPersistentReels] = useState<string[][] | null>(
    null
  );
  const [spinSound] = useState(() => {
    try {
      const audio = new Audio("/assets/sounds/spin.mp3");
      audio.onerror = () => console.log("Spin sound not available");
      return audio;
    } catch {
      return null;
    }
  });
  const [winSound] = useState(() => {
    try {
      const audio = new Audio("/assets/sounds/win.mp3");
      audio.onerror = () => console.log("Win sound not available");
      return audio;
    } catch {
      return null;
    }
  });
  const [bigWinSound] = useState(() => {
    try {
      const audio = new Audio("/assets/sounds/big-win.mp3");
      audio.onerror = () => console.log("Big win sound not available");
      return audio;
    } catch {
      return null;
    }
  });
  console.log(gameState);

  const gameData = gameState.result?.gameData;
  const isPlaying = gameState.status === "playing";
  const isCompleted = gameState.status === "completed";

  // Win lines configuration
  const winLines = [
    {
      id: 0,
      positions: [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
        [1, 4],
      ],
      color: "#FF0000",
      name: "Center",
    },
    {
      id: 1,
      positions: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
      color: "#00FF00",
      name: "Top",
    },
    {
      id: 2,
      positions: [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
        [2, 4],
      ],
      color: "#0000FF",
      name: "Bottom",
    },
    {
      id: 3,
      positions: [
        [0, 0],
        [1, 1],
        [2, 2],
        [1, 3],
        [0, 4],
      ],
      color: "#FFFF00",
      name: "Zigzag",
    },
    {
      id: 4,
      positions: [
        [2, 0],
        [1, 1],
        [0, 2],
        [1, 3],
        [2, 4],
      ],
      color: "#FF00FF",
      name: "Inverted",
    },
  ];

  // Refs and state for win line animations
  const reelContainerRef = useRef<HTMLDivElement>(null);
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [winningLines, setWinningLines] = useState<number[]>([]);
  const [enabledLines, setEnabledLines] = useState<boolean[]>([
    true,
    true,
    true,
    false,
    false,
  ]);

  // Window resize handler for responsive win lines
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    setTimeout(handleResize, 100);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch crypto data for price ticker
  useEffect(() => {
    const fetchCryptoData = async () => {
      try {
        const ids = COIN_IDS.join(",");
        const response = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
        );
        if (!response.ok) throw new Error("Network response was not ok");
        const data = await response.json();
        const formattedData: CryptoData[] = Object.keys(data).map((id) => ({
          id,
          ...coinMeta[id],
          price: data[id].usd,
          change24h: data[id].usd_24h_change,
        }));
        setCryptoData(formattedData);
      } catch (error) {
        console.error("Failed to fetch crypto data:", error);
      }
    };
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  // Initialize game state
  useEffect(() => {
    if (isPlaying && !gameData?.gameStarted) {
      playMove({
        action: "initialize",
        data: {},
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

      // Update winning lines based on backend paylines
      if (result?.paylines && Array.isArray(result.paylines)) {
        // Convert backend paylines to frontend winning line indices
        const winningLineIndices: number[] = [];
        result.paylines.forEach((payline: any, index: number) => {
          // Map backend paylines to frontend win line indices
          // Assuming first 3 paylines are horizontal (rows 0,1,2) and next 2 are diagonals
          if (index < 5) {
            winningLineIndices.push(index);
          }
        });
        setWinningLines(winningLineIndices);
      }

      // Persist the reels from the backend result
      if (result?.reels) {
        setPersistentReels(result.reels);
      }

      // Play sound effects
      try {
        if (gameState.result?.isWin) {
          const winAmount = gameState.result.winAmount || 0;
          const soundToPlay =
            winAmount > betAmount * 10 ? bigWinSound : winSound;
          if (soundToPlay) {
            const playPromise = soundToPlay.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                console.log("Could not play win sound:", error);
              });
            }
          }
        }
      } catch (error) {
        console.log("Could not play win sound:", error);
      }
    }
  }, [
    isCompleted,
    gameData,
    gameState.result,
    showResult,
    betAmount,
    winSound,
    bigWinSound,
  ]);

  // Reset state when game starts (but keep persistent reels)
  useEffect(() => {
    if (isPlaying && !isCompleted) {
      setShowResult(false);
      setSpinResult(null);
      setIsSpinning(false);
      // Don't reset persistentReels - they should persist across games
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
          playPromise.catch((error) => {
            console.log("Could not play spin sound:", error);
          });
        }
      }
    } catch (error) {
      console.log("Could not play spin sound:", error);
    }

    // Start spinning animation for 3 seconds, then make the API call
    setTimeout(async () => {
      try {
        const activeLineCount = enabledLines.filter(Boolean).length;
        await playMove({
          action: "spin",
          data: { paylines: activeLineCount },
        });
      } catch (error) {
        console.error("Error spinning slots:", error);
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
    if (newEnabledLines.every((line) => !line)) {
      newEnabledLines[0] = true;
    }
    setEnabledLines(newEnabledLines);
  };

  // Calculate win line paths
  const calculateWinLinePath = useCallback(
    (lineIndex: number) => {
      if (!reelContainerRef.current) return "";

      const line = winLines[lineIndex];
      const reelContainer = reelContainerRef.current;
      const symbolPositions = new Map();
      const containerRect = reelContainer.getBoundingClientRect();

      reelContainer
        .querySelectorAll(".symbol-container")
        .forEach((symbolEl) => {
          const reelIndexAttr = symbolEl.getAttribute("data-reel-index");
          const posIndexAttr = symbolEl.getAttribute("data-pos-index");

          if (reelIndexAttr !== null && posIndexAttr !== null) {
            const reelIndex = parseInt(reelIndexAttr, 10);
            const posIndex = parseInt(posIndexAttr, 10);
            symbolPositions.set(`${posIndex}-${reelIndex}`, symbolEl);
          }
        });

      return line.positions
        .map(([row, col], i) => {
          const symbolEl = symbolPositions.get(`${row}-${col}`);

          if (!symbolEl) {
            return i === 0 ? "M 0 0" : "L 0 0";
          }

          const symbolRect = symbolEl.getBoundingClientRect();
          const x = symbolRect.left - containerRect.left + symbolRect.width / 2;
          const y = symbolRect.top - containerRect.top + symbolRect.height / 2;

          return `${i === 0 ? "M" : "L"} ${x} ${y}`;
        })
        .join(" ");
    },
    [windowSize, winningLines]
  );

  const renderPaytable = () => (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">Paytable</h3>
      <div className="grid grid-cols-2 gap-4">
        {Object.values(symbolData).map((symbol) => (
          <div
            key={symbol.id}
            className="flex items-center space-x-3 p-2 bg-background-tertiary rounded"
          >
            <img src={symbol.image} alt={symbol.name} className="w-8 h-8" />
            <div>
              <div className="text-sm font-medium text-text-primary">
                {symbol.name}
              </div>
              <div className="text-xs text-text-secondary">
                {symbol.multiplier}x multiplier
              </div>
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
    <>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <CryptoPriceTicker data={cryptoData} />

        <div className="relative w-full max-w-lg bg-gradient-to-b from-gray-800 via-black to-gray-800 rounded-3xl p-4 border-8 border-t-yellow-300 border-l-yellow-400 border-r-yellow-600 border-b-yellow-700 shadow-2xl shadow-black/50 mt-4">
          <header className="text-center mb-4 p-2 bg-gradient-to-b from-purple-900 via-black to-purple-900 rounded-lg border-2 border-yellow-700/50">
            <h1
              className="text-3xl text-yellow-200 glow-text-yellow"
              style={{ fontFamily: ElegantFont }}
            >
              Solana Cash Machine
            </h1>
            <h2
              className="text-md text-cyan-300 tracking-widest"
              style={{ fontFamily: DigitalFont }}
            >
              THE PREMIER SOLANA SLOTS
            </h2>
          </header>

          <main className="relative bg-black rounded-lg p-4 border-4 border-black shadow-inner-strong mb-4">
            <div className="absolute inset-0 bg-damask-pattern opacity-10 bg-repeat"></div>
            <div
              ref={reelContainerRef}
              className="flex justify-around items-center"
            >
              {(
                persistentReels ||
                ((showResult || isCompleted) && spinResult?.reels
                  ? spinResult.reels
                  : gameData?.reels || [
                      ["btc", "eth", "sol"],
                      ["eth", "sol", "ada"],
                      ["sol", "ada", "matic"],
                      ["ada", "matic", "btc"],
                      ["matic", "btc", "eth"],
                    ])
              ).map((reelSymbols: string[], i: number) => (
                <Reel
                  key={i}
                  symbols={reelSymbols}
                  delay={i * 0.15}
                  isSpinning={isSpinning}
                  reelIndex={i}
                />
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
                        animation: "dash 1s linear infinite",
                      }}
                    />
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
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                >
                  🎰 SPINNING... 🎰
                </motion.div>
              </div>
            )}

            <div className="absolute inset-0 glass-pane pointer-events-none"></div>
          </main>

          <footer className="bg-gradient-to-b from-gray-900 to-gray-800 p-4 rounded-lg border-2 border-yellow-900/50 shadow-inner-strong">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <DigitalDisplay
                label="Balance"
                value={(
                  100 +
                  (gameState.result?.winAmount || 0) -
                  betAmount * enabledLines.filter(Boolean).length
                )?.toFixed(2)}
                isCurrency
              />
              <DigitalDisplay
                label="Total Bet"
                value={(
                  betAmount * enabledLines.filter(Boolean).length
                )?.toFixed(2)}
                isCurrency
              />
              <DigitalDisplay
                label="Win"
                value={(gameState.result?.winAmount || 0)?.toFixed(2)}
                isCurrency
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span
                    className="text-white font-bold"
                    style={{ fontFamily: DigitalFont }}
                  >
                    BET
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={isSpinning}
                      onClick={() => {
                        /* Handle bet decrease */
                      }}
                      className="control-button-sm disabled:opacity-50"
                    >
                      -
                    </button>
                    <span
                      className="text-white text-xl w-8 text-center"
                      style={{ fontFamily: DigitalFont }}
                    >
                      {betAmount}
                    </span>
                    <button
                      disabled={isSpinning}
                      onClick={() => {
                        /* Handle bet increase */
                      }}
                      className="control-button-sm disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-white font-bold"
                    style={{ fontFamily: DigitalFont }}
                  >
                    LINES
                  </span>
                  <div className="flex items-center space-x-2">
                    <button
                      disabled={isSpinning}
                      onClick={() => {
                        const currentActive =
                          enabledLines.filter(Boolean).length;
                        if (currentActive > 1) {
                          const newLines = [...enabledLines];
                          for (let i = newLines.length - 1; i >= 0; i--) {
                            if (newLines[i]) {
                              newLines[i] = false;
                              break;
                            }
                          }
                          setEnabledLines(newLines);
                        }
                      }}
                      className="control-button-sm disabled:opacity-50"
                    >
                      -
                    </button>
                    <span
                      className="text-white text-xl w-8 text-center"
                      style={{ fontFamily: DigitalFont }}
                    >
                      {enabledLines.filter(Boolean).length}
                    </span>
                    <button
                      disabled={isSpinning}
                      onClick={() => {
                        const currentActive =
                          enabledLines.filter(Boolean).length;
                        if (currentActive < 5) {
                          const newLines = [...enabledLines];
                          for (let i = 0; i < newLines.length; i++) {
                            if (!newLines[i]) {
                              newLines[i] = true;
                              break;
                            }
                          }
                          setEnabledLines(newLines);
                        }
                      }}
                      className="control-button-sm disabled:opacity-50"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={handleSpin}
                disabled={isSpinning || showResult || gameData?.hasSpun}
                className="spin-button"
                whileTap={!isSpinning ? { scale: 0.95, y: 2 } : {}}
              >
                <span
                  className="text-4xl font-black tracking-wider"
                  style={{ fontFamily: DigitalFont }}
                >
                  {isSpinning ? "..." : "SPIN"}
                </span>
              </motion.button>
            </div>
          </footer>
        </div>

        {/* Recent Games Section */}
        <div className="w-full max-w-4xl mt-8">
          <GameHistory
            gameType="slots"
            limit={5}
            showTitle={true}
            compact={true}
          />
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Orbitron:wght@400;900&display=swap');

        .shadow-inner-strong { box-shadow: inset 0 4px 12px 0 rgba(0, 0, 0, 0.7); }
        .glow-text-yellow { text-shadow: 0 0 5px #fef08a, 0 0 10px #fef08a, 0 0 20px #ca8a04; }
        .glow-text-green { text-shadow: 0 0 3px #4ade80, 0 0 8px #22c55e; }
        .bg-damask-pattern { background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCI+CjxyZWN0IHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgZmlsbD0iIzFmMWYxZiI+PC9yZWN0Pgo8cGF0aCBkPSJNMCAzMEwwIDE1QzMgOCAyIDAgMTUgMEMyOCAwIDI3IDggMzAgMTVM MzAiIGZpbGw9IiMzMTMxMzEiPjwvcGF0aD4KPC9zdmc+'); }
        .glass-pane { border-radius: 0.5rem; border: 2px solid rgba(255, 255, 255, 0.1); background: linear-gradient(to bottom, rgba(255,255,255,0.05), rgba(0,0,0,0.05)); backdrop-filter: blur(0.5px); overflow: hidden; }
        .glass-pane::before { content: ''; position: absolute; top: 0; left: -100%; width: 50%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%); transform: skewX(-25deg); animation: slide-glare 6s ease-in-out infinite; }
        @keyframes slide-glare { 0%, 20% { left: -100%; } 30%, 100% { left: 150%; } }
        .control-button-sm { @apply w-8 h-8 rounded-full bg-gradient-to-b from-gray-600 to-gray-800 text-white text-xl font-black border-b-4 border-gray-900 transition-all duration-100 active:border-b-2 active:translate-y-px; }
        .spin-button { @apply w-full h-full rounded-2xl bg-gradient-to-b from-purple-600 to-purple-800 text-white border-b-8 border-purple-900 transition-all duration-100 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center; }
        .spin-button:not(:disabled) { @apply active:border-b-4 active:translate-y-1; box-shadow: 0 0 20px rgba(147, 51, 234, 0.5); animation: pulse-spin 2s infinite; }
        @keyframes pulse-spin { 0% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.4); } 50% { box-shadow: 0 0 35px rgba(147, 51, 234, 0.8); } 100% { box-shadow: 0 0 20px rgba(147, 51, 234, 0.4); } }
        @keyframes dash { to { stroke-dashoffset: 24; } }
      `}</style>
    </>
  );
};

export default SlotsGame;
