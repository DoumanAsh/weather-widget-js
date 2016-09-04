'use strict';
const express = require('express');
const trace = require('./utils').logger;

const data = new (require('./data.js'))();
const app = express();

app.set('views', __from_root('views'));
app.set('view engine', 'pug');

/* Setup middleware.
 * NOTE: It should be before mounting static. */
app.use(require('./middleware/stylus.js'));

app.use('/', express.static(__from_root('static')));

/* Root page will present widget configuration */
app.get('/', function (req, res) {
    res.render('index', {
        cities: data.get_cities(),
        days: [1, 3, 7]
    });
});

app.get('/widget', function (req, res) {
    /* Example: <root>/widget?city=<name>&type=<name>&days=<num> */
    const city = req.query.city;
    const type = req.query.type;
    const days = parseInt(req.query.days);
    const forecast = data.inner[city].forecast;

    trace("Widget request(city='%s', type='%s', days='%s', forecast='%s')", city, type, days, forecast);

    if ((!city) || (!type) || (!days) || (!forecast) || (forecast.week.length < days)) {
        res.status(404).render('404');
        return;
    }

    res.render('widget', {
        city: city,
        current: forecast.current,
        week: forecast.week.slice(0, days),
        type: type
    });
});

/* Any other page is 404 */
app.get('*', function(req, res){
    res.status(404).render('404');
});

module.exports = app;
