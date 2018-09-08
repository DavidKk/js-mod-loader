define(function(require,exports){
	//异步方式加载模块
	require('./async',function(async){
		console.log(async.test);
	})
	console.log('index.js');
	exports.test = 'index';
})