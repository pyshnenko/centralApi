require('dotenv').config();
const url = process.env.MONGO_URL;
const username = process.env.MONGO_USERNAME;
const password = process.env.MONGO_PASS;
const authMechanism = "DEFAULT";
const uri =`mongodb://${username}:${password}@${url}/?authMechanism=${authMechanism}`;
const MongoClient = require("mongodb").MongoClient;
let mongoClient;
let db;
let collection;
mongoClient = new MongoClient(uri);
db = mongoClient.db("usersdbList");
collection = db.collection("usersLData");

console.log('hello');

start();

async function start() {

    if ((process.argv[2]==='-dTg')&&(process.argv[3])) {
        await updateOne({login: process.argv[3]}, {telegram: '', telegramID: 0, telegramValue: false});
    }

    else if ((process.argv[2]==='-dUs')&&(process.argv[3])) {
        console.log('delete '+process.argv[3])
        await deleteOne(process.argv[3]);
    }

    else if ((process.argv[2]==='-u')) {
        console.log( await usList());
    }

    else console.log(process.argv[2])
}

async function usList() {
    //console.log('del');
    let extBuf = [];
    try {
        await mongoClient.connect();
        extBuf = await collection.find().toArray();
    }catch(err) {
        console.log(err);
    } finally {
        await mongoClient.close();
        return extBuf;
    }

}

async function deleteOne(login) {
    //console.log('del');
    let extBuf = [];
    try {
        await mongoClient.connect();
        console.log(await collection.findOneAndDelete({login: login}));
    }catch(err) {
        console.log(err);
    } finally {
        await mongoClient.close();
    }

}

async function updateOne(oldObj, obj) {
    //console.log('upd');
    let userLogin;
    try {
        await mongoClient.connect();
        userLogin = await collection.updateOne(
            oldObj, 
            {$set: obj});
    }catch(err) {
        console.log(err);
    } finally {
        await mongoClient.close();
        return userLogin
    }
}