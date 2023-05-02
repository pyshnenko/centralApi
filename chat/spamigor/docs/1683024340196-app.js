require('dotenv').config();
var Minio = require('minio')
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOTTOKEN);
const { Extra, Markup } = require('telegraf');
var Fs = require('fs');

const MongoClient = require("mongodb").MongoClient;
const murl = process.env.STURL;
const username = encodeURIComponent(process.env.MLOGIN);
const password = encodeURIComponent(process.env.MPASS);
const authMechanism = "DEFAULT";
const uri =`mongodb://${username}:${password}@${murl}/?authMechanism=${authMechanism}`;
const mongoClient = new MongoClient(uri);

const db = mongoClient.db("minioBot");
const collection = db.collection("minioUserHist");
const {session} = require('telegraf');

const defaultTheme = require("./src/default.theme.js");
const themeW = require("./src/defaultWhite.js");


const positionsSet = [
    'url', 'port', 'ssl', 'login', 'pass', 'bucket', 'folder'
]

const authText = [
    'Введи адрес сервера minio',
    'Введи порт или поставь прочерк (-)',
    'Используем SSL?',
    'Введи логин s3',
    'Введи пароль s3',
    'введи название bucket',
    'укажи папку'
]

bot.use(session())

bot.start( async (ctx) =>  {
    await ctx.reply(`Привет ${ctx.from.first_name}`);
    let hist = await histGet(ctx.from.id);
    console.log('hist: ', hist.length===0);
    startKeyboard(hist.length!==0, ctx, `Привет ${ctx.from.first_name}, чем я могу помочь?`);
    //ctx.replyWithPhoto('https://spamigor.site/123.JPG').catch((e)=>{////console.log(3)})
});

bot.catch((err)=>console.log(err));

bot.on('callback_query', async (ctx) => {
    console.log(ctx.callbackQuery.data);
    ctx.answerCbQuery();
    ctx.deleteMessage();
    let hist = await histGet(ctx.from.id);
    switch (ctx.callbackQuery.data.substr(0,4)) {
        case 'home':
            startKeyboard(hist.length!==0, ctx, `Привет ${ctx.from.first_name}, чем я могу помочь?`);
            break;
        case 'cont': 
            openSaved(ctx);
            break;
        case 'del_':
            await deleteSaved(ctx);
            hist = await histGet(ctx.from.id);
            startKeyboard(hist.length!==0, ctx, `Привет ${ctx.from.first_name}, чем я могу помочь?`);
            break;                    
        case 'edit':
            ctx.reply(authText[0]);
            ctx.session={ask: 0};
            break;
        case 'new_':
            ctx.reply(authText[0]);
            ctx.session={ask: 0, jsk: 'def'};
            break;
        case 'newW':
            ctx.reply(authText[0]);
            ctx.session={ask: 0, jsk: 'defWhite'};
            break;
        case 'USSL':
            ctx.reply(authText[3]);
            let buf = ctx.session;
            buf.ssl=true;
            buf.ask++;
            ctx.session=buf;
            break;
        case 'nSSL':
            ctx.reply(authText[3]);
            let buf2 = ctx.session;
            buf2.ssl=false;
            buf2.ask++;
            ctx.session=buf2;
            break;
        case 'CNCT':
            let message = '';
            console.log(ctx.session);
            positionsSet.forEach((el, index)=> message+=`${el}: ${ctx.session[el]}\n`)
            ctx.reply(message);
            let jsonData;
            if (ctx.session.jsk==='def') await minioSetDef(ctx, defaultTheme);
            else if (ctx.session.jsk==='defWhite') await minioSetDef(ctx, themeW);
            else jsonData = await minioGet(ctx.session, ctx, hist);
            console.log(jsonData);
            break;
        case 'clrd':
            ctx.session={ask: -1};
            startKeyboard(hist.length!==0, ctx, `Привет ${ctx.from.first_name}, чем я могу помочь?`);
            break;
        case 'poss':
            console.log(ctx.callbackQuery.data.substr(7));
            let num = Number(ctx.callbackQuery.data.substr(7));
            console.log(num);
            console.log(hist[num]);
            ctx.session=hist[num];
            connectYN(ctx);
            break;
        case 'kat_':
            let key = ctx.callbackQuery.data.substr(7)
            console.log(key);
            let setPos = ctx.session;
            setPos.hasOwnProperty('position') ? setPos.position.push(key) : setPos.position = [key];
            ctx.session = setPos;            
            let objKey = jsonDataGet(ctx);
            console.log(objKey);
            console.log(typeof(objKey));
            if (typeof(objKey)=='object')
                inlineKeyCreate(ctx, objKey, 'Выбери подкатегорию', 'kat_', (setPos.position.length>=1));
            else ctx.replyWithHTML(
                objKey.toString()||'пусто',
                Markup.inlineKeyboard([
                    Markup.button.callback('Назад', `back%%%1`),
                    Markup.button.callback('Редактировать', `redd%%%1`)
                ], {columns: 2}))  ;
            break;
        case 'back':
            await ctx.session.position.pop();
            let objKey2 = ctx.session.position.length===0 ? ctx.session.jsonData : await jsonDataGet(ctx);
            inlineKeyCreate(ctx, objKey2, 'Выбери подкатегорию', 'kat_', (ctx.session.position.length>=1));
            break;
        case 'redd':
            ctx.session.red=true;
            ctx.reply('Введи новое значение');
            break;
        case 'save':
            minioSet(ctx, hist);
            break;
        case 'pict':
            await ctx.reply('В разработке');
            let objKey3 = ctx.session.position.length===0 ? ctx.session.jsonData : await jsonDataGet(ctx);
            inlineKeyCreate(ctx, objKey3, 'Выбери подкатегорию', 'kat_', (ctx.session.position.length>=1));
            break;
    }
});

