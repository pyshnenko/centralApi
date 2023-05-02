require('dotenv').config();
const Calendar = require('telegraf-calendar-telegram');
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);
const calendar = new Calendar(bot);
const fs = require("fs");
const Markup = require("telegraf/markup.js");
const cron = require('node-cron');
const MongoClient = require("mongodb").MongoClient;
const url = "spamigor.site:27017";
const username = encodeURIComponent(process.env.LOGIN);
const password = encodeURIComponent(process.env.PASS);
const authMechanism = "DEFAULT";
const uri =`mongodb://${username}:${password}@${url}/?authMechanism=${authMechanism}`;
const mongoClient = new MongoClient(uri);
const axiosToken = process.env.AXIOS_TOKEN;
const db = mongoClient.db("planerBot");
const collection = db.collection("users");
const collectionTime = db.collection("timers");
const WebSocketClient = require('websocket').client;
const socketPort = '8080/';
let client = new WebSocketClient();

let socket;
let socketConnect = false;

let remindBuf = {
	id: [],
	time: [],
	ret: [],
	name: [],
	wday: []
}

calendar.setDateListener((context, date) => {
	let sDate = new Date(date);
	remindBuf.id.push(context.from.id);
	remindBuf.time[remindBuf.id.indexOf(context.from.id)]=sDate;
	remindBuf.ret[remindBuf.id.indexOf(context.from.id)]='!';
	context.reply('Введи время в формате HH:MM');
});

bot.start(async (ctx) => {
	ctx.reply('Привет. Попробуем начать работу');
	let locBuf = await findUserData(ctx.from.id);
	if ((locBuf)&&(locBuf.length>0)){
		ctx.reply(ctx.from.first_name + ', что бы ты хотел сделать?');
		if (locBuf[0].title==='manager')
			ctx.replyWithHTML('Меню обновлено', getMainManagerMenu());
		else 
			ctx.replyWithHTML('Меню обновлено', getMainDeveloperMenu());			
	}
	else {
      ctx.replyWithHTML(
        'Судя по всему, ты здесь впервые\n'+
        'Зарегистрируешься?',
        Markup.inlineKeyboard([
        Markup.callbackButton('Да', 'yesReg'),
        Markup.callbackButton('Нет', 'noReg')
    ], {columns: 2}).extra())
	}
});

bot.on('text', async ctx => {
	var buf = ctx.message.text;
	buf=buf.trim();
	buf=buf.toLowerCase();
	console.log(buf);
	socketSend(`message: ${buf}`);
	let locBuf = await findUserData(ctx.from.id);
	if ((locBuf)&&(locBuf.length>0)&&(locBuf[0].hasOwnProperty('title'))) {
		console.log(locBuf[0]);
		if (buf==='-удалить аккаунт-') {
			ctx.replyWithHTML(
				'Уверен?',
				Markup.inlineKeyboard([
				Markup.callbackButton('Да', 'yesDel'),
				Markup.callbackButton('Нет', 'noReg')
			], {columns: 2}).extra())
		}
		else if (buf==='-меню напоминаний-') {			
			ctx.replyWithHTML('Меню напоминаний\n', Markup.keyboard([
				['~Список напоминаний'],
				['~Добавить напоминание'],
				['~Назад']
			]).resize().extra())
		}
		else if (buf==='~назад') {			
			locBuf[0].title==='developer' ? ctx.replyWithHTML('Главное меню\n', getMainDeveloperMenu()) : ctx.replyWithHTML('Главное меню\n', getMainManagerMenu());
		}
		else if (buf==='~список напоминаний') {			
			if ((locBuf[0].hasOwnProperty('reminds'))&&(locBuf[0].reminds.length>0)) {
				let data = [];
				for (let i=0; i<locBuf[0].reminds.length; i++) data.push(Markup.callbackButton(locBuf[0].reminds[i].name, `reminds-${i}`));
				ctx.replyWithHTML('Напоминания:\n', Markup.inlineKeyboard(data, {columns: 1}).extra());
			}
			else ctx.reply('Записей не обнаружено');
		}
		else if (buf==='~добавить напоминание')
			ctx.reply("Выбери первый день, когда необходимо напоминание", calendar.getCalendar());
		else if ((remindBuf.id.includes(ctx.from.id))&&(remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)]==='!')){
			console.log('input time');
			let hour;
			let minute;
			let save = true;
			let date = new Date(remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]);
			if (buf.indexOf(':')>0) {
				hour = Number(buf.substr(0,buf.indexOf(':')));
				minute = Number(buf.substr(buf.indexOf(':')+1));
				if (hour) date.setHours(hour);
				else if (minute) date.setMinutes(minute);
				else {ctx.reply('Проверь ввод и повтори'); save= false;}
				console.log(`${hour}:${minute}`);
				socketSend(`${hour}:${minute}`);
			} else if (buf.indexOf('.')>0) {
				hour = Number(buf.substr(0,buf.indexOf('.')));
				minute = Number(buf.substr(buf.indexOf('.')+1));
				if (hour) date.setHours(hour);
				else if (minute) date.setMinutes(minute);
				else {ctx.reply('Проверь ввод и повтори'); save= false;}
				console.log(`${hour}:${minute}`);
				socketSend(`${hour}:${minute}`);
			} else if (buf.indexOf(',')>0) {
				hour = Number(buf.substr(0,buf.indexOf('.')));
				minute = Number(buf.substr(buf.indexOf('.')+1));
				if (hour) date.setHours(hour);
				else if (minute) date.setMinutes(minute);
				else {ctx.reply('Проверь ввод и повтори');  save= false;}
				console.log(`${hour}:${minute}`);
				socketSend(`${hour}:${minute}`);
			}
			else { ctx.reply('проверь ввод и повтори'); save= false;}
			if (save) {
				console.log('enter data');
				remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]=date;
				ctx.replyWithHTML(`Напоминание будет установлено на ${hour}:${minute}\n\nВыбери частоту повторения:`, Markup.inlineKeyboard([
					Markup.callbackButton('Однократное', 'oneTime'),
					Markup.callbackButton('Каждый час', 'everyHour'),
					Markup.callbackButton('Каждый день', 'everyDay'),
					Markup.callbackButton('Дни недели', 'weekDay'),
					Markup.callbackButton('Каждый месяц', 'everyMonth'),
					Markup.callbackButton('Ежегодно', 'everyYear')
					], {columns: 1}).extra());
			}
		}
	}
});

