module.exports.test = function() {
    console.log('hello');
    return ('rHello')
}

module.exports.compareList = function(...arr) {
    console.log('compare');
    console.log(arr[0]);
    let compArr = { name: [], sumTotal: [], total: [], ind: [] };
    let lists = { name: [], num: [] };
    if (Array.isArray(arr[0])) {
        arr[0].map((item)=>{
            lists.name.push(item.name);
            lists.num.push(item.id);
            item.data.map((item2, index)=>{
                if (!compArr.name.includes(item2.name.toLocaleLowerCase())) {
                    compArr.name.push(item2.name.toLocaleLowerCase());
                    compArr.total.push(0);
                    if (!item2.selected) compArr.total[index] = item2.total;
                    compArr.sumTotal.push(item2.total);
                    compArr.ind.push(item2.ind);
                }
                else {
                    if (!item2.selected) compArr.total[compArr.name.indexOf(item2.name.toLocaleLowerCase())]+=item2.total;
                    compArr.sumTotal[compArr.name.indexOf(item2.name.toLocaleLowerCase())]+=item2.total;
                    if (compArr.ind[compArr.name.indexOf(item2.name.toLocaleLowerCase())]==='') 
                        compArr.ind[compArr.name.indexOf(item2.name.toLocaleLowerCase())]=item2.ind;
                }
            })
        })
        let extObj = {lists, id: 0, saved: false, data: []};
        compArr.name.map((item, index)=>{
            extObj.data.push({
                name: item[0].toLocaleUpperCase()+item.slice(1), 
                total: compArr.total[index], 
                sumTotal: compArr.sumTotal[index], 
                selected: compArr.total[index]===0, 
                ind: compArr.ind[index] });
        })
        return extObj;
    }
    return null
}