'use strict';
const path = require('path');

/* Setup root of project as a global */
global.__root_dir = __dirname;
global.__from_root = function(...args) {
    return path.join(global.__root_dir, ...args);
};

const PORT = 8080;
process.env.LAZY_LOG = "true";
const server = require("./src/server.js");

server.listen(PORT, function () {
    console.log('Start server on port %d', PORT);
});
