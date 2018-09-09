define(function(require, exports) {
    console.log('exec module modA_1');
    var b = require('./b');
    var c = require('./c');
    console.log('exec module modA_2');
    return {
        modB:b,
        modC:c
    }
})