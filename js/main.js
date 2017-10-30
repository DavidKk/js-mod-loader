require.config({
	paths:{bAlias : 'b'}//,mode: 'AMD'
})
require(['a','bAlias'],function(a,b,c){
	console.log('require',a.x,b.x,c);
})