# Weather widget

[![Build Status](https://travis-ci.org/DoumanAsh/weather-widget-js.svg?branch=master)](https://travis-ci.org/DoumanAsh/weather-widget-js) [![Coverage Status](https://coveralls.io/repos/github/DoumanAsh/weather-widget-js/badge.svg)](https://coveralls.io/github/DoumanAsh/weather-widget-js)

## Requirements

### ForecastIO

API key of [ForecastIO](https://developer.forecast.io) is required.

Set environment variable `FORECAST_IO_API_KEY` with it for weather widget to work.

### Redis

Server should be up and running for back-up.

## TODO

- [X] Determine weather provider
- [X] Implement server side
    - [X] Widget creation
    - [X] Client iframe
        - [ ] Fix horizontal widget
- [ ] Supply automatic test
