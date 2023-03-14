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
    console.log(originalList)
    let arr = [];
    for (let key in originalList.categories) {
        let inArr = [];
        for (let inKey in originalList.categories[key]) {
            inArr.push({...originalList.categories[key][inKey], name: inKey})
        }
        arr.push({array: inArr, name: key});
    }
    console.log({...originalList, list: arr})
    return {...originalList, list: arr};
}

module.exports.originalT = function(inList) {
    console.log(inList)
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
    extObj.categories = {...bufObj};
    delete(extObj.list);
    console.log(extObj)
    return extObj;
}