'use strict';
const util = require('util');
const path = require('path');

function stack_trace() {
    var dummyObject = {};

    var v8Handler = Error.prepareStackTrace;
    Error.prepareStackTrace = function(dummyObject, v8StackTrace) {
        return v8StackTrace;
    };
    Error.captureStackTrace(dummyObject, this);

    var v8StackTrace = dummyObject.stack;
    Error.prepareStackTrace = v8Handler;

    return v8StackTrace;
}

if (process.env.LAZY_LOG === "true") {
    module.exports = function(...args) {
        const frame = stack_trace()[2];
        console.log("[%s] %s:%s - %s",
                    (new Date()).toLocaleTimeString(),
                    path.relative(__root_dir, frame.getFileName()),
                    frame.getLineNumber(),
                    util.format(...args));
    };
}
else {
    module.exports = function() {};
}
