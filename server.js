const express = require('express');
const { Server } = require('socket.io');
const http = require('http');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('🟢 Подключён:', socket.id);

  socket.on('join-room', (roomName) => {
    const room = rooms.get(roomName) || { users: [] };
    room.users.push(socket.id);
    rooms.set(roomName, room);

    if (room.users.length === 2) {
      const otherUser = room.users.find(id => id !== socket.id);
      socket.emit('user-connected', otherUser);
    }

    socket.join(roomName);
  });

  socket.on('offer', (data) => socket.to(data.room).emit('offer', data));
  socket.on('answer', (data) => socket.to(data.room).emit('answer', data));
  socket.on('ice-candidate', (data) => socket.to(data.room).emit('ice-candidate', data));

  socket.on('disconnect', () => {
    for (const [roomName, room] of rooms) {
      const index = room.users.indexOf(socket.id);
      if (index !== -1) {
        room.users.splice(index, 1);
        socket.to(roomName).emit('user-disconnected');
        if (room.users.length === 0) rooms.delete(roomName);
        break;
      }
    }
    console.log('🔴 Отключён:', socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
