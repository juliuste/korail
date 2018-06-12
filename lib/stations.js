'use strict'

const got = require('got')

const createStation = s => {
    const station = {
        type: 'station',
        id: s.stn_cd+'',
        name: s.stn_nm,
        location: {
            type: 'location',
            longitude: s.longitude,
            latitude: s.latitude
        },
        group: s.group // todo
    }
    if (s.major) station.major = s.major // todo
    return station
}

const stations = async () => {
    const results = await (got.get('https://smart.letskorail.com/classes/com.korail.mobile.common.stationdata', {
        json: true
    }).then(res => res.body))

    return results.stns.stn.map(createStation)
}

module.exports = stations