bot.on('text', async (ctx) => {
    let buf = ctx.session;
    if (ctx.session?.ask>=0) {
        buf[positionsSet[buf.ask]]=ctx.message.text.trim();
        buf.ask++;
        if (buf.ask==2) sslYN(ctx, 2);
        else if (buf.ask<7) await ctx.reply(authText[buf.ask]) 
        else { buf.ask=(-1); connectYN(ctx) }
        ctx.session=buf;
    }
    if (ctx.session?.red) {
        ctx.session.red=false;
        let text = ctx.message.text.trim();
        if (text.toLowerCase()==='true') jsonDataSet(ctx, true);
        else if (text.toLowerCase()==='false') jsonDataSet(ctx, false);
        else jsonDataSet(ctx, ctx.message.text.trim());
        let objKey = jsonDataGet(ctx);
        ctx.replyWithHTML(
            objKey.toString(),
            Markup.inlineKeyboard([
                Markup.button.callback('Назад', `back%%%1`),
                Markup.button.callback('Редактировать', `redd%%%1`)
            ], {columns: 2}))  ;
    }
})

bot.launch();
console.log('bot start');

const startKeyboard = (hist, ctx, mess) => {
    let id = ctx.from.id;
    if ((mess==='')||(mess==undefined)) mess='пусто';
    ctx.replyWithHTML(
        mess,
            Markup.inlineKeyboard([
                Markup.button.callback('Открыть сохраненный', `cont%%%${id}`, !hist),
                Markup.button.callback('Редактировать действующий шаблон', `edit%%%${id}`),
                Markup.button.callback('Создать новый шаблон', `new_%%%${id}`),
                Markup.button.callback('Создать новый белый шаблон', `newW%%%${id}`),
                Markup.button.callback('Удалить историю', `del_%%%${id}`)
            ], {columns: 1})) 
}

const connectYN = (ctx) => {
    ctx.replyWithHTML(
        'Подключаемся?',
        Markup.inlineKeyboard([
            Markup.button.callback('Да', `CNCT`),
            Markup.button.callback('Нет', `clrd`)
        ], {columns: 2}))
}

const sslYN = (ctx, arg) => {
    ctx.replyWithHTML(
        authText[arg],
        Markup.inlineKeyboard([
            Markup.button.callback('Да', `USSL`),
            Markup.button.callback('Нет', `nSSL`)
        ], {columns: 2}))
}

const openSaved = async (ctx) => {
    let data = await histGet(ctx.from.id);
    let lines = [];
    console.log(data);
    data.forEach((el, index)=>{
        let buf = Markup.button.callback(el.url, `poss%%%${index}`);
        lines.push(buf)
    })
    ctx.replyWithHTML(
        'Выбери подходящее',
        Markup.inlineKeyboard(lines, {columns: 2}))
}

async function deleteSaved(ctx) {
    console.log('delete');
    let id = ctx.from.id;
    try {
        await mongoClient.connect();
        await collection.deleteMany({id: id});
    } catch(err) {
        console.log(err);
    } finally {
        await mongoClient.close();
    }
}

