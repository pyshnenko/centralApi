const content = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
process.title='IOServer';

const httpServer = require('http').createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Content-Length', Buffer.byteLength(content))
  res.end(content)
})

const io = require('socket.io')(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on('connection', socket => {
  console.log('Подключение установлено')

  let counter = 0
  setInterval(() => {
    // отправляем данные клиенту
    socket.emit('hello', ++counter);
  }, 1000)

  // получаем данные от клиента
  socket.on('hi', data => {
    console.log('hi', data);
    socket.join(String(data));
  });
  socket.on('bye', data => {
    console.log('bye', data);
    socket.leave(String(data));
  });
  socket.on('edit', data => {
    console.log(data)
    if (data!==null) {
      let buf = JSON.parse(data);
      console.log(buf);
      io.to(String(buf.id)).emit('edit', data);
    }
  });
})

httpServer.listen(8813, () => {
  console.log('Перейдите на http://localhost:8813')
})