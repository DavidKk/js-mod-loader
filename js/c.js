define('c',function(require,exports){
	console.log('c.js');
	var b = require('bAlias');
	console.log('c.js',b.x);
	exports.x = 'c'
})