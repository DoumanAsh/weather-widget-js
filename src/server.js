'use strict';
const express = require('express');
const trace = require('./utils').logger;
const app = express();

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
