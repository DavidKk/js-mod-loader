require.config({
	path:{test : 'b'}
})
define(function(require){
	var c = require('c');
	// var b = require('test');
	console.log('a.js'/*,b.x*/,c.x);
})