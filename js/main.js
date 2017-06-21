require.config({
	path:{bAlias : 'b'}
})
require(['a','bAlias'],function(a,b){
	console.log('require',a.x,b.x);
})