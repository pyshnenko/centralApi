require('dotenv').config();
const Minio = require('minio');
const content = require('fs').readFileSync(__dirname + '/index.html', 'utf8');
process.title='IOServer';
const MinioClass = require('./src/minio');
const log4js = require("log4js");
log4js.configure({
    appenders: { 
        bot: { type: "file", filename: "log/appio.log" }, 
        console: { type: 'console' }
    },
    categories: { default: { appenders: ['console', "bot"], level: "all" }},
});
const logger = log4js.getLogger("bot2");

const s3 = new MinioClass(process.env.MINIO_LOCATION, process.env.MINIO_KEY, process.env.MINIO_SKEY, true, 'chat');

const httpServer = require('http').createServer((req, res) => {
  res.setHeader('Content-Type', 'text/html')
  res.setHeader('Content-Length', Buffer.byteLength(content))
  res.end(content)
})

let tgBot = undefined;

let connectedPeople = {};

const io = require('socket.io')(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on('connection', socket => {
  let prom;
  if (s3.status) prom = new Promise((res, rej)=>{
    let dat = s3.getJson('spamigor');
    console.log(dat);
    res(dat)
  });
  console.log('Подключение установлено')

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
  socket.on('hiSum', data => {
    console.log('hiSum', data);
    socket.join('sum'+String(data));
  });
  socket.on('bye', data => {
    console.log('bye', data);
    socket.leave('sum'+String(data));
  });
  socket.on('editSum', data => {
    console.log(data)
    if (data!==null) {
      let buf = JSON.parse(data);
      //console.log(buf);
      io.to('sum'+String(buf.id)).emit('editSum', data);
    }
  });
  socket.on('disconnect', data => {
    console.log(`Пользователь ${socket.id} отключен`);
    if (connectedPeople.hasOwnProperty(socket.nickname)) {
      if (connectedPeople.hasOwnProperty(socket.nickname).timer!==null) clearTimeout(connectedPeople.hasOwnProperty(socket.nickname).timer)
      delete(socket.nickname)
    }
  })
  socket.on('chatStart', async data => {
    console.log(`Пользователь подключен`);
    console.log(data)
    socket.nickname = data;
    if (!connectedPeople.hasOwnProperty(data)) connectedPeople[data]={chat:[], timer: null};
    logger.info('Пользователь '+data+' подключен');
    let prom = new Promise((res, rej)=>s3.getJson(data, res, rej))
      .then((result)=>{
        console.log(85);
        console.log(typeof(result));
        connectedPeople[data].chat=result;
        socket.emit('updChat', JSON.stringify(result));
      });
  })
  socket.on('newMess', data=>{
    let buf = JSON.parse(data);
    if (connectedPeople[buf.login].timer!==null) {
      clearTimeout(connectedPeople[buf.login].timer);
      connectedPeople[buf.login].timer=null
    }
    connectedPeople[buf.login].chat.push(buf);
    console.log(data);
    connectedPeople.timer =setTimeout(save, 5000, connectedPeople[buf.login].chat, buf.login);
    let tgText = 'l ';
    buf.text.map((item)=> {tgText+=(item+'\n')})
    if (tgBot!==undefined) tgBot.telegram.sendMessage(Number(process.env.ADMINTG), buf.login+': '+tgText);
  })
})


module.exports.IOStart = function(port, bot) {
  tgBot = bot;
  httpServer.listen(port || 8813, () => {
    console.log('Перейдите на http://localhost:8813')
  })
}

function save(data, name) {
  console.log('set');
  let s3Client = new Minio.Client({
    endPoint: process.env.MINIO_LOCATION,
    useSSL: true,
    accessKey: process.env.MINIO_KEY,
    secretKey: process.env.MINIO_SKEY
  })
  console.log('upload Json')
  const fileMetaData = {
    'Content-Type': `application/json`,
  };
  s3Client.putObject('chat', name +'/chat.json', JSON.stringify(data), fileMetaData);
}

