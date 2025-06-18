import { SlotsProvider } from "../../providers/SlotsProvider";
import { GameState } from "../../types/game";

describe("SlotsProvider", () => {
  let provider: SlotsProvider;

  beforeEach(() => {
    provider = new SlotsProvider();
  });

  describe("Game Configuration", () => {
    it("should have correct game type", () => {
      expect(provider.gameType).toBe("slots");
    });

    it("should have correct configuration for 97% RTP", () => {
      expect(provider.config.minBet).toBe(0.01);
      expect(provider.config.maxBet).toBe(50);
      expect(provider.config.baseMultiplier).toBe(1);
      expect(provider.config.houseEdge).toBe(0.03); // 3% house edge = 97% RTP
    });

    it("should calculate theoretical RTP correctly", () => {
      expect(provider.calculateTheoreticalRTP()).toBe(97);
    });
  });

  describe("Symbol System", () => {
    it("should have all required symbols", () => {
      const symbols = provider.getAllSymbols();
      const symbolIds = symbols.map(s => s.id);
      
      // Fruit symbols
      expect(symbolIds).toContain('cherry');
      expect(symbolIds).toContain('lemon');
      expect(symbolIds).toContain('orange');
      expect(symbolIds).toContain('plum');
      
      // Mid-tier symbols
      expect(symbolIds).toContain('bell');
      expect(symbolIds).toContain('bar');
      expect(symbolIds).toContain('seven');
      
      // Crypto symbols
      expect(symbolIds).toContain('btc');
      expect(symbolIds).toContain('eth');
      expect(symbolIds).toContain('sol');
    });

    it("should have weighted rarity system", () => {
      const symbols = provider.getAllSymbols();
      
      // Fruit symbols should be most common
      const fruitSymbol = symbols.find(s => s.id === 'cherry');
      expect(fruitSymbol?.weight).toBe(150);
      
      // Crypto symbols should be rarest
      const btcSymbol = symbols.find(s => s.id === 'btc');
      expect(btcSymbol?.weight).toBe(10);
      
      const ethSymbol = symbols.find(s => s.id === 'eth');
      expect(ethSymbol?.weight).toBe(15);
      
      const solSymbol = symbols.find(s => s.id === 'sol');
      expect(solSymbol?.weight).toBe(20);
    });

    it("should have correct payout multipliers", () => {
      const symbols = provider.getAllSymbols();
      
      // Fruit symbols (lowest multipliers)
      const cherry = symbols.find(s => s.id === 'cherry');
      expect(cherry?.multipliers[3]).toBe(1.5);
      expect(cherry?.multipliers[5]).toBe(6);
      
      // Crypto symbols (highest multipliers)
      const btc = symbols.find(s => s.id === 'btc');
      expect(btc?.multipliers[3]).toBe(25);
      expect(btc?.multipliers[5]).toBe(100);
      
      const eth = symbols.find(s => s.id === 'eth');
      expect(eth?.multipliers[3]).toBe(20);
      expect(eth?.multipliers[5]).toBe(80);
      
      const sol = symbols.find(s => s.id === 'sol');
      expect(sol?.multipliers[3]).toBe(15);
      expect(sol?.multipliers[5]).toBe(60);
    });
  });

  describe("Crypto Themes", () => {
    it("should return available themes", () => {
      const themes = provider.getAvailableThemes();
      expect(themes).toEqual(['BTC', 'ETH', 'SOL']);
    });

    it("should modify symbol weights for themed games", () => {
      const btcSymbols = provider.getThemeSymbols('BTC');
      const btcSymbol = btcSymbols.find(s => s.id === 'btc');
      const ethSymbol = btcSymbols.find(s => s.id === 'eth');
      
      // BTC symbol should have increased weight
      expect(btcSymbol?.weight).toBe(20); // 10 * 2
      // ETH symbol should have reduced weight
      expect(ethSymbol?.weight).toBe(4); // 15 * 0.3 (floored)
    });

    it("should initialize themed games correctly", () => {
      const gameState = provider.initializeThemedGame(1, "test_seed", "BTC", "client_seed", 12345);
      
      expect(gameState.gameType).toBe("slots");
      expect(gameState.currentData.theme).toBe("BTC");
      expect(gameState.currentData.betAmount).toBe(1);
    });
  });

  describe("Game Initialization", () => {
    it("should initialize game with correct default values", () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);

      expect(gameState.gameType).toBe("slots");
      expect(gameState.status).toBe("created");
      expect(gameState.history).toEqual([]);

      const gameData = gameState.currentData;
      expect(gameData.betAmount).toBe(1);
      expect(gameData.serverSeed).toBe("test_server_seed");
      expect(gameData.clientSeed).toBe("test_client_seed");
      expect(gameData.nonce).toBe(12345);
      expect(gameData.paylines).toBe(25);
    });

    it("should initialize game with theme", () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345, "ETH");
      expect(gameState.currentData.theme).toBe("ETH");
    });
  });

  describe("Game Logic", () => {
    it("should handle auto-play correctly", async () => {
      const gameState = provider.initializeGame(1, "test_server_seed", "test_client_seed", 12345);
      
      const result = await provider.playGame(gameState);

      expect(result).toBeDefined();
      expect(result.gameData).toBeDefined();
      expect(result.gameData.reels).toBeDefined();
      expect(result.gameData.reels).toHaveLength(5); // 5 reels
      expect(result.gameData.reels[0]).toHaveLength(3); // 3 symbols per reel
      expect(result.outcome).toBeDefined();
      expect(typeof result.isWin).toBe("boolean");
      expect(typeof result.multiplier).toBe("number");
      expect(typeof result.winAmount).toBe("number");
    });

    it("should generate consistent results with same seeds", async () => {
      const gameState1 = provider.initializeGame(1, "test_seed", "client_seed", 12345);
      const gameState2 = provider.initializeGame(1, "test_seed", "client_seed", 12345);
      
      const result1 = await provider.playGame(gameState1);
      const result2 = await provider.playGame(gameState2);

      expect(result1.gameData.reels).toEqual(result2.gameData.reels);
      expect(result1.multiplier).toBe(result2.multiplier);
    });

    it("should generate different results with different seeds", async () => {
      const gameState1 = provider.initializeGame(1, "test_seed_1", "client_seed", 12345);
      const gameState2 = provider.initializeGame(1, "test_seed_2", "client_seed", 12345);
      
      const result1 = await provider.playGame(gameState1);
      const result2 = await provider.playGame(gameState2);

      expect(result1.gameData.reels).not.toEqual(result2.gameData.reels);
    });

    it("should validate bet amounts", () => {
      expect(provider.validateBet(0.01)).toBe(true);
      expect(provider.validateBet(50)).toBe(true);
      expect(provider.validateBet(0.005)).toBe(false);
      expect(provider.validateBet(51)).toBe(false);
    });

    it("should calculate winnings correctly", () => {
      expect(provider.calculateWinnings(10, 0)).toBe(0);
      expect(provider.calculateWinnings(10, 1.5)).toBe(15);
      expect(provider.calculateWinnings(10, 25)).toBe(250);
      expect(provider.calculateWinnings(10, 100)).toBe(1000);
    });
  });

  describe("Payline Calculation", () => {
    it("should detect horizontal winning lines", () => {
      const reels = [
        ['cherry', 'bell', 'bar'],
        ['cherry', 'bell', 'bar'],
        ['cherry', 'bell', 'bar'],
        ['cherry', 'bell', 'bar'],
        ['cherry', 'bell', 'bar']
      ];

      const paylines = (provider as any).calculatePaylines(reels);
      
      // Should have winning horizontal lines
      expect(paylines.length).toBeGreaterThan(0);
      const cherryLine = paylines.find((p: any) => p.line.every((s: string) => s === 'cherry'));
      expect(cherryLine?.multiplier).toBe(6); // cherry 5-of-a-kind
    });

    it("should handle fruit combination wins", () => {
      const line = ['cherry', 'lemon', 'orange', 'plum', 'cherry'];
      const result = (provider as any).calculateLineMultiplier(line);
      
      // Should give fruit combination multiplier
      expect(result.multiplier).toBe(1.5);
      expect(result.count).toBe(5); // 5 fruit symbols
    });

    it("should handle crypto symbol wins", () => {
      const line = ['btc', 'btc', 'btc', 'bell', 'bar'];
      const result = (provider as any).calculateLineMultiplier(line);
      
      // Should give BTC 3-of-a-kind multiplier
      expect(result.multiplier).toBe(25);
      expect(result.count).toBe(3);
    });

    it("should handle no wins correctly", () => {
      const line = ['cherry', 'bell', 'bar', 'seven', 'btc'];
      const result = (provider as any).calculateLineMultiplier(line);
      
      expect(result.multiplier).toBe(0);
      expect(result.count).toBe(0);
    });
  });

  describe("Integration", () => {
    it("should maintain consistent interface with other providers", () => {
      expect(typeof provider.validateBet).toBe("function");
      expect(typeof provider.calculateWinnings).toBe("function");
      expect(typeof provider.initializeGame).toBe("function");
      expect(typeof provider.playGame).toBe("function");
      expect(provider.gameType).toBe("slots");
      expect(provider.config).toBeDefined();
    });

    it("should work with different crypto themes", async () => {
      const themes = ['BTC', 'ETH', 'SOL'] as const;
      
      for (const theme of themes) {
        const gameState = provider.initializeThemedGame(1, "test_seed", theme, "client_seed", 12345);
        const result = await provider.playGame(gameState);
        
        expect(result.gameData.theme).toBe(theme);
        expect(result.outcome.theme).toBe(theme);
      }
    });

    it("should handle edge cases gracefully", async () => {
      // Test with minimal bet
      const minGameState = provider.initializeGame(0.01, "test_seed", "client_seed", 12345);
      const minResult = await provider.playGame(minGameState);
      expect(minResult).toBeDefined();
      
      // Test with maximum bet
      const maxGameState = provider.initializeGame(50, "test_seed", "client_seed", 12345);
      const maxResult = await provider.playGame(maxGameState);
      expect(maxResult).toBeDefined();
    });
  });

  describe("Weighted Symbol Selection", () => {
    it("should create weighted pool correctly", () => {
      const symbols = [
        { id: 'a', name: 'A', weight: 2, multipliers: {} },
        { id: 'b', name: 'B', weight: 3, multipliers: {} }
      ];
      
      const pool = (provider as any).createWeightedPool(symbols);
      
      expect(pool).toHaveLength(5); // 2 + 3
      expect(pool.filter((s: string) => s === 'a')).toHaveLength(2);
      expect(pool.filter((s: string) => s === 'b')).toHaveLength(3);
    });

    it("should return string symbols instead of numbers", async () => {
      const gameState = provider.initializeGame(1, "test_seed", "client_seed", 12345);
      const result = await provider.playGame(gameState);
      
      result.gameData.reels.forEach((reel: string[]) => {
        reel.forEach((symbol: string) => {
          expect(typeof symbol).toBe('string');
          expect(['cherry', 'lemon', 'orange', 'plum', 'bell', 'bar', 'seven', 'btc', 'eth', 'sol']).toContain(symbol);
        });
      });
    });
  });
});