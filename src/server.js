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
    const city_obj = data.inner[city];

    trace("Widget request(city='%s', type='%s', days='%s', city_obj='%s')", city, type, days, city_obj);

    if ((!city) || (!type) || (!days) || (!city_obj) || (!city_obj.forecast)) {
        res.status(404).render('404');
        return;
    }

    city_obj.forecast()
            .then((result) => {
                res.render('widget', {
                    city: city,
                    current: result.current,
                    week: result.week.slice(0, days),
                    type: type
                });
            })
            .catch((error) => {
                console.log("Couldn't fetch forecast info. Error='%s'", error);
                res.status(404).render('404');
            });
});

/* Any other page is 404 */
app.get('*', function(req, res){
    res.status(404).render('404');
});

module.exports = app;
