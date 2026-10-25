const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

app.get('/host', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'host.html'));
});

let players = {};
let passengers = [];
let nextPassengerId = 1;

const PICKUP_WINDOW_MS = 23000;    // how long a waiting passenger stays on the road
const CANCEL_COOLDOWN_MS = 20000;

// Put a carried passenger back on the road with the time they had left at pickup
function releasePassenger(p, x, z, byId) {
  p.pickedUpBy = null;
  p.x = x; p.z = z;
  p.spawnTime = Date.now() - (PICKUP_WINDOW_MS - (p.remainingMs ?? PICKUP_WINDOW_MS));
  p.blockedId = byId;                       // the driver who dropped them can't instantly re-grab
  p.blockedUntil = Date.now() + 5000;
}

const LANDMARKS = require('./public/landmarks.js');
const { resolveCollision } = require('./public/carstats.js');   // shared physics   // shared with the controller
const GRID = [-270, -180, -90, 0, 90, 180, 270];
const landmarkKeys = new Set(LANDMARKS.map(l => l.x + ',' + l.z));
// block centres that don't have a landmark on them = safe pickup spots
const freeBlocks = [];
GRID.forEach(x => GRID.forEach(z => { if (!landmarkKeys.has(x + ',' + z)) freeBlocks.push({ x, z }); }));

// Spawn passengers ensuring they never spawn inside buildings
setInterval(() => {
  if (passengers.length < 6) {
    const sizes = [1, 2, 3, 4];
    const size = sizes[Math.floor(Math.random() * sizes.length)];
    
    const spot = freeBlocks[Math.floor(Math.random() * freeBlocks.length)];
    const x = spot.x, z = spot.z;
    const dest = LANDMARKS[Math.floor(Math.random() * LANDMARKS.length)];
    const destX = dest.x, destZ = dest.z, randomDestName = dest.name;
    let baseTip = size * 25;

    passengers.push({
      id: nextPassengerId++,
      x: x, z: z,
      destX: destX, destZ: destZ,
      destName: randomDestName,
      size: size,
      tipValue: baseTip,
      spawnTime: Date.now(),
      pickedUpBy: null
    });
    
    io.emit('sync-passengers', passengers);
  }
}, 8000);

setInterval(() => {
  const now = Date.now();
  const prevLength = passengers.length;
  passengers = passengers.filter(p => p.pickedUpBy || (now - p.spawnTime < PICKUP_WINDOW_MS));
  
  if (passengers.length !== prevLength) {
    io.emit('sync-passengers', passengers);
  }
}, 1000);

function broadcastLeaderboard() {
  const leaderboardData = Object.values(players).map(p => ({
    name: p.name,
    tips: p.tips,
    carClass: p.carClass
  })).sort((a, b) => b.tips - a.tips);

  io.emit('update-leaderboard', leaderboardData);
}

// ---- car vs car collisions: checked 20x/sec from the positions + speeds each driver reports ----
const hitCooldown = {};   // pair -> time when they can collide again
setInterval(() => {
  const ids = Object.keys(players), now = Date.now();
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    const key = [ids[i], ids[j]].sort().join('|');
    if ((hitCooldown[key] || 0) > now) continue;
    const hit = resolveCollision(players[ids[i]], players[ids[j]]);
    if (!hit) continue;
    hitCooldown[key] = now + 1200;
    io.to(ids[i]).emit('car-hit', hit.a);
    io.to(ids[j]).emit('car-hit', hit.b);
  }
}, 50);

io.on('connection', (socket) => {
  socket.on('join-game', (data) => {
    players[socket.id] = {
      playerId: socket.id,
      name: data.name || 'Driver',
      carClass: data.carClass || 'Small',
      tips: 100,
      posX: 45, posZ: 45, rotationAngle: 0, accelerating: false
    };

    socket.emit('assigned-player', { playerId: socket.id });
    io.emit('sync-players', players);
    socket.emit('sync-passengers', passengers);
    broadcastLeaderboard();
  });

  socket.on('steering-input', (data) => {
    if (players[socket.id]) {
      players[socket.id].posX = data.posX;
      players[socket.id].posZ = data.posZ;
      players[socket.id].rotationAngle = data.rotationAngle;
      players[socket.id].accelerating = data.accelerating;
      players[socket.id].speed = data.speed || 0;
      socket.broadcast.emit('update-car-state', data);
    }
  });

  socket.on('claim-passenger', (data) => {
    const { passengerId, carClass } = data;
    const passenger = passengers.find(p => p.id === passengerId);

    const alreadyCarrying = passengers.some(q => q.pickedUpBy === socket.id);
    const blocked = passenger && passenger.blockedId === socket.id && Date.now() < passenger.blockedUntil;
    if (passenger && !passenger.pickedUpBy && !alreadyCarrying && !blocked) {
      let maxCap = (carClass === 'Small') ? 2 : (carClass === 'Large' ? 4 : 1);
      if (passenger.size <= maxCap) {
        passenger.pickedUpBy = socket.id;
        passenger.remainingMs = Math.max(0, PICKUP_WINDOW_MS - (Date.now() - passenger.spawnTime));
        io.emit('sync-passengers', passengers);
        socket.emit('passenger-picked-up', passenger);
      }
    }
  });

  socket.on('complete-trip', (data) => {
    const { passengerId, carClass } = data;
    const pIndex = passengers.findIndex(p => p.id === passengerId);

    if (pIndex !== -1 && passengers[pIndex].pickedUpBy === socket.id) {
      const passenger = passengers[pIndex];
      passengers.splice(pIndex, 1);
      io.emit('sync-passengers', passengers);

      let finalTip = carClass === 'Bougie' ? 150 : passenger.tipValue;
      if (players[socket.id]) {
        players[socket.id].tips += finalTip;
        broadcastLeaderboard();
      }

      socket.emit('trip-completed', { tip: finalTip });
    }
  });

  // Cancel: no money, passenger goes back where the car is, 20s cooldown, only while carrying
  socket.on('cancel-ride', () => {
    const me = players[socket.id];
    if (!me) return;
    const now = Date.now();
    if (now - (me.lastCancel || 0) < CANCEL_COOLDOWN_MS) return;
    const p = passengers.find(q => q.pickedUpBy === socket.id);
    if (!p) return;
    me.lastCancel = now;
    releasePassenger(p, me.posX, me.posZ, socket.id);
    io.emit('sync-passengers', passengers);
    socket.emit('ride-cancelled');
  });

  socket.on('disconnect', () => {
    const gone = players[socket.id];
    passengers.forEach(p => { if (p.pickedUpBy === socket.id) releasePassenger(p, gone ? gone.posX : p.x, gone ? gone.posZ : p.z, null); });
    io.emit('sync-passengers', passengers);
    delete players[socket.id];
    io.emit('player-left', { playerId: socket.id });
    broadcastLeaderboard();
  });
});

server.listen(3000, () => {
  console.log('UberRacer server running on http://localhost:3000');
});