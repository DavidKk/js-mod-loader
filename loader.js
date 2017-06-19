(function(window){
	"use strict"
	var moduleStack = [];
	var parentModuleName = '';
	var nowLoadedMouleName = '';
	//工具类
	var Util = {
		baseUrl: '',
		nameMap: [],
		lastSeparatorReg: /\/[a-zA-Z_-]+\/?$/,
		moduleNameReg: /\/([a-zA-Z_-])\.([a-z]+)\/?$/,
		paramWithOneReg: /\(([a-zA-Z_@$\-\d]+)\)/,
		paramWithTwoReg: /\(([a-zA-Z_@$\-\d]+),([a-zA-Z_@$\-\d]+)\)/,
		paramWithTreeReg: /\(([a-zA-Z_@$\-\d]+),([a-zA-Z_@$\-\d]+),([a-zA-Z_@$\-\d]+)\)/,
		//初始化
		init: function(){
			//设置baseUrl
			if(!this.baseUrl){
				var script = document.getElementsByTagName('script')[document.getElementsByTagName('script').length -1];
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
					require(moduleName);
				}else{
					this.baseUrl = location.href.substring(0,location.href.lastIndexOf('/')+1);
				}
			}
			window.Util = Util;
			window.define = define;
			window.require = require;
		},
		//模块名解析
		nameResolve: function(parentName,childrenName){
			parentName = parentName ? parentName : '';
			var separator = parentName.search(this.lastSeparatorReg);
			parentName = separator!=-1 ? parentName.slice(0,separator)+'/':'';
			//去除模块名的js后缀
			childrenName = childrenName.slice(childrenName.length-3,childrenName.length) == '.js' ? childrenName.slice(childrenName.length-3,childrenName.length) : childrenName;
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
		pathResolve: function(moduleName,suffix){
			//处理模块名
			for(var key in this.nameMap){
				moduleName = moduleName.replace(key,this.nameMap[key]);
			}
			return this.baseUrl+moduleName+'.'+suffix;
		},
		//加载资源
		loadRes: function(url,callback){
			var suffix = url.substr(url.lastIndexOf('.')+1);
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
		//函数字符串解析
		functionResolve: function(fun){
			var funStr = fun.toString();
			var paramLengh = 0;
			var requireStr = '';
			var dependencies = [];
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
			var regStr = requireStr+'\\([\'\" ]*?([a-zA-Z_-])[\'\" ]*?\\)';
			var reg = new RegExp(regStr,'g');
			var result = null;
			while(result=reg.exec(funStr)){
				dependencies.push(result[1]);
			}
			return {paramLengh: paramLengh, dependencies: dependencies};
		},
		//检查模块是否可以执行回调
		doLoopCheck: function(module){
			if((!module.childrenModuleNames || module.childrenModuleNames.length == 0) && !module.callbackDone){
				if(typeof module.callbackParamLength === undefined){
					module.callback();
					module.callbackDone = true;
				}else{
					switch(module.callbackParamLength){
						case 0: module.callback();break;
						case 1: module.callback(module.require); module.callbackDone = true; break;
						case 2: module.callback(module.require,module.exports); module.callbackDone = true; break;
						case 3: module.callback(module.require,module.exports,module); module.callbackDone = true; break;
					}
				}
				module = Util.getModuleByName(module.parentModuleName);
				module && this.doLoopCheck(module);
			}else{
				var childrenAllDone = true;
				var tempModule = null;
				for(var i=0; i<module.childrenModuleNames.length; i++){
					tempModule = Util.getModuleByName(module.childrenModuleNames[i]);
					if(!tempModule || !tempModule.callbackDone){
						childrenAllDone = false;
						break;
					}
				}
				if(childrenAllDone){
					var dependencies = [];
					module.callbackDone = true;
					for(var i=0; i<module.childrenModuleNames.length; i++){
						 dependencies.push(module.require(module.childrenModuleNames[i]));
					}
					module.callback.apply(module,dependencies);
					module = Util.getModuleByName(module.parentModuleName);
					module && this.doLoopCheck(module);
				}
			}
		}
	}
	//全局define函数
	function define() {
		var module = new Module();
		var defineArguments = arguments;
		//异步执行，在loadRes回调之后执行，为了获取当前执行define函数的脚本的moduleName
		setTimeout(function(){
			var moduleName,dependencies,callback,reolvedDependencies=[];
			if(defineArguments.length==1){
				var result = Util.functionResolve(defineArguments[0]);
				moduleName = nowLoadedMouleName;
				dependencies = result.dependencies;
				callback = defineArguments[0];
				module.callbackParamLength = result.paramLengh;
			}else if(defineArguments.length==2){
				moduleName = nowLoadedMouleName;
				dependencies = defineArguments[0];
				callback = defineArguments[1];
			}else if(defineArguments.length==3){
				moduleName = defineArguments[0];
				dependencies = defineArguments[1];
				callback = defineArguments[2];
			}
			for(var i=0; i<dependencies.length; i++){
				reolvedDependencies.push(Util.nameResolve(parentModuleName,dependencies[i]));
			}
			module.childrenModuleNames = reolvedDependencies;
			module.callback = callback;
			module.parentModuleName = parentModuleName;
			module.moduleName = Util.nameResolve(parentModuleName,moduleName);
			moduleStack.push({
				name: module.moduleName,
				module: module
			});
			parentModuleName = module.moduleName; 
			for(var i=0; i<reolvedDependencies.length; i++){
				module.require(reolvedDependencies[i]);
			}
		},0);	
		
	}
	function _require(moduleName,suffix){
		suffix = suffix ? suffix : 'js';
		var path = Util.pathResolve(moduleName,suffix);
		Util.loadRes(path,function(){
			nowLoadedMouleName = moduleName;
			//异步执行，在define之后执行
			setTimeout(function(){
				Util.doLoopCheck(Util.getModuleByName(parentModuleName));
			},0)
		});
	}
	//全局require函数
	function require(url,suffix){
		_require(url,suffix);
	}
	//模块类
	var Module = function(){
	}
	Module.prototype.require = function(url,suffix){
		if(this.callbackDone)
			return this.exports || {};
		_require(url,suffix);
	};
	Util.init();
})(window)