import { Chess } from 'chess.js';
import type { AIEngine } from './index';

const evaluateBoard = (game: Chess): number => {
  const pieceValues = {
    p: 1,
    n: 3,
    b: 3,
    r: 5,
    q: 9,
    k: 0
  };

  let score = 0;
  const board = game.board();

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        const value = pieceValues[piece.type.toLowerCase()];
        score += piece.color === 'w' ? value : -value;
      }
    }
  }

  return score;
};

const minimax = (game: Chess, depth: number, alpha: number, beta: number, isMaximizing: boolean): { score: number; move?: any } => {
  if (depth === 0 || game.isGameOver()) {
    return { score: evaluateBoard(game) };
  }

  const moves = game.moves({ verbose: true });
  
  if (moves.length === 0) {
    return { score: evaluateBoard(game) };
  }

  if (isMaximizing) {
    let bestScore = -Infinity;
    let bestMove = moves[0];
    
    for (const move of moves) {
      game.move(move);
      const result = minimax(game, depth - 1, alpha, beta, false);
      game.undo();
      
      if (result.score > bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, bestScore);
      if (beta <= alpha) break;
    }
    
    return { score: bestScore, move: bestMove };
  } else {
    let bestScore = Infinity;
    let bestMove = moves[0];
    
    for (const move of moves) {
      game.move(move);
      const result = minimax(game, depth - 1, alpha, beta, true);
      game.undo();
      
      if (result.score < bestScore) {
        bestScore = result.score;
        bestMove = move;
      }
      beta = Math.min(beta, bestScore);
      if (beta <= alpha) break;
    }
    
    return { score: bestScore, move: bestMove };
  }
};

export const minimaxEngine: AIEngine = {
  name: "Strategic Thinker",
  description: "Uses minimax algorithm with alpha-beta pruning to calculate the best moves",
  levels: {
    easy: {
      depth: 2,
      description: "Thinks 2 moves ahead"
    },
    medium: {
      depth: 3,
      description: "Thinks 3 moves ahead"
    },
    hard: {
      depth: 4,
      description: "Thinks 4 moves ahead"
    }
  },
  makeMove: async (game: Chess, level: string) => {
    const depth = minimaxEngine.levels[level]?.depth || 2;
    const result = minimax(game, depth, -Infinity, Infinity, true);
    
    if (!result.move) {
      throw new Error('No valid moves available');
    }

    return {
      from: result.move.from,
      to: result.move.to,
      promotion: result.move.promotion || 'q'
    };
  }
};