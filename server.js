const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

const players = {};

// Fun local quotes for the live announcer box (no AI required!)
const announcerLines = [
  "Rider rated 1 star for aggressive drifting.",
  "Surge pricing is in effect! Speed up!",
  "Driver missed the turn, recalculating route...",
  "Passenger is throwing up in the back seat!",
  "Looking for a parking spot? Good luck.",
  "Driver is playing lo-fi beats to chill/drive to.",
  "Watch out for pedestrians, your rating is dropping!",
  "Arriving in 3 minutes... make it 30 seconds."
];

// Periodically broadcast a random local announcer line to the host
setInterval(() => {
  if (Object.keys(players).length > 0) {
    const randomQuote = announcerLines[Math.floor(Math.random() * announcerLines.length)];
    io.emit('announcer-speak', { text: randomQuote });
  }
}, 7000);

io.on('connection', (socket) => {
  console.log(`Device connected: ${socket.id}`);

  socket.on('join-game', (data) => {
    players[socket.id] = {
      playerId: socket.id,
      carClass: data.carClass || 'Small',
      posX: 0,
      posZ: 0,
      rotationAngle: 0,
      accelerating: false
    };

    // Notify host that a player joined
    io.emit('player-joined', { playerId: socket.id });
    // Sync current player states
    socket.emit('assigned-player', { playerId: socket.id });
    io.emit('sync-players', players);
  });

  socket.on('steering-input', (data) => {
    if (players[data.playerId]) {
      players[data.playerId].posX = data.posX;
      players[data.playerId].posZ = data.posZ;
      players[data.playerId].rotationAngle = data.rotationAngle;
      players[data.playerId].accelerating = data.accelerating;

      // Broadcast movement to all other clients
      socket.broadcast.emit('update-car-state', players[data.playerId]);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Device disconnected: ${socket.id}`);
    if (players[socket.id]) {
      delete players[socket.id];
      io.emit('player-left', { playerId: socket.id });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});