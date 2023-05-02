const MongoClient = require("mongodb").MongoClient;
let mongoClient;
let db;
let collection;
let listCollection;
let sumListCollection;
let serialCollection;
let treningCollection;
let logger;

class mongoFunc {
    constructor(uri, loggerS) {
        mongoClient = new MongoClient(uri);
        db = mongoClient.db("usersdbList");
        collection = db.collection("usersLData");
        listCollection = db.collection("listsData");
        sumListCollection = db.collection("sumListsData");
        serialCollection = db.collection("serListsData");
        treningCollection = db.collection("treningData");
        logger = loggerS;
    }

    async find(obj) {
        logger.trace('find');
        let extBuf = [];
        try {
            await mongoClient.connect();
            if (obj) {
                extBuf = await collection.find(obj).toArray();
            }
            else {
                extBuf = await collection.find().toArray();
            }
        }catch(err) {
            logger.error('not find')
            extBuf=[];
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }

    async findSerial(login) {
        logger.trace('find serial');
        let extBuf = [];
        try {
            await mongoClient.connect();
            if (login) {
                extBuf = await serialCollection.find({login: login}).toArray();
            }
            else {
                extBuf = await serialCollection.find().toArray();
            }
            if (extBuf.length!==0) extBuf[0].res = true;
            else extBuf[0] = {res: false};
        }catch(err) {
            extBuf[0] = {res: false};
            logger.error('not find serial')
        } finally {
            await mongoClient.close();
            return extBuf[0];
        }
    }

    async findTrening(login) {
        logger.trace('find trening');
        let extBuf = [];
        try {
            await mongoClient.connect();
            if (login) {
                extBuf = await treningCollection.find({login: login}).toArray();
            }
            else {
                extBuf = await treningCollection.find().toArray();
            }
            if (extBuf.length!==0) extBuf[0].res = true;
            else extBuf[0] = {res: false};
        }catch(err) {
            extBuf[0] = {res: false};
            logger.error('not find trening')
        } finally {
            await mongoClient.close();
            return extBuf[0];
        }
    }

    async incertOne(obj) {
        logger.trace('incertOne');
        try {
            await mongoClient.connect();
            await collection.insertOne(obj);
        }catch(err) {
            logger.error('incertOne')
        } finally {
            await mongoClient.close();
        }
    }

    async incertOneSerial(obj) {
        logger.trace('incertOneSerial');
        let extBuf = {};
        try {
            await mongoClient.connect();
            await serialCollection.insertOne(obj);
            extBuf = await serialCollection.findOne({login: obj.login});
            if (extBuf) extBuf.res=true;
            else extBuf = {res: false};
        }catch(err) {
            logger.error('err');
            extBuf = {res: false};
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }


    async incertOneTrening(obj) {
        logger.trace('incertOneTrening');
        let extBuf = {};
        try {
            await mongoClient.connect();
            await treningCollection.insertOne(obj);
            extBuf = await treningCollection.findOne({login: obj.login});
            if (extBuf) extBuf.res=true;
            else extBuf = {res: false};
        }catch(err) {
            logger.error('err');
            extBuf = {res: false};
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }
    async updateOne(oldObj, obj) {
        logger.trace('updateOne');
        let userLogin;
        try {
            await mongoClient.connect();
            userLogin = await collection.updateOne(
                oldObj, 
                {$set: obj});
        }catch(err) {
            logger.error('err');
        } finally {
            await mongoClient.close();
            return userLogin
        }
    }

    async updateOneSerial(login, obj) {
        logger.trace('updateOneSerial');
        let extBuf = {};
        if (obj.hasOwnProperty('_id')) delete(obj._id);
        try {
            await mongoClient.connect();
            await serialCollection.updateOne(
                {login}, 
                {$set: obj});
            extBuf = await serialCollection.findOne({login});
            if (extBuf) extBuf.res=true;
            else extBuf = {res: false};
        }catch(err) {
            logger.error('err');
            extBuf = {res: false};
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }

    async updateOneTrening(login, obj) {
        logger.trace('updateOneTrening');
        let extBuf = {};
        if (obj.hasOwnProperty('_id')) delete(obj._id);
        try {
            await mongoClient.connect();
            await treningCollection.updateOne(
                {login}, 
                {$set: obj});
            extBuf = await treningCollection.findOne({login});
            if (extBuf) extBuf.res=true;
            else extBuf = {res: false};
        }catch(err) {
            logger.error('err');
            extBuf = {res: false};
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }

    async addList(login, list) {
        logger.trace('addList');
        let bufList;
        if(typeof(list)==='string') bufList=JSON.parse(list);
        else bufList=list;
        let userLogin;
        try {
            await mongoClient.connect();
            let id = 0;
            let buf = await listCollection.find().toArray();
            if (buf.length!==0) id = buf[buf.length-1].id+1;
            let saveData = {...bufList};
            saveData.id=id;
            await listCollection.insertOne(saveData);
            userLogin = await collection.find({ login: login }).toArray();
            if (typeof(userLogin[0].lists)!==typeof([])) userLogin[0].lists=[];
            userLogin[0].lists.push(id);
            if (list.accessUsers.length===0) {
                await collection.updateOne(
                    {login: login}, 
                    {$set: {lists: userLogin[0].lists} });
            }
            else for (let i=0; i<list.accessUsers.length; i++ ) {
                let bUser = await collection.find({ login: list.accessUsers[i] }).toArray();
                if (typeof(bUser[0].lists)!=='object') bUser[0].lists=[];
                bUser[0].lists.push(id);
                await collection.updateOne(
                    {login: list.accessUsers[i]}, 
                    {$set: {lists: bUser[0].lists} });            
            }
            userLogin = await collection.find({login: login}).toArray();
        }catch(e){
            logger.error('err');
        } finally {
            await mongoClient.close();
            return userLogin;
        }

    }

    async addSumList(login, list) {
        logger.trace('addSumList');
        let bufList;
        if(typeof(list)==='string') bufList=JSON.parse(list);
        else bufList=list;
        let userLogin;
        let succ = true;
        let id = 0;
        try {
            await mongoClient.connect();
            let buf = await sumListCollection.find().toArray();
            if (buf.length!==0) id = buf[buf.length-1].id+1;
            let saveData = {...bufList};
            saveData.id=id;
            saveData.saved = true;
            await sumListCollection.insertOne(saveData);
            userLogin = await collection.find({ login: login }).toArray();
            if (typeof(userLogin[0].sumLists)!==typeof([])) userLogin[0].sumLists=[];
            userLogin[0].sumLists.push(id);
            await collection.updateOne(
                {login: login}, 
                {$set: {sumLists: userLogin[0].sumLists} });
            userLogin = await collection.find({login: login}).toArray();
        }catch(e){
            logger.error('err');
            succ = false;
        } finally {
            await mongoClient.close();
            return {res: succ, id, user: userLogin}
        }
    }

    async updList(login, list, unlog) {
        logger.trace('updList');
        let bufList;
        if(typeof(list)==='string') bufList=JSON.parse(list);
        else bufList=list;
        let userLogin;
        try {
            await mongoClient.connect();
            await listCollection.updateOne(
                {id: Number(bufList.id)}, 
                {$set: (unlog ? {data: bufList.data} : { name: bufList.name, author: bufList.author, data: bufList.data, access: bufList.access, accessUsers: bufList.accessUsers })});
            userLogin = await listCollection.find({id: Number(bufList.id)}).toArray();
        }catch(e){
            logger.error('err');
        } finally {
            await mongoClient.close();
            if (!unlog) await this.insUpdList(userLogin);
            return userLogin;
        }

    }

    async updSumList(login, list) {
        logger.trace('updSumList');
        let bufList;
        if(typeof(list)==='string') bufList=JSON.parse(list);
        else bufList=list;
        let userLogin;
        let res = true;
        try {
            await mongoClient.connect();
            await sumListCollection.updateOne(
                {id: Number(bufList.id)}, 
                {$set: {data: bufList.data}});
            userLogin = await sumListCollection.find({id: Number(bufList.id)}).toArray();
        }catch(e){
            logger.error('err');
            res = false;
        } finally {
            await mongoClient.close();
            return { res, list: userLogin }
        }

    }

    async insUpdList(userLogin) {
        try {
            logger.trace('insUpdList');
            await mongoClient.connect();
            for (let i=0; i<userLogin[0].accessUsers.length;i++) {
                let dat = userLogin[0].accessUsers[i];
                let logData = await collection.find({login: dat}).toArray(); 
                if (!logData[0].lists.includes(bufList.id)) {
                    logData[0].lists.push(id);
                    await collection.updateOne(
                        {login: dat}, 
                        {$set: {lists: logData[0].lists} }
                    );
                }   
            }
        } catch (error) {
            logger.error('err');
        } finally {
            logger.trace('end insUpdList');
        }
    }

    async deleteOne(login, hash) {
        logger.trace('deleteOne');
        let extBuf = [];
        try {
            await mongoClient.connect();
            if (login!=='') {
                await collection.findOneAndDelete({name: login});
                extBuf = await collection.find(obj).toArray();
            }
            else if (hash!=='') await collection.findOneAndDelete({token: hash});
        }catch(err) {
            logger.error('err');
        } finally {
            await mongoClient.close();
            if (extBuf.length>0) return extBuf[0].token;
            else return hash;
        }

    }

    async incertOneList(obj) {
        logger.trace('incertOneList');
        try {
            await mongoClient.connect();
            await listCollection.insertOne(obj);
        }catch(err) {
            logger.error('err');
        } finally {
            await mongoClient.close();
        }
    }

    async countLists() {
        logger.trace('countLists');
        let count = 0;
        try {
            await mongoClient.connect();
            count = await listCollection.countDocuments();
        }catch(err){
            logger.error('err');
        }finally {
            await mongoClient.close();
            return count;
        }
    }    

    async findLists(id) {
        let extBuf = [];
        try {
            await mongoClient.connect();
            extBuf = await listCollection.find({id: id}).toArray();
        }catch(err) {
            logger.error('err');
            extBuf=[{mes: 'error'}];
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }

    async findSumLists(id) {
        logger.trace('findSumLists');
        let extBuf = [];
        try {
            await mongoClient.connect();
            extBuf = await sumListCollection.find({id: id}).toArray();
        }catch(err) {
            logger.error('err');
            extBuf=[{mes: 'error'}];
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }

    async deleteList(id) {
        logger.trace('deleteList');
        try {
            await mongoClient.connect();
            await listCollection.deleteOne({id: id});
        } catch(e) {
            logger.error('err');
            return false;
        } finally {
            await mongoClient.close();
            return true;
        }
    }

    async deleteSumList(id) {
        logger.trace('deleteSumList');
        let res = true;
        try {
            await mongoClient.connect();
            await sumListCollection.deleteOne({id: id});
        } catch(e) {
            logger.error('err');
            res = false;
        } finally {
            await mongoClient.close();
            return res;
        }
    }

    async deleteSerialsFromList(login, category, serials) {
        logger.trace('deleteSerialsFromList');
        let ext = {res: false}
        try {
            await mongoClient.connect();
            if (serials.length) {
                let buf = await serialCollection.findOneAndDelete({login: login});
                if (buf.value.hasOwnProperty(category)) {
                    await serials.map((item)=>{
                        delete(buf.value.list[category][item]);
                    })
                    delete(buf.value._id);
                }
                if (buf.lastErrorObject.n) {
                    await serialCollection.insertOne(buf.value);
                    let extBuf = await serialCollection.find({login: login}).toArray;
                    ext = {...extBuf[0]};
                    ext.res=true;
                }
            }
        } catch(e) {
            logger.error('err');
            ext = {res: false}
        } finally {
            await mongoClient.close();
            return ext;
        }
    }

    async attention() {
        logger.trace('attention');
        try {
            await mongoClient.connect();
            await collection.drop()
        }catch(err) {
            logger.error('err');
        } finally {
            await mongoClient.close();
        }

    }
}

module.exports = mongoFunc;