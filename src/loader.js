/**
 * Author: lisong
 * @todo : 模块加载器
 */
(function(global) {
    "use strict"

    //ie（6-9）不支持script.onload，使用interactive机制来获取正在执行的脚本
    var useInteractive = global.attachEvent && !(global.opera != null && global.opera.toString() === '[object Opera]');
    var currentAddingScript = null;
    var interactiveScript = null;

    //脚本加载工具
    var scriptLoader = {
        //加载js
        _loadScript: function(url, callback) {
            var script = document.createElement('script');
            var onloadEvent = 'onload' in script ? 'onload' : 'onreadystatechange'
            var head = document.getElementsByTagName('head')[0];
            script.type = 'text/javascript';
            script.src = url;
            script[onloadEvent] = function() {
                var state = script.readyState;
                if (!state || state === 'loaded' || state === 'complete') {
                    typeof callback == 'function' && callback();
                }
            }
            //在ie(6-8)下，如果有缓存，外部脚本会在动态插入后立即执行，
            //使用currentAddingScript报错节点，用来传递当前真正执行的script节点
            currentAddingScript = script;
            head.insertBefore(script, head.firstChild);
            currentAddingScript = null;
        },
        //ie(6-9)下获取当前正在执行的script
        _getCurrentScript: function() {
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
        moduleStack: {}, //模块栈
        loadedUrl: {}, //已经加载过的url
        baseUrl: '', //基准路径
        mode: 'CMD', //默认加载模式,可设置为AMD
        paths: {}, //别名
        regs: {
            suffixReg: /\.(js)$/, //文件后缀
            factoryParamReg: /function[\s]*\(([a-zA-Z_$][\w_$\-\d]*?)([\s]*?,[\s]*?[a-zA-Z_$][\w_$\-\d]*?[\s]*?)*\)/, //匹配参数,function(require)
            commenteReg: /\/\/[\s\S]*?\n|\/\*[\s\S]*?\*\//mg, //去除注释
            urlReg: /^(https?):\/\/[\w\-]+(\.[\w\-]+)+([\w\-\.,@?^=%&:\/~\+#]*[\w\-\@?^=%&\/~\+#])?$/ //匹配url
        },
        //初始化
        _init: function() {
            //设置baseUrl
            this._setBaseUrl();
            //设置全局变量
            global.define = define;
            global.require = require;
        },
        _setBaseUrl: function() {
            //设置baseUr
            var scripts = document.getElementsByTagName('script');
            //最后一个为当前加载器
            var script = scripts[scripts.length - 1];
            var main = script.getAttribute('data-main');
            //以加载器的路径为基准url
            this.baseUrl = script.src.substring(0, script.src.lastIndexOf('/') + 1);
            this.domain = script.src.substring(0, script.src.indexOf('/', script.src.indexOf('://') + 3));
            if (main) {
                var tmp = main.indexOf('://');
                if (tmp != -1) {
                    main = main.substr(main.indexOf('/', tmp + 3));
                }
                if (main.charAt(0) != '.' && main.charAt(0) != '/') {
                    main = './' + main;
                }
                scriptLoader._loadScript(this._urlResolve(this.baseUrl, main));
            }
        },
        //路径解析
        _urlResolve: function(parentPath, moduleId) {
            var suffix = moduleId.match(this.regs.suffixReg) && moduleId.match(this.regs.suffixReg)[1];
            var self = this;
            //处理模块别名
            for (var key in this.paths) {
                var reg = new RegExp('(^|/)' + key + '(/|$)');
                if (reg.test(moduleId))
                    moduleId = moduleId.replace(key, this.paths[key]);
            }
            //去除模块名的后缀
            moduleId = suffix ? moduleId.slice(0, moduleId.length - (suffix.length + 1)) : moduleId;
            if (!suffix) {
                suffix = 'js';
            }
            if (this.regs.urlReg.test(moduleId)) {
                if (_moduleId.charAt(_moduleId.length - 1) == '/') { //如果是目录，默认加载index文件
                    parentPath = moduleId + 'index.' + suffix;
                } else {
                    parentPath = moduleId + '.' + suffix;
                }
                return parentPath;
            }
            //如果父目录是个url地址
            if (parentPath.charAt(parentPath.length - 1) != '/') {
                //当前目录
                parentPath = parentPath.substring(0, parentPath.lastIndexOf('/') + 1);
            }

            //处理/,./,../相对路径
            function _relPath(_parentPath, _moduleId) {
                if (_moduleId.charAt(0) == '/') {
                    _parentPath = self.domain + '/' + _moduleId;
                } else if (_moduleId.slice(0, 2) == './') {
                    _parentPath = _parentPath + _moduleId.replace('./', '');
                } else if (_moduleId.slice(0, 3) == '../') {
                    _moduleId = _moduleId.replace('../', _parentPath);
                    if (_parentPath.indexOf('/') != -1) {
                        //父目录
                        _parentPath = _parentPath.substring(0, _parentPath.lastIndexOf('/', _parentPath.length - 1) + 1);
                    } else {
                        throw new Error('Error load ' + moduleId)
                    }
                    //可能还存在../
                    if (_moduleId.indexOf('../') != -1) {
                        return _relPath(_parentPath, _moduleId);
                    }
                    _parentPath = _parentPath + _moduleId;
                } else {
                    _parentPath = self.baseUrl + moduleId;
                }
                if (_moduleId.charAt(_moduleId.length - 1) == '/') { //如果是目录，默认加载index文件
                    _parentPath = _parentPath + 'index.' + suffix;
                } else {
                    _parentPath = _parentPath + '.' + suffix;
                }
                return _parentPath;
            }

            return _relPath(parentPath, moduleId);
        },
        //解析依赖
        _codeResolve: function(fun) {
            var funStr = fun.toString();
            var paramLengh = 0;
            var requireStr = '';
            var dependencies = [];
            var reg = null;
            //先去掉注释
            funStr = funStr.replace(this.regs.commenteReg, '');
            //解析参数
            reg = funStr.match(this.regs.factoryParamReg);
            requireStr = reg[1];
            //根据第一个参数拼凑加载依赖的正则
            var regStr = requireStr + '\\s*?\\(\\s*?[\'\"]([\\w_-]+)[\'\"]\\s*?\\)\\s*?';
            var reg = new RegExp(regStr, 'mg');
            var result = null;
            //匹配使用require函数加载的依赖名名称
            while (result = reg.exec(funStr)) {
                dependencies.push(result[1]);
            }
            return dependencies;
        },
        //为子模块添加父模块
        _addParentModule: function(module, parentModule) {
            var hasAddParentMod = false;
            for (var i = 0; i < module.parentModules.length; i++) {
                if (module.parentModules[i] == parentModule) {
                    hasAddParentMod = true;
                    break;
                }
            }
            if (!hasAddParentMod) {
                module.parentModules.push(parentModule);
            }
        },
        //建立父子关系链
        _setLink: function(mod) {
            for (var id in this.moduleStack) {
                var _mod = this.moduleStack[id];
                for (var i = 0; i < _mod.allDeps.length; i++) {
                    if (mod.id == _mod.allDeps[i] || _mod.url && mod.id == this._urlResolve(_mod.url, _mod.allDeps[i])) {
                        _mod.allDeps[_mod.allDeps[i]] = mod;
                        this._addParentModule(mod, _mod);
                    }
                }
            }
        },
        //产生随机模块名称
        _createRandomName: function(num) {
            var str = '';
            for (var i = 0; i < num; i++) {
                str += String.fromCharCode(65 + Math.ceil(Math.random() * (90 - 65)));
            }
            return str + new Date().getTime();
        }
    }

    /**
     * @todo  模块对象
     * @param    String  id   模块id
     * @param    Function factory  回调函数
     */
    var Module = function(id, factory) {
        //模块id
        this.id = id;
        //回调函数
        this.factory = factory;
        //对外接口
        this.exports = {};
        //模块本身
        this.module = this;
        //父模块
        this.parentModules = [];
        //define声明的依赖
        this.defineDeps = [];
        //回调函数内的依赖
        this.requireDeps = [];
        //所有依赖
        this.allDeps = [];
        //异步对象(多个模块可能在一个文件里声明，用集合存储)
        !Module.anonymous ? Module.anonymous = [this] : Module.anonymous.push(this);
    }
    Module.prototype = {
        constructor: Module,
        //factory内加载模块
        require: function(id, factory) {
            if (!factory) {
                var mod = this.allDeps[id];
                if (Loader.mode == 'CMD') {
                    var myExports = this._excute(mod);
                    if (myExports) {
                        mod.exports = myExports;
                    }
                    return mod.exports;
                } else if (Loader.mode == 'AMD') {
                    var mod = this.allDeps[id];
                    return mod.exports;
                }
            } else {
                require(id, factory);
            }
        },
        //执行factory
        _excute: function(mod) {
            var myExports = null;
            if (mod.defineDeps && mod.defineDeps.length > 0) { //要加载的模块如果有define声明的依赖
                var _results = [];
                for (var i = 0; i < mod.defineDeps.length; i++) {
                    _results.push(mod.require(mod.defineDeps[i]));
                }
                myExports = mod.factory.apply(mod, _results); //function(modA,modB,modC)
            } else { //默认function(require,exports,module)函数回调
                myExports = mod.factory(function(id, factory) { return mod.require(id, factory); }, mod.exports, mod);
            }
            return myExports;
        },
        //尝试执行factory
        _tryExcute: function() {
            var self = this;
            var allDeps = this.allDeps;
            var _deps = [];
            var allDepsLoaded = true;
            //避免非叶子节点多次执行
            if (this._depsLinkLoaded && allDeps.length > 0) {
                return;
            }
            //判断依赖是否都加载完毕了
            for (var i = 0; i < allDeps.length; i++) {
                var mod = allDeps[allDeps[i]];
                if (!mod || !mod._depsLinkLoaded) {
                    allDepsLoaded = false;
                }
                _deps.push(allDeps[i]);
            }
            if (allDepsLoaded) {
                this._depsLinkLoaded = true;
                //没有父模块或者AMD模式下提前执行factory
                if (!this.parentModules.length || Loader.mode == 'AMD') {
                    this._excute(this);
                }
                //递归尝试执行所有父模块的factory
                if (this.parentModules) {
                    for (var i = 0; i < this.parentModules.length; i++) {
                        this.parentModules[i]._tryExcute();
                    }
                }
            }
        }
    }

    /**
     * @todo     全局模块声明函数
     * @param    String  id  模块id
     * @param    Array  dependencies  依赖数组
     * @param    Function  factory  回调函数
     */
    function define(id, dependencies, factory) {
        //获取ie(6-9)下正在执行的script
        var currentScript = scriptLoader._getCurrentScript();
        var mod = null;
        if (arguments.length == 1) { //参数只有一个函数
            factory = id;
            id = null;
        } else if (arguments.length == 2) { //参数为模块id和函数或者依赖数组和函数
            if (id instanceof Array) {
                factory = dependencies;
                dependencies = id;
                id = null;
            } else {
                factory = dependencies;
                dependencies = null;
            }
        }
        dependencies = dependencies || [];
        if (currentScript) { //ie(6-9)下同步模式设置模块信息（onload回调不一定会立刻执行）
            mod = Loader.moduleStack[id] || Loader.moduleStack[currentScript.src]
            if (mod) {
                //设置父子关系链
                Loader._setLink(mod);
                return;
            }
            mod = new Module(null, factory);
            mod.id = id;
            mod.defineDeps = dependencies;
            mod.allDeps = mod.defineDeps.concat([]);
            mod.url = currentScript.src;
            mod.id = mod.id || mod.url;
            Module.anonymous = null;
            //添加到模块栈
            Loader.moduleStack[mod.id] = mod;
            //为接下来要加载的依赖提供父模块依据
            Module.parentModule = mod;
            //解析依赖（如果define显示声明了需要加载哪些依赖，将不会再解析内部依赖）
            if (mod.factory && mod.defineDeps.length == 0) {
                mod.requireDeps = Loader._codeResolve(mod.factory);
                mod.allDeps = mod.allDeps.concat(mod.requireDeps);
            }
            //设置父子关系链
            Loader._setLink(mod);
            //判断所有依赖是否加载完毕
            if (mod.allDeps.length == 0) {
                mod._depsLinkLoaded = true;
            } else { //加载依赖
                require(mod.allDeps)
            }
            //设置已加载标识
            Loader.loadedUrl[url] = true;
            //尝试执行factory
            mod._tryExcute();
        } else {
            mod = new Module(null, factory);
            mod.id = id;
            mod.defineDeps = dependencies;
            mod.allDeps = mod.defineDeps.concat([]);
        }
    }
    /**
     * @todo     全局加载函数
     * @param    String|Array  moduleId  模块id或者依赖数组
     * @param    Function factory  回调函数
     */
    function require(moduleId, factory) {
        var mod = null;
        //异步加载，新建匿名模块
        if (factory) {
            mod = new Module(null, factory);
            mod.url = Module.parentModule && Module.parentModule.url ? Module.parentModule.url : Loader.baseUrl
            Loader.moduleStack[Loader._createRandomName(6)] = mod;
            Module.parentModule = mod;
            //清空异步模块对信息
            Module.anonymous = null;
        }
        if (moduleId instanceof Array) { //加载多个模块
            if (mod) {
                mod.defineDeps = mod.defineDeps.concat(moduleId);
                mod.allDeps = mod.allDeps.concat(moduleId);
            }
            for (var i = 0; i < moduleId.length; i++) {
                _loadRes(moduleId[i]);
            }
        } else { //加载单个模块
            if (mod) {
                mod.defineDeps = [moduleId];
                mod.allDeps = [moduleId];
            }
            _loadRes(moduleId);
        }

        function _loadRes(_moduleId) {
            //将要依赖接下来要加载的模块的父模块
            var currentModule = Module.parentModule;
            //获取真实url地址
            var url = Loader._urlResolve(currentModule.url ? currentModule.url : Loader.baseUrl, _moduleId);
            var loadedModule = Loader.moduleStack[_moduleId] || Loader.moduleStack[url];
            if (loadedModule) {
                //添加父依赖
                Loader._setLink(loadedModule);
                return;
            }
            //加载模块
            scriptLoader._loadScript(url, function() {
                //防止执行两次回调
                if (Loader.loadedUrl[url]) {
                    return;
                }
                //设置已加载标识
                Loader.loadedUrl[url] = true;
                if (Module.anonymous) { //标准浏览器下，在onload回调中异步设置模块信息（onload会在脚本执行完后立即触发）
                    var anonymous = [].concat(Module.anonymous);
                    for (var i = 0; i < anonymous.length; i++) {
                        mod = anonymous[i];
                        mod.url = url;
                        mod.id = mod.id || mod.url;
                        //为接下来要加载的依赖提供父模块依据
                        Module.parentModule = mod;
                        //添加到模块栈
                        Loader.moduleStack[mod.id] = mod;
                        //解析依赖
                        if (mod.factory && mod.defineDeps.length == 0) {
                            mod.requireDeps = Loader._codeResolve(mod.factory);
                            mod.allDeps = mod.allDeps.concat(mod.requireDeps);
                        }
                        //设置父子关系链
                        Loader._setLink(mod);
                        //判断所有依赖是否加载完毕
                        if (mod.allDeps.length == 0) {
                            mod._depsLinkLoaded = true;
                        } else { //加载依赖
                            require(mod.allDeps)
                        }
                        //尝试执行factory
                        mod._tryExcute();
                    }
                    //清空异步模块对象
                    Module.anonymous = null;
                }

            });
        }

    }
    /**
     * @todo    配置
     * @param   Object   opt {baseUrl:基准url，mode:加载模式(CMD|AMD)，paths:路径别名}
     */
    require.config = function(opt) {
        if (!opt || !typeof obj == 'object')
            return;
        if (opt.baseUrl) {
            var rel = opt.baseUrl;
            if (rel.charAt(0) == '/') {
                Loader.baseUrl += rel.substr(1);
            } else {
                Loader.baseUrl += rel;
            }
            if (Loader.baseUrl.charAt(Loader.baseUrl.length - 1) != '/') {
                Loader.baseUrl += '/'
            }
        }
        opt.mode && (Loader.mode = opt.mode);
        opt.paths && (Loader.paths = opt.paths);
    }
    Loader._init();
})(window)