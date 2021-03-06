'use strict'

const { fetch } = require('fetch-ponyfill')()
const { stringify } = require('query-string')
const { DateTime } = require('luxon')
const isString = require('lodash/isString')

const createISODate = ({ day, time }) =>
	DateTime.fromFormat(`${day} ${time}`, 'yyyyMMdd HHmmss', { zone: 'Asia/Seoul' }).toISO()

const createStopover = s => {
	let arrival = null
	if (s.h_arv_tm !== '999999') {
		arrival = createISODate({ day: s.h_arv_dt, time: s.h_arv_tm })
	}
	let departure = null
	if (s.h_dpt_tm !== '999999') {
		departure = createISODate({ day: s.h_dpt_dt, time: s.h_dpt_tm })
	}

	return ({
		type: 'stopover',
		stop: {
			type: 'station',
			id: s.h_stop_rs_stn_cd + '',
			name: s.h_stop_rs_stn_nm,
		},
		arrival,
		departure,
		// todo: h_act_arv_dlay_tnum
	})
}

const tripStopovers = async (tripId) => {
	if (!isString(tripId) || tripId.length === 0) throw new Error('invalid or missing `tripId`, must be string')
	const [lineId, day] = tripId.split('###') // @todo

	if (!isString(lineId) || lineId.length === 0) throw new Error('invalid `tripId`')
	if (!isString(day) || day.length !== 8) throw new Error('invalid `tripId`')

	const endpoint = 'https://smart.letskorail.com/classes/com.korail.mobile.trainsInfo.TrainSchedule'
	const query = stringify({
		Device: 'IP',
		// Sid: '1QihOasC3e4vT2ld1RRiMw==',
		// Version: '180314001',
		srtCheckYn: 'Y',
		txtRunDt: day,
		txtTrnNo: lineId,
	})
	const url = `${endpoint}?${query}`
	let results = await fetch(url, { method: 'POST' })
	results = await results.json()

	if (results.strResult !== 'SUCC') throw new Error(JSON.stringify(results))
	return results.time_infos.time_info.map(createStopover)
}
tripStopovers.features = {} // required by fpti

module.exports = tripStopovers
