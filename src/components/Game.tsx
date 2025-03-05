import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Copy, Eye } from 'lucide-react';
import { engines } from '../ai/engines/index.ts';

interface GameProps {
  theme: string;
}

const Game: React.FC<GameProps> = ({ theme }) => {
  const { roomId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [game, setGame] = useState(new Chess());
  const [socket, setSocket] = useState<Socket | null>(null);
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>(
    searchParams.get('color') as 'white' | 'black' || 'spectator'
  );
  const [isPlayerTurn, setIsPlayerTurn] = useState(playerColor === 'white');
  const [gameMode] = useState(searchParams.get('mode') || 'multiplayer');
  const [showCopied, setShowCopied] = useState(false);
  const [moveCount, setMoveCount] = useState(0);
  const [opponentJoined, setOpponentJoined] = useState(false);
  const [spectators, setSpectators] = useState(0);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [players, setPlayers] = useState<{white: string | null, black: string | null}>({
    white: null,
    black: null
  });
  const [selectedPiece, setSelectedPiece] = useState<string | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [moveStyle] = useState<'drag' | 'click'>(
    searchParams.get('moveStyle') as 'drag' | 'click' || 'drag'
  );

  // Define canMakeMove first since it's used in makeMove
  const canMakeMove = useCallback(() => {
    if (gameMode === 'multiplayer') {
      if (!opponentJoined || playerColor === 'spectator') return false;
      const currentTurn = game.turn() === 'w' ? 'white' : 'black';
      return !game.isGameOver() && currentTurn === playerColor;
    }
    return !game.isGameOver() && isPlayerTurn;
  }, [gameMode, opponentJoined, playerColor, game, isPlayerTurn]);

  const makeMove = useCallback((move: { from: string; to: string; promotion?: string }) => {
    try {
      if (!canMakeMove()) return false;

      const result = game.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || 'q'
      });

      if (result) {
        const newGame = new Chess(game.fen());
        setGame(newGame);
        setMoveCount(prev => prev + 1);
        
        if (gameMode === 'bot' && !game.isGameOver()) {
          setIsPlayerTurn(false);

          // Get the AI engine and level from URL params
          const engineName = searchParams.get('engine') || 'stockfish';
          const level = searchParams.get('level') || 'medium';
          
          // Make AI move
          setTimeout(async () => {
            try {
              const engine = engines[engineName];
              const aiMove = await engine.makeMove(newGame, level);
              
              if (aiMove) {
                const aiResult = newGame.move(aiMove);
                if (aiResult) {
                  setGame(new Chess(newGame.fen()));
                  setIsPlayerTurn(true);
                }
              }
            } catch (error) {
              console.error('AI move error:', error);
              setIsPlayerTurn(true);
            }
          }, 300);
        } else if (socket && gameMode === 'multiplayer') {
          socket.emit('move', { roomId, move: result, gameState: newGame.fen() });
          setIsPlayerTurn(false);
        }
        
        setSelectedPiece(null);
        setPossibleMoves([]);
        return true;
      }
    } catch (e) {
      console.error('Error making move:', e);
    }
    return false;
  }, [game, socket, roomId, gameMode, searchParams, canMakeMove]);

  useEffect(() => {
    const newSocket = io('http://localhost:3001');
    setSocket(newSocket);

    if (gameMode === 'multiplayer') {
      if (playerColor !== 'spectator') {
        newSocket.emit('createRoom', { roomId, color: playerColor });
      } else {
        newSocket.emit('joinAsSpectator', { roomId });
      }
    }

    return () => {
      newSocket.close();
    };
  }, [roomId, playerColor, gameMode]);

  useEffect(() => {
    if (!socket) return;

    socket.on('roomFull', () => {
      alert('This room is full. Please join another room or create a new one.');
      navigate('/');
    });

    socket.on('roomNotFound', () => {
      alert('Room not found. Please check the room ID and try again.');
      navigate('/');
    });

    socket.on('moveMade', ({ move, gameState }) => {
      const newGame = new Chess(gameState);
      setGame(newGame);
      setMoveCount(prev => prev + 1);
      setIsPlayerTurn(true);
    });

    socket.on('playerJoined', ({ color, players: roomPlayers, isReady }) => {
      setOpponentJoined(isReady);
      setPlayers(roomPlayers);
      setIsPlayerTurn(playerColor === 'white');
    });

    socket.on('syncGameState', ({ gameState }) => {
      if (gameState) {
        const newGame = new Chess(gameState);
        setGame(newGame);
        setIsPlayerTurn(playerColor === (newGame.turn() === 'w' ? 'white' : 'black'));
      }
    });

    socket.on('invalidMove', () => {
      alert('Invalid move. Please try again.');
    });

    socket.on('spectatorJoined', ({ count }) => {
      setSpectators(count);
    });

    socket.on('spectatorLeft', ({ count }) => {
      setSpectators(count);
    });

    socket.on('themeChanged', ({ theme: newTheme }) => {
      setCurrentTheme(newTheme);
    });

    socket.on('playerLeft', () => {
      alert('Opponent has left the game');
      setOpponentJoined(false);
      setPlayers(prev => ({
        ...prev,
        [playerColor === 'white' ? 'black' : 'white']: null
      }));
    });

    return () => {
      socket.off('roomFull');
      socket.off('roomNotFound');
      socket.off('moveMade');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('spectatorJoined');
      socket.off('spectatorLeft');
      socket.off('themeChanged');
      socket.off('syncGameState');
      socket.off('invalidMove');
    };
  }, [socket, navigate, playerColor]);

  const onSquareClick = (square: string) => {
    if (!canMakeMove() || moveStyle !== 'click') return;

    // If a piece is already selected
    if (selectedPiece) {
      // Try to make the move
      const moveResult = makeMove({ from: selectedPiece, to: square });
      
      // Reset selection regardless of move success
      setSelectedPiece(null);
      setPossibleMoves([]);
      
      if (moveResult) return;
    }

    // If no piece is selected or the move was invalid, try to select a new piece
    const piece = game.get(square);
    if (piece) {
      const pieceColor = piece.color === 'w' ? 'white' : 'black';
      if ((gameMode === 'multiplayer' && pieceColor === playerColor) || 
          (gameMode === 'bot' && isPlayerTurn && pieceColor === playerColor)) {
        // Get all possible moves for the selected piece
        const moves = game.moves({ square, verbose: true });
        if (moves.length > 0) {
          setSelectedPiece(square);
          setPossibleMoves(moves.map(move => move.to));
        }
      }
    }
  };

  const customSquareStyles = () => {
    const styles: { [square: string]: React.CSSProperties } = {};
    
    if (moveStyle === 'click') {
      // Highlight selected piece
      if (selectedPiece) {
        styles[selectedPiece] = {
          backgroundColor: 'rgba(255, 255, 0, 0.4)'
        };
      }

      // Show possible moves
      possibleMoves.forEach(square => {
        const pieceOnSquare = game.get(square);
        if (pieceOnSquare) {
          // Show capture squares with a different style
          styles[square] = {
            backgroundColor: 'rgba(255, 0, 0, 0.2)',
            borderRadius: '50%'
          };
        } else {
          // Show regular move squares
          styles[square] = {
            background: 'radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)',
            borderRadius: '50%'
          };
        }
      });
    }

    return styles;
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId || '');
    setShowCopied(true);
    setTimeout(() => setShowCopied(false), 2000);
  };

  const getCustomTheme = () => {
    const themes = {
      default: { light: '#f0d9b5', dark: '#b58863' },
      ocean: { light: '#c2d7e3', dark: '#4a7b9d' },
      forest: { light: '#c8d6c7', dark: '#5b8c5a' },
      royal: { light: '#e6d0e9', dark: '#8b4513' }
    };
    return themes[currentTheme as keyof typeof themes] || themes.default;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <ArrowLeft size={20} />
            Back to Home
          </button>
          
          {gameMode === 'multiplayer' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-600">Room ID:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{roomId}</code>
              <button
                onClick={copyRoomId}
                className="text-gray-600 hover:text-gray-800"
                title="Copy Room ID"
              >
                <Copy size={20} />
              </button>
              {showCopied && (
                <span className="text-green-500 text-sm">Copied!</span>
              )}
              {spectators > 0 && (
                <div className="flex items-center gap-1 text-gray-600">
                  <Eye size={16} />
                  <span>{spectators}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4">
          <Chessboard
            position={game.fen()}
            boardOrientation={playerColor === 'spectator' ? 'white' : playerColor}
            onPieceDrop={(sourceSquare, targetSquare) => {
              if (!canMakeMove() || moveStyle !== 'drag') return false;
              return makeMove({ from: sourceSquare, to: targetSquare });
            }}
            onSquareClick={onSquareClick}
            customBoardStyle={{
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
            }}
            customDarkSquareStyle={{
              backgroundColor: getCustomTheme().dark,
            }}
            customLightSquareStyle={{
              backgroundColor: getCustomTheme().light,
            }}
            customSquareStyles={customSquareStyles()}
          />
        </div>

        <div className="mt-4 text-center">
          <p className="text-gray-600">
            {game.isGameOver()
              ? 'Game Over!'
              : gameMode === 'multiplayer' && !opponentJoined
              ? 'Waiting for opponent...'
              : playerColor === 'spectator'
              ? `Spectating - ${game.turn() === 'w' ? 'White' : 'Black'}'s turn`
              : `${isPlayerTurn ? 'Your' : "Opponent's"} turn`}
          </p>
          {spectators > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {spectators} spectator{spectators !== 1 ? 's' : ''} watching
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Game;