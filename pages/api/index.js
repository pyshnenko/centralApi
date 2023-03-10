require('dotenv').config();
import NextCors from 'nextjs-cors';
const fs = require('fs');
let jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const mailSend = require('./../../src/mailSend');
const mail = new mailSend(process.env.MYURLS, process.env.SALT_CRYPT);
const redirectPage = '/build';

const log4js = require("log4js");

let options = {
  key: fs.readFileSync("/home/spamigor/next/api/js/centralapi/src/sert/privkey.crt"),
  cert: fs.readFileSync("/home/spamigor/next/api/js/centralapi/src/sert/fullchain.crt"),
ca: fs.readFileSync("/home/spamigor/next/api/js/centralapi/src/sert/chain.crt")
};

log4js.configure({
    appenders: { 
        cApi: { type: "file", filename: "log/CentralApi.log" }, 
        console: { type: 'console' },
        mail: {
            type: '@log4js-node/smtp',
            recipients: 'pyshnenko94@yandex.ru',
            sendInterval: 20,
            transport: 'SMTP',
            SMTP: {
                host: 'smtp.gmail.com',
                port: 465,
                secure: true,
                key: options.key,
                cert: options.sert,
                ca: options.ca,
                auth: {
                    user: process.env.MAILUSER,
                    pass: process.env.MAILPASS,
                },
            },
        },
    },
    categories: { default: { appenders: ['console', "cApi"], level: "all" },
                mailer: { appenders: ['mail', 'console', 'cApi'], level: 'all' }, },
  });
const logger = log4js.getLogger("cApi");

const url = process.env.MONGO_URL;
const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASS;
const authMechanism = "DEFAULT";
const uri =`mongodb://${username}:${password}@${url}/?authMechanism=${authMechanism}`;

const mongoMech = require('./../../src/mongoMech');
const mongo = new mongoMech(uri, logger);

