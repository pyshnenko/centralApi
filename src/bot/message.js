const sendPost = require('./api');
const {session} = require('telegraf');
const {startKeyboard, isEmpty, accUsList, okText, nokText} = require("./other");
const { Markup } = require('telegraf');
const okLbl='✅ ';
const nokLbl='❌ ';
const {parse, original} = require("./listsReorginizer")

async function textHandler(ctx) {
    let err = false;
    console.log(ctx.message.text);
    let session = {...ctx.session};
    if (session.hasOwnProperty('status')) {

        console.log(session.status)

        if (session.status==='login') {
            let res = await sendPost({login: ctx.message.text.trim(), loginTG: ctx.from.username, id: Number(ctx.from.id)}, 'connectTG', '');
            if (res.status===200) {
                ctx.replyWithHTML('Данные переданы. Пожалуйста, перейдите на <a href="https://spamigor.site/build/">основной сайт</a>, зайдите в профиль и подтвердите Ваш аккаунт (возле графы "телеграм" нажмите на Х чтобы подтвердить)');
                session.status='wait';
            }
            else ('Что-то с сервером. Попробуйте позднее');
            console.log(res.data);
        }

        else if (ctx.session.status==='categoryName') {
            session.status = 'work';
            session.serials.list.push({ array: [], name: ctx.message.text.trim() });
            let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
            if (res.status===200) {
                let arr = [];
                let data = parse(res.data);
                session.serials = data;
                data.list.map((item, index)=>arr.push(Markup.button.callback(`${item.name}`, `serList:${index}`)));
                arr.push(Markup.button.callback(`Создать категорию`, `crSerCat`),);
                arr.push(Markup.button.callback(`Назад`, `StartP`));
                ctx.replyWithHTML('Выбери категорию:', Markup.inlineKeyboard(arr, {columns: 1} ))
            }
            else startKeyboard(ctx, 'Что-то пошло не так');
        }

        else if (ctx.session.status==='reNmCat:') {
            session.status = 'work';
            session.serials.list[session.tecnicalSerial].name = ctx.message.text.trim();
            let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
            if (res.status === 200) {
                startKeyboard(ctx, 'Готово')
            }
            else {
                startKeyboard(ctx, 'Неудача')
            }
        }

        else if (ctx.session.status==='addSer::') {
            session.status = 'work';
            session.serials.list[session.tecnicalSerial].array.push({ name: ctx.message.text.trim(), s: 0, e: 0, t: '0:00' });
            let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
            if (res.status === 200) {
                startKeyboard(ctx, 'Готово')
            }
            else {
                startKeyboard(ctx, 'Неудача')
            }
        }

        else if (ctx.session.status==='edSeaz::') {
            let text = Number(ctx.message.text.trim());
            if ((!text)&&(text===0)) text = ctx.message.text.trim();
            session.status = 'work';
            session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].s = text;
            let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
            if (res.status === 200) {
                startKeyboard(ctx, 'Готово')
            }
            else {
                startKeyboard(ctx, 'Неудача')
            }
        }

        else if (ctx.session.status==='editEp::') {
            let text = Number(ctx.message.text.trim());
            if ((!text)&&(text===0)) text = ctx.message.text.trim();
            session.status = 'work';
            session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].e = text;
            let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
            if (res.status === 200) {
                startKeyboard(ctx, 'Готово')
            }
            else {
                startKeyboard(ctx, 'Неудача')
            }
        }

        else if (ctx.session.status==='edTime::') {
            session.status = 'work';
            session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].t = ctx.message.text.trim();
            let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
            if (res.status === 200) {
                startKeyboard(ctx, 'Готово')
            }
            else {
                startKeyboard(ctx, 'Неудача')
            }
        }

        else if (ctx.session.status==='register') {
            if (ctx.session.reg.make==='login') {
                let login = ctx.message.text.trim();
                let promis = await sendPost({login: login}, 'checkLogin', '');
                if (promis.data.result==='buzy') {
                    ctx.reply('Логин занят. Попробуй другой');
                }
                else {
                    session.reg.login = login;
                    session.reg.make='fPass';
                    ctx.reply('Введи пароль');
                }
            }

            else if (ctx.session.reg.make==='fPass') {
                session.reg.fPass = ctx.message.text.trim();
                session.reg.make='lPass';
                ctx.reply('Еще раз введи пароль');
            }

            else if (ctx.session.reg.make==='lPass') {
                if (session.reg.fPass === ctx.message.text.trim()) {
                    session.reg.pass=session.reg.fPass;
                    delete(session.reg.fPass);
                    session.reg.make='name'
                    ctx.reply('Введи имя');
                }
                else {
                    session.reg.make='fPass';
                    ctx.reply('Пароли не совпадают. Введи пароль еще раз');
                }
            }

            else if (ctx.session.reg.make==='name') {
                session.reg.make='last_name';
                session.reg.name=ctx.message.text.trim();  
                ctx.reply('Введи фамилию или пришли 0');              
            }

            else if (ctx.session.reg.make==='last_name') {
                if (ctx.message.text.trim()!=='0')
                    session.reg.last_name=ctx.message.text.trim(); 
                session.reg.make='first_name';      
                ctx.reply('Введи отчество или пришли 0');          
            }

            else if (ctx.session.reg.make==='first_name') {
                if (ctx.message.text.trim()!=='0')
                    session.reg.first_name=ctx.message.text.trim(); 
                session.reg.make='email';      
                ctx.reply('Введи email или пришли 0');          
            }

            else if (ctx.session.reg.make==='email') {
                if (ctx.message.text.trim()!=='0')
                    session.reg.email=ctx.message.text.trim(); 
                session.reg.make='email';      
                ctx.replyWithHTML(`Проверяем информацию:\nЛогин: ${session.reg.login}\nИмя: ${session.reg.name}\n Фамилия: ${session.reg.last_name}\nОтчество: ${session.reg.first_name}\nemail: ${session.reg.email}`,
                    Markup.inlineKeyboard([
                        Markup.button.callback(`${okLbl}Да`, 'yesRegS'),
                        Markup.button.callback(`${nokLbl}Нет`, 'noRegS')
                    ], {columns: 2})
                )
            }
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
            ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)');
            err = true;
            console.log(ctx.message.text)
        }
    }

    else {
        ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)');
        err = true;
        console.log(ctx.message.text)
    }
    ctx.deleteMessage(ctx.message.message_id);
    
    if (!err)
    {
        ctx.deleteMessage(ctx.message.message_id-1);
    }
    ctx.session=session;
}

module.exports = textHandler;