async function histGet(id) {
    let results;
    try {
        console.log('im here');
        await mongoClient.connect();
        results = await collection.find({id: id}).toArray();
        console.log(results);         
    } catch(err) {
        console.log(err);
    } finally {
        await mongoClient.close();
        return results;
    }
}

async function histSet(id, data) {
    try {
        await mongoClient.connect();
        let needWrite = true;
        let buf = await collection.find({id: id}).toArray();
        buf.forEach((el)=> { if (el.url==data.url) needWrite=false })
        let result;
        if (needWrite) { 
            let enterData = data;
            enterData.id = id;
            buf.push(enterData);
            result = await collection.insertOne(enterData);
        }
        console.log(result);
    }catch(err) {
        console.log(err);
    } finally {
        await mongoClient.close();
    }
};

const getNecessaryPolicy = (themeBt) => {
    return JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Action: ['s3:DeleteObject', 's3:GetObject', 's3:PutObject'],
          Effect: 'Allow',
          Principal: { AWS: '*' },
          Resource: [`arn:aws:s3:::${themeBt}/*`],
          Sid: '',
        },
      ],
    });
  }


const minioSetDef = async (ctx, theme) => {
    var minioClient = new Minio.Client({
        endPoint: ctx.session.url,
        port: Number(ctx.session.port),
        useSSL: ctx.session.ssl,
        accessKey: ctx.session.login,
        secretKey: ctx.session.pass
    });
    const buckets = await minioClient.listBuckets();
    const bucketExist = buckets.filter((bucket) => bucket.name === ctx.session.bucket)[0];
    if (!bucketExist) {
        await minioClient.makeBucket(ctx.session.bucket, 'us-east-1')
            .catch((errorCreate) => {
                console.log('Error creating bucket.');
            });
        ctx.reply('Бакет создан');
    }
    const policy = await getPolicy(ctx.session.bucket, minioClient);
    const buckerPolicy = JSON.parse(policy);
    if (buckerPolicy.Statement.length > 1) {
        await minioClient.setBucketPolicy(ctx.session.bucket, getNecessaryPolicy(ctx.session.bucket))
            .catch((error) => {
                console.log('error whith policy set');
            });
        console.log(`Policy for ${ctx.session.bucket} was created successfully`);
        ctx.reply('Политика задана');
    }
    await histSet(ctx.from.id, ctx.session);
    let hist = await histGet(ctx.from.id);
    if (ctx.session.jsk==='defWhite') {
        theme.images.favicon=`${ctx.session.ssl ? 'https' : 'http'}://${ctx.session.url}${ctx.session.port==='-' ? '/' : ':'+ctx.session.port+'/'}${ctx.session.bucket}/${ctx.session.folder}/favicon.ico`
        standImagePut(minioClient, ctx, hist, theme.images.favicon);
    }

    await minioClient.putObject(ctx.session.bucket, `/${ctx.session.folder}/theme.json`, JSON.stringify(theme), async function(e) {
        if (e) {
        return console.log(e)
      }           
      startKeyboard(hist.length!==0, ctx, `Загрузка успешно выполнена`);
      ctx.session={}
    })
}

async function getPolicy(themeBt, minioClient) {
    const policy = await minioClient.getBucketPolicy(themeBt)
      .catch(async (error) => {
        if (error.code === 'NoSuchBucketPolicy') {
          await minioClient.setBucketPolicy(themeBt, getNecessaryPolicy(themeBt));
          console.log(`Policy for ${themeBt} was created successfully`);
          const createdPolicy = await minioClient.getBucketPolicy(themeBt);

          return createdPolicy;
        }
        console.log('Minio getBucketPolicy error: ');

      });
    return policy;
}


const minioSet = async (ctx, hist) => {
    var minioClient = new Minio.Client({
        endPoint: ctx.session.url,
        port: Number(ctx.session.port),
        useSSL: ctx.session.ssl,
        accessKey: ctx.session.login,
        secretKey: ctx.session.pass
    });
    await minioClient.putObject(ctx.session.bucket, `/${ctx.session.folder}/theme.json`, JSON.stringify(ctx.session.jsonData), function(e) {
        if (e) {
        return console.log(e)
      }
      startKeyboard(hist.length!==0, ctx, `Загрузка успешно выполнена`);
      ctx.session={}
    })
}

