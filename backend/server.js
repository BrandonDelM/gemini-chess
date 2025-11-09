import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function startServer() {
  const app = express();

  // HTTP server for Express app to pass through
  const httpServer = createServer(app);

  // Socket.io init attached to HTTP server
  const io = new Server(httpServer, {
    cors: {
      origin: "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  // Create Vite dev server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    root: path.join(__dirname, '../frontend'),
  });

  // Use Vite’s middleware
  app.use(vite.middlewares);

  // Example API route
  app.get('/api/message', (req, res) => {
    res.json({ text: 'Hello from Express!' });
  });

  // SOCKET.IO GAME LOGIC
  const games = {}; // game servers
  io.on('connection', (socket) => {
    console.log('User: ${socket.id}') // development debugging users

    // Matchmaking
    socket.on('joinRoom', (roomId) => {
      socket.join(roomId);
      console.log('User ${socket.id} joined room $roomId'); // dev debugging lobbying rooms
      io.to(roomId).emit('playerJoined', {playerId: socket.id, roomSize: io.sockets.adapter.rooms.get(roomId).size });
    });

    // Chess moves
    socket.on('move', (data => {
      const { roomId, moveSan, sourcePlayerId} = data; // room to send to, move notation, player identification

      // Add serverside validation for moves
      
      socket.to(roomId).emit('moveMade', { moveSan: moveSan, movedBy: sourcePlayerId});
    }));
    socket.on('disconnect', () => {
      console.log('User disconnected: ${socket.id}'); // dev debugging user disconnect

      // Add serverside comms for disconnection to user

    })
  })

  // All other routes handled by Vite’s index.html
  app.get('*', async (req, res, next) => {
    try {
      const url = req.originalUrl;
      let template = await vite.transformIndexHtml(url, 
        await fs.promises.readFile(path.join(__dirname, '../frontend/index.html'), 'utf-8')
      );
      res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
    } catch (e) {
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(3000, () => console.log('http://localhost:3000'));
}

startServer();
