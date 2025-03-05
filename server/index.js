import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { Chess } from 'chess.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Room structure to store game state and players
const rooms = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', ({ roomId, color }) => {
    console.log('Creating room:', roomId, 'Color:', color);
    
    const room = rooms.get(roomId);
    if (room) {
      // Room exists, try to join as the opposite color
      if (!room.players[color]) {
        room.players[color] = socket.id;
        socket.join(roomId);
        
        // Notify all players in the room about the new player
        io.to(roomId).emit('playerJoined', {
          color,
          players: room.players,
          isReady: room.players.white && room.players.black
        });

        // Sync game state with the new player
        socket.emit('syncGameState', { gameState: room.game.fen() });
      } else {
        socket.emit('roomFull');
      }
    } else {
      // Create new room
      const newRoom = {
        game: new Chess(),
        players: {
          white: color === 'white' ? socket.id : null,
          black: color === 'black' ? socket.id : null
        },
        spectators: new Set(),
        moves: []
      };
      
      rooms.set(roomId, newRoom);
      socket.join(roomId);
      
      io.to(roomId).emit('playerJoined', {
        color,
        players: newRoom.players,
        isReady: false
      });
    }
  });

  socket.on('joinRoom', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (!room) {
      socket.emit('roomNotFound');
      return;
    }

    let assignedColor = null;
    if (!room.players.white) {
      assignedColor = 'white';
      room.players.white = socket.id;
    } else if (!room.players.black) {
      assignedColor = 'black';
      room.players.black = socket.id;
    }

    if (assignedColor) {
      socket.join(roomId);
      io.to(roomId).emit('playerJoined', {
        color: assignedColor,
        players: room.players,
        isReady: room.players.white && room.players.black
      });
      socket.emit('syncGameState', { gameState: room.game.fen() });
    } else {
      socket.emit('roomFull');
    }
  });

  socket.on('joinAsSpectator', ({ roomId }) => {
    const room = rooms.get(roomId);
    if (room) {
      room.spectators.add(socket.id);
      socket.join(roomId);
      socket.emit('syncGameState', { gameState: room.game.fen() });
      io.to(roomId).emit('spectatorJoined', { count: room.spectators.size });
    }
  });

  socket.on('move', ({ roomId, move, gameState }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    try {
      // Validate the move
      const result = room.game.move(move);
      if (result) {
        room.moves.push(move);
        
        // Update game state
        room.game = new Chess(gameState);
        
        // Broadcast the move to all other players in the room
        socket.to(roomId).emit('moveMade', {
          move: result,
          gameState: room.game.fen()
        });
      }
    } catch (error) {
      console.error('Invalid move:', error);
      socket.emit('invalidMove');
    }
  });

  socket.on('themeChange', ({ roomId, theme }) => {
    socket.to(roomId).emit('themeChanged', { theme });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Clean up rooms where the disconnected user was a player
    rooms.forEach((room, roomId) => {
      if (room.players.white === socket.id || room.players.black === socket.id) {
        // Notify remaining players
        io.to(roomId).emit('playerLeft');
        
        // Update player list
        if (room.players.white === socket.id) {
          room.players.white = null;
        } else if (room.players.black === socket.id) {
          room.players.black = null;
        }

        // Remove room if empty
        if (!room.players.white && !room.players.black && room.spectators.size === 0) {
          rooms.delete(roomId);
        }
      } else if (room.spectators.has(socket.id)) {
        room.spectators.delete(socket.id);
        io.to(roomId).emit('spectatorLeft', { count: room.spectators.size });
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});