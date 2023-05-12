const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let leftPlayer = null;
let rightPlayer = null;

const boardSize = {
  width: 800,
  height: 600,
};

let ball = {
  direction: {
    x: 0,
    y: 0,
  },
  speed: 0,
  position: {
    x: boardSize.width / 2,
    y: boardSize.height / 2,
  },
  radius: 10
};

const paddleGap = 5;
const paddleHeight = 100;
const paddleWidth = 10;

let leftPaddle = {
  x: paddleGap,
  y: (boardSize.height - paddleHeight) / 2,
  width: paddleWidth,
  height: paddleHeight,
};

let rightPaddle = {
  x: boardSize.width - paddleWidth - paddleGap,
  y: (boardSize.height - paddleHeight) / 2,
  width: paddleWidth,
  height: paddleHeight,
};

let score = {
  left: 0,
  right: 0,
};

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
      if (rightPlayer) {
        io.emit('startGame', { leftPaddle, rightPaddle, score });
        createBall();
      }
    } else if (side == 'right') {
      if (rightPlayer) {
        return 1;
      }
      rightPlayer = socket;
      if (leftPlayer) {
        io.emit('startGame', { leftPaddle, rightPaddle, score });
        createBall();
      }
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
      leftPaddle.y = data.y;
    } else if (data.player === 'right') {
      rightPaddle.y = data.y;
    }
    io.emit('updatePaddle', {
      leftPaddle,
      rightPaddle
    });
  });
});

function createBall() {
  ball.speed = .2;
  if (Math.round(Math.random()) == 1) {
    ball.direction.x = 1;
  } else {
    ball.direction.x = -1;
  }
  if (Math.round(Math.random()) == 1) {
    ball.direction.y = 1;
  } else {
    ball.direction.y = -1;
  }
  ball.position.x = boardSize.width / 2;
  ball.position.y = boardSize.height / 2;
}

function updateBall() {
  setTimeout(() => {
    ball.position.x += (ball.speed * ball.direction.x);
    ball.position.y += (ball.speed * ball.direction.y);
    checkCollision();
    io.emit('updateBall', ball);
    updateBall();
  });
}

updateBall();

function checkCollision() {
  if (ball.position.y <= 0 + ball.radius) {
    ball.direction.y *= -1;
  }
  if (ball.position.y >= boardSize.height - ball.radius) {
    ball.direction.y *= -1;
  }
  if (ball.position.x <= 0) {
    score.right += 1;
    io.emit('updateScore', score);
    createBall();
  }
  if (ball.position.x >= boardSize.width) {
    score.left += 1;
    io.emit('updateScore', score);
    createBall();
  }
  if (ball.position.x <= (leftPaddle.x + leftPaddle.width + ball.radius)) {
    if (ball.position.y > leftPaddle.y && ball.position.y < leftPaddle.y + leftPaddle.height) {
      ball.position.x = leftPaddle.x + leftPaddle.width + ball.radius;
      ball.direction.x *= -1;
      ball.speed += .075;
    }
  }
  if (ball.position.x >= (rightPaddle.x - ball.radius)) {
    if (ball.position.y > rightPaddle.y && ball.position.y < rightPaddle.y + rightPaddle.height) {
      ball.position.x = rightPaddle.x - ball.radius;
      ball.direction.x *= -1;
      ball.speed += .075;
    }
  }
}

const port = process.env.PORT || 3000;
http.listen(port, () => {
  console.log(`listening on *:${port}`);
});
