'use strict';
if (process.env.LAZY_LOG === "true") {
    const util = require('util');
    module.exports = function(...args) {
        console.log("[%s]: %s", (new Date()).toLocaleTimeString(), util.format(...args));
    };
}
else {
    module.exports = function() {};
}
