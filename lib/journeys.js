'use strict'

const { fetch } = require('fetch-ponyfill')()
const { stringify } = require('query-string')
const { DateTime } = require('luxon')
const isString = require('lodash/isString')
const isObject = require('lodash/isObject')
const isBoolean = require('lodash/isBoolean')
const groupBy = require('lodash/groupBy')
const sortBy = require('lodash/sortBy')
const toArray = require('lodash/toArray')
const isDate = require('lodash/isDate')
const merge = require('lodash/merge')
const slug = require('slugg')
const getStream = require('get-stream').array

const { all: _stations } = require('./stations')
const stations = getStream(_stations())

const defaults = {
	direct: false,
	product: null
}

const products = {
	'KTX': '100',
	'새마을': '101',
	'무궁화': '102', // including 누리로
	'청춘': '104'
}

const hashLeg = (l) => [l.origin.id, l.departure, l.destination.id, l.arrival, l.line.name].join('_')
const hashJourney = (j) => j.legs.map(l => l.schedule).join('_')

const createISODate = ({ day, time }) =>
	DateTime.fromFormat(`${day} ${time}`, 'yyyyMMdd HHmmss', { zone: 'Asia/Seoul' }).toISO()

const createLeg = async (l) => {
	const stationList = await stations
	const leg = {
		origin: stationList.find(s => s.id === l.h_dpt_rs_stn_cd),
		destination: stationList.find(s => s.id === l.h_arv_rs_stn_cd),
		departure: createISODate({ day: l.h_dpt_dt, time: l.h_dpt_tm }),
		arrival: createISODate({ day: l.h_arv_dt, time: l.h_arv_tm }),
		// todo: h_expct_dlay_hr
		mode: 'train', // sigh…
		public: true,
		operator: 'korail',

		line: {
			type: 'line',
			id: l.h_trn_no + '',
			name: [l.h_trn_clsf_nm, l.h_trn_no].join(' '),
			product: {
				id: l.h_trn_gp_cd,
				name: l.h_trn_gp_nm
			},
			mode: 'train',
			operator: 'korail'
		}
	}

	leg.schedule = slug(hashLeg(leg))
	return leg
}

const createJourney = async legGroup => {
	if (legGroup.length !== +legGroup[0].h_chg_trn_dv_cd) throw new Error('unexpected leg group length, please report this issue')

	const legs = await Promise.all(legGroup.map(createLeg))

	const journey = {
		type: 'journey',
		id: slug(hashJourney({ legs })),
		legs
	}

	if (legs.length === 1 && legGroup[0].h_rcvd_amt && +legGroup[0].h_rcvd_amt > 0) {
		journey.price = {
			amount: +legGroup[0].h_rcvd_amt,
			currency: 'KRW'
		}
	}

	return journey
}

const journeys = async (origin, destination, date = new Date(), opt) => {
	const stationList = await stations

	if (isString(origin)) origin = stationList.find(s => s.id === origin)
	else origin = stationList.find(s => s.id === origin.id)
	if (!isObject(origin) || origin.type !== 'station' || !isString(origin.id) || !isString(origin.name)) throw new Error('invalid, missing or unknown origin')
	origin = origin.name

	if (isString(destination)) destination = stationList.find(s => s.id === destination)
	else destination = stationList.find(s => s.id === destination.id)
	if (!isObject(destination) || destination.type !== 'station' || !isString(destination.id) || !isString(destination.name)) throw new Error('invalid, missing or unknown destination')
	destination = destination.name

	if (!isDate(date)) throw new Error('`date` must be a JS Date() object')
	const day = DateTime.fromJSDate(date, { zone: 'Asia/Seoul' }).toFormat('yyyyMMdd')
	const time = DateTime.fromJSDate(date, { zone: 'Asia/Seoul' }).toFormat('HHmmss')

	const options = merge({}, defaults, opt || {})
	if (!isBoolean(options.direct)) throw new Error('invalid options.direct, must be boolean')
	if (options.product && !Object.keys(products).includes(options.product)) throw new Error('invalid options.product, must be one of ' + JSON.stringify(Object.keys(products)))

	const product = options.product ? products[options.product] : '109'

	const endpoint = 'https://smart.letskorail.com/classes/com.korail.mobile.seatMovie.ScheduleView'
	const query = stringify({
		Device: 'IP',
		// Sid: 'GZSeQnD/q53ni/oohPUFlQ==',
		// Version: '180314001',
		ebizCrossCheck: 'Y',
		key: 'korail1234567890',
		radJobId: options.direct ? '1' : '5',
		rtYn: 'N',
		selGoTrain: product,
		srtCheckYn: 'Y',
		txtCardPsgCnt: '0',
		txtGoAbrdDt: day,
		txtGoEnd: destination,
		txtGoHour: time,
		txtGoStart: origin,
		// txtMenuId: '11',
		txtPsgFlg_1: '01', // passenger count, todo
		txtPsgFlg_2: '00',
		txtPsgFlg_3: '00',
		txtPsgFlg_4: '00',
		txtPsgFlg_5: '00',
		txtSeatAttCd_2: '000',
		txtSeatAttCd_3: '000',
		txtSeatAttCd_4: '015',
		txtTrnGpCd: product
	})
	const url = `${endpoint}?${query}`
	let results = await fetch(url, {
		method: 'POST',
		headers: {
			'Accept': 'application/json'
		}
	})
	results = await results.json()

	if (results.strResult === 'FAIL' && results.h_msg_cd === 'WRG000000') return ([]) // no query results error
	if (results.strResult === 'FAIL' && results.h_msg_cd === 'WRD000061') return ([]) // no direct connections found error
	if (results.strResult !== 'SUCC') throw new Error(JSON.stringify(results))

	const legGroups = toArray(groupBy(results.trn_infos.trn_info, x => x.h_trn_seq))
		.map(lG => sortBy(lG, x => +x.h_chg_trn_seq))

	return Promise.all(legGroups.map(createJourney))
}

module.exports = journeys
