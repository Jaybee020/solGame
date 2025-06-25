import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GameState } from "../../hooks/useGame";
import { PAYOUT_TOKEN } from "../../config/tokens";

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
            {coin.change24h >= 0 ? "▲" : "▼"} {coin.change24h.toFixed(2)}%
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
  const [cryptoData, setCryptoData] = useState<CryptoData[] | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [spinResult, setSpinResult] = useState<any>(null);
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

  const gameData = gameState.gameData;
  const isPlaying = gameState.status === "playing";
  const isCompleted = gameState.status === "completed";

  // Crypto-themed symbols with images - updated to match new design
  const symbols = [
    {
      id: "btc",
      symbol: "₿",
      name: "Bitcoin",
      color: "#F7931A",
      image: "/assets/crypto-logos/btc.png",
      payout: 100,
      glow: "#F7931A",
      multiplier: 5,
      isWild: false,
    },
    {
      id: "eth",
      symbol: "Ξ",
      name: "Ethereum",
      color: "#627EEA",
      image: "/assets/crypto-logos/eth.png",
      payout: 80,
      glow: "#627EEA",
      multiplier: 1.6,
      isWild: false,
    },
    {
      id: "sol",
      symbol: "◎",
      name: "Solana",
      color: "#00FFA3",
      image: "/assets/crypto-logos/sol.png",
      payout: 60,
      glow: "#00FFA3",
      multiplier: 2,
      isWild: true,
    },
    {
      id: "ada",
      symbol: "₳",
      name: "Cardano",
      color: "#0033AD",
      image: "/assets/crypto-logos/ada.png",
      payout: 40,
      glow: "#0033AD",
      multiplier: 1.2,
      isWild: false,
    },
    {
      id: "matic",
      symbol: "◇",
      name: "Polygon",
      color: "#8247E5",
      image: "/assets/crypto-logos/polygon.png",
      payout: 30,
      glow: "#8247E5",
      multiplier: 0.9,
      isWild: false,
    },
    {
      id: "wild",
      symbol: "💎",
      name: "Diamond Wild",
      color: "#00FFFF",
      image: null,
      payout: 200,
      glow: "#00FFFF",
      special: "wild",
      multiplier: 10,
      isWild: true,
    },
    {
      id: "scatter",
      symbol: "⭐",
      name: "Star Scatter",
      color: "#FFD700",
      image: null,
      payout: 150,
      glow: "#FFD700",
      special: "scatter",
    },
  ];

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

      // Update winning lines
      if (result?.winningLines) {
        setWinningLines(result.winningLines);
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

  const renderSymbol = (
    symbolId: string,
    reelIndex: number,
    posIndex: number,
    isAnimated = false
  ) => {
    const symbol = symbols.find((s) => s.id === symbolId) || symbols[0];
    const shouldAnimate =
      isAnimated && isSpinning && !showResult && !isCompleted;
    const isWinningSymbol = winningLines.some((lineIndex) => {
      const line = winLines[lineIndex];
      return line.positions.some(
        ([row, col]) => row === posIndex && col === reelIndex
      );
    });

    return (
      <div
        className="symbol-container"
        data-reel-index={reelIndex}
        data-pos-index={posIndex}
      >
        <motion.div
          key={`symbol-${gameState.sessionId}-${
            showResult ? "result" : "spinning"
          }-${reelIndex}-${posIndex}`}
          animate={
            shouldAnimate
              ? {
                  y: [-40, 40, -40],
                  rotateY: [0, 180, 360],
                  scale: [1, 1.1, 1],
                }
              : isWinningSymbol
              ? {
                  scale: [1, 1.15, 1],
                  boxShadow: [
                    `0 0 5px ${symbol.glow}`,
                    `0 0 20px ${symbol.glow}`,
                    `0 0 5px ${symbol.glow}`,
                  ],
                }
              : {
                  y: 0,
                  rotateY: 0,
                  scale: 1,
                }
          }
          transition={{
            duration: shouldAnimate ? 0.6 : 0.5,
            repeat: shouldAnimate ? Infinity : isWinningSymbol ? Infinity : 0,
            ease: shouldAnimate ? "easeInOut" : "easeOut",
            delay: shouldAnimate ? reelIndex * 0.15 : 0,
          }}
          className="relative w-28 h-28 bg-damask-pattern bg-cover bg-center rounded-lg flex items-center justify-center p-2 border-2 border-yellow-700/50 shadow-lg transform-gpu overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-lg"></div>
          {shouldAnimate ? (
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
              className="text-3xl z-10"
            >
              🎰
            </motion.div>
          ) : (
            <>
              {symbol.image ? (
                <img
                  src={symbol.image}
                  alt={symbol.name}
                  className={`w-16 h-16 object-contain drop-shadow-lg z-10 ${
                    isWinningSymbol ? "brightness-125" : ""
                  }`}
                  style={{
                    filter: isWinningSymbol
                      ? `drop-shadow(0 0 8px ${symbol.glow})`
                      : "none",
                  }}
                />
              ) : (
                <div
                  className={`text-4xl z-10 ${
                    isWinningSymbol ? "animate-pulse" : ""
                  }`}
                  style={{
                    color: symbol.color,
                    textShadow: isWinningSymbol
                      ? `0 0 10px ${symbol.glow}`
                      : "none",
                  }}
                >
                  {symbol.symbol}
                </div>
              )}
              {symbol.isWild && (
                <div className="absolute top-1 left-1 text-yellow-300 text-2xl drop-shadow-md z-10">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    ★
                  </motion.div>
                </div>
              )}
            </>
          )}
        </motion.div>
      </div>
    );
  };

  const renderSlotMachine = () => {
    const reels =
      (showResult || isCompleted) && spinResult?.reels
        ? spinResult.reels
        : gameData?.reels || [
            ["btc", "eth", "sol"],
            ["eth", "sol", "ada"],
            ["sol", "ada", "dot"],
            ["ada", "dot", "link"],
            ["dot", "link", "btc"],
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
              background: "linear-gradient(to bottom, #000000, #1a1a2e)",
              boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
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
                        animation: "dash 1s linear infinite",
                      }}
                    />
                    {/* Add circles at connection points */}
                    {line.positions.map(([row, col], idx) => {
                      const symbolEl = document.querySelector(
                        `[data-pos-index="${row}"][data-reel-index="${col}"]`
                      );
                      if (!symbolEl || !reelContainerRef.current) return null;

                      const containerRect =
                        reelContainerRef.current.getBoundingClientRect();
                      const symbolRect = symbolEl.getBoundingClientRect();
                      const x =
                        symbolRect.left -
                        containerRect.left +
                        symbolRect.width / 2;
                      const y =
                        symbolRect.top -
                        containerRect.top +
                        symbolRect.height / 2;

                      return (
                        <circle
                          key={`point-${lineIndex}-${idx}`}
                          cx={x}
                          cy={y}
                          r={3}
                          fill={line.color}
                          style={{
                            filter: `drop-shadow(0 0 4px ${line.color})`,
                          }}
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
                    {activeLineCount} line{activeLineCount !== 1 ? "s" : ""} × $
                    {betAmount.toFixed(2)}
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
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full"
                      />
                      <span>SPINNING...</span>
                    </div>
                  ) : showResult || gameData?.hasSpun ? (
                    "🎰 SPIN COMPLETE 🎰"
                  ) : (
                    "🎰 SPIN TO WIN 🎰"
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
          <div
            key={symbol.id}
            className="flex items-center space-x-3 p-2 bg-background-tertiary rounded"
          >
            <div className="text-2xl" style={{ color: symbol.color }}>
              {symbol.symbol}
            </div>
            <div>
              <div className="text-sm font-medium text-text-primary">
                {symbol.name}
              </div>
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
    <>
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        
        <CryptoPriceTicker data={cryptoData} />

        <div className="relative w-full max-w-lg bg-gradient-to-b from-gray-800 via-black to-gray-800 rounded-3xl p-4 border-8 border-t-yellow-300 border-l-yellow-400 border-r-yellow-600 border-b-yellow-700 shadow-2xl shadow-black/50 mt-4">

          <header className="text-center mb-4 p-2 bg-gradient-to-b from-purple-900 via-black to-purple-900 rounded-lg border-2 border-yellow-700/50">
            <h1 className="text-3xl text-yellow-200 glow-text-yellow" style={{ fontFamily: ElegantFont }}>
              Solana Cash Machine
            </h1>
            <h2 className="text-md text-cyan-300 tracking-widest" style={{ fontFamily: DigitalFont }}>THE PREMIER SOLANA SLOTS</h2>
          </header>

          <main className="relative bg-black rounded-lg p-4 border-4 border-black shadow-inner-strong mb-4">
            <div className="absolute inset-0 bg-damask-pattern opacity-10 bg-repeat"></div>
            <div ref={reelContainerRef} className="flex justify-around items-center">
              {((showResult || isCompleted) && spinResult?.reels ? 
                spinResult.reels : 
                gameData?.reels || [
                  ['btc', 'eth', 'sol'],
                  ['eth', 'sol', 'ada'],
                  ['sol', 'ada', 'matic'],
                  ['ada', 'matic', 'btc'],
                  ['matic', 'btc', 'eth']
                ]).map((reelSymbols: string[], i: number) => (
                <div key={i} className="h-[360px] w-[120px] overflow-hidden">
                  <motion.div
                    animate={{ y: isSpinning ? '-2400px' : '0px' }}
                    transition={{
                      duration: isSpinning ? 2.5 + i * 0.15 : 0.8,
                      ease: isSpinning ? [0.33, 1, 0.68, 1] : 'circOut',
                    }}
                  >
                    {isSpinning
                      ? [...Array(20)].flatMap(() => Object.keys(symbols.reduce((acc, s) => ({ ...acc, [s.id]: s }), {})).sort(() => Math.random() - 0.5)).map((symbolId, idx) => 
                          <div key={idx} className="py-2">{renderSymbol(symbolId, i, Math.floor(idx / 5), true)}</div>
                        )
                      : reelSymbols.map((symbolId: string, symbolIndex: number) => (
                          <div key={symbolIndex} className="py-2">{renderSymbol(symbolId, i, symbolIndex, true)}</div>
                        ))
                    }
                  </motion.div>
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
            
            <div className="absolute inset-0 glass-pane pointer-events-none"></div>
          </main>

          <footer className="bg-gradient-to-b from-gray-900 to-gray-800 p-4 rounded-lg border-2 border-yellow-900/50 shadow-inner-strong">
            <div className="grid grid-cols-3 gap-3 mb-4">
              <DigitalDisplay 
                label="Balance" 
                value={(100 + (gameState.result?.winAmount || 0) - betAmount * enabledLines.filter(Boolean).length).toFixed(2)} 
                isCurrency 
              />
              <DigitalDisplay 
                label="Total Bet" 
                value={(betAmount * enabledLines.filter(Boolean).length).toFixed(2)} 
                isCurrency 
              />
              <DigitalDisplay 
                label="Win" 
                value={(gameState.result?.winAmount || 0).toFixed(2)} 
                isCurrency 
              />
            </div>

            <div className="grid grid-cols-2 gap-4 items-center">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold" style={{ fontFamily: DigitalFont }}>BET</span>
                  <div className="flex items-center space-x-2">
                    <button disabled={isSpinning} onClick={() => {/* Handle bet decrease */}} className="control-button-sm disabled:opacity-50">-</button>
                    <span className="text-white text-xl w-8 text-center" style={{ fontFamily: DigitalFont }}>{betAmount}</span>
                    <button disabled={isSpinning} onClick={() => {/* Handle bet increase */}} className="control-button-sm disabled:opacity-50">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white font-bold" style={{ fontFamily: DigitalFont }}>LINES</span>
                  <div className="flex items-center space-x-2">
                    <button disabled={isSpinning} onClick={() => {
                      const currentActive = enabledLines.filter(Boolean).length;
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
                    }} className="control-button-sm disabled:opacity-50">-</button>
                    <span className="text-white text-xl w-8 text-center" style={{ fontFamily: DigitalFont }}>{enabledLines.filter(Boolean).length}</span>
                    <button disabled={isSpinning} onClick={() => {
                      const currentActive = enabledLines.filter(Boolean).length;
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
                    }} className="control-button-sm disabled:opacity-50">+</button>
                  </div>
                </div>
              </div>

              <motion.button
                onClick={handleSpin}
                disabled={isSpinning || showResult || gameData?.hasSpun}
                className="spin-button"
                whileTap={!isSpinning ? { scale: 0.95, y: 2 } : {}}
              >
                <span className="text-4xl font-black tracking-wider" style={{ fontFamily: DigitalFont }}>
                  {isSpinning ? '...' : 'SPIN'}
                </span>
              </motion.button>
            </div>
          </footer>
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
