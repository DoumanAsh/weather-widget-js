'use strict';
const trace = require('./logger.js');

/**
 * Database abstraction class.
 */
module.exports = class DB {
    /**
     * Initializes Database interface.
     *
     * @constructor
     */
    constructor() {
        this.inner = require('redis').createClient();

        this.inner.on("error", (err) => {
            console.log("Redis error: %s", err);
        });
    }

    /**
     * @return Promises with value of key.
     * @param key {String} Name of variable to retrieve.
     */
    get(key) {
        trace("get '%s'", key);
        return new Promise((resolve, reject) => {
            this.inner.get(key, (err, reply) => {
                trace("inner get(err=%s, reply=%s)", err, reply);
                if (!reply) {
                    reject(err);
                }

                resolve(reply);
            });
        });
    }

    /**
     * @return Promises with value of key converted to JS Object.
     * @param key {String} Name of variable to retrieve.
     */
    get_obj(key) {
        return this.get(key).then((value) => {
            return JSON.parse(value);
        });
    }

    /**
     * Sets new values to key.
     *
     * @param key {String} Name of key.
     * @param value {String} Value of key.
     */
    set(key, value) {
        trace("set value='%s' to key='%s'", value, key);
        return new Promise((resolve, reject) => {
            this.inner.set(key, value, (err, result) => {
                trace("inner set. err='%s', result='%s'", err, result);
                if (result === 'OK') {
                    resolve();
                }
                else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Sets new values to key.
     *
     * @param key {String} Name of key.
     * @param value {Object} Value of key.
     */
    set_obj(key, value) {
        return this.set(key, JSON.stringify(value));
    }
};
