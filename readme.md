# korail

JavaScript client for the South Korean 🇰🇷 [korail](https://www.letskorail.com) railway API. Complies with the [friendly public transport format](https://github.com/public-transport/friendly-public-transport-format). Inofficial, using *korail* endpoints. Ask them for permission before using this module in production. *Work in progress.*

[![npm version](https://img.shields.io/npm/v/korail.svg)](https://www.npmjs.com/package/korail)
[![Build Status](https://travis-ci.org/juliuste/korail.svg?branch=master)](https://travis-ci.org/juliuste/korail)
[![Greenkeeper badge](https://badges.greenkeeper.io/juliuste/korail.svg)](https://greenkeeper.io/)
[![dependency status](https://img.shields.io/david/juliuste/korail.svg)](https://david-dm.org/juliuste/korail)
[![license](https://img.shields.io/github/license/juliuste/korail.svg?style=flat)](license)
[![fptf version](https://fptf.badges.juliustens.eu/badge/juliuste/korail)](https://fptf.badges.juliustens.eu/link/juliuste/korail)
[![chat on gitter](https://badges.gitter.im/juliuste.svg)](https://gitter.im/juliuste)

## Installation

```shell
npm install korail
```

## Usage

```javascript
const korail = require('korail')
```

This package contains data in the [*Friendly Public Transport Format*](https://github.com/public-transport/friendly-public-transport-format) and provides the following methods:

- [`stations()`](docs/stations.md) to get a list of operated stations, such as `서울`, `부산` or `목포`.
- [`journeys(origin, destination, date = new Date(), opt)`](docs/journeys.md) to get routes between stations.
- [`journeyLeg(lineId, departureDate)`](docs/journeyLeg.md) to get all passed stations for a given journey leg (train).

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/korail/issues).
