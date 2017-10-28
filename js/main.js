require.config({
	path:{bAlias : 'b'},
	baseUrl: location.host+location.pathname.substring(0,location.pathname.lastIndexOf('/'))+'/js/'
})
require(['a','bAlias'],function(a,b){
	console.log('require',a.x,b.x);
})