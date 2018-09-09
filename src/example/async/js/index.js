define(function(require,exports){
	//异步方式加载模块
	require('./async',function(async){
		console.log('require async cb',async.test);
	})
	console.log('exec index.js');
	exports.test = 'index';
})