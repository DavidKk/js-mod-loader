define('a',function(require,exports){
	//使用exports接口返回数据
	exports.test='a';
})
//出口模块不用声明模块名称
define(['a'],function(a){
	console.log(a.test);
	//用return也能直接返回模块数据
	return a;
})