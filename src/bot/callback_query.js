const { Markup } = require('telegraf');
const {session} = require('telegraf');
const okLbl='✅ ';
const nokLbl='❌ ';
const prize='🍔';
const compare = require("./../../compare");
const sendPost = require('./api');
const {startKeyboard, isEmpty, accUsList, okText, nokText, YorNkeyboard, progressBar} = require("./other");
const {parse, parseT, original, originalT} = require("./listsReorginizer")
const formUrl = 'https://spamigor.ru/list';
let jwt = require('jsonwebtoken');

async function callback_query(ctx, logger, process) {
    let trig = true;
    let del = true;
    let session = {...ctx.session};
    if ((!session.start)&&(isEmpty(session))) ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)');
    else {
        switch (ctx.callbackQuery.data.slice(0,8)) {

            //ЧАТ

            case 'PMessage' : {
                ctx.reply('Пришли мне имя пользователя');
                session.status='chatOpen';
                break;
            }

            case 'replyTo:' : {
                let name = ctx.callbackQuery.data.slice(8);
                ctx.replyWithHTML('Введи текст или закрой чат', Markup.keyboard([
                    ['- Закрыть чат -']
                ]));
                session.status='chatWork';
                session.chatUser = name;
                del = false;
                break;
            }

            case 'closeCht' : {
                session.status='work';
                delete(session.chatUser);
                startKeyboard(ctx, 'Закрыто', )
                break;
            }

            // ТРЕНИРОВКИ  

            case 'editWebT' : {
                let item = Number(ctx.callbackQuery.data.slice(8));
                const uriDat = jwt.sign({ 
                    iss: 'bot', 
                    sub: 'auth', 
                    iat: Number(Date.now()), 
                    login: session.user.login, 
                    token: `Bearer ${session.token}`,
                    make: 'trening', 
                    categ: session.trening.list[item].name 
                }, process.env.SKEY, { expiresIn: '1h' });
                session.status = 'editWebT';
                let sendUri = new URL(formUrl);
                sendUri.searchParams.append('trening', true);
                sendUri.searchParams.append('auth', uriDat);
                console.log(sendUri.href)
                await ctx.replyWithHTML(
                    'Перейди для изменения',
                    Markup.keyboard([
                    Markup.button.webApp(
                        "Open",
                        sendUri.href
                    ),
                ]))
                break;
            }
            
            case 'tgTrnRep' : {
                if (trig) {
                    session.status='tgTrnRep';
                    session.trening.onTarget=0;
                    let res = await sendPost(originalT(session.trening), 'updateTreningList', `Bearer ${session.token}`);
                    trig = false;
                }
            }
            
            case 'tgTrn++' : {
                if (trig) {
                    session.status='tgTrn++';
                    session.trening.onTarget++;
                    let res = await sendPost(originalT(session.trening), 'updateTreningList', `Bearer ${session.token}`);
                }
            }

            case 'trening' : {
                session.status='trening';
                let res = await sendPost({login: session.user.login}, 'findTreningList', `Bearer ${session.token}`);
                if (res.status===402) {
                    logger.trace(`id: ${ctx.from.id}: Список тренировок не найден, создаю`)
                    let result = await sendPost({}, 'createTreningList', `Bearer ${session.token}`);
                    if (result.status ===200) {
                        let data = parseT(res.data); 
                        session.trening = data;
                        let jDate = (new Date()).setMonth((new Date()).getMonth()+1);
                        if (!session.trening.hasOwnProperty('date')) session.trening.date = Number(jDate);
                        const rDate = new Date();
                        const sDate = new Date(session.trening.date);
                        if (rDate>sDate) session.trening.onTarget = 0;
                        let arr = [];
                        if ((session.trening.target)&&(session.trening.target>0)) {arr.push(Markup.button.callback(`➕ к прогрессу`, `tgTrn++`));
                        arr.push(Markup.button.callback(`🔄 Сбросить прогресс`, `tgTrnRep`))}
                        arr.push(Markup.button.callback(`задать цель на месяц`, `tgTrnNew`));
                        arr.push(Markup.button.callback(`задать дату обновления`, `tgTrnNDt`));
                        data.list.map((item, index)=>{if ((item!=='target')&&(item!=='onTarget')&&(item!=='date')) arr.push(Markup.button.callback(`${item.name}`, `trnList:${index}`))});
                        arr.push(Markup.button.callback(`Создать категорию`, `crTrnCat`));
                        arr.push(Markup.button.callback(`Назад`, `StartP`));
                        ctx.replyWithHTML(
                            (session.trening.target&&session.trening.target>0) ? 
                                `Прогресс:\n${progressBar((100*(session.trening.onTarget)||0)/(session.trening.target||1))}\n${session.trening.onTarget||'0'} из ${session.trening.target}\n${session.trening.onTarget>=session.trening.target?'♿'+prize+prize+prize+'♿':''}\nДата следующего сброса:\n${sDate.toLocaleDateString('ru-RU')}\nВыбери категорию` : 
                                'Выбери категорию:', 
                            Markup.inlineKeyboard(arr, {columns: 1} ))
                        break;
                    }
                    else {
                        logger.warn(`При создании списка тренировок для ${ctx.from.username||ctx.from.id} возникла ошибка`);
                        ctx.reply('Что-то пошло не так, попробуйте позже');
                        break;
                    }
                }
                else if (res.status===200) {
                    let data = parseT(res.data); 
                    session.trening = data;
                    let jDate = (new Date()).setMonth((new Date()).getMonth()+1);
                    if (!session.trening.hasOwnProperty('date')) session.trening.date = Number(jDate);
                    const rDate = new Date();
                    const sDate = new Date(session.trening.date);
                    if (rDate>sDate) session.trening.onTarget = 0;
                    let arr = [];
                    if ((session.trening.target)&&(session.trening.target>0)) {arr.push(Markup.button.callback(`➕ к прогрессу`, `tgTrn++`));
                    arr.push(Markup.button.callback(`🔄 Сбросить прогресс`, `tgTrnRep`))}
                    arr.push(Markup.button.callback(`задать цель на месяц`, `tgTrnNew`));
                    arr.push(Markup.button.callback(`задать дату обновления`, `tgTrnNDt`));
                    data.list.map((item, index)=>arr.push(Markup.button.callback(`${item.name}`, `trnList:${index}`)));
                    arr.push(Markup.button.callback(`Создать категорию`, `crTrnCat`));
                    arr.push(Markup.button.callback(`Назад`, `StartP`));
                    ctx.replyWithHTML(
                        (session.trening.target&&session.trening.target>0) ? 
                            `Прогресс:\n${progressBar((100*(session.trening.onTarget)||0)/(session.trening.target||1))}\n${session.trening.onTarget||'0'} из ${session.trening.target}\n${session.trening.onTarget>=session.trening.target?'♿'+prize+prize+prize+'♿':''}\nДата следующего сброса:\n${sDate.toLocaleDateString('ru-RU')}\nВыбери категорию` : 
                            'Выбери категорию:', 
                        Markup.inlineKeyboard(arr, {columns: 1} ))
                    break;
                }

                else {
                    ctx.reply('Что-то пошло не так, попробуйте позже');
                    break;
                }
            }

            case 'trnTargP' : {
                let item = Number(ctx.callbackQuery.data.slice(8));
                session.trening.list[item].onTarget++;
                let res = await sendPost(originalT(session.trening), 'updateTreningList', `Bearer ${session.token}`);
                if (res.status===200) {
                    let data = parseT(res.data); 
                    session.trening = data;
                }
                else {
                    startKeyboard(ctx, 'Ошибка доступа к базе');
                    break;
                }
            }

            case 'trnList:' : {
                let item = Number(ctx.callbackQuery.data.slice(8));
                let arr = [];
                let jDate = (new Date()).setMonth((new Date()).getMonth()+1);
                if (!session.trening.list[item].hasOwnProperty('date')) session.trening.list[item].date = Number(jDate);
                const rDate = new Date();
                const sDate = new Date(session.trening.list[item].date);
                if (rDate>sDate) session.trening.list[item].onTarget = 0;
                if (session.trening.list[item].target) arr.push(Markup.button.callback(`➕ к прогрессу`, `trnTargP${item}`))
                session.trening.list[item].array.map((items, index)=>arr.push(Markup.button.callback(`${items.name} - ${items.w}`, `trenTren${item}&&${index}`)));
                arr.push(Markup.button.callback(`Изменить запись через WEB`, `editWebT${item}`));
                arr.push(Markup.button.callback('Добавить запись', `addTren:${item}`));
                arr.push(Markup.button.callback('Переименовать категорию', `reNmCatT${item}`));
                arr.push(Markup.button.callback('Удалить категорию', `delCatT:${item}`));
                arr.push(Markup.button.callback('Назад', `trening`));
                ctx.replyWithHTML((session.trening.list[item].target&&session.trening.list[item].target>0) ? 
                `Прогресс:\n${progressBar((100*(session.trening.list[item].onTarget)||0)/(session.trening.list[item].target||1))}\n${session.trening.list[item].onTarget||'0'} из ${session.trening.list[item].target}\n${session.trening.list[item].onTarget>=session.trening.list[item].target?'♿'+prize+prize+prize+'♿':''}\nДата следующего сброса:\n${sDate.toLocaleDateString('ru-RU')}\nВыбери категорию` : 
                'Выбери запись:', Markup.inlineKeyboard(arr, {columns: 1} ))
                break;
            }       

            case 'tgTrnNDt' : {
                session.status='tgTrnNDt';
                ctx.reply('Пришли мне число (1-31). В этот день будет сбрасываться счетчик');
                break;
            }  

            case 'crTrnCat' : {
                session.status='crTrnCat';
                ctx.reply('Пришли мне название категории');
                break;
            }

            case 'tgTrnNew' : {
                session.status = 'tgTrnNew';
                ctx.reply('Пришли мне цель');
                break;
            }

            case 'addTren:' : {
                session.tecnicalTren = Number(ctx.callbackQuery.data.slice(8));
                session.status = 'addTren:';
                ctx.reply('Пришли мне название');
                break;
            }

            case 'reNmCatT' : {
                session.tecnicalTren = Number(ctx.callbackQuery.data.slice(8));
                session.status = 'reNmCatT';
                ctx.reply('Пришли мне новое название');
                break;
            }

            case 'delCatT:' : {
                session.YorNid = ctx.callbackQuery.data;
                YorNkeyboard(ctx, `Удаляем ${session.trening.list[Number(ctx.callbackQuery.data.slice(8))].name}?`);
                break;
            }

            case 'trenTren' : {
                let par = ctx.callbackQuery.data.slice(8);
                let itemStr = par.split('&&');
                let item = [];
                itemStr.map(str=>item.push(Number(str)));
                let obj = session.trening.list[item[0]].array[item[1]];
                ctx.replyWithHTML(`${obj.name}\nВес: ${obj.w}`, Markup.inlineKeyboard([
                    Markup.button.callback(`Изменить название`, `edNameT:${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Изменить вес`, `editWT::${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Удалить`, `DelTrenN${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Назад`, `trnList:${item[0]}`)
                ], {columns: 1} ));
                break;
            }

            case 'DelTrenN' : {
                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                let se = [Number(item[0]), Number(item[1])]
                session.YorNid = ctx.callbackQuery.data;
                YorNkeyboard(ctx, `Удаляем ${session.trening.list[se[0]].array[se[1]].name}?`);
                break;
            }            

            case 'edNameT:' : {
                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                session.tecnicalSub = [Number(item[0]), Number(item[1])]
                session.status = 'edNameT:';
                ctx.reply('Пришли мне новое название');
                break;
            }

            case 'editWT::' : {
                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                session.tecnicalSub = [Number(item[0]), Number(item[1])]
                session.status = 'editWT::';
                ctx.reply('Пришли мне вес/повторы');
                break;
            }

            //

            case 'delCat::' : {
                session.YorNid = ctx.callbackQuery.data;
                YorNkeyboard(ctx, `Удаляем ${session.serials.list[Number(ctx.callbackQuery.data.slice(8))].name}?`);
                break;
            }

            //Клавиатура Да Нет

            case 'YESkeyb' : {
                let id = session.YorNid;
                if (id.slice(0,8)==='delCat::') {
                    let item = Number(id.slice(8));
                    session.serials.list.splice(item, 1);
                    let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
                    if (res.status === 200) {
                        logger.trace(`id: ${ctx.from.id}: api ok`)
                        trig = false;
                    }
                    else {
                        logger.error(`id: ${ctx.from.id}: api ответил статусом: ${res.status} при команде updateSerialList (${ctx.callbackQuery.data})`)
                        ctx.reply('Что-то пошло не так');
                        break;session
                    }
                }
                else if (id.slice(0,8)==='delCatT:') {
                    let item = Number(id.slice(8));
                    session.trening.list.splice(item, 1);
                    let res = await sendPost(originalT(session.trening), 'updateTreningList', `Bearer ${session.token}`);
                    if (res.status === 200) {
                        logger.trace(`id: ${ctx.from.id}: api ok`)
                        trig = false;
                        startKeyboard(ctx, 'Готово');
                        break;
                    }
                    else {
                        logger.error(`id: ${ctx.from.id}: api ответил статусом: ${res.status} при команде updateTreningList (${ctx.callbackQuery.data})`)
                        ctx.reply('Что-то пошло не так');
                        break;
                    }
                }
                else if (id.slice(0, 8) === 'DelSer::') {
                    let se = id.slice(8).split('&&');
                    let item = [Number(se[0]), Number(se[1])];
                    session.serials.list[item[0]].array.splice(item[1], 1);
                    let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
                    if (res.status === 200) {
                        logger.trace(`id: ${ctx.from.id}: api ok`)
                        trig = false;
                    }
                    else {
                        logger.error(`id: ${ctx.from.id}: api ответил статусом: ${res.status} при команде updateSerialList (${ctx.callbackQuery.data})`)
                        ctx.reply('Что-то пошло не так');
                        break;
                    }
                }
                else if (id.slice(0, 8) === 'DelTrenN') {
                    let se = id.slice(8).split('&&');
                    let item = [Number(se[0]), Number(se[1])];
                    session.trening.list[item[0]].array.splice(item[1], 1);
                    let res = await sendPost(originalT(session.trening), 'updateTreningList', `Bearer ${session.token}`);
                    if (res.status === 200) {
                        logger.trace(`id: ${ctx.from.id}: api ok`)
                        trig = false;
                        startKeyboard(ctx, 'Готово');
                        break;
                    }
                    else {
                        logger.error(`id: ${ctx.from.id}: api ответил статусом: ${res.status} при команде updateTreningList (${ctx.callbackQuery.data})`)
                        ctx.reply('Что-то пошло не так');
                        break;
                    }
                }
                else {
                    ctx.reply('Что-то непонятное произошло');
                    break;
                }
            }

            case 'NOkeyb' : {
                if (trig) {
                    let id = session.YorNid;
                    delete(session.YorNid);
                    if (id.slice(0,8)==='delCat::') {
                        ctx.reply('Нет так нет');
                    }
                    else if (id.slice(0,8)==='delCatT:') {
                        startKeyboard(ctx, 'Нет так нет');
                        break;
                    }
                    else  if (id.slice(0,8)==='DelTrenN') {
                        startKeyboard(ctx, 'Нет так нет');
                        break;
                    }
                }
                delete(session.YorNid);
            }

            //

            case 'serials' : {
                session.status='serials';
                let res = await sendPost({login: session.user.login}, 'findSerialList', `Bearer ${session.token}`);
                if (res.status===402) {
                    logger.trace(`id: ${ctx.from.id}: Список сериалов не найден, предложено создать`)
                    ctx.replyWithHTML(
                        'Кажется, у вас еще нет списка\n\nСоздадим?',
                        Markup.inlineKeyboard([
                            Markup.button.callback(`${okLbl} Да`, `CrSerial`),
                            Markup.button.callback(`${nokLbl} Нет`, `StartP`)
                        ], {columns: 2}))
                        break;
                }
                else if (res.status===200) {
                    let data = parse(res.data); 
                    let arr = [];
                    session.serials = data;
                    data.list.map((item, index)=>arr.push(Markup.button.callback(`${item.name}`, `serList:${index}`)));
                    arr.push(Markup.button.callback(`Создать категорию`, `crSerCat`),);
                    arr.push(Markup.button.callback(`Назад`, `StartP`));
                    ctx.replyWithHTML('Выбери категорию:', Markup.inlineKeyboard(arr, {columns: 1} ))
                    break;
                }

                else {
                    ctx.reply('Что-то пошло не так, попробуйте позже');
                    break;
                }
            }

            case 'CrSerial' : {
                let res = await sendPost({login: session.user.login}, 'createSerialList', `Bearer ${session.token}`);
                let data = parse(res.data); 
                let serials = data;
                serials.list=[ {name: 'без категории', array: []} ];
                session.serials = serials;
                res = await sendPost(original(serials), 'updateSerialList', `Bearer ${session.token}`);
                ctx.replyWithHTML('Выбери категорию:', Markup.inlineKeyboard([
                        Markup.button.callback(`Без категории`, `serList:0`),
                        Markup.button.callback(`Создать категорию`, `crSerCat`),
                        Markup.button.callback(`Назад`, `StartP`),
                    ], {columns: 1} ))
                break;
            }

            case 'crSerCat' : {
                session.status='categoryName';
                ctx.reply('Пришли мне название категории');
                break;
            }

            case 'StartP' : {
                session.status='work';
                startKeyboard(ctx);
                break;
            }

            case 'serList:' : {
                let item = Number(ctx.callbackQuery.data.slice(8));
                let arr = [];
                session.serials.list[item].array.map((items, index)=>arr.push(Markup.button.callback(`${items.name}`, `serSer::${item}&&${index}`)));
                arr.push(Markup.button.callback('Добавить сериал', `addSer::${item}`));
                arr.push(Markup.button.callback('Переименовать категорию', `reNmCat:${item}`));
                arr.push(Markup.button.callback('Удалить категорию', `delCat::${item}`));
                arr.push(Markup.button.callback('Назад', `serials`));
                ctx.replyWithHTML('Выбери сериал:', Markup.inlineKeyboard(arr, {columns: 1} ))
                break;
            }

            case 'addSer::' : {
                session.tecnicalSerial = Number(ctx.callbackQuery.data.slice(8));
                session.status = 'addSer::';
                ctx.reply('Пришли мне название сериала');
                break;
            }

            case 'reNmCat:' : {
                session.tecnicalSerial = Number(ctx.callbackQuery.data.slice(8));
                session.status = 'reNmCat:';
                ctx.reply('Пришли мне новое название');
                break;
            }

            case 'seeById' : {
                startKeyboard(ctx, 'Временно недоступно. Выбери другое');
                break;
            }

            case 'serSer::' : {
                let par = ctx.callbackQuery.data.slice(8);
                let itemStr = par.split('&&');
                let item = [];
                itemStr.map(str=>item.push(Number(str)));
                let obj = session.serials.list[item[0]].array[item[1]];
                ctx.replyWithHTML(`${obj.name}\nСезон: ${obj.s}\nЭпизод: ${obj.e}\nВремя: ${obj.t}\n`, Markup.inlineKeyboard([
                    Markup.button.callback(`Изменить запись`, `editWeb:${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Изменить сезон`, `edSeaz::${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Изменить эпизод`, `editEp::${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Изменить время`, `edTime::${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Удалить`, `DelSer::${item[0]}&&${item[1]}`),
                    Markup.button.callback(`Назад`, `serList:${item[0]}`)
                ], {columns: 1} ));
                break;
            }

            case 'editWeb:' : {

                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                session.tecnicalSub = [Number(item[0]), Number(item[1])]
                session.status = 'editWeb:';
                let sendUri = new URL(formUrl);
                sendUri.searchParams.append('form', true);
                sendUri.searchParams.append('serialN', encodeURI(session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].name));
                sendUri.searchParams.append('serialS', encodeURI(session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].s));
                sendUri.searchParams.append('serialE', encodeURI(session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].e));
                sendUri.searchParams.append('serialT', encodeURI(session.serials.list[session.tecnicalSub[0]].array[session.tecnicalSub[1]].t));
                await ctx.replyWithHTML(
                    'Перейди для изменения',
                    Markup.keyboard([
                    Markup.button.webApp(
                        "Open",
                        sendUri.href
                    ),
                ]))
                break;
            }

            case 'edSeaz::' : {
                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                session.tecnicalSub = [Number(item[0]), Number(item[1])]
                session.status = 'edSeaz::';
                ctx.reply('Пришли мне номер сезона');
                break;
            }

            case 'editEp::' : {
                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                session.tecnicalSub = [Number(item[0]), Number(item[1])]
                session.status = 'editEp::';
                ctx.reply('Пришли мне номер серии');
                break;
            }

            case 'edTime::' : {
                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                session.tecnicalSub = [Number(item[0]), Number(item[1])]
                session.status = 'edTime::';
                ctx.reply('Пришли мне время');
                break;
            }

            case 'DelSer::' : {
                let par = ctx.callbackQuery.data.slice(8);
                let item = par.split('&&');
                let se = [Number(item[0]), Number(item[1])]
                session.YorNid = ctx.callbackQuery.data;
                YorNkeyboard(ctx, `Удаляем ${session.serials.list[se[0]].array[se[1]].name}?`);
                break;
            }

            case 'register' : {
                session.status = 'register';
                session.reg = {make: 'login', login: '', name: '', first_name: '', last_name: '', email: '', fPass: '', pass: ''};
                ctx.reply('Придумай логин');
                break;
            }

            case 'yesRegS' : {
                session.status = 'work';
                delete(session.reg.make);
                let res = await sendPost({...session.reg, telegram: ctx.from.username, telegramID: ctx.from.id, telegramValid: true}, 'reg', '' );
                session.token = res.data.token;
                logger.info(`Пользователь ${ctx.from.id}, ${ctx.from.username} подал запрос на регистрацию`)
                ctx.reply('Для начала работы нажми "Старт" (/start)')
                break;
            }

            case 'noRegS' : {
                session.status = '';
                delete(session.reg);
                await ctx.replyWithHTML(
                    'Не могу Вас опознать\n\nМы знакомы?',
                    Markup.inlineKeyboard([
                        Markup.button.callback('У меня есть аккаунт', `connect`),
                        Markup.button.callback('Зарегистрироваться', `register`)
                    ], {columns: 1}))
                break;
            }

            case 'connect' : {
                ctx.reply(`Пришли мне свой логин`);
                session.status='login';
                break;
            }

            case 'dellist:' : {
                let ind = Number(ctx.callbackQuery.data.slice(ctx.callbackQuery.data[8]==='S'?9:8));
                ctx.replyWithHTML(
                    'Уверены?',
                    Markup.inlineKeyboard([
                        Markup.button.callback(`${okLbl}Да`, `delListY${ctx.callbackQuery.data[8]==='S'?'S':''}${ind}`),
                        Markup.button.callback(`${nokLbl}Нет`, `myList::${ctx.callbackQuery.data[8]==='S'?'S':''}${ind}`)
                    ], {columns: 2})
                );
                break;
            }

            case 'delListY' : {
                let ind = Number(ctx.callbackQuery.data.slice(ctx.callbackQuery.data[8]==='S'?9:8));
                let id = ctx.callbackQuery.data[8]==='S'?Number(session.slists[ind].id):Number(session.lists[ind].id);
                let res = await sendPost({id: id}, ctx.callbackQuery.data[8]==='S'?'delSumList':'delList', `Bearer ${session.token}`);
                if (res.status===200) session.lists.splice(ind, 1);
                trig=false;
            }

            case 'backLCr' : {
                if (trig) {
                    delete(session.compareLists);
                    trig=false;
                }
            }
            

            case 'sumLCr' : {
                if (trig) {
                    if (session.compareLists.length===1) {
                        ctx.reply('Выбран всего один список. Нет смысла совмещать');
                        delete(session.compareLists);
                    }
                    else {
                        let arrS = [];
                        session.compareLists.map((item)=>arrS.push(session.lists[item]));
                        delete(session.compareLists);
                        let compRes = compare.compareList(arrS);
                        let res = await sendPost(compRes, 'saveSumList', `Bearer ${session.token}`);
                    }
                }
            }

            case 'lists' : {
                session.lists=[];
                let res = await sendPost({name: ctx.session.user.name}, 'lists', `Bearer ${ctx.session.token}`);
                session.lists=res.data.lists;
                let listArr = [];
                res.data.lists.map((item, index)=>listArr.push(Markup.button.callback(item.name, `myList::${index}`)));
                let res2 = await sendPost({name: ctx.session.user.name}, 'sumLists', `Bearer ${ctx.session.token}`);
                session.slists=res2.data.sumLists;
                if (res2.data.hasOwnProperty('sumLists')) res2.data.sumLists.map((item, index)=>{
                    let nameL = 'Совмещенный ';
                    item.lists.name.map((item)=>nameL+=`- ${item}`);
                    listArr.push(Markup.button.callback(nameL, `myListS:${index}`))
                });
                listArr.push(Markup.button.callback('Создать новый список', `newList`));
                if (session.lists.length) listArr.push(Markup.button.callback('Создать совмещенный список', `newSList`));
                ctx.replyWithHTML(
                    'Выбери список',
                    Markup.inlineKeyboard(listArr, {columns: 1})
                );
                break;
            }

            case 'newSList' : {
                let listArr=[];
                if (session.compareLists) {
                    let ind = Number(ctx.callbackQuery.data.slice(8));
                    session.compareLists.push(ind);
                    session.lists.map((item, index)=>{
                        if (!session.compareLists.includes(index)) listArr.push(Markup.button.callback(item.name, `newSList${index}`))
                    })
                    listArr.push(Markup.button.callback('Собрать', `sumLCr`));
                    listArr.push(Markup.button.callback('Назад', `backLCr`));
                    ctx.replyWithHTML(
                        'Выбери еще список',
                        Markup.inlineKeyboard(listArr, {columns: 1})
                    );
                }
                else {
                    session.compareLists = [];
                    session.lists.map((item, index)=>listArr.push(Markup.button.callback(item.name, `newSList${index}`)));
                    listArr.push(Markup.button.callback('Назад', `backLCr`));
                    ctx.replyWithHTML(
                        'Выбери список',
                        Markup.inlineKeyboard(listArr, {columns: 1})
                    );
                }
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
                        let addr = new URL(formUrl);
                        addr.searchParams.append('list', res.data.hash);
                        addr.searchParams.append('done', 'stList');
                        ctx.reply(addr.href);
                    }
                    else ctx.reply('Сервер временно недоступен');
                }
                else {
                    let addr = new URL(formUrl);
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
    ctx.answerCbQuery();
    if (del) ctx.deleteMessage();
}

module.exports = callback_query;