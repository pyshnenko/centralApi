const MongoClient = require("mongodb").MongoClient;
let mongoClient;
let db;
let collection;
let listCollection;

class mongoFunc {
    constructor(uri) {
        mongoClient = new MongoClient(uri);
        db = mongoClient.db("usersdbList");
        collection = db.collection("usersLData");
        listCollection = db.collection("listsData")
    }

    async find(obj) {
        let extBuf = [];
        try {
            await mongoClient.connect();
            if (obj) {
                extBuf = await collection.find(obj).toArray();
            }
            else {
                extBuf = await collection.find().toArray();
            }
            //console.log(extBuf)
        }catch(err) {
            extBuf=[];
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }

    async incertOne(obj) {
        //console.log('inc');
        try {
            await mongoClient.connect();
            await collection.insertOne(obj);
        }catch(err) {
            console.log(err);
        } finally {
            await mongoClient.close();
        }
    }

    async updateOne(oldObj, obj) {
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

    async addList(login, list) {
        console.log('cList');
        let bufList;
        //console.log(list)
        if(typeof(list)==='string') bufList=JSON.parse(list);
        else bufList=list;
        //console.log(bufList)
        let userLogin;
        try {
            await mongoClient.connect();
            let id = 0;
            let buf = await listCollection.find().toArray();
            //console.log(buf)
            //console.log(typeof(buf[buf.length-1].id))
            //console.log(buf.length)
            if (buf.length!==0) id = buf[buf.length-1].id+1;
            let saveData = {...bufList};
            saveData.id=id;
            await listCollection.insertOne(saveData);
            userLogin = await collection.find({ login: login }).toArray();
            //console.log('\n\n82\n\n');
            //console.log(typeof(userLogin[0].lists));
            //console.log(userLogin[0].lists);
            if (typeof(userLogin[0].lists)!==typeof([])) userLogin[0].lists=[];
            //console.log(userLogin[0].lists);
            userLogin[0].lists.push(id);
            //console.log(userLogin);
            if (list.accessUsers.lenght===0) {
                await collection.updateOne(
                    {login: login}, 
                    {$set: {lists: userLogin[0].lists} });
            }
            else {
                list.accessUsers.map(async(num)=>{
                    let bUser = await collection.find({ login: num }).toArray();
                    if (typeof(bUser[0].lists)!=='object') bUser[0].lists=[];
                    bUser[0].lists.push(id);
                    await collection.updateOne(
                        {login: num}, 
                        {$set: {lists: bUser[0].lists} });
                })
            }
            userLogin = await collection.find({login: login}).toArray();
            //console.log(userLogin)
        }catch(e){
            console.log(e)
        } finally {
            await mongoClient.close();
            return userLogin;
        }

    }

    async updList(login, list, unlog) {
        console.log('\x1b[32muList\x1b[0m');
        let bufList;
        //console.log(list)
        if(typeof(list)==='string') bufList=JSON.parse(list);
        else bufList=list;
        //console.log(bufList.id)
        //console.log(bufList.author)
        //console.log(bufList.name)
        let userLogin;
        try {
            await mongoClient.connect();
            await listCollection.updateOne(
                {id: Number(bufList.id)}, 
                {$set: (unlog ? {data: bufList.data} : { name: bufList.name, author: bufList.author, data: bufList.data, access: bufList.access, accessUsers: bufList.accessUsers })});
            userLogin = await listCollection.find({id: Number(bufList.id)}).toArray();
            console.log(userLogin);
            console.log('userLogin');
        }catch(e){
            console.log(e)
        } finally {
            console.log('close');
            await mongoClient.close();
            if (!unlog) await this.insUpdList(userLogin);
            return userLogin;
        }

    }

    async insUpdList(userLogin) {
        try {
            console.log('unlog')
            await mongoClient.connect();
            for (let i=0; i<userLogin[0].accessUsers.lenght;i++) {
                console.log('for');
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
            console.log(error)
        } finally {
            console.log('close2');
        }
    }

    async deleteOne(login, hash) {
        //console.log('del');
        let extBuf = [];
        try {
            await mongoClient.connect();
            if (login!=='') {
                await collection.findOneAndDelete({name: login});
                extBuf = await collection.find(obj).toArray();
            }
            else if (hash!=='') await collection.findOneAndDelete({token: hash});
        }catch(err) {
            console.log(err);
        } finally {
            await mongoClient.close();
            if (extBuf.lenght>0) return extBuf[0].token;
            else return hash;
        }

    }

    async incertOneList(obj) {
        //console.log('inc');
        try {
            await mongoClient.connect();
            await listCollection.insertOne(obj);
        }catch(err) {
            console.log(err);
        } finally {
            await mongoClient.close();
        }
    }

    async countLists() {
        let count = 0;
        try {
            await mongoClient.connect();
            count = await listCollection.countDocuments();
        }catch(err){
            console.log(err);
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
            console.log(err)
            extBuf=[{mes: 'error'}];
        } finally {
            await mongoClient.close();
            return extBuf;
        }
    }

    async deleteList(id) {
        try {
            await mongoClient.connect();
            await listCollection.deleteOne({id: id});
        } catch(e) {
            return false;
        } finally {
            await mongoClient.close();
            return true;
        }
    }

    async attention() {
        //console.log('goodbye');
        try {
            await mongoClient.connect();
            await collection.drop()
        }catch(err) {
            console.log(err);
        } finally {
            await mongoClient.close();
        }

    }
}

module.exports = mongoFunc;