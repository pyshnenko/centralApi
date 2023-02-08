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
    session.start=true;
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
    let trig = true;
    ctx.answerCbQuery();
    ctx.deleteMessage();
    let session = {...ctx.session};
    if (!session.start) ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)');
    else {
        console.log(ctx.callbackQuery.data.slice(0,8));
        console.log(ctx.callbackQuery.data.slice(8));
        switch (ctx.callbackQuery.data.slice(0,8)) {
            case 'connect' : {
                ctx.reply(`Пришли мне свой логин`);
                session.status='login';
                break;
            }

            case 'dellist:' : {
                let ind = Number(ctx.callbackQuery.data.slice(ctx.callbackQuery.data[8]===S?9:8));
                ctx.replyWithHTML(
                    'Уверены?',
                    Markup.inlineKeyboard([
                        Markup.button.callback(`${okLbl}Да`, `delListYS${ind}`),
                        Markup.button.callback(`${nokLbl}Нет`, `myList::S${ind}`)
                    ], {columns: 2})
                );
                break;
            }

            case 'delListY' : {
                let ind = Number(ctx.callbackQuery.data.slice(ctx.callbackQuery.data[8]===S?9:8));
                let id = ctx.callbackQuery.data[8]===S?Number(session.slists[ind].id):Number(session.lists[ind].id);
                let res = await sendPost({id: id}, ctx.callbackQuery.data[8]===S?'delSumList':'delList', `Bearer ${session.token}`);
                if (res.status===200) session.lists.splice(ind, 1);
            }

            case 'lists' : {
                session.lists=[];
                let res = await sendPost({name: ctx.session.user.name}, 'lists', `Bearer ${ctx.session.token}`);
                session.lists=res.data.lists;
                let listArr = [];
                res.data.lists.map((item, index)=>listArr.push(Markup.button.callback(item.name, `myList::${index}`)));
                let res2 = await sendPost({name: ctx.session.user.name}, 'sumLists', `Bearer ${ctx.session.token}`);
                session.slists=res2.data.sumLists;
                console.log(res2.data.sumLists[0].lists)
                res2.data.sumLists.map((item, index)=>{
                    let nameL = 'Совмещенный ';
                    item.lists.name.map((item)=>nameL+=`- ${item}`);
                    listArr.push(Markup.button.callback(nameL, `myListS:${index}`))
                });
                listArr.push(Markup.button.callback('Создать новый список', `newList`));
                listArr.push(Markup.button.callback('Создать совмещенный список', `newSList`));
                ctx.replyWithHTML(
                    'Выбери список',
                    Markup.inlineKeyboard(listArr, {columns: 1})
                );
                break;
            }

            case 'newList' : {
                ctx.reply('Введи название');
                session.status='newRow';
                break;
            }

            case 'addrow::' : {
                let ind = Number(ctx.callbackQuery.data.slice(8));
                session.status = 'addRowName';
                session.addRow = {stat: 'add', rowInd: ind, name: '', total: 0, ind: '', del: 0, selected: false };
                ctx.reply('Введи название');
                break;
            }

            case 'addind::' : {
                let ind = ctx.callbackQuery.data.slice(8);
                switch (ind) {
                    case 'kg' : { session.addRow.ind=' кг'; break; }
                    case 'g' : { session.addRow.ind = ' кг'; session.addRow.total/=1000; break; }
                    case 'l' : { session.addRow.ind=' л'; break; }
                    case 'ml' : { session.addRow.ind = ' л'; session.addRow.total/=1000; break; }
                }
                console.log(session.addRow);
                let str = 'Добавляем?\n\n';
                str+=(nokText(session.addRow.name, session.addRow.total, session.addRow.ind, true));
                ctx.replyWithHTML(str,
                    Markup.inlineKeyboard([
                        Markup.button.callback(`${okLbl}`, `yesAdR::${session.addRow.rowInd}`),
                        Markup.button.callback(`${nokLbl}`, `noAddRow`)
                    ], {columns: 2})    
                );
                break;
            }

            case 'yesAdR::' : {
                let obj = {...ctx.session.addRow};
                let ind = obj.rowInd;
                delete(obj.stat);
                delete(obj.rowInd);
                let list = session.lists[ind];
                let inp = -1;
                for (let i=0; i<list.data.length; i++) 
                    if (list.data[i].name.toLowerCase()===obj.name.toLowerCase()) {
                        inp=i;
                        break;
                    }
                if (inp>=0) list.data[inp].total+=obj.total; 
                else list.data.push( obj );
                let res = sendPost({list: list}, 'updList', `Bearer ${session.token}`);
                if (res.status===200) session.lists[ind] = list;
                trig = false;
            }

            case `noAddRow` : {
                delete(session.addRow);
                session.status='work';
                trig = false;
            }

            case 'myList::' : {
                let ind = Number(ctx.callbackQuery.data.slice(8));
                let str = '';
                session.lists[ind].data.map((item)=>str+=(item.selected?okText(item.name, item.total, item.ind):nokText(item.name, item.total, item.ind)));
                str === '' ?
                ctx.replyWithHTML('Пусто. Добавим что-нибудь?',
                    Markup.inlineKeyboard([
                        Markup.button.callback('Добавить пункт', `addrow::${ind}`),
                        Markup.button.callback('Удалить список', `dellist:${ind}`),
                        Markup.button.callback('Назад', `lists`)
                    ], {columns: 1})    
                ) :
                ctx.replyWithHTML(str,
                    Markup.inlineKeyboard([
                        Markup.button.callback('Отметить', `select::${ind}`),
                        Markup.button.callback('Добавить пункт', `addrow::${ind}`),
                        Markup.button.callback('Удалить пункт', `delrow::${ind}`),
                        Markup.button.callback('Удалить список', `dellist:${ind}`),
                        Markup.button.callback('Поделиться списком', `shlist::${ind}`),
                        Markup.button.callback('Назад', `lists`)
                    ], {columns: 1})    
                );
                break;
            }

            case 'myListS:' : {
                let ind = Number(ctx.callbackQuery.data.slice(8));
                let str = '';
                session.slists[ind].data.map((item)=>str+=(item.selected?okText(item.name, item.total, item.ind):nokText(item.name, item.total, item.ind)));
                str === '' ?
                ctx.replyWithHTML('Пусто. Добавим что-нибудь?',
                    Markup.inlineKeyboard([
                        Markup.button.callback('Удалить список', `dellist:S${ind}`),
                        Markup.button.callback('Назад', `lists`)
                    ], {columns: 1})    
                ) :
                ctx.replyWithHTML(str,
                    Markup.inlineKeyboard([
                        Markup.button.callback('Отметить', `select::S${ind}`),
                        Markup.button.callback('Удалить список', `dellist:S${ind}`),
                        Markup.button.callback('Поделиться списком', `shlist::S${ind}`),
                        Markup.button.callback('Назад', `lists`)
                    ], {columns: 1})    
                );
                break;
            }

            case 'shlist::' : {
                let ind = Number(ctx.callbackQuery.data.slice(ctx.callbackQuery.data[8]==='S' ? 9 : 8));
                let id = Number(session.lists[ind].id);
                if (ctx.callbackQuery.data[8]!=='S') {
                    let res = await sendPost({id: id}, 'setHash', `Bearer ${session.token}`);
                    if (res.status===200) {
                        let addr = new URL('https://spamigor.site/build/');
                        addr.searchParams.append('list', res.data.hash);
                        addr.searchParams.append('done', 'stList');
                        ctx.reply(addr.href);
                    }
                    else ctx.reply('Сервер временно недоступен');
                }
                else {
                    let addr = new URL('https://spamigor.site/build/');
                    addr.searchParams.append('list', session.slists[ind].hash);
                    addr.searchParams.append('done', 'sumtList');
                    ctx.reply(addr.href);
                }
                startKeyboard(ctx);
                break;
            }

            case 'rowsel::' : {
                let buf = ctx.callbackQuery.data.slice(ctx.callbackQuery.data[8]==='S'?9:8);
                let ind = Number(buf.slice(0, buf.indexOf(':')));
                let pos = Number(buf.slice(buf.indexOf(':')+2));
                let list = ctx.callbackQuery.data[8]==='S'?session.slists[ind]:session.lists[ind];
                if (session.addRow?.stat==='del') list.data.splice(pos, 1);
                else list.data[pos].selected=!list.data[pos].selected;
                let res;
                if (ctx.callbackQuery.data[8]==='S') res = await sendPost(list, 'saveSumList', `Bearer ${session.token}`);
                else res = await sendPost({list}, 'updList', `Bearer ${session.token}`);
                if (res.status===200)
                    ctx.callbackQuery.data[8]==='S'?session.slists[0]=list:session.lists[0]=list;
                trig=false;
            }

            case 'delrow::' : {
                if (trig) {
                    let buf = ctx.callbackQuery.data.slice(8);
                    session.addRow={ stat: 'del' };
                }
            }

            case 'select::' : {
                let buf = ctx.callbackQuery.data.slice(ctx.callbackQuery.data[8]==='S'?9:8);
                if (buf.indexOf(':')!==(-1)) buf=buf.slice(0, buf.indexOf(':'))
                let ind = Number(buf);
                let listArr = [];
                if (ctx.callbackQuery.data[8]==='S') {
                    session.slists[ind].data.map((item, index)=>listArr.push(
                        Markup.button.callback(
                            (item.selected?okText(item.name, item.total, item.ind, true, true):nokText(item.name, item.total, item.ind, true)), 
                            `rowsel::S${ind}::${index}`)));
                }
                else {
                    session.lists[ind].data.map((item, index)=>listArr.push(
                        Markup.button.callback(
                            (item.selected?okText(item.name, item.total, item.ind, true, true):nokText(item.name, item.total, item.ind, true)), 
                            `rowsel::${ind}::${index}`)));
                }
                listArr.push(Markup.button.callback('OK', `myList${ctx.callbackQuery.data[8]==='S'?'S':':'}:${buf}`))
                ctx.replyWithHTML(`выбери что отметить`,
                    Markup.inlineKeyboard(listArr, {columns: 1})
                )

                break;
            }
        }
        ctx.session = session
    }
});

