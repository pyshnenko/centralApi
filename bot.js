require('dotenv').config();
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOTTOKEN);
const {session} = require('telegraf');
const { Extra, Markup } = require('telegraf');
const textHandler = require("./src/bot/message");
const {startKeyboard, isEmpty, accUsList, okText, nokText} = require("./src/bot/other");
const sendPost = require('./src/bot/api');
const callback_query = require('./src/bot/callback_query');
const {parse, original} = require("./src/bot/listsReorginizer")

const okLbl='✅ ';
const nokLbl='❌ ';

process.title='TOXA23CM'

bot.use(session())

bot.start( async (ctx) =>  {
    let res = await sendPost({tgID: Number(ctx.from.id)}, 'loginTG', '');
    console.log(res.status);
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
    else ctx.reply('Сервер временно недоступен. Попробуйте позже');
    ctx.session=session;
});

bot.on('callback_query', async (ctx) => {
    console.log('callback_query')
    await callback_query(ctx);
});

bot.on('text', async (ctx) => {
    console.log('text')
    await textHandler(ctx);
});

bot.on('web_app_data', async (ctx) => {
    let session = ctx.session;
    console.log('web_app_data');
    let data = JSON.parse(ctx.message.web_app_data.data)
    console.log(data);
    session.status = 'work';
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
    ctx.session = session;
})

bot.launch();