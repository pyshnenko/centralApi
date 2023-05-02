let timer = {}

function delMess(ctx, id, logger) {
    if (timer.hasOwnProperty(ctx.from.id)) {
        timer[ctx.from.id].finishID = id;
        clearTimeout(timer[ctx.from.id].timer)
    }
    else timer[ctx.from.id] = {startID: id-1, finishID: id};
    timer[ctx.from.id].timer = setTimeout(workTot, 5*60*1000, ctx, timer[ctx.from.id].startID, timer[ctx.from.id].finishID+1, logger);
}

function workTot(ctx, startId, id, logger) {
    delete(timer[ctx.from.id]);
    work(ctx, startId, id, logger)
}

async function work(ctx, startId, id, logger) {
    try {await ctx.deleteMessage(id)}
    catch(e) {}
    if (id>=startId) setTimeout(work, 500, ctx, startId, id-1, logger)
    else {
        logger.trace(`delete message by id:${ctx.from.id} done`);
        ctx.reply('Нажми СТАРТ (/start) для начала')
    }
}

module.exports = delMess;