bot.on('text', async (ctx) => {
    console.log(ctx.message.text);
    let session = {...ctx.session};
    if (session.hasOwnProperty('status')) {
        if (session.status==='login') {
            let res = await sendPost({login: ctx.message.text.trim(), loginTG: ctx.from.username, id: Number(ctx.from.id)}, 'connectTG', '');
            if (res.status===200) {
                ctx.replyWithHTML('Данные переданы. Пожалуйста, перейдите на <a href="https://spamigor.site/build/">основной сайт</a>, зайдите в профиль и подтвердите Ваш аккаунт (возле графы "телеграм" нажмите на Х чтобы подтвердить)');
                session.status='wait';
            }
            else ('Что-то с сервером. Попробуйте позднее');
            console.log(res.data);
        }

        else if (ctx.session.status==='addRowName') {
            session.addRow.name=ctx.message.text;
            session.status='addRowTotal';
            ctx.reply('Введи количество');
        }

        else if (ctx.session.status==='addRowTotal'){
            let buf = Number(ctx.message.text.trim());
            if (buf||buf===0) {
                session.addRow.total = buf;
                console.log(buf)
                session.status = 'addRowInd';
                ctx.session=session;
                ctx.replyWithHTML ('Выбери величину', Markup.inlineKeyboard([
                    Markup.button.callback('кг', 'addind::kg'),
                    Markup.button.callback('г', 'addind::g'),
                    Markup.button.callback('л', 'addind::l'),
                    Markup.button.callback('мл', 'addind::ml'),
                    Markup.button.callback('другое', 'addind::other'),
                ], {columns: 4}))
            }
        }

        else if (ctx.session.status==='newRow') {   
            let acc = session.user?.settings?.sharedMode ? session.user?.settings?.sharedMode : 'me';
            let accU = await accUsList(session, acc);     
            let res = await sendPost({
                name: ctx.message.text.trim(), 
                author: session.user.name || session.user.login, 
                data: [], 
                access: session.user.settings.sharedMode, 
                accessUsers: accU
            }, 'setList', `Bearer ${session.token}`);
            if (res.status===200) session.lists=res.data.list;
            let listArr = [];
            session.lists.map((item, index)=>listArr.push(Markup.button.callback(item.name, `myList::${index}`)));
            listArr.push(Markup.button.callback('Создать новый список', `newList`));
            ctx.replyWithHTML(
                'Выбери список',
                Markup.inlineKeyboard(listArr, {columns: 1})
            );

            console.log(res.data)
        }

        else {
            ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)')
            console.log(ctx.message.text)
        }
    }

    else {
        ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)')
        console.log(ctx.message.text)
    }
    ctx.session=session;
});

