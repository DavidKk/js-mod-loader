define(function(require, exports) {
    console.log('exec module index_1')
    var a = require('./a');
    console.log('exec module index_2')
    return a;
})