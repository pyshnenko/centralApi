const express = require("express");
const multer  = require("multer");
const cors = require('cors');
const fs = require('fs');
process.title='APIServer';
const app = express();

app.use(cors())

let name = '';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, file.fieldname + '-' + uniqueSuffix);
    name = file.fieldname + '-' + uniqueSuffix;
  }
})

const upload = multer({ storage: storage })
  
app.use(express.static(__dirname));

app.get("/pict*", function(request, response){
    filePath = request.url.substr(1);
    fs.readFile(filePath, function(error, data){              
        if(error){                  
            response.statusCode = 404;
            response.end("Resourse not found!");
            console.log('404');
        }   
        else{
            response.end(data);
        }
    });
});

app.get("/chat*", function(request, response){
    filePath = request.url.substr(1);
    fs.readFile(filePath, function(error, data){              
        if(error){                  
            response.statusCode = 404;
            response.end("Resourse not found!");
            console.log('404');
        }   
        else{
            response.end(data);
        }
    });
});

app.use(upload.single("file"));
app.post("/apiUpload", function (req, res, next) {
   
    let filedata = req.body;
    console.log(req.headers.login);
    console.log(req.headers.fname);
    if(!filedata)
        res.send({res: 'error'});
    else
    {
        let ddir = [];
        let jjj = fs.readdirSync("pict", { withFileTypes: true });
        jjj=jjj.filter(d => d.isDirectory());
        jjj.map(d => ddir.push(d.name));
        console.log(ddir);
        if (!ddir.includes(decodeURI(req.headers.login))) fs.mkdir(`pict/${decodeURI(req.headers.login)}`, err => {
          if(err) throw err; // не удалось создать папку
            console.log('Папка успешно создана');
        });
        let newName = `pict/${req.headers.login ? decodeURI(req.headers.login) : 'base'}/${decodeURI(req.headers.fname)}`;
        fs.rename(`uploads/${name}`, `${newName}`, err => {
          if(err) throw err; // не удалось переместить файл
            console.log('Файл успешно перемещён');
        });
        res.send({res: 'ok', addr: newName});
    }
});

app.post("/apiChat", function (req, res, next) {
   
    let filedata = req.body;
    console.log(req.headers.login);
    console.log(req.headers.fname);
    console.log(req.headers.mode);
    console.log(req.headers.ftype);

    if(!filedata)
        res.send({res: 'error'});
    else
    {
        let ddir = [];
        let jjj = fs.readdirSync("chat", { withFileTypes: true });
        jjj=jjj.filter(d => d.isDirectory());
        jjj.map(d => ddir.push(d.name));
        console.log('folders')
        console.log(ddir);
        if (!ddir.includes(decodeURI(req.headers.login))) {
          console.log('no folder')
          fs.mkdir(`chat/${decodeURI(req.headers.login)}`, err => {
            if(err) throw err; // не удалось создать папку
            console.log('Папка успешно создана');
          });
        }
        let imgF = fs.readdirSync(`chat/${decodeURI(req.headers.login)}`, { withFileTypes: true });
        imgF=imgF.filter(d => d.isDirectory());
        imgF.map(d => ddir.push(d.name));
        console.log('folders')
        console.log(ddir);
        if (!ddir.includes('img')) {
          console.log('no img');
          fs.mkdir(`chat/${decodeURI(req.headers.login)}/img`, err => {
            if(err) throw err; // не удалось создать папку
            console.log('Папка успешно создана');
          });
        }
        let imgD = fs.readdirSync(`chat/${decodeURI(req.headers.login)}`, { withFileTypes: true });
        imgD=imgD.filter(d => d.isDirectory());
        imgD.map(d => ddir.push(d.name));
        console.log('folders')
        console.log(ddir);
        if (!ddir.includes('docs')) {
          console.log('no docs');
          fs.mkdir(`chat/${decodeURI(req.headers.login)}/docs`, err => {
            if(err) throw err; // не удалось создать папку
            console.log('Папка успешно создана');
          });
        }
        let newName = `chat/${req.headers.login ? decodeURI(req.headers.login) : 'base'}/${req.headers.ftype==='image'?'img':'docs'}/${Number(new Date())}-${decodeURI(req.headers.fname)}`;
        fs.rename(`uploads/${name}`, `${newName}`, err => {
          if(err) throw err; // не удалось переместить файл
            console.log('Файл успешно перемещён');
        });
        res.send({res: 'ok', addr: newName});
    }
});
app.listen(8766);