bot.launch();

const startKeyboard = (ctx) => {
    ctx.replyWithHTML(
        `Привет ${ctx.session.user.login}\n\nЧем займемся?`,
        Markup.inlineKeyboard([
            Markup.button.callback('Посмотреть мои списки', `lists`),
            Markup.button.callback('Найти список по его ID', `seechById`)
        ], {columns: 1}))
}

function okText(text, total, index, karet, line) {
    let rTotal = (index===' кг'||index==='л')&&total<1 ? total*1000 : total;
    let rIndex = total<1&&index===' кг' ? ' г' : total<1&&index===' л' ? ' мл' : index;
    return line?`${okLbl}${text} - ${rTotal+rIndex}${karet?'':'\n'}`:`${okLbl}<s>${text} - ${rTotal+rIndex}</s>${karet?'':'\n'}`
}

function nokText(text, total, index, karet) {
    let rTotal = (index===' кг'||index==='л')&&total<1 ? total*1000 : total;
    let rIndex = total<1&&index===' кг' ? ' г' : total<1&&index===' л' ? ' мл' : index;
    return `${nokLbl}${text} - ${rTotal+rIndex}${karet?'':'\n'}`
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

const accUsList = (session, shMode) => {
    let buf = [];
    if (!shMode||(shMode==='me')) buf.push(session.user.login);
    else if (shMode==='friends') {
        buf = session.user.friends;
        buf.push(session.user.login);
    }
    return buf; 
}
