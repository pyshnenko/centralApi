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
      if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='checkLogin')&&(req.hasOwnProperty('body'))&&(req.body.login)) {
        console.log('check login');
        console.log(buf)
        let extData = await mongo.find({login: buf.login.trim()})
        extData.length===0 ? res.status(200).json({ result: 'free' }) : res.status(200).json({ result: 'buzy' })
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='usersList')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')) {
        console.log('usersList');
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let data = await mongo.find({})
          console.log(data);
          let result = [];
          data.map((key)=>{
            result.push({login: key.login, role: key.role, name: key.name});
          });
          res.status(200).json({ list: result });
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='askUserData')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))) {
        console.log('askUserData');
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let data = await mongo.find({login: req.body.login})
          console.log('data');
          console.log(data);
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
            asked: (((data[0].askToAdd)&&(data[0].askToAdd.includes(extData[0].login))) ? true : false)
          } });
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='friendshipNo')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('friend'))) {
        console.log('friendshipNo');
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let askToAddArr = extData[0].askToAdd;
          askToAddArr.splice(extData[0].askToAdd.indexOf(req.body.friend),1);
          await mongo.updateOne({login: extData[0].login}, {askToAdd: askToAddArr});
          let data = await mongo.find({token: atoken})
          console.log('data');
          console.log(data);
          delete data._id;
          delete data.token;
          delete data.atoken;
          res.status(200).json({...data});
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='friendshipStart')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('friend'))) {
        console.log('friendshipStart');
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
          console.log('data');
          console.log(data);
          delete data._id;
          delete data.token;
          delete data.atoken;
          res.status(200).json({...data});
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make});
      }

      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='friendshipEnd')&&(req.headers.hasOwnProperty('authorization'))&&(req.headers.authorization!=='')&&(req.hasOwnProperty('body'))&&(req.body.hasOwnProperty('friend'))) {
        console.log('friendshipEnd');
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
        console.log('askToAdd');
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          let data = await mongo.find({login: req.body.login})
          console.log('data');
          console.log(data);
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
        else res.status(401).json({err: 'login not found', make: req.headers.make})
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
            else res.status(401).json({ res: 'not ok', error: 'pass incorrect', make: req.headers.make})
          });
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='lists')&&(req.headers.hasOwnProperty('authorization')))
      {
        console.log('\n\nlists\n\n')
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        let realLists = [];
        let needUpd = false;
        console.log('atoken')
        console.log(atoken)
        console.log('extData.length')
        console.log(extData.length)
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
            console.log('lists111: ');
            console.log(realLists);
            if (needUpd) mongo.updateOne({login: extData[0].login}, {lists: realLists})
            res.status(200).json({ lists: resData })
          }
          else 
          res.status(200).json({lists: [{name: 'Тестовый лист', author: 'nop', data: []}]})
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='setList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body')))
      {
        console.log('\n\n\n\nsetList\n\n\n\n');
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken})
        if (extData.length!==0) {
          //console.log('add')
          let realLists = [];
          let needUpd = false;      
          let buf;
          if (typeof(req.body)==='string') buf = JSON.parse(req.body);
          else buf = req.body;
          let answ = await mongo.addList(extData[0].login, buf);
          //console.log('\n\n\nset\n\n\n');
          //console.log(buf.accessUsers)
          //console.log(answ);
          let resData = [];
          for (let i=0; i<answ[0].lists.length; i++) {
            let row = answ[0].lists[i];
            //console.log(row)
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

        console.log('\nupdList\n')
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        //console.log(extData)
        if ((extData.length!==0)&&(req.body.list)) {
          //console.log(req.body.list);
          let answ = [];
          try{answ = await mongo.updList(extData[0].login, req.body.list);}
          catch(e){console.log('\x1b[31mошибка ебучая блять\x1b[0m')}
          //console.log('answ')
          //console.log(answ);
          if ((answ[0].access==='friends')||(answ[0].access==='users')) {
            answ[0].accessUsers.map((log)=>{
              extData = mongo.find({login: log});
              extData.then((exDataRes)=>{
                //console.log(exDataRes);
                if ((exDataRes.length!==0)&&(!exDataRes[0].lists.includes(answ[0].id))) {
                  let extBufM = exDataRes[0].lists;
                  extBufM.push(answ[0].id);
                  let resM = mongo.updateOne({login: log}, {lists: extBufM});
                  resM.then((result)=>console.log(result))
                }
              });
            })
          }
          res.status(200).json({ message: 'list upd', list: req.body.list })
        }
        else res.status(401).json({err: 'login not found', make: req.headers.make})
        //console.log('exit');
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='delList')&&(req.headers.hasOwnProperty('authorization'))&&(req.hasOwnProperty('body'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});            
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        //console.log(buf)
        if (extData.length!==0) {
          if (buf.id!=='') {
            let reee = await mongo.deleteList(Number(buf.id));
            res.status(200).json({res: reee});
          }
          else res.status(402).json({res: 'incorrect', make: req.headers.make});
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='checkMail')&&(req.headers.hasOwnProperty('authorization'))) {
        let atoken=req.headers.authorization.substr(7)
        let extData = await mongo.find({token: atoken});
        //console.log(extData);
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
        //console.log(extData);            
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        //console.log(buf);
        let bufB = {};
        Object.keys(buf).map((key)=>{if ((key!=='_id')&&(key!=='emailValid')&&(key!=='login')) bufB[key]=buf[key]});
        //console.log(bufB);
        if (extData.length!==0) {
          if (buf.id!=='') {
            if (extData[0].email!==buf.email.trim()) buf.emailValid=false;
            await mongo.updateOne({login: extData[0].login}, buf);
            let reee = await mongo.find({token: atoken});
            res.status(200).json({data: reee});
          }
          else res.status(402).json({res: 'incorrect', make: req.headers.make});
        }
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
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
          else res.status(401).json({error: 'no list', make: req.headers.make});
        }
        else res.status(200).json({error: 'incorrect'});
      }
      else if ((req.headers.hasOwnProperty('make'))&&(req.headers.make==='updUList')&&(req.hasOwnProperty('body'))) {
        console.log('\n\nupdul\n\n')
        let buf;
        if (typeof(req.body)==='string') buf = JSON.parse(req.body);
        else buf = req.body;
        //console.log(buf)
        if (Number(buf.list.id)) {
          //console.log('im here')
          let row = await mongo.findLists(Number(buf.list.id));
          //console.log(row)
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

    else if (req.method==='DELETE') {      
      let buf;
      console.log('\n\n\n\ndelete\n\n\n\n\n');
      //console.log(Object.keys(req))
      //console.log(Object.keys(req.body))
      //console.log(req.body);
      //console.log(typeof(req.body));
      if (typeof(req.body)==='string') buf = JSON.parse(req.body);
      else buf = req.body;
      //console.log(buf)
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
        else res.status(401).json({error: 'unautorized', make: req.headers.make})
      }
      else res.status(200).json({test: 'ok'})
    }
    else console.log(req.method);
    console.log('end')
  }