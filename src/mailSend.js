const fs = require("fs");
var CryptoJS = require("crypto-js");
const nodemailer = require('nodemailer');
let testEmailAccount = nodemailer.createTestAccount();
let myURL = 'http://212.22.94.200:8765';

let options = {
    key: fs.readFileSync("/home/spamigor/next/api/js/centralApi/src/sert/privkey.crt"),
    cert: fs.readFileSync("/home/spamigor/next/api/js/centralApi/src/sert/fullchain.crt"),
	ca: fs.readFileSync("/home/spamigor/next/api/js/centralApi/src/sert/chain.crt")
};

let transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',//'smtp.mail.ru',
    port: 465,
    secure: true,
    key: options.key,
    cert: options.sert,
    ca: options.ca,
    auth: {
      user: 'pyshnenko94@gmail.com',//'mazepaspam@mail.ru',
      pass: 'jicymvjnhdacalcl',//'18nK7ijCnMbv3wbKu0e6',
    },
});

let sKey = '18nK7ijCnMbv3wbKu0e6';

class mailFunction {
    constructor(url, salt) {
        if (url) myURL=url;
        if (salt) sKey=salt;
    }

    urlAsk() {
        return myURL;
    }

    async cryptHash(hash) {
        console.log(hash);
        let buf = hash.toString();
        let ciphertext = encodeURIComponent(await CryptoJS.AES.encrypt(buf, sKey).toString());
        console.log(ciphertext);
        return ciphertext;
    }

    async decryptHash(ciphertext) {
        console.log(ciphertext);
        console.log(decodeURIComponent(ciphertext))
        let bytes = await CryptoJS.AES.decrypt(decodeURIComponent(ciphertext), sKey);
        console.log(bytes);
        let originalText = await bytes.toString(CryptoJS.enc.Utf8);
        console.log(originalText);
        return originalText;
    }

    async sendMail(addr, hash) {
        console.log('addr', addr)
        let hashS = await this.cryptHash(hash);
        let hashA = await this.cryptHash(addr);
        transporter.sendMail({
            from: '<pyshnenko94@gmail.com>',//'<mazepaspam@mail.ru>',
            to: addr,
            subject: 'Подтверждение почты',
            text: `Подтвердите почту ${addr} пройдя по ссылке ${myURL}/api?name=${hashS}&addr=${hashA}`,
            html:
            `Подтвердите почту ${addr} пройдя по ссылке <a href="${myURL}/api?name=${hashS}&addr=${hashA}">тыкни сюда</a>`,
        }).catch((e) => {console.log('error',e)});
    }
}

module.exports = mailFunction;