export default async function handler(req, res) {
  logger.trace('method: '+req.method)
    await NextCors(req, res, {
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200,
    });
    if (req.method==='POST') {
      logger.trace('make: '+req.headers.make)
      let buf;
      if (typeof(req.body)==='string') buf = JSON.parse(req.body);
      else buf = req.body;
      if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='checkLogin')&&(req.hasOwnProperty('body'))&&(req.body.login)) {
        let extData = await mongo.find({login: buf.login.trim()})
        extData.length===0 ? res.status(200).json({ result: 'free' }) : res.status(200).json({ result: 'buzy' })
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='usersList')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let data = await mongo.find({})
          let result = [];
          data.map((key)=>{
            result.push({login: key.login, role: key.role, name: key.name});
          });
          res.status(200).json({ list: result });
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='unSumLoginAdm')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('hash'))) {
        let id = await mail.decryptHash(req.body.hash);
        if (id) {
          let extData = await mongo.findSumLists(Number(id));
          if (extData.length!==0) {
            res.status(200).json({data: extData});
          }
          else res.status(401).json({err: 'id not found', make: req.headers.make});
        }
        else res.status(401).json({err: 'id incorrect', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='unLoginAdm')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('hash'))) {
        let id = await mail.decryptHash(req.body.hash);
        if (id) {
          logger.trace('findLists');
          let extData = await mongo.findLists(Number(id));
          if (extData.length!==0) {
            res.status(200).json({data: extData});
          }
          else res.status(401).json({err: 'id not found', make: req.headers.make});
        }
        else res.status(401).json({err: 'id incorrect', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='saveSumList')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let bodyBuf = req.body;
          if (typeof(req.body)==='string') bodyBuf=JSON.parse(req.body);
          let result; 
          if (bodyBuf.id!==0) {
            result = await mongo.updSumList(extData[0].login, bodyBuf);
            if (result.res) {
              let hash = await mail.cryptHash(bodyBuf.id);
              res.status(200).json({ hash, list: result.user });
            }
            else res.status(401).json({err: 'ERROR with db', make: req.headers.make});
          }
          else {
            result = await mongo.addSumList(extData[0].login, bodyBuf);
            if (result.res) {
              let hash = await mail.cryptHash(result.id);
              res.status(200).json({ id: result.id, hash, user: result.user });
            }
            else res.status(401).json({err: 'ERROR with db', make: req.headers.make});
          }
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='setHash')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('id'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let hash = await mail.cryptHash(req.body.id);
          res.status(200).json({ hash });
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='askUserData')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let data = await mongo.find({login: req.body.login})
          res.status(200).json({ answer: {
            login: data[0].login, 
            role: data[0].role,
            avatar: data[0].avatar,
            name: data[0].name, 
            first_name: data[0].first_name, 
            last_name: data[0].last_name, 
            email: data[0].email, 
            emailValid: data[0].emailValid,
            telegram: data[0].telegram,
            telegramID: data[0].telegramID,
            telegramValid: data[0].telegramValid,
            asked: (((data[0].askToAdd)&&(data[0].askToAdd.includes(extData[0].login))) ? true : false)
          } });
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='friendshipNo')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('friend'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let askToAddArr = extData[0].askToAdd;
          askToAddArr.splice(extData[0].askToAdd.indexOf(req.body.friend),1);
          await mongo.updateOne({login: extData[0].login}, {askToAdd: askToAddArr});
          let data = await mongo.find({token: atoken})
          delete data._id;
          delete data.token;
          delete data.atoken;
          res.status(200).json({...data});
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='friendshipStart')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('friend'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        let extData2 = await mongo.find({login: req.body.friend});
        if ((extData.length!==0)&&(extData2.length!==0)) {
          let friendsArr = extData[0].friends;
          friendsArr.push(req.body.friend);
          friendsArr.sort();
          let askToAddArr = extData[0].askToAdd;
          askToAddArr.splice(extData[0].askToAdd.indexOf(req.body.friend),1);
          await mongo.updateOne({login: extData[0].login}, {friends: friendsArr, askToAdd: askToAddArr});
          friendsArr = extData2[0].friends;
          friendsArr.push(req.body.login);
          friendsArr.sort();
          await mongo.updateOne({login: req.body.friend}, {friends: friendsArr});
          let data = await mongo.find({token: atoken})
          delete data._id;
          delete data.token;
          delete data.atoken;
          res.status(200).json({...data});
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='friendshipEnd')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('friend'))) {
        let atoken=req.headers.authorization.substr(7);
        let extData = await mongo.find({token: atoken});
        let extData2 = await mongo.find({login: req.body.friend});
        if ((extData.length!==0)&&(extData2.length!==0)) {
          let friendsArr = extData[0].friends;
          friendsArr.splice(extData[0].friends.indexOf(req.body.friend),1);
          await mongo.updateOne({login: extData[0].login}, {friends: friendsArr});
          friendsArr = extData2[0].friends;
          friendsArr.splice(extData[0].friends.indexOf(extData[0].login),1);
          await mongo.updateOne({login: req.body.friend}, {friends: friendsArr});
          let data = await mongo.find({token: atoken});
          delete data._id;
          delete data.token;
          delete data.atoken;
          res.status(200).json({...data});
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='askToAdd')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let data = await mongo.find({login: req.body.login})
          let newAsk = data[0].askToAdd;
          if (typeof(newAsk)!=='Array') newAsk=[];
          if (!newAsk.includes(extData[0].login)) 
          {
            newAsk.push(extData[0].login)
            let dataS = await mongo.updateOne({login: req.body.login}, {askToAdd: newAsk} )
            res.status(200).json({ answer: 'ok' });
          }
          else res.status(200).json({answer: 'ok'})
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='reg')) {
        let extData = await mongo.find({login: req.body.login.trim()})
        if (extData.length===0) {
          let atoken = await bcrypt.hash((req.body.pass+req.body.login.trim()), 10)
          let token = await jwt.sign(req.body, atoken);
          mongo.incertOne({
            name: req.body.name.trim(),
            first_name: req.body.first_name.trim(), 
            last_name: req.body.last_name.trim(),
            pass: atoken,
            token: token, 
            role: 'User', 
            login: req.body.login.trim(), 
            email: req.body.email.trim(),
            emailValid: false,
            settings: {
              autosave: false,
              edit: false,
              animation: 0,
              grow: false,
              askToDel: false,
              sharedMode: 'me',
              pageSave: true,
              localSave: true,
              mobileAnimation: true,
              mobileLogo: false,
              neonLogo: true
            },
            telegram: req.body.telegram||'',
            telegramID: req.body.telegramID||0,
            telegramValid: req.body.telegramValid||false,
            lists: [],
            sumLists: [],
            friends: [],
            askToAdd: []
          });
          res.status(200).json({ method: req.method, headers: req.headers, token: token, atoken: atoken })
        }
        else {
          res.status(401).json({ method: req.method, headers: req.headers, error: 'login bizy'})
        }
      }
           
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='login')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!==''))
      {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
            res.status(200).json({ res: 'ok', data: extData, token: extData[0].token, atoken})
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='login')&&(req.hasOwnProperty('body'))&&(req.body.login!=='')&&(req.body.pass!==''))
      {
        let extData = await mongo.find({login: req.body.login.trim()})
        if (extData.length!==0) {
          bcrypt.compare(req.body.pass+req.body.login.trim(), extData[0].pass).then(function(result) {
            let atoken=extData[0].pass.substr(7)
            if (result == true) res.status(200).json({ res: 'ok', data: extData, token: extData[0].token, atoken})
            else res.status(401).json({ res: 'not ok', error: 'pass incorrect', make: req.headers.make})
          });
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='loginTG')&&(req.hasOwnProperty('body'))&&(Number(req.body.tgID)))
      {
        let extData = await mongo.find({telegramID: Number(req.body.tgID)})
        if (extData.length!==0) {
            let atoken=extData[0].pass.substr(7)
            res.status(200).json({ res: 'ok', data: extData, token: extData[0].token, atoken})
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='connectTG')&&(req.hasOwnProperty('body'))&&(req.body.login!=='')&&(req.body.loginTG!=='')&&(Number(req.body.id)))
      {
        let extData = await mongo.find({login: req.body.login.trim()})
        if (extData.length!==0) {
            mongo.updateOne({login: extData[0].login}, {telegram: req.body.loginTG.trim(), telegramID: Number(req.body.id)});            
            let atoken=extData[0].pass.substr(7);
            res.status(200).json({ res: 'ok', data: extData, token: extData[0].token, atoken})
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='lists')&&(req.headers.hasOwnProperty('authorization')))
      {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        let realLists = [];
        let needUpd = false;
        if (extData.length!==0) {
          if ((extData[0].hasOwnProperty('lists'))&&(extData[0].lists.length!==0)) {
            let resData = [];
            logger.trace('findLists');
            for (let i=0; i<extData[0].lists.length; i++) {
              let row = extData[0].lists[i];
              let tBuf = await mongo.findLists(row);
              if (tBuf.length!==0) {
                if ((tBuf[0].hasOwnProperty('accessUsers'))&&((tBuf[0].accessUsers!==null)&&(tBuf[0].accessUsers.includes(extData[0].login)))||((tBuf[0].hasOwnProperty('access'))&&(tBuf[0].access==='all'))) {
                  if (!realLists.includes(row)) {
                    resData.push(tBuf[0])
                    realLists.push(row);
                  }
                }
                else if (!tBuf[0].hasOwnProperty('accessUsers')) {
                  if (!realLists.includes(row)) {
                    resData.push(tBuf[0])
                    realLists.push(row);
                  }
                }
              }
              else needUpd = true;
            }
            if (needUpd) mongo.updateOne({login: extData[0].login}, {lists: realLists})
            res.status(200).json({ lists: resData })
          }
          else 
          res.status(200).json({lists: [{name: 'Тестовый лист', author: 'nop', data: []}]})
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='sumLists')&&(req.headers.hasOwnProperty('authorization')))
      {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        let realLists = [];
        let needUpd = false;
        if (extData.length!==0) {
          if (!extData[0].hasOwnProperty('sumLists')) { await mongo.updateOne({login: extData[0].login}, {sumLists: []}); extData[0].sumLists=[] };
          if ((extData[0].hasOwnProperty('lists'))&&(extData[0].sumLists.length!==0)) {
            let resData = [];
            for (let i=0; i<extData[0].sumLists.length; i++) {
              let row = extData[0].sumLists[i];
              let tBuf = await mongo.findSumLists(row);
              if (tBuf.length!==0) {                
                if (!realLists.includes(row)) {
                  tBuf[0].hash = await mail.cryptHash(tBuf[0].id);
                  resData.push(tBuf[0])
                  realLists.push(row);
                }
              }
              else needUpd = true;
            }
            if (needUpd) mongo.updateOne({login: extData[0].login}, {sumLists: realLists})
            res.status(200).json({ sumLists: resData })
          }
          else 
          res.status(200).json({lists: [{name: 'Тестовый лист', author: 'nop', data: []}]})
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='setList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body')))
      {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let realLists = [];
          let needUpd = false;      
          let buf;
          if (typeof(req.body)==='string') buf = JSON.parse(req.body);
          else buf = req.body;
          let answ = await mongo.addList(extData[0].login, buf);
          let resData = [];
          logger.trace('findLists');
          for (let i=0; i<answ[0].lists.length; i++) {
            let row = answ[0].lists[i];
            let tBuf = await mongo.findLists(row);
            if (tBuf.length!==0) { 
              resData.push(tBuf[0])
              realLists.push(row);
            }
            else needUpd = true;
          }
          if (needUpd) mongo.updateOne({login: extData[0].login}, {lists: realLists})
          res.status(200).json({ message: 'list save', list: resData })
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body')))
      {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        if ((extData.length!==0)&&(req.body.list)) {
          let answ = [];
          try{answ = await mongo.updList(extData[0].login, req.body.list);}
          catch(e){logger.error('ошибка ебучая блять')}
          if ((answ[0].access==='friends')||(answ[0].access==='users')) {
            for (let i=0; i<answ[0].accessUsers.length; i++) {
              let log = answ[0].accessUsers[i];
              extData = await mongo.find({login: log.trim()});
                if ((extData.length!==0)&&(!extData[0].lists.includes(answ[0].id))) {
                  let extBufM = extData[0].lists;
                  extBufM.push(answ[0].id);
                  let resM = await mongo.updateOne({login: log}, {lists: extBufM});
                }
            }
          }
          res.status(200).json({ message: 'list upd', list: req.body.list })
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='delList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});            
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        if (extData.length!==0) {
          if (buf.id!=='') {
            let reee = await mongo.deleteList(Number(buf.id));
            res.status(200).json({res: reee});
          }
          else res.status(402).json({res: 'incorrect', make: req.headers.make});
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='delSumList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});            
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        if (extData.length!==0) {
          if (buf.id!=='') {
            let reee = await mongo.deleteSumList(Number(buf.id));
            res.status(200).json({res: reee});
          }
          else res.status(402).json({res: 'incorrect', make: req.headers.make});
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='checkMail')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        if (extData.length!==0) {
          if ((!extData[0].emailValid)&&(extData[0].email.includes('@'))) {
            await mail.sendMail(extData[0].email, extData[0].login);
            res.status(200).json({res: 'send'});
          }
          else res.status(402).json({error: 'incorrect', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updUserData')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        let bufB = {};
        Object.keys(buf).map((key)=>{if ((key!=='_id')&&(key!=='emailValid')&&(key!=='login')) bufB[key]=buf[key]});
        if (extData.length!==0) {
          if (buf.id!=='') {
            if (buf.email&&(extData[0].email!==buf.email.trim())) buf.emailValid=false;
            await mongo.updateOne({login: extData[0].login}, buf);
            let reee = await mongo.find({token: atoken});
            res.status(200).json({data: reee});
          }
          else res.status(402).json({res: 'incorrect', make: req.headers.make});
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }      

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='tgCheck')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          await mongo.updateOne({login: extData[0].login}, {telegramValid: true});
          let reee = await mongo.find({token: atoken});
          res.status(200).json({data: reee});
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }      

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='createSerialList')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          let reee = await mongo.incertOneSerial({login: extData[0].login});
          if (reee.res) res.status(200).json(reee);
          else res.status(402).json({error: 'error on insert', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }       

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='findSerialList')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          let reee = await mongo.findSerial(extData[0].login);
          if (reee.res) res.status(200).json(reee);
          else res.status(402).json({error: 'error on find', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }    

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updateSerialList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          if (typeof(req.body)==='string') buf = JSON.parse(req.body);
          else buf = req.body;
          let reee = await mongo.updateOneSerial(extData[0].login, buf);
          if (reee.res) res.status(200).json(reee);
          else res.status(402).json({error: 'error on update', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }  

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='deleteSerialList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          if (typeof(req.body)==='string') buf = JSON.parse(req.body);
          else buf = req.body;
          let reee = await mongo.deleteSerialsFromList(extData[0].login, buf.category, buf.serials);
          if (reee.res) res.status(200).json(reee);
          else res.status(402).json({error: 'error on delete', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }      

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='createTreningList')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          let reee = await mongo.incertOneTrening({login: extData[0].login, history: [], categories: {'Без категории': {}}});
          if (reee.res) res.status(200).json(reee);
          else res.status(402).json({error: 'error on insert', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }       

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='findTreningList')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          let reee = await mongo.findTrening(extData[0].login);
          if (reee.res) res.status(200).json(reee);
          else res.status(402).json({error: 'error on find', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }    

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updateTreningList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        let buf;
        if (extData.length!==0) {
          if (typeof(req.body)==='string') buf = JSON.parse(req.body);
          else buf = req.body;
          let reee = await mongo.updateOneTrening(extData[0].login, buf);
          if (reee.res) res.status(200).json(reee);
          else res.status(402).json({error: 'error on update', make: req.headers.make})
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }  

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='askList')&&(req.hasOwnProperty('body'))) {
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        if (Number(buf.id)) {
          logger.trace('findLists');
          let row = await mongo.findLists(Number(buf.id));
          if (row.length!==0) {
            if (row[0].access==='all') {
              res.status(200).json({res: row[0]});
            }
            else res.status(402).json({error: 'access denied'});
          }
          else res.status(401).json({error: 'no list', make: req.headers.make});
        }
        else res.status(200).json({error: 'incorrect'});
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updUList')&&(req.hasOwnProperty('body'))) {
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        if (Number(buf.list.id)) {
          logger.trace('findLists');
          let row = await mongo.findLists(Number(buf.list.id));
          if (row.length!==0) {
            if (row[0].access==='all') {
              let answ = await mongo.updList('', buf.list, true);
              res.status(200).json({res: answ});
            }
            else res.status(402).json({error: 'access denied', make: req.headers.make});
          }
          else res.status(401).json({error: 'no list', make: req.headers.make});
        }
        else res.status(402).json({error: 'incorrect', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updASumUList')&&(req.hasOwnProperty('body'))) {
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        if (Number(buf.list.id)) {
          let row = await mongo.findSumLists(Number(buf.list.id));
          if (row.length!==0) {
            let answ = await mongo.updSumList('', buf.list, true);
            res.status(200).json({res: answ});
          }
          else res.status(401).json({error: 'no list', make: req.headers.make});
        }
        else res.status(402).json({error: 'incorrect', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updAUList')&&(req.hasOwnProperty('body'))) {
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        if (Number(buf.list.id)) {
          logger.trace('findLists');
          let row = await mongo.findLists(Number(buf.list.id));
          if (row.length!==0) {
            let answ = await mongo.updList('', buf.list, true);
            res.status(200).json({res: answ});
          }
          else res.status(401).json({error: 'no list', make: req.headers.make});
        }
        else res.status(402).json({error: 'incorrect', make: req.headers.make});
      }

      else res.status(401).json({error: 'not ok', make: req.headers.make});
    }    

    else if (req.method==='GET') {
      if (((Object.keys(req.query)).includes('name'))&&((Object.keys(req.query)).includes('addr'))) {
        let buf = await mail.decryptHash(req.query.name);
        let bufA = await mail.decryptHash(req.query.addr);
        let userData;
        if (buf&&bufA) {
            userData = await mongo.find({login: buf});
            mongo.updateOne({login: buf}, {emailValid: true})
            res.redirect(redirectPage);
        } 
        else res.status(200).json({ method: req.method, cookies: req.cookies, name: buf, addr: bufA, save: false });
      }
    }
    logger.info('done')
  }