(function(window){
	//模块类
	var Module = function(){

	}
	//加载器
	var Loader = {
		baseUrl: '',
		nameMap: [],
		init: function(){

		},
		//模块名解析
		nameResolve: function(parentName,childrenName){
			var separator = parentName.search(/\/[a-zA-Z_\-]+\/?$/);
			parentName = separator!=-1 ? parentName.slice(0,separator)+'/':'';
			//去除模块名的js后缀
			childrenName = childrenName.slice(childrenName.length-3,childrenName.length) == '.js' ? childrenName.slice(childrenName.length-3,childrenName.length) : childrenName;
			//处理./和../
			if(childrenName.slice(0,2) == './'){
				childrenName = childrenName.replace('./',parentName);
			}else if(childrenName.slice(0,3) == '../'){
				separator = parentName.search(/\/[a-zA-Z_\-]+\/?$/);
				parentName = separator!=-1 ? parentName.slice(0,separator)+'/':'';
				childrenName = childrenName.replace('../',parentName);
			}
			//处理模块名
			for(var key in this.nameMap){
				childrenName.replace(key,this.nameMap[key]);
			}
			return childrenName;
		}
	}
	window.Loader = Loader;
})(window)