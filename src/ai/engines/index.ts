import { Chess } from 'chess.js';
import { stockfish } from './stockfish';
import { minimaxEngine } from './minimax';
import { random } from './random';

export type AIEngine = {
  name: string;
  description: string;
  levels: {
    [key: string]: {
      depth?: number;
      timeLimit?: number;
      description: string;
    };
  };
  makeMove: (game: Chess, level: string) => Promise<{ from: string; to: string; promotion?: string }>;
};

export const engines: { [key: string]: AIEngine } = {
  stockfish: stockfish,
  minimax: minimaxEngine,
  random: random,
};