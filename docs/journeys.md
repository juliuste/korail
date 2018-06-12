# `journeys(origin, destination, date = new Date(), opt)`

Get directions for routes from A to B. Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/promise) that will resolve with an array of `journey`s in the [*Friendly Public Transport Format*](https://github.com/public-transport/friendly-public-transport-format).

**Please note that this module fetches a list of stations using the `stations()` method upon initialization, which takes about 3-4 seconds.**

`origin` and `destination` must be `station` objects or ids (use the [`stations`](stations.md) method to get this information).

`date` must be a JS `Date` object. Please note that the API doesn't return results for an entire day, but rather for the next few hours starting at the given `date`.

`opt` partially overwrites `defaults`, which looks like this:

```js
const defaults = {
    direct: false, // direct connections only
    product: null, // return only results for specific train type. supported products: 'KTX', '새마을', '무궁화' (includes 누리로) and '청춘'
}
```

## Example

```js
const korail = require('korail')

const seoul = {
    type: 'station',
    id: '0001',
    name: '서울'
}

const busan = '0020'

korail.journeys(seoul, busan, new Date(), {direct: true, product: 'KTX'})
.then(console.log)
.catch(console.error)
```

## Response

```js
[
    {
        type: "journey",
        id: "0001_2018-06-12T20:00:00+09:00_0020_2018-06-12T22:37:00+09:00_KTX 163",
        legs: [
            {
                origin: {
                    type: "station",
                    id: "0001",
                    name: "서울",
                    location: {
                        type: "location",
                        longitude: "126.9708191",
                        latitude: "37.551856"
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
                        longitude: "129.0415717",
                        latitude: "35.1150906"
                    },
                    group: "6",
                    major: "21"
                },
                departure: "2018-06-12T20:00:00+09:00",
                arrival: "2018-06-12T22:37:00+09:00",
                mode: "train",
                public: true,
                operator: "korail",
                line: {
                    type: "line",
                    id: "163",
                    name: "KTX 163",
                    product: {
                        id: "100",
                        name: "KTX"
                    },
                    mode: "train",
                    operator: "korail"
                },
                schedule: "0001_2018-06-12T20:00:00+09:00_0020_2018-06-12T22:37:00+09:00_KTX 163"
            }
        ],
        price: { // undefined if the API doesn't return a price for this specific journey
            amount: 59800,
            currency: "KRW"
        }
    }
    // …
]
```
