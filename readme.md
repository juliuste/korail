# korail

JavaScript client for the South Korean 🇰🇷 [korail](https://www.letskorail.com) railway API. Inofficial, using *korail* endpoints. Ask them for permission before using this module in production.

This module conforms to the [FPTI-JS `0.3.2` standard](https://github.com/public-transport/fpti-js/tree/0.3.2) for JavaScript public transportation modules.

[![npm version](https://img.shields.io/npm/v/korail.svg)](https://www.npmjs.com/package/korail)
[![Build Status](https://travis-ci.org/juliuste/korail.svg?branch=master)](https://travis-ci.org/juliuste/korail)
[![Greenkeeper badge](https://badges.greenkeeper.io/juliuste/korail.svg)](https://greenkeeper.io/)
[![license](https://img.shields.io/github/license/juliuste/korail.svg?style=flat)](license)
[![fpti-js version](https://fpti-js.badges.juliustens.eu/badge/juliuste/korail)](https://fpti-js.badges.juliustens.eu/link/juliuste/korail)
[![chat on gitter](https://badges.gitter.im/juliuste.svg)](https://gitter.im/juliuste)

## Installation

```shell
npm install korail
```

## Usage

```javascript
const korail = require('korail')
```

The `korail` module conforms to the [FPTI-JS `0.3.2` standard](https://github.com/public-transport/fpti-js/tree/0.3.2) for JavaScript public transportation modules and exposes the following methods:

Method | Feature description | [FPTI-JS `0.3.2`](https://github.com/public-transport/fpti-js/tree/0.3.2)
-------|---------------------|--------------------------------------------------------------------
[`stations.all([opt])`](#stationsallopt) | All stations of the *Korail* network, such as `서울`, `부산` or `목포` | [✅ yes](https://github.com/public-transport/fpti-js/blob/0.3.2/docs/stations-stops-regions.all.md)
[`journeys(origin, destination, [opt])`](#journeysorigin-destination-opt) | Journeys between stations | [✅ yes](https://github.com/public-transport/fpti-js/blob/0.3.2/docs/journeys.md)
[`tripStopovers(tripId)`](#tripStopoverstripid) | All stopovers for a trip (all stations a given train passes) | ❌ no

---

### `stations.all([opt])`

Get **all** stations of the *Korail* network, such as `Berlin central bus station` or `Frankfurt Hbf`. See [this method in the FPTI-JS `0.3.2` spec](https://github.com/public-transport/fpti-js/blob/0.3.2/docs/stations-stops-regions.all.md).

#### Supported Options

There currently aren't any supported options for this method, but this might change in a future release.

#### Example

```js
const korail = require('korail')
const stationStream = korail.stations.all()

stationStream.on('data', item => {
    // item is an FPTF station object
    console.log(item)
})
```

```js
{
    type: "station",
    id: "0001",
    name: "서울",
    location: {
        type: "location",
        longitude: 126.9708191,
        latitude: 37.551856
    },
    group: "7",
    major: "1"
}
```

---

### `journeys(origin, destination, [opt])`

Find journeys between stations. See [this method in the FPTI-JS `0.3.2` spec](https://github.com/public-transport/fpti-js/blob/0.3.2/docs/journeys.md).

#### Supported Options

Attribute | Description | FPTI-spec | Value type | Default
----------|-------------|------------|------------|--------
`when` | Journey date, synonym to `departureAfter` | ✅ | [`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/date) | `new Date()`
`departureAfter` | List journeys with a departure (first leg) after this date | ✅ | [`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/date) | `new Date()`
`results` | Max. number of results returned | ✅ | `Number` | `null`
`interval` | Results for how many minutes after `when`/`departureAfter` | ✅ | `Number` | `null`
`transfers` | Max. number of transfers | ✅ | `Number` | `null`
`product` | Filter journey for specific train type | ❌ | Enum (`String`) | `KTX`, `새마을`, `무궁화` (includes 누리로), `청춘`

**Please note that this module fetches a list of stations using the `stations.all()` method upon initialization, which takes about 3-4 seconds.**

#### Example

```js
const seoul = '0001' // station id
const busan = { // FPTF station
	type: 'station',
	id: '0020'
	// …
}
korail.journeys(seoul, busan, { when: new Date('2019-06-27T05:00:00+0200'), product: 'KTX', transfers: 0 }).then(…)
```

```js
{
    type: "journey",
    id: "0001-2019-06-27t12-00-00-000-09-00-0020-2019-06-27t14-42-00-000-09-00-ktx-127",
    legs: [
        {
            origin: {
                type: "station",
                id: "0001",
                name: "서울",
                location: {
                    type: "location",
                    longitude: 126.9708191,
                    latitude: 37.551856
                },
                group: "7",
                major: "1"
            },
            destination: {
                type: "station",
                id: "0020",
                name: "부산",
                location: {
                    type: "location",
                    longitude: 129.0415717,
                    latitude: 35.1150906
                },
                group: "6",
                major: "21"
            },
            departure: "2019-06-27T12:00:00.000+09:00",
            arrival: "2019-06-27T14:42:00.000+09:00",
            mode: "train",
            public: true,
            operator: {
                type: "operator",
                id: "korail",
                name: "korail",
                url: "https://www.letskorail.com"
            },
            line: {
                type: "line",
                id: "127",
                name: "KTX 127",
                product: {
                    id: "100",
                    name: "KTX"
                },
                mode: "train",
                operator: {
                    type: "operator",
                    id: "korail",
                    name: "korail",
                    url: "https://www.letskorail.com"
                }
            },
            tripId: "127###20190627"
        }
    ],
    price: {
        amount: 59800,
        currency: "KRW"
    }
}
```

---

### `tripStopovers(tripId)`

All stopovers for a given trip (all stations a given train passes). Obtain a `tripId` using the [`journeys(origin, destination, [opt])`](#journeysorigin-destination-opt) method. Returns a `Promise` that resolves in a list of stopovers.

#### Example

```js
const tripId = '127###20190627' // taken from the journeys example above
korail.tripStopovers(tripId).then(…)
```

```js
[
    {
        type: "stopover",
        stop: {
            type: "station",
            id: "0001",
            name: "서울"
        },
        arrival: null,
        departure: "2019-06-27T12:00:00.000+09:00"
    },
    {
        type: "stopover",
        stop: {
            type: "station",
            id: "0501",
            name: "광명"
        },
        arrival: "2019-06-27T12:15:00.000+09:00",
        departure: "2019-06-27T12:16:00.000+09:00"
    },
    {
        type: "stopover",
        stop: {
            type: "station",
            id: "0502",
            name: "천안아산"
        },
        arrival: "2019-06-27T12:37:00.000+09:00",
        departure: "2019-06-27T12:39:00.000+09:00"
    },
    // …
    {
        type: "stopover",
        stop: {
            type: "station",
            id: "0020",
            name: "부산"
        },
        arrival: "2019-06-27T14:42:00.000+09:00",
        departure: null
    }
]
```

## Contributing

If you found a bug or want to propose a feature, feel free to visit [the issues page](https://github.com/juliuste/korail/issues).
