import { Chess } from 'chess.js';
import type { AIEngine } from './index';

export const random: AIEngine = {
  name: "Random Mover",
  description: "Makes completely random legal moves. Perfect for beginners!",
  levels: {
    easy: {
      description: "Makes moves instantly"
    }
  },
  makeMove: async (game: Chess) => {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
      throw new Error('No valid moves available');
    }
    const move = moves[Math.floor(Math.random() * moves.length)];
    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion || 'q'
    };
  }
};