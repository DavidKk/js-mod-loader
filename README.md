# js-mod-loader

> 一个简单的 JavaScript 模块加载器，支持 AMD 和 CMD 模式

## 内容

- [**`功能特性`**](#功能特性)
- [**`安装`**](#安装)
- [**`使用`**](#使用)
- [**`案例`**](#案例)
- [**`define`**](#define) 
- [**`require`**](#require)   
- [**`require.config`**](#require.config)   
- [**`贡献`**](#贡献)


## 功能特性
* [x] 支持 ADM 和 CMD 模式（默认为 CMD 模式，可配置成 AMD 模式）
* [x] 兼容 pc 和 h5
* [x] 持续维护迭代

## 安装

```bash
npm install js-mod-loader
```

## 案例

请查看[**`example`**](https://github.com/wanls4583/js-mod-loader/tree/master/src/example)

## define

```javascript
/**
 * @todo     全局模块声明函数
 * @param    String  id  模块id
 * @param    Array  dependencies  依赖数组
 * @param    Function  factory  回调函数
 */
window.define = function(id, dependencies, factory)
```

## require

```javascript
/**
 * @todo     全局加载函数
 * @param    String|Array  moduleId  模块id或者依赖数组
 * @param    Function factory  回调函数
 */
global.require = function(moduleId, factory)	
```

## require.config

```javascript
/**
 * @todo    全局配置函数
 * @param   Object   opt {baseUrl:基准url，mode:加载模式(CMD|AMD)，alias:路径别名}
 */
global.require.config = function(opt)
```
`注意：baseUrl默认为加载器所在的路径`

## 贡献

欢迎给出一些意见和优化，期待你的 `Pull Request`