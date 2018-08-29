# `stations()`

Get a list of all stations. Returns a [Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/promise) that will resolve in an array of `station`s in the [*Friendly Public Transport Format*](https://github.com/public-transport/friendly-public-transport-format).

```js
const korail = require('korail')

korail.stations()
.then(console.log)
.catch(console.error)
```

## Response

```js
[
    {
        type: "station",
        id: "0476",
        name: "가야",
        location: {
            type: "location",
            longitude: 129.0395387,
            latitude: 35.1609769
        },
        group: "1"
    },
    {
        type: "station",
        id: "0150",
        name: "가평",
        location: {
            type: "location",
            longitude: 127.5133331,
            latitude: 37.8243821
        },
        group: "1"
    },
    {
        type: "station",
        id: "0309",
        name: "각계",
        location: {
            type: "location",
            longitude: 127.7254118,
            latitude: 36.2082396
        },
        group: "1"
    }
    // …
]
```
