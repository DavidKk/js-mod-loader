require.config({
	mode: 'AMD' //默认为CMD
})
require(['example/amd/js/index'],function(index){
	console.log('exec main.js',index);
});