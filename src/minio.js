require('dotenv').config();
const Minio = require('minio');
const log4js = require("log4js");
log4js.configure({
    appenders: { 
        bot: { type: "file", filename: "./log/minio.log" }, 
        console: { type: 'console' }
    },
    categories: { default: { appenders: ['console', "bot"], level: "all" }},
});
const logger = log4js.getLogger("bot2");

class MinioClass {

  s3Client;
  s3ClientNew;
  #bucket;
  status = false;
  #url;

  constructor (endPoint, accessKey, secretKey, useSSL, bucket) {
    this.#createClient(endPoint, accessKey, secretKey, useSSL);
    this.#bucket = bucket;
    this.status = this.askBuckets();
    this.#url = `${useSSL?'https':'http'}://${endPoint}/${bucket}/`
  }

  #createClient(endPoint, accessKey, secretKey, useSSL) {
    this.s3Client = new Minio.Client({
      endPoint,
      useSSL,
      accessKey,
      secretKey
    });
    this.s3ClientNew = new Minio.Client({
      endPoint: process.env.ENDPOINTNEW,
      port: 9000,
      useSSL: true,
      accessKey: process.env.ACCESSNEW,
      secretKey: process.env.SECRETNEW
    });
  }

  askBuckets() {
    let prom1 = this.s3Client.listBuckets()
    
      .then((res)=>{
        
        logger.info('connection whith s3 successfull')
        console.log('buckets :', res);

        for (let i = 0; i < res.length; i++) {
          console.log(res[i].name);
          if (res[i].name === this.#bucket) return this.#askPolicy();
        }
        console.log('next')
        
        return this.createBucket(this.#bucket);

      })

      .catch((rej) => {      
        console.log(e);
        logger.error('error on listAsk')
      });
  }

  async #askPolicy() { 
    console.log('askPolicy');
    let policy = this.s3Client.getBucketPolicy(this.#bucket)
      .then((res)=>{
        console.log(`Bucket policy: ${res}`)
        const bucketPolicy = JSON.parse(res);
        if (bucketPolicy.Statement.length !== 1) {
          this.#setPolicy();
        }
        else this.status = true;
      })
      .catch((err)=>{
        console.log(err.code);
        if (err.code==='NoSuchBucketPolicy') {
          console.log(this.#bucket);
          logger.warn('no policy');
          this.#setPolicy();
        }
        else {
          logger.error('some error with connection');
          this.status = false;
        }
      })
      console.log('askPolicyNew');
      let policynew = this.s3ClientNew.getBucketPolicy(this.#bucket)
        .then((res)=>{
          console.log(`Bucket policy: ${res}`)
          const bucketPolicy = JSON.parse(res);
          if (bucketPolicy.Statement.length !== 1) {
            this.#setPolicy();
          }
          else this.status = true;
        })
        .catch((err)=>{
          console.log(err.code);
          if (err.code==='NoSuchBucketPolicy') {
            console.log(this.#bucket);
            logger.warn('no policy');
            this.#setPolicy();
          }
          else {
            logger.error('some error with connection');
            this.status = false;
          }
        })
  }

  createBucket(bucket) {
    let p = this.s3Client.makeBucket(bucket)
      .then((res)=>{
        logger.info('bucket created')
        console.log("Success")
        this.#askPolicy();
      })
      .catch((e)=>{
        logger.error('some error with creating bucket');
        console.log(e);
        this.status = false
      })
      let pNew = this.s3ClientNew.makeBucket(bucket)
        .then((res)=>{
          logger.info('bucket created')
          console.log("Success")
          this.#askPolicy();
        })
        .catch((e)=>{
          logger.error('some error with creating bucket');
          console.log(e);
          this.status = false
        })
  }

  #setPolicy() {
    console.log('set policy');
    let p0 = this.constructor.getMyPolicy(this.#bucket);
    let p1 = this.s3Client.setBucketPolicy(this.#bucket, p0)
      .then((res)=>{
        console.log(res)
        logger.info('policy set')
        this.status = true;
      })
      .catch((err)=>{
        console.log(err);
        logger.error('error whith set policy');
        this.status = false;
      })
    let p1new = this.s3ClientNew.setBucketPolicy(this.#bucket, p0)
      .then((res)=>{
        console.log(res)
        logger.info('policy set')
        this.status = true;
      })
      .catch((err)=>{
        console.log(err);
        logger.error('error whith set policy');
        this.status = false;
      })
  }

  async getJson2(name) {

    try {
      let p = await this.s3Client.getObject(this.#bucket, name+'/chat.json');
      
      console.log(p);
      let exP = JSON.parse(p);
      logger.debug('datas read')
    }
    catch(e) {
      if (e.code==='NoSuchKey') {
        logger.info('start new chat with ' + name);
        this.uploadJson([], name);
        return [];
      }
      console.log(e);
      logger.error('error with getJson');
      return ['error']
    }
  }

  async uploadJson(data, name, CPU) {
    console.log('upload Json  yyy')
    const fileMetaData = {
      'Content-Type': `application/json`,
    };
    try {
      await this.s3Client.putObject(this.#bucket, CPU ? 'systemD/data.json' : name +'/chat.json', JSON.stringify(data), fileMetaData);
    }
    catch (e) {
      console.log(e)
    };
    console.log('upload2')
    try {
      await this.s3ClientNew.putObject(this.#bucket, CPU ? 'systemD/data.json' : name +'/chat.json', JSON.stringify(data), fileMetaData);
    }
    catch (e) {
      console.log(e)
    }
  }

  getJson(name, res, rej, CPU) {
    let data, dataS='';
    console.log('getJson');
    console.log(name);
    let uJ = this.uploadJson;
    let prom = this.s3Client.getObject(this.#bucket, CPU ? 'systemD/data.json' : name +'/chat.json', function(e, dataStream) {
        if (e) {
          if (e.code==='NoSuchKey') {
            if (CPU) {
              logger.info('no cpu data');
              res({mem: {}, cpu: {}});
            }
            else {
              logger.info('start new chat with ' + name);
              uJ([], name);
              res([]);
            }
          }
          console.log(e);
          logger.error('error with getJson');
          rej(['error'])
        }
        else {
          try {
            dataStream.on('data', function(chunk) {
              console.log('chunk');
              dataS += chunk
            });
            dataStream.on('end', function() {
              data=JSON.parse(dataS);
              console.log('stream end');
              console.log(data);
              res(data);
              return
            })
            dataStream.on('error', function(e) {
              console.log('stream err');
              console.log(e.code);
            })
          }
          catch(e) {
            if (e.code==='NoSuchKey') {
              if (CPU) {
                logger.info('no cpu data');
                res({mem: {}, cpu: {}});
              }
              else {
                logger.info('start new chat with ' + name);
                uJ([], name);
                res([]);
              }
            }
            console.log(e);
            logger.error('error with getJson');
            rej(['error'])
        }}});
  }

  static getMyPolicy(themeBt) {
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

}

module.exports = MinioClass;