bot.on('callback_query', async (ctx) => {
    ctx.answerCbQuery();
	ctx.deleteMessage();
	let buf = ctx.callbackQuery.data;
	if (buf==='yesReg') {
		try {
			await mongoClient.connect();
			let user = {name: ctx.from.first_name, id: ctx.from.id};
			await collection.insertOne(user);
			console.log('user add');
			socketSend(`user add`);
			ctx.replyWithHTML(
				'Ты зарегистрирован. Выбери свой статус\n',
				Markup.inlineKeyboard([
				Markup.callbackButton('Менеджер', 'manager'),
				Markup.callbackButton('Разработчик', 'developer')
			], {columns: 2}).extra())
		}catch(err) {
			console.log(err);
			socketSend(`${err}`);
			ctx.reply('Доступ к базе отсутствует. Попробуй позже');
		} finally {
			await mongoClient.close();
		}
	}
	else if ((buf==='developer')||(buf==='manager')){
		try {
			await mongoClient.connect();
			let user = {name: ctx.from.first_name, id: ctx.from.id};
			await collection.findOneAndUpdate({id: ctx.from.id}, { $set: {title: buf}});
			console.log('title add');
			socketSend(`title add`);
			buf==='developer' ? ctx.replyWithHTML('Ты зарегистрирован как разработчик\n', getMainDeveloperMenu()) : ctx.replyWithHTML('Ты зарегистрирован как менеджер\n', getMainManagerMenu());
		} catch(err) {
			console.log(err);
			socketSend(`${err}`);
			ctx.replyWithHTML(
				'Доступ к базе отсутствует. попробуй позже\n',
				Markup.inlineKeyboard([
				Markup.callbackButton('Менеджер', 'manager'),
				Markup.callbackButton('Разработчик', 'developer')
			], {columns: 2}).extra())
		} finally {
			await mongoClient.close();
		}
	}
	else if (buf==='yesDel') {
		await mongoClient.connect();
		await collection.deleteOne({id: ctx.from.id});
		await mongoClient.close();
		let locBuf = await findUserData(ctx.from.id);
		if ((locBuf)&&(locBuf.length==0)) ctx.replyWithHTML('удалено', getZeroMenu());
		else ctx.reply('ошибка. повтори позднее');
	}
	else if (buf==='oneTime') {
		let date = new Date(remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]);
		remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)] = `?* ${date.getMinutes().toString()} ${date.getHours().toString()} ${date.getDate().toString()} ${(date.getMonth()+1).toString()} *`;
		
	}
	else if (buf==='everyHour') {
		let date = new Date(remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]);
		remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)] = `* ${date.getMinutes().toString()} * * * *`;			
	}
	else if (buf==='everyDay') {
		let date = new Date(remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]);
		remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)] = `* ${date.getMinutes().toString()} ${date.getHours().toString()} * * *`;			
	}
	else if (buf==='weekDay') {
		let date = new Date(remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]);
		remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)] = `* ${date.getMinutes().toString()} ${date.getHours().toString()} ${date.getDate().toString()} * `;		
		remindBuf.wday[remindBuf.id.indexOf(ctx.from.id)] = [true,true,true,true,true,true,true];
		ctx.replyWithHTML(`Выбери дни недели для напоминания`, Markup.inlineKeyboard([
				Markup.callbackButton('Вс', '%d0'),
				Markup.callbackButton('Пн', '%d1'),
				Markup.callbackButton('Вт', '%d2'),
				Markup.callbackButton('Ср', '%d3'),
				Markup.callbackButton('Чт', '%d4'),
				Markup.callbackButton('Пт', '%d5'),
				Markup.callbackButton('Сб', '%d6'),
				Markup.callbackButton('Готово', '%d7')
			], {columns: 1}).extra());
	}
	else if (buf==='everyMonth') {
		let date = new Date(remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]);
		remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)] = `* ${date.getMinutes().toString()} ${date.getHours().toString()} ${date.getDate().toString()} * *`;		
	}
	else if (buf==='everyYear') {
		let date = new Date(remindBuf.time[remindBuf.id.indexOf(ctx.from.id)]);
		remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)] = `* ${date.getMinutes().toString()} ${date.getHours().toString()} ${date.getDate().toString()} ${(date.getMonth()+1).toString()} *`;
	} 
	else if ((buf[0]==='%')&&(buf[1]==='d')) {
		console.log(buf);
		socketSend(`${buf}`);
		let num = Number(buf[2]);
		if (num === 7) ctx.reply('Введи название');
		else {
			if (remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)][remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)].length-1]!==' ') {
				remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)]+=',';				
			}
			remindBuf.wday[remindBuf.id.indexOf(ctx.from.id)][num]=false;
			remindBuf.ret[remindBuf.id.indexOf(ctx.from.id)]+=num.toString();
			let aaa = [];
			let aab = [
				['Вс', '%d0'],
				['Пн', '%d1'],
				['Вт', '%d2'],
				['Ср', '%d3'],
				['Чт', '%d4'],
				['Пт', '%d5'],
				['Сб', '%d6'],
				['Готово', '%d7']
			]
			for (let i=0; i<7; i++) if (remindBuf.wday[remindBuf.id.indexOf(ctx.from.id)][i]) aaa.push(Markup.callbackButton(aab[i][0], aab[i][1]));
			aaa.push(Markup.callbackButton('Готово', '%d7'));
			ctx.replyWithHTML(`Выбери дни недели для напоминания`, Markup.inlineKeyboard(aaa, {columns: 1}).extra());
		}
	}		
	console.log(remindBuf);
	socketSend(`${remindBuf}`);
});

