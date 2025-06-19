import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSupportedGames } from '../hooks/useSupportedGames';
import { SupportedGame } from '../services/gameApi';
import { STAKING_TOKEN } from '../config/tokens';

interface GameLobbyProps {
  onGameSelect: (gameType: string) => void;
  isWalletConnected: boolean;
  onConnectWallet: () => void;
}

const GameCard: React.FC<{
  game: SupportedGame;
  onSelect: () => void;
  disabled: boolean;
}> = ({ game, onSelect, disabled }) => {
  const gameIcons: Record<string, string> = {
    blackjack: '/assets/games/blackjack.png',
    dice: '/assets/games/dice.png',
    slots: '/assets/games/slots.png',
    shipcaptaincrew: '/assets/games/dice.png', // Using dice icon as fallback
  };

  const gameDescriptions: Record<string, string> = {
    blackjack: 'Classic card game with splits, doubles, and surrender',
    dice: 'Roll the dice and test your luck',
    slots: 'Spin the reels for crypto prizes',
    shipcaptaincrew: 'Roll three dice to become the captain',
  };

  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={`game-card relative overflow-hidden ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      onClick={disabled ? undefined : onSelect}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 opacity-0 hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary capitalize">
            {game.gameType.replace('shipcaptaincrew', 'Ship Captain Crew')}
          </h3>
          <div className="w-12 h-12 rounded-lg bg-background-tertiary flex items-center justify-center">
            <img
              src={gameIcons[game.gameType]}
              alt={game.gameType}
              className="w-8 h-8"
              onError={(e) => {
                // Fallback to emoji if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = getGameEmoji(game.gameType);
              }}
            />
          </div>
        </div>

        <p className="text-text-secondary text-sm mb-4">
          {gameDescriptions[game.gameType] || 'Experience the thrill of casino gaming'}
        </p>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-background-tertiary rounded-lg p-2">
            <p className="text-xs text-text-secondary">Min Bet</p>
            <p className="text-sm font-semibold text-primary">
              {game.config.minBet.toFixed(2)} ${STAKING_TOKEN.symbol}
            </p>
          </div>
          <div className="bg-background-tertiary rounded-lg p-2">
            <p className="text-xs text-text-secondary">Max Bet</p>
            <p className="text-sm font-semibold text-primary">
              {game.config.maxBet.toFixed(2)} ${STAKING_TOKEN.symbol}
            </p>
          </div>
        </div>

        <div className="bg-background-tertiary rounded-lg p-2 mb-4">
          <p className="text-xs text-text-secondary">House Edge</p>
          <p className="text-sm font-semibold text-warning">
            {(game.config.houseEdge * 100).toFixed(1)}%
          </p>
        </div>

        <button
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
            disabled
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'btn-primary hover:shadow-glow'
          }`}
          disabled={disabled}
        >
          {disabled ? 'Connect Wallet' : 'Play Now'}
        </button>
      </div>
    </motion.div>
  );
};

const getGameEmoji = (gameType: string): string => {
  const emojis: Record<string, string> = {
    blackjack: '🃏',
    dice: '🎲',
    slots: '🎰',
    shipcaptaincrew: '⚓',
  };
  return `<span class="text-2xl">${emojis[gameType] || '🎮'}</span>`;
};

const GameLobby: React.FC<GameLobbyProps> = ({
  onGameSelect,
  isWalletConnected,
  onConnectWallet,
}) => {
  const { games, isLoading, error, refreshGames } = useSupportedGames();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const categories = [
    { id: 'all', name: 'All Games', icon: '🎮' },
    { id: 'cards', name: 'Card Games', icon: '🃏' },
    { id: 'dice', name: 'Dice Games', icon: '🎲' },
    { id: 'slots', name: 'Slot Games', icon: '🎰' },
  ];

  const getGameCategory = (gameType: string): string => {
    const categoryMap: Record<string, string> = {
      blackjack: 'cards',
      dice: 'dice',
      shipcaptaincrew: 'dice',
      slots: 'slots',
    };
    return categoryMap[gameType] || 'all';
  };

  const filteredGames = games.filter(game => 
    selectedCategory === 'all' || getGameCategory(game.gameType) === selectedCategory
  );

  useEffect(() => {
    if (error) {
      // Retry loading games after a delay
      const timeout = setTimeout(() => {
        refreshGames();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [error, refreshGames]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="loading-spinner w-16 h-16 mx-auto mb-4" />
          <p className="text-text-secondary">Loading games...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-text-primary mb-2">
            Unable to Load Games
          </h2>
          <p className="text-text-secondary mb-4">{error}</p>
          <button
            onClick={refreshGames}
            className="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Solana Cash Machine
            </span>
          </h1>
          <p className="text-text-secondary text-lg md:text-xl max-w-2xl mx-auto">
            Experience provably fair gaming with instant payouts on Solana
          </p>
        </motion.div>

        {/* Wallet Connection Banner */}
        {!isWalletConnected && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-r from-primary/20 to-secondary/20 border border-primary/30 rounded-xl p-6 mb-8"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  Connect Your Wallet
                </h3>
                <p className="text-text-secondary">
                  Connect your Solana wallet to start playing and earning rewards
                </p>
              </div>
              <button
                onClick={onConnectWallet}
                className="btn-primary whitespace-nowrap"
              >
                Connect Wallet
              </button>
            </div>
          </motion.div>
        )}

        {/* Category Filter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap justify-center gap-4 mb-8"
        >
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'bg-primary text-black'
                  : 'bg-background-secondary text-text-secondary hover:bg-background-tertiary hover:text-text-primary'
              }`}
            >
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </button>
          ))}
        </motion.div>

        {/* Games Grid */}
        {filteredGames.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredGames.map((game, index) => (
              <motion.div
                key={game.gameType}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <GameCard
                  game={game}
                  onSelect={() => onGameSelect(game.gameType)}
                  disabled={!isWalletConnected}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <div className="text-text-secondary text-6xl mb-4">🎮</div>
            <h3 className="text-xl font-semibold text-text-primary mb-2">
              No Games Found
            </h3>
            <p className="text-text-secondary">
              Try selecting a different category or check back later
            </p>
          </div>
        )}

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="card text-center">
            <div className="text-primary text-3xl font-bold mb-2">
              {games.length}
            </div>
            <p className="text-text-secondary">Games Available</p>
          </div>
          <div className="card text-center">
            <div className="text-primary text-3xl font-bold mb-2">100%</div>
            <p className="text-text-secondary">Provably Fair</p>
          </div>
          <div className="card text-center">
            <div className="text-primary text-3xl font-bold mb-2">Instant</div>
            <p className="text-text-secondary">Payouts</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default GameLobby;