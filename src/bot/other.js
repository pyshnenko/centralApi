const { Markup } = require('telegraf');
const {session} = require('telegraf');
const okLbl='✅ ';
const nokLbl='❌ ';
const greenBlock = '🟩';
const redBlock = '🟥';

module.exports.startKeyboard = async function(ctx, text) {
    let mData = await ctx.reply('Обновим интерфейс', Markup.removeKeyboard(true));
    await ctx.deleteMessage(mData.message_id);
    ctx.replyWithHTML(
        (text||`Привет ${ctx.session.user.login}\n\nЧем займемся?`), 
        Markup.inlineKeyboard([
            Markup.button.callback('Посмотреть мои списки', `lists`),
            Markup.button.callback('Найти список по его ID', `seeById`),
            Markup.button.callback('Блокнотик для сериальчиков', `serials`),
            Markup.button.callback('Блокнотик тренировок', `trening`),
        ], {columns: 1}))
}

module.exports.isEmpty = function(obj) {
    for (let key in obj) {
        return false;
    }
    return true;
}

module.exports.accUsList = (session, shMode) => {
    let buf = [];
    if (!shMode||(shMode==='me')) buf.push(session.user.login);
    else if (shMode==='friends') {
        buf = session.user.friends;
        buf.push(session.user.login);
    }
    return buf; 
}

module.exports.okText = (text, total, index, karet, line) => {
    let rTotal = (index===' кг'||index==='л')&&total<1 ? total*1000 : total;
    let rIndex = total<1&&index===' кг' ? ' г' : total<1&&index===' л' ? ' мл' : index;
    return line?`${okLbl}${text} - ${rTotal+rIndex}${karet?'':'\n'}`:`${okLbl}<s>${text} - ${rTotal+rIndex}</s>${karet?'':'\n'}`
}

module.exports.nokText = (text, total, index, karet) => {
    let rTotal = (index===' кг'||index==='л')&&total<1 ? total*1000 : total;
    let rIndex = total<1&&index===' кг' ? ' г' : total<1&&index===' л' ? ' мл' : index;
    return `${nokLbl}${text} - ${rTotal+rIndex}${karet?'':'\n'}`
}

module.exports.YorNkeyboard = (ctx, text) => {
    ctx.replyWithHTML(
        (text||`Вы уверены?`), Markup.inlineKeyboard([
            Markup.button.callback(`${okLbl}Да`, `YESkeyb`),
            Markup.button.callback(`${nokLbl}Нет`, `NOkeyb`)
        ], {columns: 2}))
}

module.exports.progressBar = (value) => {
    let str = '';
    console.log(value)
    for (let i=0; i<10; i++) {
        if ((Math.floor(100*i/9)<=(value+0.01))&&(value!==0)) str+=greenBlock;
        else str+=redBlock;
    }
    console.log(str)
    return str;
}