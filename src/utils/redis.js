'use strict';
const trace = require('.').logger;
const redis_cli = require('redis').createClient();

redis_cli.on("error", function (err) {
    trace("Redis error: %s", err);
});

module.exports = redis_cli;
