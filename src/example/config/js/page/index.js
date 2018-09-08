define(function(require,exports){
	//使用exports接口返回数据
	console.log('index.js call');
	var a = require('aAlias');
	exports.test=a.test;
})