require('dotenv').config();
const Minio = require('minio');
const { Markup } = require('telegraf');
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
let needToSave = {};

const io = require('socket.io')(httpServer, {
  cors: {
    origin: "*",
  },
});

io.on('connection', socket => {
  let prom;
  console.log('Подключение установлено ' + socket.id)

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
      console.log(connectedPeople[socket.nickname].id.length)
      if (connectedPeople[socket.nickname].id.length===1) { 
        if (connectedPeople[socket.nickname].save) save(connectedPeople[socket.nickname].chat, socket.nickname)
        if (connectedPeople[socket.nickname].timer!==null) clearTimeout(connectedPeople[socket.nickname].timer)
        delete(connectedPeople[socket.nickname])
      }
      else connectedPeople[socket.nickname].id.slice(connectedPeople[socket.nickname].id.indexOf(socket.id),1);
    }
  })


  socket.on('chatStart', async data => {
    console.log(`Пользователь подключен`);
    console.log(data);
    if (socket.nickname!=='spamigor') socket.nickname = data;    
    socket.join('mess-'+data);
    console.log(Object.keys(connectedPeople))
    if (!connectedPeople.hasOwnProperty(data)) {
      if (needToSave.hasOwnProperty(data)) {
        connectedPeople[data] = {...needToSave[data], id: socket.nickname===data?[socket.id]:[]};
        delete(needToSave[data]);
        socket.emit('updChat', JSON.stringify(connectedPeople[data].chat));
      }
      else {
        connectedPeople[data]={chat:[], timer: null, save: false, id: socket.nickname===data?[socket.id]:[]};
        let prom = new Promise((res, rej)=>s3.getJson(data, res, rej))
          .then((result)=>{
            console.log(85);
            console.log(typeof(result));
            connectedPeople[data].chat=result;
            socket.emit('updChat', JSON.stringify(connectedPeople[data].chat));
          });
      }
    }
    else {
      connectedPeople[data].id.push(socket.id);
      socket.emit('updChat', JSON.stringify(connectedPeople[data].chat));
    }
    logger.info('Пользователь '+data+' подключен');
  })


  socket.on('newMess', data=>{
    console.log(socket.nickname)
    let bufS = JSON.parse(data);
    let author = socket.nickname;
    let buf = {...bufS, login: author}
    let login = bufS.login;
    if (connectedPeople.hasOwnProperty(login)){
      if (connectedPeople[login].timer!==null) {
        clearTimeout(connectedPeople[login].timer);
        connectedPeople[login].timer=null
      }
      connectedPeople[login].chat.push(buf);
      connectedPeople[login].save = true;
      console.log(data);    
      io.to('mess-'+login).emit('newMess', JSON.stringify(buf));
      connectedPeople[login].timer =setTimeout(save, 5000, connectedPeople[login].chat, login);
      let tgText = 'l ';
      buf.text.map((item)=> {tgText+=(item+'\n')})
      if ((tgBot!==undefined)&&(socket.nickname===login)) 
        {
          if (buf.text[0].slice(0, 4)==='img:') {
            tgBot.telegram.sendPhoto(Number(process.env.ADMINTG), buf.text[0].slice(5))
              .then((res)=>
                tgBot.telegram.sendMessage(Number(process.env.ADMINTG), login, Markup.inlineKeyboard([
                    Markup.button.callback(`Ответить`, `replyTo:${login}`)
                  ], {columns: 1} )))
              .catch((e)=>
                tgBot.telegram.sendMessage(Number(process.env.ADMINTG), login+': '+tgText, Markup.inlineKeyboard([
                  Markup.button.callback(`Ответить`, `replyTo:${login}`)
                ], {columns: 1} )))
          }
          else if (buf.text[0].slice(0, 4)==='doc:') {
            tgBot.telegram.sendDocument(Number(process.env.ADMINTG), buf.text[0].slice(5))
              .then((res)=>
                tgBot.telegram.sendMessage(Number(process.env.ADMINTG), login, Markup.inlineKeyboard([
                    Markup.button.callback(`Ответить`, `replyTo:${login}`)
                  ], {columns: 1} )))
              .catch((e)=>
                tgBot.telegram.sendMessage(Number(process.env.ADMINTG), login+': '+tgText, Markup.inlineKeyboard([
                  Markup.button.callback(`Ответить`, `replyTo:${login}`)
                ], {columns: 1} )))
          }
          else 
            tgBot.telegram.sendMessage(Number(process.env.ADMINTG), login+': '+tgText, Markup.inlineKeyboard([
                Markup.button.callback(`Ответить`, `replyTo:${login}`)
              ], {columns: 1} )); 

        }     
    }
    else if (needToSave.hasOwnProperty(login)) {
      if (needToSave[login].timer!==null) {
        clearTimeout(needToSave[login].timer);
        needToSave[login].timer=null
      }
      needToSave[login].chat.push(buf);
      console.log(data);    
      io.to('mess-'+login).emit('newMess', JSON.stringify(buf));
      needToSave[login].timer =setTimeout(save, 5000, needToSave[login].chat, login);
      let tgText = 'l ';
      buf.text.map((item)=> {tgText+=(item+'\n')})
      if ((tgBot!==undefined)&&(socket.nickname===login)) tgBot.telegram.sendMessage(Number(process.env.ADMINTG), login+': '+tgText, Markup.inlineKeyboard([
        Markup.button.callback(`Ответить`, `replyTo:${login}`)
      ], {columns: 1} )); 
    }
    else {
      let prom = new Promise((res, rej)=>s3.getJson(login, res, rej))
        .then((result)=>{
          console.log(131);
          needToSave[login] = {chat: [], timer: null, save: true};
          needToSave[login].chat=result;
          needToSave[login].chat.push(buf);
          needToSave[login].timer = setTimeout(save, 20000, needToSave[login].chat, login);
        });
    }
  })
})

function privateMessage(name, mess, trig) {
  logger.debug('new mess')
  if (!trig)
  {const arr = mess.trim().split('\n');
  const buf = {login: 'spamigor', time: Number(new Date()), text: arr};
  io.to('mess-'+name).emit('newMess', JSON.stringify(buf));
  if (connectedPeople.hasOwnProperty(name)) {
    connectedPeople[name].chat.push(buf);
    connectedPeople[name].timer =setTimeout(save, 5000, connectedPeople[name].chat, name);
    connectedPeople[name].save = true;
  }
  else {
    if (needToSave.hasOwnProperty(name)) {
      clearTimeout(needToSave[name].timer)
      needToSave[name].chat.push(buf);
      needToSave[name].timer = setTimeout(save, 20000, connectedPeople[name].chat, name);
      needToSave[name].save = true;
    }
    else {
      let prom = new Promise((res, rej)=>s3.getJson(name, res, rej))
        .then((result)=>{
          console.log(131);
          needToSave[name] = {chat: [], timer: null, save: true};
          needToSave[name].chat=result;
          needToSave[name].chat.push(buf);
          needToSave[name].timer = setTimeout(save, 20000, needToSave[name].chat, name);
        });
    }
  }}
}

module.exports.message = privateMessage;

module.exports.IOStart = function(port, bot) {
  tgBot = bot;
  httpServer.listen(port || 8813, () => {
    console.log('Перейдите на http://localhost:8813')
  });
  return privateMessage
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

