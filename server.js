require('dotenv').config();

const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Track active players and their colors
const activePlayers = {};
const carColors = [0xff1744, 0x00e676, 0x2979ff, 0xffea00, 0xd500f9, 0x00bcd4];

io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  socket.on('join-game', async () => {
    // Assign a unique color based on connection order
    const colorIndex = Object.keys(activePlayers).length % carColors.length;
    activePlayers[socket.id] = {
      id: socket.id,
      color: carColors[colorIndex],
      targetX: 0,
      zPos: 0,
      accelerating: false
    };

    socket.emit('assigned-player', { playerId: socket.id, color: carColors[colorIndex] });
    
    // Send full current player roster to everyone so new players see existing ones, and vice versa
    io.emit('sync-players', activePlayers);
    io.emit('player-joined', { playerId: socket.id });

    // Instant fallback hype line
    io.emit('announcer-speak', { text: "Green flag is out! Multiple racers hitting the grid!" });

    // Non-blocking background Gemini announcer
    const prompt = `Give a hilarious, 1-sentence racing announcer hype line for a new player joining the multiplayer grid. Keep it under 12 words.`;
    
    ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: prompt,
      config: { thinkingConfig: { thinkingLevel: "LOW" } }
    }).then(response => {
      if (response && response.text) {
        io.emit('announcer-speak', { text: response.text });
      }
    }).catch(err => {
      console.warn("Background AI skipped:", err.message);
    });
  });

  // Update specific player state and broadcast to everyone
  socket.on('steering-input', (data) => {
    if (activePlayers[socket.id]) {
      activePlayers[socket.id].targetX = data.targetX;
      activePlayers[socket.id].accelerating = data.accelerating;
      activePlayers[socket.id].zPos = data.zPos;
    }
    io.broadcast.emit('update-car-state', data);
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
    delete activePlayers[socket.id];
    io.emit('player-left', { playerId: socket.id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});