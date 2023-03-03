const axios = require('axios');
const {session} = require('telegraf');

async function sendPost(obj, make, token) {
    let baseURL = 'https://spamigor.site/api';
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
        console.log(res.status); 
        //console.log(res.data); 
        return res;
    }
    catch(e) {
        //console.log(e)
        return (e.response)
    }
}

module.exports = sendPost