bot.help((ctx) => ctx.reply('Я представляю из себя бота-планировщика задач'));

bot.catch((err) => {
	console.log('bot catch');
	console.log(err);
	socketSend('bot cath');
});

function getMainManagerMenu() {
    return Markup.keyboard([
        ['-Добавить сотрудника-', '-Добавить задачу-'],
        ['-Выбрать сотрудника-', '-Список задач-'],
		['-Меню напоминаний-', '-Удалить аккаунт-']
    ]).resize().extra()
}

function getMainDeveloperMenu() {
    return Markup.keyboard([
        ['-Статус задачи-', '-Проставить время-'],
        ['-Сведения о руководителе-'],
		['-Список задач-'],
		['-Меню напоминаний-', '-Удалить аккаунт-']
    ]).resize().extra()
}

function getZeroMenu() {
    return Markup.keyboard([]).resize().extra()
}

async function findUserData (id) {
	let results;
	try {
		await mongoClient.connect();
		results = await collection.find({id: id}).toArray();
	}
	catch {
		return null;
	}
	finally {
		await mongoClient.close();
		return results;
	}
}

bot.launch();
console.log('bot start');

client.on('connectFailed', function(error) {
	socketConnect = false;
    console.log('Connect Error: ' + error.toString());
	setTimeout(() => {
		console.log('reconnect');
		client.connect('wss://spamigor.site:' + socketPort, 'echo-protocol');
	}, 60*1000)
});

client.on('connect', function(connection) {
	socketConnect = true;
    console.log('WebSocket Client Connected');
    connection.on('error', function(error) {
		socketConnect = false;
        console.log("Connection Error: " + error.toString());
    });
    connection.on('close', function() {
		socketConnect = false;
        console.log('echo-protocol Connection Closed');
		setTimeout(() => {
			console.log('reconnect');
			client.connect('wss://spamigor.site:' + socketPort, 'echo-protocol');
		}, 60*1000)
    });
    connection.on('message', function(message) {
        if (message.type === 'utf8') {
			console.log("Received: '" + message.utf8Data + "'");
        }
    });
	
	socket = connection;
    
    function sendNumber() {
        if (connection.connected) {
            var number = new Date();
            connection.sendUTF('no: ' + (Number(number)).toString());
            setTimeout(sendNumber, 60*1000);
        }
    }
    sendNumber();
});

client.connect('wss://spamigor.site:' + socketPort, 'echo-protocol');

async function socketSend(buf){
	if (socketConnect) socket.sendUTF(`TM: no: ${buf}`);
}