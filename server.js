const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('move_circle', (data) => {
    // data: { x, y, ts, id }
    socket.broadcast.emit('update_circle', data);
  });
  // Pen Path: share drawn traces
  socket.on('path_draw', (data) => {
    // data: { path: [[x1, y1], [x2, y2], ...] }
    socket.broadcast.emit('path_draw', data);
  });
});

const PORT = process.env.PORT || 10000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const bodyParser = require('body-parser');
app.use(bodyParser.json());

app.post('/ai/analyze', (req, res) => {
  // green team positions: req.body.green (array of {id, left, top})
  // Get ball position:
  const ballEl = req.body.ball; // {left, top}
  // Example: Mirror green team, but set circle21 near the ball
  const red = [];
  for (let i = 0; i < 10; i++) {
    const g = req.body.green[i];
    if (g) {
      red.push({
        id: 13 + i,
        left: 600 - g.left,
        top: g.top
      });
    }
  }
  // Set red #9 (circle21) near the ball
  red[8] = { // 8th index (id 21)
    id: 21,
    left: ballEl.left - 9,
    top: ballEl.top
  };
  res.json({ red });
});

app.use(express.static(__dirname));
