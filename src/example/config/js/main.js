require.config({
	baseUrl: 'js/page/',//基准路径
	paths: {'aAlias':'a/'},//别名设置
	mode: 'AMD'//加载模式
})
require(['index'],function(index){
	console.log(index);
});