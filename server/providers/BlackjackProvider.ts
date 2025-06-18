import { BaseGameProvider } from './BaseGameProvider';
import { GameType, GameConfig, GameState, GameResult, GameMove } from '../types/game';

interface Card {
  suit: number;
  rank: number;
  value: number;
}

interface BlackjackGameData {
  betAmount: number;
  serverSeed: string;
  clientSeed: string;
  nonce: number;
  playerHand: Card[];
  dealerHand: Card[];
  deck: Card[];
  gamePhase: 'dealing' | 'player_turn' | 'dealer_turn' | 'finished';
  playerTotal: number;
  dealerTotal: number;
  canDoubleDown: boolean;
  canSplit: boolean;
}

interface BlackjackResult {
  playerHand: Card[];
  dealerHand: Card[];
  playerTotal: number;
  dealerTotal: number;
  outcome: 'win' | 'lose' | 'push' | 'blackjack';
  isWin: boolean;
}

export class BlackjackProvider extends BaseGameProvider {
  gameType: GameType = 'blackjack';
  config: GameConfig = {
    minBet: 0.01,
    maxBet: 100,
    baseMultiplier: 2,
    houseEdge: 0.005
  };

  private createDeck(): Card[] {
    const deck: Card[] = [];
    for (let suit = 0; suit < 4; suit++) {
      for (let rank = 1; rank <= 13; rank++) {
        const value = rank > 10 ? 10 : rank;
        deck.push({ suit, rank, value });
      }
    }
    return deck;
  }

