import { useState, useCallback, useRef } from 'react';
import { gameApi, GameResponse, GameMove, GameUtils, CreateGameRequest } from '../services/gameApi';

export interface GameState {
  sessionId: string | null;
  gameType: string | null;
  status: 'idle' | 'creating' | 'playing' | 'completed' | 'error';
  gameData: any;
  result: any;
  error: string | null;
  isLoading: boolean;
}

export interface UseGameReturn {
  gameState: GameState;
  createGame: (request: CreateGameRequest) => Promise<boolean>;
  playMove: (move: Omit<GameMove, 'operationId'>) => Promise<boolean>;
  autoPlay: () => Promise<boolean>;
  resetGame: () => void;
  isGameActive: boolean;
  canMakeMove: boolean;
}

export const useGame = (): UseGameReturn => {
  const [gameState, setGameState] = useState<GameState>({
    sessionId: null,
    gameType: null,
    status: 'idle',
    gameData: null,
    result: null,
    error: null,
    isLoading: false,
  });

  const currentSessionId = useRef<string | null>(null);

  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState(prev => ({ ...prev, ...updates }));
  }, []);

  const createGame = useCallback(async (request: CreateGameRequest): Promise<boolean> => {
    try {
      updateGameState({ 
        status: 'creating', 
        isLoading: true, 
        error: null 
      });

      // Add client seed and device fingerprint for provably fair gaming
      const enhancedRequest = {
        ...request,
        clientSeed: request.clientSeed || GameUtils.generateClientSeed(),
        deviceFingerprint: request.deviceFingerprint || GameUtils.generateDeviceFingerprint(),
      };

      const response = await gameApi.createGame(enhancedRequest);

      if (response.success && response.data) {
        currentSessionId.current = response.data.sessionId;
        
        updateGameState({
          sessionId: response.data.sessionId,
          gameType: response.data.gameType,
          status: 'playing',
          gameData: response.data.gameState,
          isLoading: false,
        });

        return true;
      } else {
        updateGameState({
          status: 'error',
          error: response.error || response.message || 'Failed to create game',
          isLoading: false,
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error creating game:', error);
      updateGameState({
        status: 'error',
        error: error.message || 'Failed to create game',
        isLoading: false,
      });
      return false;
    }
  }, [updateGameState]);

  const playMove = useCallback(async (move: Omit<GameMove, 'operationId'>): Promise<boolean> => {
    if (!currentSessionId.current) {
      updateGameState({
        status: 'error',
        error: 'No active game session',
      });
      return false;
    }

    try {
      updateGameState({ isLoading: true, error: null });

      const moveWithId: GameMove = {
        ...move,
        operationId: GameUtils.generateOperationId(),
      };

      const response = await gameApi.playGame({
        sessionId: currentSessionId.current,
        move: moveWithId,
      });

      if (response.success && response.data) {
        const newStatus = response.data.status === 'completed' ? 'completed' : 'playing';
        
        updateGameState({
          status: newStatus,
          gameData: response.data.gameState,
          result: response.data.result,
          isLoading: false,
        });

        return true;
      } else {
        updateGameState({
          status: 'error',
          error: response.error || response.message || 'Failed to make move',
          isLoading: false,
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error making move:', error);
      updateGameState({
        status: 'error',
        error: error.message || 'Failed to make move',
        isLoading: false,
      });
      return false;
    }
  }, [updateGameState]);

  const autoPlay = useCallback(async (): Promise<boolean> => {
    if (!currentSessionId.current) {
      updateGameState({
        status: 'error',
        error: 'No active game session',
      });
      return false;
    }

    try {
      updateGameState({ isLoading: true, error: null });

      const response = await gameApi.playGame({
        sessionId: currentSessionId.current,
        // No move provided for auto-play
      });

      if (response.success && response.data) {
        updateGameState({
          status: 'completed',
          gameData: response.data.gameState,
          result: response.data.result,
          isLoading: false,
        });

        return true;
      } else {
        updateGameState({
          status: 'error',
          error: response.error || response.message || 'Failed to auto-play',
          isLoading: false,
        });
        return false;
      }
    } catch (error: any) {
      console.error('Error in auto-play:', error);
      updateGameState({
        status: 'error',
        error: error.message || 'Failed to auto-play',
        isLoading: false,
      });
      return false;
    }
  }, [updateGameState]);

  const resetGame = useCallback(() => {
    currentSessionId.current = null;
    setGameState({
      sessionId: null,
      gameType: null,
      status: 'idle',
      gameData: null,
      result: null,
      error: null,
      isLoading: false,
    });
  }, []);

  const isGameActive = gameState.status === 'playing' || gameState.status === 'creating';
  const canMakeMove = gameState.status === 'playing' && !gameState.isLoading;

  return {
    gameState,
    createGame,
    playMove,
    autoPlay,
    resetGame,
    isGameActive,
    canMakeMove,
  };
};