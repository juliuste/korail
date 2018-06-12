# `journeyLeg(lineId, departureDate)`

Get passed stations and prices for a specific journey leg / train. Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/promise) that will resolve with an array which looks as follows.

`lineId` must be a valid line id obtained using the `journeys` method.

`departureDate` must be a departure `Date` object of the same leg. Please note that the `journeys` method doesn't return `Date` objects, but rather ISO strings instead, so you would need to use `new Date(leg.departure)` instead of `leg.departure`.

## Example

```js
const korail = require('korail')

korail.journeyLeg('163', new Date('2018-06-12T20:00:00+09:00')) // Seoul -> Busan
.then(console.log)
.catch(console.error)
```

Note that, rather than returning just the stations between origin and destination of your original journey, this methods returns the entire train route.

## Response

```js
[
    {
        station: {
            type: "station",
            id: "0390",
            name: "행신"
        },
        arrival: null,
        departure: "2018-06-20T19:38:00+09:00"
    },
    {
        station: {
            type: "station",
            id: "0001",
            name: "서울"
        },
        arrival: "2018-06-20T19:55:00+09:00",
        departure: "2018-06-20T20:00:00+09:00"
    },
    // …
    {
        station: {
            type: "station",
            id: "0509",
            name: "울산(통도사)"
        },
        arrival: "2018-06-20T22:15:00+09:00",
        departure: "2018-06-20T22:17:00+09:00"
    },
    {
        station: {
            type: "station",
            id: "0020",
            name: "부산"
        },
        arrival: "2018-06-20T22:37:00+09:00",
        departure: null
    }
]
```
