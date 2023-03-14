require('dotenv').config();
const fs = require("fs");
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOTTOKEN);
const {session} = require('telegraf');
const { Extra, Markup } = require('telegraf');
const textHandler = require("./src/bot/message");
const {startKeyboard, isEmpty, accUsList, okText, nokText} = require("./src/bot/other");
const sendPost = require('./src/bot/api');
const callback_query = require('./src/bot/callback_query');
const {parse, original} = require("./src/bot/listsReorginizer");
const delMess = require("./src/bot/historyClear");

let options = {
    key: fs.readFileSync("/home/spamigor/next/api/js/centralapi/src/sert/privkey.crt"),
    cert: fs.readFileSync("/home/spamigor/next/api/js/centralapi/src/sert/fullchain.crt"),
	ca: fs.readFileSync("/home/spamigor/next/api/js/centralapi/src/sert/chain.crt")
};
const log4js = require("log4js");
log4js.configure({
    appenders: { 
        bot: { type: "file", filename: "log/bot.log" }, 
        console: { type: 'console' },
        mail: {
            type: '@log4js-node/smtp',
            recipients: 'pyshnenko94@yandex.ru',
            sendInterval: 20,
            transport: 'SMTP',
            SMTP: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                key: options.key,
                cert: options.sert,
                ca: options.ca,
                auth: {
                    user: process.env.MAILUSER,
                    pass: process.env.MAILPASS,
                },
            },
        },
    },
    categories: { default: { appenders: ['console', "bot"], level: "all" },
                mailer: { appenders: ['mail', 'console', 'bot'], level: 'all' }, },
  });
const logger = log4js.getLogger("bot2");
const mailLog = log4js.getLogger("mailer");

const okLbl='✅ ';
const nokLbl='❌ ';

process.title='TOXA23CM'

bot.use(session())

bot.start( async (ctx) =>  {
    let res = await sendPost({tgID: Number(ctx.from.id)}, 'loginTG', '');
    logger.trace(res.status);
    let session = {...ctx.session};
    session.start=true;
    if (res.status===401) {
        await ctx.reply(`Привет ${ctx.from.first_name}`);
        if (session.status==='login') {
            ctx.reply('Введите Ваш логин');
        }
        else if (session.status==='wait') {
            ctx.replyWithHTML('Данные переданы. Пожалуйста, перейдите на <a href="https://spamigor.site/build/">основной сайт</a>, зайдите в профиль и подтвердите Ваш аккаунт (возле графы "телеграм" нажмите на Х чтобы подтвердить)');
        }
        else {
            await ctx.replyWithHTML(
                'Не могу Вас опознать\n\nМы знакомы?',
                Markup.inlineKeyboard([
                    Markup.button.callback('У меня есть аккаунт', `connect`),
                    Markup.button.callback('Зарегистрироваться', `register`)
                ], {columns: 1}))
        }
    }
    else if (res.status===200) {
        session.token=res.data.token;
        session.user=res.data.data[0];
        session.status='work';
        ctx.session=session;
        startKeyboard(ctx);
    }
    else {
        ctx.reply('Сервер временно недоступен. Попробуйте позже');
        logger.error('Сервер БД недоступен. Запрос loginTG')
    }
    delMess(ctx, ctx.message.message_id+1, logger);
    ctx.session=session;
});

bot.on('callback_query', async (ctx) => {
    logger.trace('callback_query: ' + ctx.from.id + ": " + ctx.callbackQuery.data)
    await callback_query(ctx, logger, process);
    delMess(ctx, ctx.callbackQuery.message.message_id+1, logger);
});

bot.on('text', async (ctx) => {
    logger.trace('text: ' + ctx.from.id + ": " + ctx.message.text)
    await textHandler(ctx, logger);
    delMess(ctx, ctx.message.message_id+1, logger);
});

bot.on('web_app_data', async (ctx) => {
    let session = ctx.session;
    let data = JSON.parse(ctx.message.web_app_data.data)
    logger.trace('web_app_data: ' + ctx.from.id + ": " + ctx.message.web_app_data.data);
    if (session.status==='editWebT') {
        if(data.res) {
            console.log(data.data);
            session.trening.categories = data.data;
            let buf = session.trening;
            delete(buf.list);
            let res = await sendPost(buf, 'updateTreningList', `Bearer ${session.token}`);
            if (res.status === 200) {
                await ctx.reply('Готово', Markup.removeKeyboard(true));
                startKeyboard(ctx)
            }
            else {
                await ctx.reply('Неудача', Markup.removeKeyboard(true));
                startKeyboard(ctx);
            }
        }
        else ctx.reply('Кажется, вы используете WEB-версию telegram. Воспользуйтесь другими способами изменения данных')
    }
    else if (session.status==='editWeb:') {
        if ((data.seazon)&&(data.epizod)&&(data.time)) {
            session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].s = (data.seazon==='0'||Number(data.seazon) ? Number(data.seazon) : data.seazon);
            session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].e = (data.epizod==='0'||Number(data.epizod) ? Number(data.epizod) : data.epizod);
            session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].t = (data.time==='0'||Number(data.time) ? Number(data.time) : data.time);
            delete(session.tecnicalSub);
            let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
            if (res.status === 200) {
                await ctx.reply('Готово', Markup.removeKeyboard(true));
                startKeyboard(ctx)
            }
            else {
                await ctx.reply('Неудача', Markup.removeKeyboard(true));
                startKeyboard(ctx);
            }
        }
        else ctx.reply('Кажется, вы используете WEB-версию telegram. Воспользуйтесь другими способами изменения данных')
    }
    else {        
        ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)');
        logger.error(`uncnown error: user: ${ctx.from.id}, ${ctx.from.username}; status: ${session?.status}, message: ${ctx.message.text}`)
    }
    ctx.session = session;
    session.status = 'work';
    delMess(ctx, ctx.message.message_id+2, logger);
})

bot.launch(mailLog.info('bot start'));

bot.catch((err)=>console.log(err));

process.on('uncaughtException', (err, origin) => {
    mailer.fatal('Все, пиздец')
});

process.once('SIGINT', () => {
    bot.stop('SIGINT');
    logger.fatal('Остановлено SIGINT');
    process.exit(-1);
});
process.once('SIGTERM', () => {
    bot.stop('SIGTERM');
    logger.fatal('Остановлено SIGINT');
    process.exit(-1);
});