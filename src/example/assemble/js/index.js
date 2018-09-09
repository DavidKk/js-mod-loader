define('modA', function(require, exports) {
    console.log('exec module modA')
    //使用exports接口返回数据
    exports.test = 'a';
})
define('modB', function(require, exports) {
    console.log('exec module modB')
    //使用exports接口返回数据
    exports.test = 'b';
})
//出口模块不用声明模块名称
define(['modA', 'modB'], function(modA, modB) {
    console.log('exec module ano', modA.test, modB.test);
    //用return也能直接返回模块数据
    return {
    	modA:modA,
    	modB:modB
    }
})