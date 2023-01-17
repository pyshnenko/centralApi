require('dotenv').config();
import NextCors from 'nextjs-cors';
const fs = require('fs');
let jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const url = process.env.MONGO_URL;
const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASS;
const authMechanism = "DEFAULT";
const uri =`mongodb://${username}:${password}@${url}/?authMechanism=${authMechanism}`;

const mongoMech = require('./../../src/mongoMech');
const mongo = new mongoMech(uri);

const mailSend = require('./../../src/mailSend');
const mail = new mailSend(process.env.MYURLS, process.env.SALT_CRYPT);
const redirectPage = '/list';

export default async function handler(req, res) {
  console.log('\x1b[34mmethod: '+req.method+'\x1b[0m');
    await NextCors(req, res, {
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200,
    });
    if (req.method==='POST') {
      let buf;
      if (typeof(req.body)==='string') buf = JSON.parse(req.body);
      else buf = req.body;
      if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='reg')) {
        console.log('\n\nreg\n\n')
        let extData = await mongo.find({login: req.body.login.trim()})
        if (extData.length===0) {
          console.log('yep')
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
              autosave: false
            },
            telegram: '',
            lists: [],
            friends: [],
          });
          res.status(200).json({ method: req.method, headers: req.headers, token: token, atoken: atoken })
        }
        else {
          res.status(401).json({ method: req.method, headers: req.headers, error: 'login bizy'})
          console.log('errr')
        }
      }            
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='login')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!==''))
      {
        console.log('\n\nloginB\n\n')
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
            res.status(200).json({ res: 'ok', data: extData, token: extData[0].token, atoken})
        }
        else res.status(401).json({err: 'login not found'})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='login')&&(req.hasOwnProperty('body'))&&(req.body.login!=='')&&(req.body.pass!==''))
      {
        console.log('\n\nlogin\n\n')
        let extData = await mongo.find({login: req.body.login.trim()})
        if (extData.length!==0) {
          bcrypt.compare(req.body.pass+req.body.login.trim(), extData[0].pass).then(function(result) {
            console.log(result)
            let atoken=extData[0].pass.substr(7)
            if (result == true) res.status(200).json({ res: 'ok', data: extData, token: extData[0].token, atoken})
            else res.status(401).json({ res: 'not ok', error: 'pass incorrect'})
          });
        }
        else res.status(401).json({err: 'login not found'})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='lists')&&(req.headers.hasOwnProperty('authorization')))
      {
        console.log('\n\nlists\n\n')
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        let realLists = [];
        let needUpd = false;
        if (extData.length!==0) {
          if ((extData[0].hasOwnProperty('lists'))&&(extData[0].lists.length!==0)) {
            let resData = [];
            for (let i=0; i<extData[0].lists.length; i++) {
              let row = extData[0].lists[i];
              let tBuf = await mongo.findLists(row);
              console.log(tBuf)
              if (tBuf.length!==0) {
                if ((tBuf[0].hasOwnProperty('accessUsers'))&&((tBuf[0].accessUsers!==null)&&(tBuf[0].accessUsers.includes(extData[0].login)))||((tBuf[0].hasOwnProperty('access'))&&(tBuf[0].access==='all'))) {
                  resData.push(tBuf[0])
                  realLists.push(row);
                }
                else if (!tBuf[0].hasOwnProperty('accessUsers')) {
                  resData.push(tBuf[0])
                  realLists.push(row);
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
        else res.status(401).json({err: 'login not found'})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='setList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body')))
      {
        console.log('\n\n\n\nsetList\n\n\n\n');
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          console.log('add')
          let realLists = [];
          let needUpd = false;      
          let buf;
          if (typeof(req.body)==='string') buf = JSON.parse(req.body);
          else buf = req.body;
          let answ = await mongo.addList(extData[0].login, buf);
          console.log('\n\n\nset\n\n\n');
          console.log(buf.accessUsers)
          console.log(answ);
          let resData = [];
          for (let i=0; i<answ[0].lists.length; i++) {
            let row = answ[0].lists[i];
            let tBuf = await mongo.findLists(row);
            if (tBuf.length!==0) { 
              resData.push(tBuf[0])
              realLists.push(i);
            }
            else needUpd = true;
          }
          if (needUpd) mongo.updateOne({login: extData[0].login}, {lists: realLists})
          res.status(200).json({ message: 'list save', list: resData })
        }
        else res.status(401).json({err: 'login not found'})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body')))
      {

        console.log('\nupdList\n')
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          console.log(req.body.list)
          try{let answ = await mongo.updList(extData[0].login, req.body.list);}
          catch(e){console.log('\x1b[31mошибка ебучая блять\x1b[0m')}
          console.log('answ')
          res.status(200).json({ message: 'list upd', list: req.body.list })
        }
        else res.status(401).json({err: 'login not found'})
        console.log('exit');
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='delList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});            
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        console.log(buf)
        if (extData.length!==0) {
          if (buf.id!=='') {
            let reee = await mongo.deleteList(Number(buf.id));
            res.status(200).json({res: reee});
          }
          else res.status(200).json({res: 'incorrect'});
        }
        else res.status(401).json({error: 'unautorized'})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='checkMail')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        console.log(extData);
        if (extData.length!==0) {
          if ((!extData[0].emailValid)&&(extData[0].email.includes('@'))) {
            await mail.sendMail(extData[0].email, extData[0].login);
            res.status(200).json({res: 'send'});
          }
          else res.status(402).json({error: 'incorrect'})
        }
        else res.status(401).json({error: 'unautorized'})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updUserData')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        console.log(extData);            
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        console.log(buf);
        let bufB = {};
        Object.keys(buf).map((key)=>{if ((key!=='_id')&&(key!=='emailValid')&&(key!=='login')) bufB[key]=buf[key]});
        console.log(bufB);
        if (extData.length!==0) {
          if (buf.id!=='') {
            if (extData[0].email!==buf.email.trim()) buf.emailValid=false;
            await mongo.updateOne({login: extData[0].login}, buf);
            let reee = await mongo.find({token: atoken});
            res.status(200).json({data: reee});
          }
          else res.status(200).json({res: 'incorrect'});
        }
        else res.status(401).json({error: 'unautorized'})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='askList')&&(req.hasOwnProperty('body'))) {
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        if (Number(buf.id)) {
          let row = await mongo.findLists(Number(buf.id));
          if (row.length!==0) {
            if (row[0].access==='all') {
              res.status(200).json({res: row[0]});
            }
            else res.status(402).json({error: 'access denied'});
          }
          else res.status(401).json({error: 'no list'});
        }
        else res.status(200).json({error: 'incorrect'});
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updUList')&&(req.hasOwnProperty('body'))) {
        console.log('\n\nupdul\n\n')
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        console.log(buf)
        if (Number(buf.list.id)) {
          console.log('im here')
          let row = await mongo.findLists(Number(buf.list.id));
          console.log(row)
          if (row.length!==0) {
            if (row[0].access==='all') {
              let answ = await mongo.updList('', buf.list, true);
              res.status(200).json({res: answ});
            }
            else res.status(402).json({error: 'access denied'});
          }
          else res.status(401).json({error: 'no list'});
        }
        else res.status(200).json({error: 'incorrect'});
      }
      else res.status(401).json({error: 'not ok'});
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

    else if (req.method==='DELETE') {      
      let buf;
      console.log('\n\n\n\ndelete\n\n\n\n\n');
      console.log(Object.keys(req))
      console.log(Object.keys(req.body))
      console.log(req.body);
      console.log(typeof(req.body));
      if (typeof(req.body)==='string') buf = JSON.parse(req.body);
      else buf = req.body;
      console.log(buf)
      if ((req.headers.make==='lists')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {        
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          if (buf.id!=='') {
            let reee = await mongo.deleteList(Number(buf.id));
            res.status(200).json({res: reee});
          }
          res.status(200).json({res: 'incorrect'});
        }
        else res.status(401).json({error: 'unautorized'})
      }
      else res.status(200).json({test: 'ok'})
    }
    else console.log(req.method);
    console.log('end')
  }