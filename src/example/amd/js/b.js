define(function(require, exports) {
    console.log('exec module modB_1');
    var c = require('./c');
    console.log('exec module modB_2');
    exports.test = 'b';
})