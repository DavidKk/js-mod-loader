require.config({
	path:{test : 'b'}
})
define(function(require){
	var b = require('test');
	console.log('a.js',b.x);
})