const minioGet = async (session, ctx, hist) => {
    var minioClient = new Minio.Client({
        endPoint: session.url,
        port: Number(session.port),
        useSSL: session.ssl,
        accessKey: session.login,
        secretKey: session.pass
    });
    let data;
    await minioClient.getObject(session.bucket, `/${session.folder}/theme.json`, function(err, dataStream) {
        if (err) {
            console.log(112);
            if (err.code==='SignatureDoesNotMatch') startKeyboard(hist.length!==0, ctx, `Неверный логин/пароль`);
            else if (err.code==='NoSuchBucket') startKeyboard(hist.length!==0, ctx, `Неверный бакет. Создай новый или проверь ввод`);
            else startKeyboard(hist.length!==0, ctx, err.code);
            console.log('\n\nerr\n\n');
            console.log(err);
            console.log(err.code);
            return err;//err)
        }
        dataStream.on('data', function(chunk) {
            data ? data = chunk : data += chunk;
        })
        dataStream.on('end', function() {
            console.log('data: ', data);
            console.log('dataB: ', data.slice(data.indexOf('{')));
            let dataS=JSON.parse(data.slice(data.indexOf('{')));
            let buf = ctx.session;
            buf.jsonData=dataS;
            ctx.session=buf;
            console.log(ctx.session.jsonData)
            ctx.reply(`Данные компании ${ctx.session.jsonData.company_name} получены`);
            inlineKeyCreate(ctx, ctx.session.jsonData, 'Выбери категорию', 'kat_', false);            
            histSet(ctx.from.id, ctx.session);
        })
        dataStream.on('error', function(err) {
            console.log(112);
            console.log(err)//err)
        })
      })
}

function standImagePut(minioClient, ctx, hist, img)
{
    let file = './src/faviconW.ico'
    let fileStream = Fs.createReadStream(file)
    let fileStat = Fs.stat(file, function(e, stat) {
        if (e) {
            return console.log(e)
        }
        minioClient.putObject(ctx.session.bucket, `/${ctx.session.folder}/favicon.ico`, fileStream, stat.size, 'image/x-icon', function(e) {
            if (e) {
            return console.log(e)
            }
            console.log("Successfully uploaded the stream");
            console.log(img);
            ctx.replyWithDocument(img).catch((e)=>{ctx.reply(img)})//img
        })
    })
}

async function inlineKeyCreate(ctx, obj, mess, call, backButton) {     
    if (mess==='') mess='пусто';
    let buf = [];
    console.log(obj)
    let keyObj = Object.keys(obj);
    console.log(keyObj);
    keyObj.forEach((el, ind) => {buf.push(Markup.button.callback(el, `${call}%%%${el}`))});
    if (backButton) buf.push(Markup.button.callback('Назад', `back%%%1`))
    else {
        buf.push(Markup.button.callback('Сохранить', `save%%%1`));
        buf.push(Markup.button.callback('Загрузка картинок', `pict%%%1`));        
        buf.push(Markup.button.callback('Главное меню', `home%%%1`));
    }
    ctx.replyWithHTML(
        mess,
        Markup.inlineKeyboard(buf, {columns: 1}))    
}

const jsonDataGet = (ctx) => {    
    let objKey;
    switch (ctx.session.position.length) {
        case 1 : objKey = ctx.session.jsonData[ctx.session.position[0]]; break;
        case 2 : objKey = ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]]; break;
        case 3 : objKey = ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]]; break;
        case 4 : objKey = ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]][ctx.session.position[3]]; break;
        case 5 : objKey = ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]][ctx.session.position[3]][ctx.session.position[4]]; break;
        case 6 : objKey = ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]][ctx.session.position[3]][ctx.session.position[4]][ctx.session.position[5]]; break;
    }
    return objKey;
}

const jsonDataSet = (ctx, data) => {    
    switch (ctx.session.position.length) {
        case 1 : ctx.session.jsonData[ctx.session.position[0]]=data; break;
        case 2 : ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]]=data; break;
        case 3 : ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]]=data; break;
        case 4 : ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]][ctx.session.position[3]]=data; break;
        case 5 : ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]][ctx.session.position[3]][ctx.session.position[4]]=data; break;
        case 6 : ctx.session.jsonData[ctx.session.position[0]][ctx.session.position[1]][ctx.session.position[2]][ctx.session.position[3]][ctx.session.position[4]][ctx.session.position[5]]=data; break;
    }
}