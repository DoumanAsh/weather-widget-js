'use strict';
const express = require('express');
const trace = require('./utils').logger;
const geo = require('./utils').geo;

const db = new (require('./utils').db)();
const app = express();

var cities = {};

db.get_obj('cities')
  .then((result) => {
      trace("Got cached cities='%j'", result);
      cities = result;
  })
  .catch(function(err) {
      trace('Could not get cities. Error=%s', err);

      geo.get_coords_city('Nizhny Novgorod', 'Moscow', 'Saint Petersburg')
         .then((result) => {
             trace("Downloaded coordinates=%j", result);
             cities = result;
             db.set_obj('cities', cities)
               .then(() => {
                   trace('cached new cities');
                   //TODO: download weather.
               })
               .catch((error) => {
                   console.log("Could not cache cities. Error=%s", error);
               });
         })
         .catch((error) => {
             console.log("Could not retrieve cities. Error=%s", error);
         });
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
