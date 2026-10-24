require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static('public'));

// Initialize the Gemini client with your key
// Initialize the Gemini client using an environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
io.on('connection', (socket) => {
  console.log('Device connected:', socket.id);

  // When a phone clicks start racing:
  socket.on('join-game', async () => {
    socket.emit('assigned-player', { playerId: socket.id });
    io.emit('player-joined', { playerId: socket.id });

    // 1. Immediately send an instant fallback message so the screen updates with zero lag
    io.emit('announcer-speak', { text: "Green flag is out! Tires are screaming on the grid!" });

    console.log("Requesting background AI commentary...");
    const startTime = Date.now();

    try {
      const prompt = `Give a hilarious, 1-sentence racing announcer hype line for a new player joining the grid. Keep it under 12 words.`;
      
      // Call Gemini with a race condition timeout (e.g. 4 seconds max)
      const aiPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Gemini timeout")), 4000)
      );

      const response = await Promise.race([aiPromise, timeoutPromise]);

      if (response && response.text) {
        console.log(`Announcer ready in ${((Date.now() - startTime) / 1000).toFixed(2)}s:`, response.text);
        io.emit('announcer-speak', { text: response.text });
      }
    } catch (err) {
      console.warn("Gemini skipped/timed out, keeping instant hype line:", err.message);
    }
  });

  socket.on('steering-input', (data) => {
    io.emit('update-car-steering', data);
  });

  socket.on('disconnect', () => {
    console.log('Device disconnected:', socket.id);
    io.emit('player-left', { playerId: socket.id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});