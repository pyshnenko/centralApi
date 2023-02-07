require('dotenv').config();
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOTTOKEN);
const {session} = require('telegraf');
const { Extra, Markup } = require('telegraf');
const axios = require('axios');

const okLbl='✅ ';
const nokLbl='❌ ';

process.title='TOXA23CM'

bot.use(session())

bot.start( async (ctx) =>  {
    await ctx.reply(`Привет ${ctx.from.first_name}`);
    let res = await sendPost({tgID: Number(ctx.from.id)}, 'loginTG', '');
    console.log(res.status);
    let session = {...ctx.session};
    if (res.status===401) {
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
    ctx.answerCbQuery();
    ctx.deleteMessage();
    let session = {...ctx.session};
    console.log(ctx.callbackQuery.data.slice(0,8));
    switch (ctx.callbackQuery.data.slice(0,8)) {
        case 'connect' : {
            ctx.reply(`Пришли мне свой логин`);
            session.status='login';
            break;
        }
        case 'lists' : {
            session.lists=[];
            let res = await sendPost({name: ctx.session.user.name}, 'lists', `Bearer ${ctx.session.token}`);
            session.lists=res.data.lists;
            let listArr = [];
            res.data.lists.map((item, index)=>listArr.push(Markup.button.callback(item.name, `myList::${index}`)))
            ctx.replyWithHTML(
                'Выбери список',
                Markup.inlineKeyboard(listArr, {columns: 1})
            );
            break;
        }
        case 'myList::' : {
            let ind = Number(ctx.callbackQuery.data.slice(8));
            let listArr = [];
            let str = '';
            session.lists[ind].data.map((item)=>str+=(item.selected?okText(item.name, item.total, item.ind):nokText(item.name, item.total, item.ind)));
            ctx.replyWithHTML(str);
        }
    }
    ctx.session = session
});

bot.on('text', async (ctx) => {
    console.log(ctx.message.text);
    let session = {...ctx.session};
    if (session.status==='login') {
        let res = await sendPost({login: ctx.message.text.trim(), loginTG: ctx.from.username, id: Number(ctx.from.id)}, 'connectTG', '');
        if (res.status===200) {
            ctx.replyWithHTML('Данные переданы. Пожалуйста, перейдите на <a href="https://spamigor.site/build/">основной сайт</a>, зайдите в профиль и подтвердите Ваш аккаунт (возле графы "телеграм" нажмите на Х чтобы подтвердить)');
            session.status='wait';
        }
        else ('Что-то с сервером. Попробуйте позднее');
        console.log(res.data);
    }
    else console.log(ctx.message.text)
});

bot.launch();

const startKeyboard = (ctx) => {
    ctx.replyWithHTML(
        `Привет ${ctx.session.user.login}\n\nЧем займемся?`,
        Markup.inlineKeyboard([
            Markup.button.callback('Посмотреть мои списки', `lists`),
            Markup.button.callback('Найти список по его ID', `seechById`),
            Markup.button.callback('Создать новый список', `newList`)
        ], {columns: 1}))
}

function okText(text, total, index) {
    let rTotal = (index===' кг'||index==='л')&&total<1 ? total*1000 : total;
    let rIndex = total<1&&index===' кг' ? ' г' : total<1&&index===' л' ? ' мл' : index;
    return `${okLbl}<s>${text}</s> - ${rTotal+rIndex}\n`
}

function nokText(text, total, index) {
    let rTotal = (index===' кг'||index==='л')&&total<1 ? total*1000 : total;
    let rIndex = total<1&&index===' кг' ? ' г' : total<1&&index===' л' ? ' мл' : index;
    return `${nokLbl}${text} - ${rTotal+rIndex}\n`
}

async function sendPost(obj, make, token) {
    let baseURL = 'https://spamigor.site/api';
    try {
        const jsonHeader = {
            "Content-type": "application/json",
            "make": make,
            "authorization": '' || token
        };
    
        let send = axios.create({
            baseURL,
            timeout: 10000,
            headers: jsonHeader
        });
        const res = await send.post(baseURL, obj);
        console.log(res.status); 
        //console.log(res.data); 
        return res;
    }
    catch(e) {
        //console.log(e)
        return (e.response)
    }
}