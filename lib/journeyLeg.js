'use strict'

const got = require('got')
const { DateTime } = require('luxon')
const isString = require('lodash/isString')
const isDate = require('lodash/isDate')

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
		station: {
			type: 'station',
			id: s.h_stop_rs_stn_cd + '',
			name: s.h_stop_rs_stn_nm
		},
		arrival,
		departure
		// todo: h_act_arv_dlay_tnum
	})
}

const journeyLeg = async (lineId, departureDate) => {
	if (!isString(lineId) || lineId.length === 0) throw new Error('invalid or missing `lineId`, must be string')

	if (!isDate(departureDate)) throw new Error('`departureDate` must be a JS Date() object')
	const day = DateTime.fromJSDate(departureDate, { zone: 'Asia/Seoul' }).toFormat('yyyyMMdd')

	const results = await (got.post('https://smart.letskorail.com/classes/com.korail.mobile.trainsInfo.TrainSchedule', {
		query: {
			Device: 'IP',
			// Sid: '1QihOasC3e4vT2ld1RRiMw==',
			// Version: '180314001',
			srtCheckYn: 'Y',
			txtRunDt: day,
			txtTrnNo: lineId
		},
		json: true
	}).then(res => res.body))

	if (results.strResult !== 'SUCC') throw new Error(JSON.stringify(results))

	return results.time_infos.time_info.map(createStopover)
}

module.exports = journeyLeg
