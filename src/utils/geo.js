'use strict';
const request = require('request');
const util = require('util');

/**
 * @return HTTP(s) request link for city.
 * @param {String} city_name Name of city.
 */
function geocode_city(city_name) {
    return util.format("https://maps.googleapis.com/maps/api/geocode/json?address=Russia,%s&sensor=true",
                       city_name.replace(' ', '+'));
}

/**
 * Retrieves coordinates of Russian city.
 *
 * @param {Array} args List of cities names.
 *
 * @return Promise with object which consist of city name and its coordinates.
 */
function get_coords_city(args) {
    var args_num = args.length;
    return new Promise(function(resolve, reject) {
        var result = {};

        args.forEach(function(arg) {
            request(geocode_city(arg), function(error, response, body) {
                args_num -= 1;
                if (!error && response.statusCode === 200) {
                    body = JSON.parse(body);

                    if (body.status !== "OK") {
                        reject(new Error('Bad google api result'));
                    }

                    //Assume that we're going to have only one result.
                    result[arg] = {
                        lat: body.results[0].geometry.location.lat,
                        lng: body.results[0].geometry.location.lng,
                    };

                    if (!args_num) {
                        resolve(result);
                    }
                }
                else {
                    reject(error);
                }
            });
        });
    });
}

module.exports.get_coords_city = get_coords_city;
