const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const crypto = require('crypto');

app.use(express.static('public'));

let leftPlayer = null;
let rightPlayer = null;

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (leftPlayer == socket) {
      leftPlayer = null;
    } else if (rightPlayer == socket) {
      rightPlayer = null;
    }
  });

  function enterGame(side) {
    if (side == 'left') {
      if (leftPlayer) {
        return 1;
      }
      leftPlayer = socket;
    } else if (side == 'right') {
      if (rightPlayer) {
        return 1;
      }
      rightPlayer = socket;
    } else {
      return 2;
    }
    return 0;
  }

  socket.on('enterGame', (side) => {
    code = enterGame(side);
    socket.emit('enterGame', { side, code });
  });

  socket.on('updatePaddle', (data) => {
    if (data.player === 'left') {
      leftPaddleY = data.y;
    } else if (data.player === 'right') {
      rightPaddleY = data.y;
    }
    io.emit('updatePaddle', data);
  });

});

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
