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

const winScore = 10;

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

const leftPaddleStart = {
  x: paddleGap,
  y: (boardSize.height - paddleHeight) / 2,
  width: paddleWidth,
  height: paddleHeight,
};
let leftPaddle = leftPaddleStart;

const rightPaddleStart = {
  x: boardSize.width - paddleWidth - paddleGap,
  y: (boardSize.height - paddleHeight) / 2,
  width: paddleWidth,
  height: paddleHeight,
};
let rightPaddle = rightPaddleStart;

let score = {
  left: 0,
  right: 0,
};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('disconnect', () => {
    console.log('user disconnected');
    if (leftPlayer?.id == socket.id) {
      leftPlayer = null;
      rightPlayer?.emit('playerDisconnect');
      reset();
    } else if (rightPlayer?.id == socket.id) {
      rightPlayer = null;
      leftPlayer?.emit('playerDisconnect');
      reset();
    }
  });

  function enterGame(side) {
    if (side == 'left') {
      if (leftPlayer) {
        return 'sideTaken';
      }
      leftPlayer = socket;
    } else if (side == 'right') {
      if (rightPlayer) {
        return 'sideTaken';
      }
      rightPlayer = socket;
    } else {
      return 'invalidSide';
    }
    if (leftPlayer && rightPlayer) {
      io.emit('startGame', { leftPaddle, rightPaddle, score });
      createBall();
      updateBall();
    }
    return 'entered';
  }

  socket.on('enterGame', (side) => {
    result = enterGame(side);
    socket.emit('enterGame', { side, result });
  });

  socket.on('updatePaddle', (data) => {
    if (socket.id == leftPlayer?.id) {
      leftPaddle.y = data.y;
    } else if (socket.id == rightPlayer?.id) {
      rightPaddle.y = data.y;
    } else {
      return;
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

let timerId;

function reset() {
  clearTimeout(timerId);
  leftPaddle = leftPaddleStart;
  rightPaddle = rightPaddleStart;
  score = { left: 0, right: 0 };
}

function updateBall() {
  timerId = setTimeout(() => {
    ball.position.x += (ball.speed * ball.direction.x);
    ball.position.y += (ball.speed * ball.direction.y);
    checkCollision();
    if (leftPlayer && rightPlayer) {
      io.emit('updateBall', ball);
      updateBall();
    }
  });
}

function checkCollision() {
  if (ball.position.y <= 0 + ball.radius) {
    ball.direction.y *= -1;
  }
  if (ball.position.y >= boardSize.height - ball.radius) {
    ball.direction.y *= -1;
  }
  if (ball.position.x <= 0) {
    score.right += 1;
    if (score.right >= winScore) {
      leftPlayer.emit('defeat');
      rightPlayer.emit('victory');
      reset();
      leftPlayer = null;
      rightPlayer = null;
    } else {
      io.emit('updateScore', score);
    }
    createBall();
  }
  if (ball.position.x >= boardSize.width) {
    score.left += 1;
    if (score.left >= winScore) {
      leftPlayer.emit('victory');
      rightPlayer.emit('defeat');
      reset();
      leftPlayer = null;
      rightPlayer = null;
    } else {
      io.emit('updateScore', score);
    }
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
