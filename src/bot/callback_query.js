const { Markup } = require('telegraf');
const {session} = require('telegraf');
const okLbl='✅ ';
const nokLbl='❌ ';
const compare = require("./../../compare");
const sendPost = require('./api');
const {startKeyboard, isEmpty, accUsList, okText, nokText, YorNkeyboard} = require("./other");
const {parse, original} = require("./listsReorginizer")

async function callback_query(ctx) {
    let trig = true;
    ctx.answerCbQuery();
    ctx.deleteMessage();
    let session = {...ctx.session};
    if ((!session.start)&&(isEmpty(session))) ctx.replyWithHTML('Ситуация мне непонятная. нажмите <b>"Старт"</b> (/start)');
    else {
        console.log(ctx.callbackQuery.data.slice(0,8));
        console.log(ctx.callbackQuery.data.slice(8));
        switch (ctx.callbackQuery.data.slice(0,8)) {

            case 'delCat::' : {
                session.YorNid = ctx.callbackQuery.data;
                YorNkeyboard(ctx, `Удаляем ${session.serials.list[Number(ctx.callbackQuery.data.slice(8))].name}?`);
                break;
            }

            case 'YESkeyb' : {
                let id = session.YorNid;
                if (id.slice(0,8)==='delCat::') {
                    let item = Number(id.slice(8));
                    session.serials.list.splice(item, 1);
                    let res = await sendPost(original(session.serials), 'updateSerialList', `Bearer ${session.token}`);
                    if (res.status === 200) {
                        console.log(res.data);
                        trig = false;
                    }
                    else {
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
                        console.log(res.data);
                        trig = false;
                    }
                    else {
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
                    console.log(session)
                    let id = session.YorNid;
                    console.log(id)
                    delete(session.YorNid);
                    console.log(id)
                    if (id.slice(0,8)==='delCat::') {
                        ctx.reply('Нет так нет');
                    }
                }
                delete(session.YorNid);
            }

            case 'serials' : {
                session.status='serials';
                let res = await sendPost({login: session.user.login}, 'findSerialList', `Bearer ${session.token}`);
                console.log(res.data);      
                if (res.status===402) {
                    ctx.replyWithHTML(
                        'Кажется, у вас еще нет списка\n\nСоздадим?',
                        Markup.inlineKeyboard([
                            Markup.button.callback(`${okLbl} Да`, `CrSerial`),
                            Markup.button.callback(`${nokLbl} Нет`, `StartP`)
                        ], {columns: 2}))
                        break;
                }
                else if (res.status===200) {
                    console.log('\x1b[34m Ответ: \n')
                    console.log(res.status);
                    console.log('\n');
                    console.log(res.data.list);
                    console.log('\x1b[0m \n');
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
                console.log('\x1b[34m Ответ: \n')
                console.log(res.status);
                console.log('\n');
                console.log(res.data);
                console.log('\x1b[0m \n');
                let data = parse(res.data); 
                let serials = data;
                serials.list=[ {name: 'без категории', array: []} ];
                session.serials = serials;
                res = await sendPost(original(serials), 'updateSerialList', `Bearer ${session.token}`);
                ctx.replyWithHTML('Выбери категорию:', Markup.inlineKeyboard([
                        Markup.button.callback(`Без категории`, `serList:Без категории`),
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
                console.log('\n\nserList\n\n')
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
                console.log(item);
                console.log(session.serials);
                let obj = session.serials.list[item[0]].array[item[1]];
                console.log(obj);
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
                session.status = 'edSeaz::';
                
                await ctx.replyWithHTML(
                    'Перейди для изменения',
                    Markup.keyboard([
                    Markup.button.webApp(
                        "Open",
                        "https://test.spamigor.site/build/form"
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
                console.log(res.data);
                console.log('\n\n72\n\n')
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
                        console.log(compRes);
                        console.log('send');
                        let res = await sendPost(compRes, 'saveSumList', `Bearer ${session.token}`);
                        console.log('Res');
                        console.log(res.status);
                        console.log(res.data);
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
                console.log('\n\n\n LOOK HERE \n\n\n')
                console.log(res2.data);
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
                console.log(session)
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
}

module.exports = callback_query;