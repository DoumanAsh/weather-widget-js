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
        trace("get(key='%s')", key);
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
     * @return Value associated with key.
     * @param hash {String} Name of hash from where to extract key.
     * @param key {String} Associated key.
     */
    hash_get(hash, key) {
        trace("hash_get(hash='%s', key='%s')", hash, key);
        return new Promise((resolve, reject) => {
            this.inner.hget(hash, key, (err, reply) => {
                trace("inner hget(err=%s, reply=%s)", err, reply);
                if (!reply) {
                    reject(err);
                }

                resolve(reply);
            });
        });
    }

    /**
     * @return Promises with value of key converted to JS Object.
     * @param hash {String} Name of hash from where to extract key.
     * @param key {String} Associated key.
     */
    hash_get_obj(hash, key) {
        return this.hash_get(hash, key).then((value) => {
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

    /**
     * Insert key & value into hash.
     *
     * @param hash {String} Name of hash.
     * @param key {String} Key to insert.
     * @param value {String} Value associated with key.
     */
    hash_set(hash, key, value) {
        trace("hash_set(hash='%s', key='%s', value='%s')", hash, key, value);
        return new Promise((resolve, reject) => {
            this.inner.hset(hash, key, value, (err, result) => {
                trace("inner hset. err='%s', result='%s'", err, result);
                if (!err) {
                    resolve();
                }
                else {
                    reject(err);
                }
            });
        });
    }

    /**
     * Insert key & value into hash.
     *
     * @param hash {String} Name of hash.
     * @param key {String} Key to insert.
     * @param value {Object} Value associated with key.
     */
    hash_set_obj(hash, key, value) {
        return this.hash_set(hash, key, JSON.stringify(value));
    }
};
