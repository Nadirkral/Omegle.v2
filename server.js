const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = {};

io.on('connection', (socket) => {
  socket.on('join', ({ room, location, profile }) => {
    socket.room = room;
    socket.location = location;
    socket.profile = profile;
    socket.join(room);

    if (!rooms[room]) rooms[room] = [];

    const match = rooms[room].find(user => {
      const dx = user.location.lat - location.lat;
      const dy = user.location.lon - location.lon;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return distance < 1.0;
    });

    if (match) {
      socket.peer = match.socket;
      match.socket.peer = socket;

      socket.emit('matched', match.socket.profile);
      match.socket.emit('matched', socket.profile);

      rooms[room] = rooms[room].filter(u => u.socket !== match.socket);
    } else {
      rooms[room].push({ socket, location, profile });
      socket.emit('info', 'Yaxın istifadəçi axtarılır...');
    }
  });

  socket.on('signal', (data) => {
    if (socket.peer) socket.peer.emit('signal', data);
  });

  socket.on('next', () => {
    if (socket.peer) {
      socket.peer.emit('info', 'Qarşı tərəf keçid etdi.');
      socket.peer.peer = null;
      socket.peer = null;
    }
    socket.emit('refresh');
  });

  socket.on('disconnect', () => {
    if (socket.peer) socket.peer.emit('info', 'Qarşı tərəf bağlantıdan çıxdı.');
    if (rooms[socket.room]) {
      rooms[socket.room] = rooms[socket.room].filter(u => u.socket !== socket);
    }
  });
});

server.listen(3000, () => console.log('Server: http://localhost:3000'));