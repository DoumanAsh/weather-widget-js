'use strict';
const stylus = require('stylus');

module.exports = stylus.middleware({
    src: __from_root('views'),
    dest: __from_root('static'),
    compile: function(string) {
        return stylus(string).set('compress', true);
    }
});
