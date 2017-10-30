require.config({
	paths:{bAlias : 'b'}//,mode: 'AMD'
})
require(['a','bAlias','https://file.qf.56.com/f/modjs/app/common/socket/1.2.x/index.js'],function(a,b,c){
	console.log('require',a.x,b.x,c);
})