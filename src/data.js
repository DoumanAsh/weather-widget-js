'use strict';
const trace = require('./utils').logger;
const geo = require('./utils').geo;
const db = new (require('./utils').db)();

const ForecastIO = require('forecast-io');

/**
 * Data class.
 *
 * Contains information about cities and their forecast.
 */
module.exports = class DB {
    /**
     * Initializes Data.
     *
     * @constructor
     */
    constructor() {
        //TODO: remove API key here :)
        this.forecast_io = new ForecastIO('API_KEY');
        this.inner = {
            'Nizhny Novgorod': undefined,
            'Moscow': undefined,
            'Saint Petersburg': undefined
        };

        this.init_cities();
    }

    /**
     * @return [Array] List of cities in DB.
     */
    get_cities() {
        return Object.keys(this.inner);
    }

    /**
     * @return {Object} city's data.
     * @param city {String} name of the city.
     */
    get_city(city) {
        if (city in this.inner) {
            return this.inner[city];
        }
        else {
            throw new Error('City ' + city + ' does not exist in DB');
        }
    }

    /**
     * @return {Object} pair of coordinates: latitude and longitude.
     * @param city {String} name of the city.
     */
    get_city_coords(city) {
        var city = this.get_city(city);

        if (!city) {
            return undefined;
        }

        return city.coordinates;
    }

    /**
     * Initializes cities coordinates.
     */
    init_cities() {
        trace('Initialize cities coordinates');

        db.get_obj('cities')
          .then((result) => {
              trace("Got cached cities='%j'", result);

              this.set_coordinates(result);
          })
          .catch((err) => {
              trace('Could not get cities from DB. Error=%s', err);
              this.fetch_coordinates();
          });
    }

    /**
     * Sets coordinates for cities.
     * @param cities {Object} Pair of city name and coordinates {lat; lng}
     */
    set_coordinates(cities) {
        this.get_cities().forEach((key) => {
            if (this.inner[key]) {
                this.inner[key].coordinates = cities[key];
            }
            else {
                this.inner[key] = {
                    coordinates: cities[key],
                    forecast: undefined
                };
            }
        });
    }

    /**
     * Downloads cities coordinates.
     */
    fetch_coordinates() {
        trace('Download cities(%s) coordinates', this.get_cities());

        geo.get_coords_city(this.get_cities())
           .then((result) => {
               trace("Downloaded coordinates=%j", result);

               db.set_obj('cities', result)
                 .then(() => {
                     trace('cached new cities');
                 })
                 .catch((error) => {
                     console.log("Could not cache cities. Error=%s", error);
                 });

               this.set_coordinates(result);
           })
           .catch((error) => {
               console.log("Could not retrieve cities. Error=%s", error);
           });
    }

    /**
     * Downloads forecast information.
     */
    fetch_forecast() {
    }
};