  private shuffleDeck(deck: Card[], serverSeed: string, clientSeed: string, nonce: number): Card[] {
    const shuffled = [...deck];
    const randoms = this.generateSecureRandoms(serverSeed, clientSeed, nonce, deck.length);
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(randoms[i] * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  private calculateHandValue(hand: Card[]): number {
    let total = 0;
    let aces = 0;

    for (const card of hand) {
      if (card.rank === 1) {
        aces++;
        total += 11;
      } else {
        total += card.value;
      }
    }

    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return total;
  }

  private isBlackjack(hand: Card[]): boolean {
    return hand.length === 2 && this.calculateHandValue(hand) === 21;
  }

  initializeGame(betAmount: number, serverSeed: string, clientSeed: string = '', nonce: number = 0): GameState {
    const deck = this.createDeck();
    const shuffledDeck = this.shuffleDeck(deck, serverSeed, clientSeed, nonce);

    const playerHand = [shuffledDeck[0], shuffledDeck[2]];
    const dealerHand = [shuffledDeck[1]];
    const remainingDeck = shuffledDeck.slice(3);

    const gameData: BlackjackGameData = {
      betAmount,
      serverSeed,
      clientSeed,
      nonce,
      playerHand,
      dealerHand,
      deck: remainingDeck,
      gamePhase: 'dealing',
      playerTotal: this.calculateHandValue(playerHand),
      dealerTotal: this.calculateHandValue(dealerHand),
      canDoubleDown: true,
      canSplit: playerHand[0].rank === playerHand[1].rank
    };

    return {
      gameType: this.gameType,
      status: 'in_progress',
      currentData: gameData,
      history: []
    };
  }

  async playGame(state: GameState, move?: GameMove): Promise<GameResult> {
    const gameData = state.currentData as BlackjackGameData;

    if (!move || !move.action) {
      return this.autoPlay(gameData, state);
    }

    switch (move.action) {
      case 'hit':
        return this.handleHit(gameData, state);
      case 'stand':
        return this.handleStand(gameData, state);
      case 'double':
        return this.handleDouble(gameData, state);
      default:
        return this.autoPlay(gameData, state);
    }
  }

  private async autoPlay(gameData: BlackjackGameData, state: GameState): Promise<GameResult> {
    if (this.isBlackjack(gameData.playerHand)) {
      gameData.dealerHand.push(gameData.deck.shift()!);
      gameData.dealerTotal = this.calculateHandValue(gameData.dealerHand);
      
      if (this.isBlackjack(gameData.dealerHand)) {
        return this.finishGame(gameData, state, 'push');
      } else {
        return this.finishGame(gameData, state, 'blackjack');
      }
    }

    if (gameData.playerTotal > 21) {
      return this.finishGame(gameData, state, 'lose');
    }

    return this.dealerPlay(gameData, state);
  }

  private async handleHit(gameData: BlackjackGameData, state: GameState): Promise<GameResult> {
    if (gameData.deck.length === 0) {
      throw new Error('No cards left in deck');
    }

    gameData.playerHand.push(gameData.deck.shift()!);
    gameData.playerTotal = this.calculateHandValue(gameData.playerHand);
    gameData.canDoubleDown = false;

    if (gameData.playerTotal > 21) {
      return this.finishGame(gameData, state, 'lose');
    }

    state.currentData = gameData;
    return {
      isWin: false,
      multiplier: 0,
      winAmount: 0,
      gameData: {
        playerHand: gameData.playerHand,
        dealerHand: gameData.dealerHand,
        playerTotal: gameData.playerTotal,
        dealerTotal: gameData.dealerTotal,
        gamePhase: gameData.gamePhase,
        canDoubleDown: gameData.canDoubleDown,
        canSplit: gameData.canSplit
      },
      outcome: { action: 'hit', playerTotal: gameData.playerTotal, status: 'continue' }
    };
  }

  private async handleStand(gameData: BlackjackGameData, state: GameState): Promise<GameResult> {
    return this.dealerPlay(gameData, state);
  }

  private async handleDouble(gameData: BlackjackGameData, state: GameState): Promise<GameResult> {
    if (!gameData.canDoubleDown) {
      throw new Error('Cannot double down');
    }

    gameData.betAmount *= 2;
    gameData.playerHand.push(gameData.deck.shift()!);
    gameData.playerTotal = this.calculateHandValue(gameData.playerHand);

    if (gameData.playerTotal > 21) {
      return this.finishGame(gameData, state, 'lose');
    }

    return this.dealerPlay(gameData, state);
  }

  private async dealerPlay(gameData: BlackjackGameData, state: GameState): Promise<GameResult> {
    gameData.dealerHand.push(gameData.deck.shift()!);
    gameData.dealerTotal = this.calculateHandValue(gameData.dealerHand);

    while (gameData.dealerTotal < 17) {
      gameData.dealerHand.push(gameData.deck.shift()!);
      gameData.dealerTotal = this.calculateHandValue(gameData.dealerHand);
    }

    if (gameData.dealerTotal > 21) {
      return this.finishGame(gameData, state, 'win');
    } else if (gameData.playerTotal > gameData.dealerTotal) {
      return this.finishGame(gameData, state, 'win');
    } else if (gameData.playerTotal < gameData.dealerTotal) {
      return this.finishGame(gameData, state, 'lose');
    } else {
      return this.finishGame(gameData, state, 'push');
    }
  }

  private finishGame(gameData: BlackjackGameData, state: GameState, outcome: 'win' | 'lose' | 'push' | 'blackjack'): GameResult {
    gameData.gamePhase = 'finished';
    state.status = 'completed';

    let multiplier = 0;
    let isWin = false;

    switch (outcome) {
      case 'blackjack':
        multiplier = 2.5;
        isWin = true;
        break;
      case 'win':
        multiplier = 2;
        isWin = true;
        break;
      case 'push':
        multiplier = 1;
        isWin = false;
        break;
      case 'lose':
        multiplier = 0;
        isWin = false;
        break;
    }

    const winAmount = this.calculateWinnings(gameData.betAmount, multiplier);

    const result: BlackjackResult = {
      playerHand: gameData.playerHand,
      dealerHand: gameData.dealerHand,
      playerTotal: gameData.playerTotal,
      dealerTotal: gameData.dealerTotal,
      outcome,
      isWin
    };

    state.history.push(result);

    return {
      isWin,
      multiplier,
      winAmount,
      gameData: result,
      outcome: { outcome, playerTotal: gameData.playerTotal, dealerTotal: gameData.dealerTotal }
    };
  }
}