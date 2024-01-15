const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const messagesDB = new sqlite3.Database('public/message.db', sqlite3.OPEN_READWRITE, (err) => {
  if(err) return console.error(err.message);
});

sql = 'CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY,message)';
messagesDB.run(sql);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static('public', { 'extensions': ['html', 'css', 'js'] }));

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
  });

  // DB EVENTS
  socket.on('load messages from db', () => {
    const sql = 'SELECT * FROM messages';
    messagesDB.all(sql, [], (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }if (rows){
        // Envoyez les données au client
      console.log('messages loading');
      socket.emit('display messages', rows.message);
      }
    });
  });

  socket.on('save in DB', (data) => {
    sql = 'INSERT INTO messages ( message) VALUES (?)';
    messagesDB.run(sql, [ data.message], (err, rows) => {
      if (err) {
        console.error(err.message);
        return;
      }
    });
  });

  // MESSAGE
  socket.on('message', (data) => {
    io.to(data.target).emit('message', data);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Serveur en écoute sur le port ${PORT}`);
});