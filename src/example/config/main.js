require.config({
	baseUrl: 'example/config/js/page/',//基准路径
	alias: {'aAlias':'a/'}//别名设置
})
require(['index'],function(index){
	console.log('exec main.js',index);
});