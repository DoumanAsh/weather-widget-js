'use strict';
const express = require('express');
const trace = require('./utils').logger;
const geo = require('./utils').geo;
const redis_cli = require('./utils').redis;

const app = express();

var cities = {};

redis_cli.get('cities', function(err, reply) {
    trace('redis GET \'cities\'. err=%s | reply=%s', err, reply);
    if (reply) {
        cities = JSON.parse(reply);
    }
    else {
        geo.get_coords_city('Nizhny Novgorod', 'Moscow', 'Saint Petersburg')
           .then(function(result) {
               trace("Downloaded coordinates=%j", result);
               cities = result;
               redis_cli.set('cities', JSON.stringify(cities));
           })
           .catch(function(error) {
               throw error;
           });
    }
});

app.set('views', __from_root('views'));
app.set('view engine', 'pug');

/* Setup middleware.
 * NOTE: It should be before mounting static. */
app.use(require('./middleware/stylus.js'));

app.use('/', express.static(__from_root('static')));

/* Root page will present widget configuration */
app.get('/', function (req, res) {
    res.render('index');
});

/* Any other page is 404 */
app.get('*', function(req, res){
    res.status(404).render('404');
});

module.exports = app;
