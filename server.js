const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('Utilisateur connecté:', socket.id);

  // Événements pour la gestion de la signalisation WebRTC
  socket.on('offer', (offer, targetSocketId) => {
    io.to(targetSocketId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, targetSocketId) => {
    io.to(targetSocketId).emit('answer', answer, socket.id);
  });

  socket.on('ice-candidate', (candidate, targetSocketId) => {
    io.to(targetSocketId).emit('ice-candidate', candidate, socket.id);
  });

  // Gestionnaire de déconnexion
  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté:', socket.id);
    io.emit('userDisconnected', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});