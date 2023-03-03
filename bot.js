require('dotenv').config();
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOTTOKEN);
const {session} = require('telegraf');
const { Extra, Markup } = require('telegraf');
const textHandler = require("./src/bot/message");
const {startKeyboard, isEmpty, accUsList, okText, nokText} = require("./src/bot/other");
const sendPost = require('./src/bot/api');
const callback_query = require('./src/bot/callback_query');

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
        console.log(res.data.data);
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
    await callback_query(ctx);
});

bot.on('text', async (ctx) => {
    await textHandler(ctx);
});

bot.launch();