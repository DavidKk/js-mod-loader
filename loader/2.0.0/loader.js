/**
 * Author: lisong
 * TODO: 符合AMD标准的模块加载器
 */
(function(window){
	"use strict"

	//模块类
	var Module = function(){
		this.exports = {};
	}
	Module.prototype.require = function(moduleName){
		return _require(moduleName);
	};
	//工具类
	var Util = {
	}
	//加载器
	var Loader = {
		moduleStack: [],//模块栈
		baseUrl: '',//基准路径
		nowJsUrl: '',//当前加载的js链接
		path: {},//别名
		suffixReg: /\.(js)$/,//文件后缀
		moduleNameReg: /\/[\w_-]+\/?$/,//匹配模块名
		oneParamReg: /function[\s]*\(([a-zA-Z_$][\w_$\-\d]*?)[\s]*\)/,//匹配一个参数,function(require)
		twoParamReg: /function[\s]*\(([a-zA-Z_$][\w_$\-\d]*?)[\s]*?,[\s]*?([a-zA-Z_$][\w_$\-\d]*?)[\s]*?\)/,//匹配两个个参数,function(require,export)
		threeParamReg: /function[\s]*\(([a-zA-Z_$][\w_$\-\d]*?)[\s]*?,[\s]*?([a-zA-Z_$][\w_$\-\d]*?)[\s]*?,[\s]*?([a-zA-Z_$][\w_$\-\d]*?)[\s]*?\)/,//匹配三个参数,function(require,export,module)
		commenteReg: /\/\/[\s\S]*?\n|\/\*[\s\S]*?\*\//mg,//去除注释
		//初始化
		_init: function(){
			//设置baseUrl
			this.setBaseUrl();
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
				if(main){//以main入口脚本路径为基准
					var separator = main.search(this.moduleNameReg);
					var moduleName = separator!=-1 ? main.substr(separator+1) : main;
					var base = separator!=-1 ? main.slice(0,separator+1):'';
					if(base.charAt(0)=='/'){//绝对路径
						this.baseUrl = location.protocol+'//'+location.host+base.substr(1);
					}else if(base.charAt(0)=='.'){//相对路径
						base = base.replace('./','');
						this.baseUrl = location.href.substring(0,location.href.lastIndexOf('/')+1)+base;
					}
					_require(moduleName,true);
				}else{//以html文件路径为基准
					this.baseUrl = location.href.substring(0,location.href.lastIndexOf('/')+1);
				}
			}
		},
		//路径解析
		_pathResolve: function(path,moduleId){
			var suffix = moduleId.match(this.suffixReg) && moduleId.match(this.suffixReg)[1];
			var separator = path.search(this.moduleNameReg);
			path = separator!=-1 ? path.slice(0,separator+1):'';
			//去除模块名的后缀
			moduleId = suffix ? moduleId.slice(moduleId.length - (suffix.length+1),moduleId.length) : moduleId;
			//处理./和../
			if(moduleId.slice(0,2) == './'){
				moduleId = moduleId.replace('./',path);
			}else if(moduleId.slice(0,3) == '../'){
				separator = path.search(moduleNameReg);
				path = separator!=-1 ? path.slice(0,separator+1):'';
				moduleId = moduleId.replace('../',path);
			}

			//处理模块名
			for(var key in this.path){
				var reg = new RegExp('(^|/)'+key+'(/|$)');
				if(reg.test(moduleId))
					moduleId = moduleId.replace(key,this.path[key]);
			}
			return this.baseUrl+moduleId+'.'+suffix;
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
			if(reg = funStr.match(this.oneParamReg)){
				paramLengh = 1;
				requireStr = reg[1];
			}else if(reg = funStr.match(this.paramWithTwoReg)){
				paramLengh = 2;
				requireStr = reg[1];
			}else if(reg = funStr.match(this.paramWithThreeReg)){
				paramLengh = 3;
			}
			requireStr = reg[1];
			//根据第一个参数拼凑加载依赖的正则
			var regStr = requireStr+'\\s*?\\([\'\"](\\w_-]+)[\'\"]\\)\\s*?';
			var reg = new RegExp(regStr,'mg');
			var result = null;
			//匹配使用require函数加载的依赖名名称
			while(result=reg.exec(funStr)){
				dependencies.push(result[1]);
			}
			return {paramLengh: paramLengh, dependencies: dependencies};
		},
		//加载资源
		_loadRes: function(url,callback){
			var suffix = url.substr(url.lastIndexOf('.')+1);
			//目前只能加载js，后续可以继续扩展
			switch(suffix){
				case 'js':this.loadScript(url,callback);this.nowJsUrl = url;break;
			}
		},
		//加载js
		_loadScript: function(url,callback){
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
		_getModuleByName: function(moduleName){
			for(var i=0; i<this.moduleStack.length; i++){
				if(this.moduleStack[i].name==moduleName){
					return this.moduleStack[i].module;
				}
			}
		},
		//私有require函数，只供内部调用
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
				var path = this._pathResolve(self.nowJsUrl?self.nowJsUrl:self.baseUrl,_moduleId);
				self._loadRes(path,function(){
					count++;
					if(moduleId instanceof Array && count==moduleId.length || !moduleId instanceof Array){
						callback();
					}
					console.log(path);
				});
			}
		}
	}
	//执行回调
	function excute(module){
		
	}
	//全局define函数
	function define() {
		
	}
	//全局require函数
	function require(dependencies,callback){

	}
	//配置路径映射接口
	require.config = function(obj){
		(typeof obj == 'object' && obj.path && typeof obj.path == 'object') ? Util.path = obj.path : '';
	}
	Util.init();
})(window)