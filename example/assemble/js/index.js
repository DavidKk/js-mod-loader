define('a',function(require,exports){
	exports.test='a';
})
define(['a'],function(a){
	console.log(a.test);
})