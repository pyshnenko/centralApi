module.exports.parse = function(originalList) {
    let arr = [];
    for (let key in originalList.list) {
        let inArr = [];
        for (let inKey in originalList.list[key]) {
            inArr.push({...originalList.list[key][inKey], name: inKey})
        }
        arr.push({array: inArr, name: key});
    }
    return {...originalList, list: arr};
}

module.exports.original = function(inList) {
    let extObj = {...inList};
    let bufObj = {};
    inList.list.map((item)=>{
        let buf = {};        
        item.array.map((inItem)=>{
            buf[inItem.name]={...inItem}
            delete(buf[inItem.name].name)
        })
        bufObj[item.name] = buf;
    })
    extObj.list = {...bufObj};
    return extObj;
}

module.exports.parseT = function(originalList) {
    let arr = [];
    for (let key in originalList.categories) {
        let inArr = [];
        let target = 0;
        let onTarget = 0;
        let date = 0;
        for (let inKey in originalList.categories[key]) {
            if (inKey==='target') target = originalList.categories[key][inKey];
            else if (inKey==='onTarget') onTarget = originalList.categories[key][inKey];
            else if (inKey==='date') date = originalList.categories[key][inKey];
            else inArr.push({...originalList.categories[key][inKey], name: inKey})
        }
        arr.push({array: inArr, name: key, target, onTarget, date});
    }
    return {...originalList, list: arr};
}

module.exports.originalT = function(inList) {
    console.log('\n\noriginalT\n\n')
    console.log(inList)
    let extObj = {...inList};
    let bufObj = {};
    inList.list.map((item)=>{
        console.log('\n\noriginalT item\n\n')
        console.log(item)
        let buf = {};        
        item.array.map((inItem)=>{
            buf[inItem.name]={...inItem}
            delete(buf[inItem.name].name)
        })
        buf.target = item.target;
        buf.onTarget = item.onTarget;
        buf.date = item.date;
        console.log('\n\nbuf\n\n')
        console.log(buf)
        bufObj[item.name] = buf;
    })
    extObj.categories = {...bufObj};
    delete(extObj.list);
    console.log(extObj)
    return extObj;
}