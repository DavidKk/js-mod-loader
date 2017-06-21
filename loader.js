/**
 * Author: lisong
 * TODO: 符合AMD标准的模块加载器
 */
(function(window){
	"use strict"
	var moduleStack = [];//模块栈
	var parentModuleNameMap = {};//父模块名映射
	var nowModule = null;//当前处理的模块
	var customModuleName = '';//自定义的模块名
	var nowDependencies = [];//当前待处理的未解析的依赖名称数组
	//工具类
	var Util = {
		baseUrl: '',
		path: [],
		suffixReg: /\.([a-zA-Z]+)$/,//文件后缀
		lastSeparatorReg: /\/[a-zA-Z_-]+\/?$/,//匹配最后一个有效/分隔符
		paramWithOneReg: /function *\(([a-zA-Z_$\-\d]+)\)/,//匹配一个参数
		paramWithTwoReg: /function *\(([a-zA-Z_$\-\d]+),([a-zA-Z_$\-\d]+)\)/,//匹配两个个参数
		paramWithTreeReg: /function *\(([a-zA-Z_$\-\d]+),([a-zA-Z_$\-\d]+),([a-zA-Z_$\-\d]+)\)/,//匹配三个参数
		noteReg: /\/\/[\s\S]*?\n|\/\*[\s\S]*?\*\//mg,//去除注释
		//初始化
		init: function(){
			//设置baseUrl
			if(!this.baseUrl){
				var scripts = document.getElementsByTagName('script');
				var script = scripts[scripts.length -1];
				var main = script.getAttribute('data-main');
				if(main){
					var separator = main.search(this.lastSeparatorReg);
					var moduleName = separator!=-1 ? main.substr(separator+1) : main;
					main = separator!=-1 ? main.slice(0,separator)+'/':'';
					if(main.charAt(0)=='/'){
						this.baseUrl = location.protocol+'//'+location.host+main.substr(1);
					}else{
						main = main.replace('./','');
						this.baseUrl = location.href.substring(0,location.href.lastIndexOf('/')+1)+main;
					}
					_require(moduleName,true);
				}else{
					this.baseUrl = location.href.substring(0,location.href.lastIndexOf('/')+1);
				}
			}
			//设置全局变量
			//window.Util = Util;
			window.define = define;
			window.require = require;
		},
		//产生随机模块名称
		createRandomName: function(num){
			var str = '';
			for(var i=0; i<num; i++){
				str += String.fromCharCode(65+Math.ceil(Math.random()*(90-65)));
			}
			return str;
		},
		//模块名解析
		nameResolve: function(parentName,childrenName){
			parentName = parentName ? parentName : '';
			var suffix = childrenName.match(this.suffixReg) && childrenName.match(this.suffixReg)[1];
			var separator = parentName.search(this.lastSeparatorReg);
			parentName = separator!=-1 ? parentName.slice(0,separator)+'/':'';
			//去除模块名的后缀
			childrenName = suffix ? childrenName.slice(childrenName.length - (suffix.length+1),childrenName.length) : childrenName;
			//处理./和../
			if(childrenName.slice(0,2) == './'){
				childrenName = childrenName.replace('./',parentName);
			}else if(childrenName.slice(0,3) == '../'){
				separator = parentName.search(lastSeparatorReg);
				parentName = separator!=-1 ? parentName.slice(0,separator)+'/':'';
				childrenName = childrenName.replace('../',parentName);
			}
			return childrenName.replace(/^\/|\/$/,'');
		},
		//路径解析
		pathResolve: function(moduleName){
			var suffix = 'js';
			//处理模块名
			for(var key in this.path){
				moduleName = moduleName.replace(key,this.path[key]);
			}
			return this.baseUrl+moduleName+'.'+suffix;
		},
		//函数解析
		functionResolve: function(fun){
			var funStr = fun.toString();
			var paramLengh = 0;
			var requireStr = '';
			var dependencies = [];
			//先去掉注释
			funStr = funStr.replace(this.noteReg,'');
			//解析出第一个参数require
			if(funStr.match(this.paramWithOneReg)){
				paramLengh = 1;
				requireStr = funStr.match(this.paramWithOneReg)[1];
			}else if(funStr.match(this.paramWithTwoReg)){
				paramLengh = 2;
				requireStr = funStr.match(this.paramWithTwoReg)[1];
			}else if(funStr.match(this.paramWithThreeReg)){
				paramLengh = 3;
				requireStr = funStr.match(this.paramWithThreeReg)[1];
			}
			//根据第一个参数拼凑加载依赖的正则
			var regStr = requireStr+'\\([\'\" ]*?([a-zA-Z_-]+)[\'\" ]*?\\)';
			var reg = new RegExp(regStr,'mg');
			var result = null;
			//匹配使用require函数加载的依赖名名称
			while(result=reg.exec(funStr)){
				dependencies.push(result[1]);
			}
			return {paramLengh: paramLengh, dependencies: dependencies};
		},
		//加载资源
		loadRes: function(url,callback){
			var suffix = url.substr(url.lastIndexOf('.')+1);
			//目前只能加载js，后续可以继续扩展
			switch(suffix){
				case 'js':this.loadScript(url,callback);break;
			}
		},
		//加载js
		loadScript: function(url,callback){
			var script = document.createElement('script');
			script.type = 'text/javascript';  
	        script.src = url;
	        var userAgent = navigator.userAgent;
	        //如果是IE
	        if (userAgent.indexOf("compatible") > -1 && userAgent.indexOf("MSIE") && userAgent.indexOf("Opera")==-1 ) {
		        script.onreadystatechange = function() { 
					var r = script.readyState; 
					if (r === 'loaded' || r === 'complete') { 
					 	script.onreadystatechange = null; 
					 	if(typeof callback == 'function')
					 		callback(); 
					} 
				}; 
		    }else{
		    	script.onload = function(){
		    		if(typeof callback == 'function')
					 	callback();
		    	}
		    }
	    	document.getElementsByTagName('head')[0].appendChild(script);
		},
		//根据模块名获取模块
		getModuleByName: function(moduleName){
			for(var i=0; i<moduleStack.length; i++){
				if(moduleStack[i].name==moduleName){
					return moduleStack[i].module;
				}
			}
		},
		//检查模块是否可以执行回调
		doLoopCheck: function(module){
			var childrenAllDone = true;
			var tempModule = null;
			//检查依赖的模块的回调函数是否都执行完毕了
			for(var i=0; module.childrenModuleNames && i<module.childrenModuleNames.length; i++){
				tempModule = Util.getModuleByName(module.childrenModuleNames[i]);
				//没有加载完成或没有执行回调函数
				if(!tempModule || !tempModule.callbackDone){
					childrenAllDone = false;
					break;
				}
			}
			//如果依赖的模块的回调函数都执行完毕了，那么该模块开始执行回调函数
			if(childrenAllDone && !module.callbackDone){
				var map = moduleStack;
				if(typeof module.callbackParamLength != 'undefined'){
					switch(module.callbackParamLength){
						case 0: module.callback();break;
						case 1: module.callback(module.require); module.callbackDone = true; break;
						case 2: module.callback(module.require,module.exports); module.callbackDone = true; break;
						case 3: module.callback(module.require,module.exports,module); module.callbackDone = true; break;
						default: module.callback(); module.callbackDone = true;
					}
				}else{
					var dependencies = [];
					module.callbackDone = true;
					//获得所有依赖的模块
					for(var i=0; i<module.childrenModuleNames.length; i++){
						 dependencies.push(module.require(module.childrenModuleNames[i]));
					}
					//依赖模块默认加入exports
					dependencies.push(module.exports);
					//依赖模块当做参数执行回调
					module.callback.apply(module,dependencies);
				}
				module = Util.getModuleByName(module.parentModuleName);
				module && this.doLoopCheck(module);
			}
		}
	}
	//全局define函数
	function define() {
		nowModule = new Module();
		var moduleName,callback;
		if(arguments.length==1){//define(callback)
			var result = Util.functionResolve(arguments[0]);
			nowDependencies = result.dependencies;
			callback = arguments[0];
			nowModule.callbackParamLength = result.paramLengh;
			nowModule.paramLength = 1;
		}else if(arguments.length==2){//define(dependencies,callback)|define(moduleName,callback)
			if(typeof arguments[0] == 'string'){
				var result = Util.functionResolve(arguments[1]);
				customModuleName = arguments[0];
				nowDependencies = result.dependencies;
				nowModule.callbackParamLength = result.paramLengh;
			}else{
				nowDependencies = arguments[0];
			}
			callback = arguments[1];
			nowModule.paramLength = 2;
		}else if(arguments.length==3){//define(moduleName,dependencies,callback)
			customModuleName = arguments[0];
			nowDependencies = arguments[1];
			callback = arguments[2];
			nowModule.paramLength = 3;
		}
		//回调函数
		nowModule.callback = callback;
	}
	//私有require函数，只供内部调用
	function _require(moduleName,isDataMain){
		var module = Util.getModuleByName(moduleName);
		//如果已加载过
		if(module){
			//如果加载已经完成，返回输出接口，否则返回null
			return module.callbackDone ? module.exports : null;
		}
		var path = Util.pathResolve(moduleName);
		var dependencies = [];
		Util.loadRes(path,function(){
			//如果是入口模块，直接返回
			if(isDataMain)return;
			moduleName = customModuleName || moduleName;
			customModuleName = '';
			//模块名
			nowModule.moduleName = moduleName;
			//解析依赖的模块名
			for(var i=0; i<nowDependencies.length; i++){
				var name = Util.nameResolve(moduleName,nowDependencies[i]);
				name!=moduleName ? dependencies.push(name) : '';
			}
			//所有依赖的模块
			nowModule.childrenModuleNames = dependencies;
			//模块入栈
			moduleStack.push({
				name: nowModule.moduleName,
				module: nowModule
			});
			//父模块
			nowModule.parentModuleName = parentModuleNameMap[moduleName];
			//加载依赖
			for(var i=0; i<dependencies.length; i++){
				nowModule.require(dependencies[i]);
				parentModuleNameMap[dependencies[i]] = moduleName;
			}
			Util.doLoopCheck(Util.getModuleByName(moduleName));
		});
	}
	//全局require函数
	function require(dependencies,callback){
		callback = typeof callback == 'function' ? callback : function(){};
		if(dependencies instanceof Array == false){
			dependencies = [dependencies];
		}
		//运行全局require函数将实例化一个模块类
		nowModule = new Module();
		//随机生成模块名称
		nowModule.moduleName = Util.createRandomName(10);
		nowModule.paramLength = 2;
		nowModule.callback = callback;
		nowModule.childrenModuleNames = dependencies;
		for(var i=0; i<dependencies.length ;i++){
			parentModuleNameMap[dependencies[i]] = nowModule.moduleName;
			nowModule.require(dependencies[i]);
		}
		moduleStack.push({
			name: nowModule.moduleName,
			module: nowModule
		});
		
	}
	//配置路径映射接口
	require.config = function(obj){
		(typeof obj == 'object' && obj.path && typeof obj.path == 'object') ? Util.path = obj.path : '';
	}
	//模块类
	var Module = function(){
		this.exports = {};
	}
	Module.prototype.require = function(moduleName){
		return _require(moduleName);
	};
	Util.init();
})(window)