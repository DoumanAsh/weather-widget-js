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
        this.forecast_io = new ForecastIO(process.env.FORECAST_IO_API_KEY);
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
        city = this.get_city(city);

        if (!city) {
            return undefined;
        }

        return city.coordinates;
    }

    /**
     * @return {Object} Forecast for city.
     * @param city Name of the city.
     */
    get_city_forecast(city) {
        city = this.get_city(city);

        if (!city) {
            return undefined;
        }

        return city.forecast;
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
              this.init_forecast();
          })
          .catch((err) => {
              trace('Could not get cities from DB. Error=%s', err);
              this.fetch_coordinates();
          });
    }

    /**
     * Initializes forecast information.
     */
    init_forecast() {
        trace('Initialize forecast info');
        this.fetch_forecast();

        /* 1 hour re-fetch */
        setInterval(this.fetch_forecast, 3600000, this);
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
     * Sets forecast for city.
     * @param city {String} Name of the city.
     * @param data {Object} JSON data from ForecastIO.
     */
    set_forecast(city, data) {
        trace('Set forecast for city %s', city);
        function day_info(forecast_io_data) {
            const current = forecast_io_data.currently;
            return {
                time: current.time, //Unix time
                summary: current.summary,
                temperature: current.temperature, //Celcius
                windSpeed: current.windSpeed, //Meters per second
                humidity: current.humidity //%
            };
        }

        function week_info(forecast_io_data) {
            var time_now = new Date();
            time_now.setHours(0, 0, 0, 0);
            time_now = time_now.getTime() / 1000; //Unix time.

            var result = [];
            forecast_io_data.daily.data.forEach((day_data) => {
                if (day_data.time >= time_now) {
                    result.push({
                        time: day_data.time,
                        summary: day_data.summary,
                        temperature: {
                            min: day_data.temperatureMin,
                            max: day_data.temperatureMax,
                        },
                        humidity: day_data.humidity,
                        windSpeed: day_data.windSpeed
                    });
                }
            });

            return result;
        }

        this.inner[city].forecast = {
            current: day_info(data),
            week: week_info(data)
        };
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
               this.init_forecast();
           })
           .catch((error) => {
               console.log("Could not retrieve cities. Error=%s", error);
           });
    }

    /**
     * Downloads forecast information.
     */
    fetch_forecast(self) {
        /* When called from time-out we pass this. */
        if (!self) {
            self = this
        }

        self.get_cities().forEach((key) => {
            const coords = self.inner[key].coordinates;

            self.forecast_io.latitude(coords.lat)
                            .longitude(coords.lng)
                            .units('si')
                            .get()
                            .then((res) => {
                                self.set_forecast(key, JSON.parse(res));
                            })
                            .catch((err) => {
                                console.log(err);
                            });
        });
    }
};
