import { Chess } from 'chess.js';
import type { AIEngine } from './index';

type PieceValue = {
  [key: string]: number;
};

const pieceValues: PieceValue = {
  p: 100,   // pawn
  n: 320,   // knight
  b: 330,   // bishop
  r: 500,   // rook
  q: 900,   // queen
  k: 20000  // king
};

// Piece-square tables for positional evaluation
const pawnTable = [
  0,  0,  0,  0,  0,  0,  0,  0,
  50, 50, 50, 50, 50, 50, 50, 50,
  10, 10, 20, 30, 30, 20, 10, 10,
  5,  5, 10, 25, 25, 10,  5,  5,
  0,  0,  0, 20, 20,  0,  0,  0,
  5, -5,-10,  0,  0,-10, -5,  5,
  5, 10, 10,-20,-20, 10, 10,  5,
  0,  0,  0,  0,  0,  0,  0,  0
];

const evaluatePosition = (game: Chess): number => {
  let score = 0;
  const board = game.board();

  // Material and position evaluation
  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const piece = board[i][j];
      if (piece) {
        // Material score
        const value = pieceValues[piece.type];
        const materialScore = piece.color === 'w' ? value : -value;
        
        // Position score for pawns
        let positionScore = 0;
        if (piece.type === 'p') {
          const index = piece.color === 'w' ? (7-i) * 8 + j : i * 8 + j;
          positionScore = piece.color === 'w' ? pawnTable[index] : -pawnTable[63-index];
        }
        
        score += materialScore + positionScore;
      }
    }
  }

  // Mobility bonus
  score += game.moves().length * (game.turn() === 'w' ? 1 : -1);

  return score;
};

const getRandomMove = (moves: string[]): string => {
  return moves[Math.floor(Math.random() * moves.length)];
};

const getBestMove = (game: Chess, depth: number = 2): any => {
  const moves = game.moves({ verbose: true });
  let bestMove = moves[0];
  let bestScore = -Infinity;

  for (const move of moves) {
    game.move(move);
    let score = -evaluatePosition(game);
    
    if (depth > 1 && !game.isGameOver()) {
      const response = getBestMove(game, depth - 1);
      game.move(response);
      score = -evaluatePosition(game);
      game.undo(); // Undo response
    }
    
    game.undo(); // Undo our move

    if (score > bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return bestMove;
};

export const stockfish: AIEngine = {
  name: "Stockfish",
  description: "A powerful chess engine with multiple difficulty levels",
  levels: {
    easy: {
      description: "Makes random moves occasionally"
    },
    medium: {
      description: "Balanced mix of strategy and randomness"
    },
    hard: {
      description: "Plays at full strength"
    }
  },
  makeMove: async (game: Chess, level: string) => {
    const moves = game.moves({ verbose: true });
    
    if (moves.length === 0) {
      throw new Error('No valid moves available');
    }

    let selectedMove;
    
    switch (level) {
      case 'easy':
        selectedMove = moves[Math.floor(Math.random() * moves.length)];
        break;
      case 'medium':
        // 70% chance of making a decent move, 30% chance of random move
        if (Math.random() < 0.3) {
          selectedMove = moves[Math.floor(Math.random() * moves.length)];
        } else {
          selectedMove = getBestMove(game, 1);
        }
        break;
      case 'hard':
        selectedMove = getBestMove(game, 2);
        break;
      default:
        selectedMove = getBestMove(game, 1);
    }

    return {
      from: selectedMove.from,
      to: selectedMove.to,
      promotion: selectedMove.promotion || 'q'
    };
  }
};