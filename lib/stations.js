'use strict'

const { fetch } = require('fetch-ponyfill')()
const intoStream = require('into-stream').object

const createStation = s => {
	const station = {
		type: 'station',
		id: s.stn_cd + '',
		name: s.stn_nm,
		location: {
			type: 'location',
			longitude: +s.longitude,
			latitude: +s.latitude
		},
		group: s.group // todo
	}
	if (s.major) station.major = s.major // todo
	if (s.popupMessage) station.info = s.popupMessage // todo
	return station
}

const allAsync = async (opt) => {
	let results = await fetch('https://smart.letskorail.com/classes/com.korail.mobile.common.stationdata')
	results = await results.json()
	return results.stns.stn.map(createStation)
}

const all = (opt = {}) => {
	return intoStream(allAsync(opt))
}
all.features = {} // required by fpti

module.exports = { all }
