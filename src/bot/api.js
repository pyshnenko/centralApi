const axios = require('axios');
const {session} = require('telegraf');
const log4js = require("log4js");
log4js.configure({
    appenders: { api: { type: "file", filename: "log/api.log" }, 
        console: { type: 'console' } },
    categories: { default: { appenders: ['console', "api"], level: "all" } },
  });
const logger = log4js.getLogger("bot");

async function sendPost(obj, make, token) {
    let baseURL = 'https://spamigor.ru/api';
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
        //console.log(res.data); 
        logger.info(`Удачный запрос на ${make}`);
        return res;
    }
    catch(e) {
        //console.log(e)
        logger.error(`Неудачный запрос на ${make} статус ${e.status}`);
        return (e.response)
    }
}

module.exports = sendPost