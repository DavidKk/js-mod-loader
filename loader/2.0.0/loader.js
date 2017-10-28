/**
 * Author: lisong
 * TODO: 符合AMD标准的模块加载器
 */
(function(window){
	"use strict"

	//模块类
	var Module = function(id,callback){
		this.id = id;
		this.callback = callback;
		this.exports = {};
		Module.anonymous = null;
	}
	Module.prototype.require = function(moduleName){
		return _require(moduleName);
	};
	//ie（6-9）不支持script.onload，使用interactive机制来获正在执行的脚本
	var useInteractive = window.attachEvent && !(window.opera != null && window.opera.toString() === '[object Opera]'),currentAddingScript,interactiveScript;
	//脚本加载工具
	var scriptLoader = {
		//加载js
		_loadScript: function(url,callback){
			var script = document.createElement('script');
			var onloadEvent = 'onload' in script ? 'onload' : 'onreadystatechange'
			var head = document.getElementsByTagName('head')[0];
			script.type = 'text/javascript';  
	        script.src = url;
	        script[onloadEvent] = function(){
	        	var state = script.readyState;
	        	if(!state || state === 'loaded' || state === 'complete'){
	        		if(typeof callback == 'function')
					 	callback();
	        	}
	        }
	        currentAddingScript = script;
	    	head.insertBefore(script, head.firstChild);
	    	currentAddingScript = null;
		},
		//获取当前正在执行的script
		_getCurrentScript: function(){
			if (currentAddingScript) { return currentAddingScript; }

			if (interactiveScript && interactiveScript.readyState === 'interactive') {
				return interactiveScript;
			}

			var scripts = document.getElementsByTagName('script');
			for (var i = 0; i < scripts.length; i++) {
				if (scripts[i].readyState === 'interactive') {
					interactiveScript = scripts[i];
					return interactiveScript;
				}
			}
		}
	}
	//加载器
	var Loader = {
		moduleStack: [],//模块栈
		baseUrl: '',//基准路径
		mode: 'CMD',//加载模式
		nowJsUrl: '',//当前加载的js链接
		path: {},//别名
		suffixReg: /\.(js)$/,//文件后缀
		oneParamReg: /function[\s]*\(([a-zA-Z_$][\w_$\-\d]*?)[\s]*\)/,//匹配一个参数,function(require)
		twoParamReg: /function[\s]*\(([a-zA-Z_$][\w_$\-\d]*?)[\s]*?,[\s]*?([a-zA-Z_$][\w_$\-\d]*?)[\s]*?\)/,//匹配两个个参数,function(require,export)
		threeParamReg: /function[\s]*\(([a-zA-Z_$][\w_$\-\d]*?)[\s]*?,[\s]*?([a-zA-Z_$][\w_$\-\d]*?)[\s]*?,[\s]*?([a-zA-Z_$][\w_$\-\d]*?)[\s]*?\)/,//匹配三个参数,function(require,export,module)
		commenteReg: /\/\/[\s\S]*?\n|\/\*[\s\S]*?\*\//mg,//去除注释
		//初始化
		_init: function(){
			//设置baseUrl
			this._setBaseUrl();
			//设置全局变量
			window.define = define;
			window.require = require;
		},
		_setBaseUrl: function(){
			//设置baseUr
			if(!this.baseUrl){
				var scripts = document.getElementsByTagName('script');
				var script = scripts[scripts.length -1];
				var main = script.getAttribute('data-main');
				//以当前页面的完全路径为基准url
				this.baseUrl = location.protocol+'//'+location.host+location.pathname.substring(0,location.pathname.lastIndexOf('/')+1);
				this._require(main);
			}
		},
		//路径解析
		_pathResolve: function(path,moduleId){
			var suffix = moduleId.match(this.suffixReg) && moduleId.match(this.suffixReg)[1];
			//去除模块名的后缀
			moduleId = suffix ? moduleId.slice(moduleId.length - (suffix.length+1),moduleId.length) : moduleId;
			//带./和不带./都是指当前目录
			moduleId = moduleId.replace('./','');
			if(!suffix){
				suffix = 'js';
			}
			//避免去掉域名
			if(path.substring(0,path.lastIndexOf('/')).indexOf(location.host) != -1){
				//当前目录
				path = path.substring(0,path.lastIndexOf('/'));
			}
			//处理./和../
			if(moduleId.slice(0,3) == '../'){
				moduleId = moduleId.replace('../',path);
				if(path.substring(0,path.lastIndexOf('/')).indexOf(location.host) != -1){
					//父目录
					path = path.substring(0,path.lastIndexOf('/'));
				}
				path = path+'/'+moduleId.replace('../','');
			}else{
				path = path+'/'+moduleId;
			}

			//处理模块名
			for(var key in this.path){
				var reg = new RegExp('(^|/)'+key+'(/|$)');
				if(reg.test(path))
					path = path.replace(key,this.path[key]);
			}
			return path+'.'+suffix;
		},
		//加载资源
		_loadRes: function(url,callback){
			var suffix = url.substr(url.lastIndexOf('.')+1);
			//目前只能加载js，后续可以继续扩展
			switch(suffix){
				case 'js':scriptLoader._loadScript(url,callback);break;
			}
		},
		//函数解析
		_codeResolve: function(fun){
			var funStr = fun.toString();
			var paramLengh = 0;
			var requireStr = '';
			var dependencies = [];
			var reg = null;
			//先去掉注释
			funStr = funStr.replace(this.commenteReg,'');
			//解析参数
			reg = funStr.match(this.paramWithThreeReg) || funStr.match(this.paramWithTwoReg) || funStr.match(this.oneParamReg);
			requireStr = reg[1];
			//根据第一个参数拼凑加载依赖的正则
			var regStr = requireStr+'\\s*?\\([\'\"](\\w_-]+)[\'\"]\\)\\s*?';
			var reg = new RegExp(regStr,'mg');
			var result = null;
			//匹配使用require函数加载的依赖名名称
			while(result=reg.exec(funStr)){
				dependencies.push(result[1]);
			}
			return dependencies;
		},
		//根据模块名获取模块
		_getModuleByName: function(moduleName){
			for(var i=0; i<this.moduleStack.length; i++){
				if(this.moduleStack[i].name==moduleName){
					return this.moduleStack[i].module;
				}
			}
		},
		_loopCheck: function(){

		},
		//私有require函数，只供内部递归加载依赖
		_require: function(moduleId,callback){
			var self = this;
			var count = 0;
			if (moduleId instanceof Array){
				for(var i=0; i<moduleId.length; i++){
					_loadRes(moduleId[i]);
				}
			}else{
				_loadRes(moduleId)
			}
			function _loadRes(_moduleId){
				//获取真实url地址
				var url = self._pathResolve(self.nowJsUrl?self.nowJsUrl:self.baseUrl,_moduleId);
				var mod = new Module(url,self.callback);
				//避免某些浏览器执行两次回调
				if(self.moduleStack[url]){
					return;
				}
				mod.url = url;
				self.moduleStack[url] = mod;
				self._loadRes(url,function(){
					count++;
					if(Module.anonymous){
						mod.callback = Module.anonymous.callback;
						mod.id = Module.anonymous.id;
						mod.deps = Module.anonymous.deps;
						if(!mod.id){
							mod.id = mod.url;
						}
					}
					if(mod.callback){
						mod.deps.concat(self._codeResolve(mod.callback))
					}
					mod.deps && mod.deps.length > 0 && (self._require(mod.deps));
					console.log(mod);
				});
			}
		}
	}
	//全局define函数
	function define(id,dependencies,callback) {
		var currentScript = scriptLoader._getCurrentScript();

		if(arguments.length==1){//参数只有一个函数
			callback = id;
			id = null;
		}else if(arguments.length==2){//参数为模块id和函数或者依赖数组和函数
			if(id instanceof Array){
				callback = dependencies;
				dependencies = id;
				id = null;
			}else{
				callback = dependencies;
				dependencies = null;
			}
		}

		if(currentScript){
			var mod = Loader.moduleStack[currentScript.src]
			mod.callback = callback;
			mod.id = id;
			mod.deps = dependencies || [];
			if(!mod.id){
				mod.id = currentScript.src;
			}
		}else{
			Module.anonymous = {
				id : id,
				callback : callback,
				deps: dependencies || []
			}
		}
	}
	//全局require函数
	function require(dependencies,callback){
		Loader._require(dependencies,callback);
	}
	//配置路径映射接口
	require.config = function(opt){
		if(!opt || !typeof obj == 'object')
			return;
		opt.baseUrl && (Loader.baseUrl = opt.baseUrl);
		opt.mode && (Loader.mode = opt.mode);
		opt.path && (Loader.path = opt.path);
	}
	Loader._init();
})(window)