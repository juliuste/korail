'use strict'

const { journeys: validateArguments } = require('fpti-util').validateMethodArguments
const { fetch } = require('fetch-ponyfill')()
const { stringify } = require('query-string')
const { DateTime } = require('luxon')
const merge = require('lodash/merge')
const groupBy = require('lodash/groupBy')
const sortBy = require('lodash/sortBy')
const toArray = require('lodash/toArray')
const last = require('lodash/last')
const take = require('lodash/take')
const slug = require('slugg')
const getStream = require('get-stream').array

const { all: _stations } = require('./stations')
const stations = getStream(_stations())

const products = {
	'KTX': '100',
	'새마을': '101',
	'무궁화': '102', // including 누리로
	'청춘': '104'
}

const operator = {
	type: 'operator',
	id: 'korail',
	name: 'korail',
	url: 'https://www.letskorail.com'
}

const hashLeg = (l) => [l.origin.id, l.departure, l.destination.id, l.arrival, l.line.name].join('_')
const hashJourney = (j) => j.legs.map(hashLeg).join('_')

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
		operator,

		line: {
			type: 'line',
			id: l.h_trn_no + '',
			name: [l.h_trn_clsf_nm, l.h_trn_no].join(' '),
			product: {
				id: l.h_trn_gp_cd,
				name: l.h_trn_gp_nm
			},
			mode: 'train',
			operator
		}
	}

	leg.tripId = [leg.line.id, DateTime.fromISO(leg.departure, { zone: 'Asia/Seoul' }).toFormat('yyyyMMdd')].join('###')
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

const fetchJourneysForDate = async (origin, destination, options, date) => {
	const endpoint = 'https://smart.letskorail.com/classes/com.korail.mobile.seatMovie.ScheduleView'
	const day = DateTime.fromJSDate(date, { zone: 'Asia/Seoul' }).toFormat('yyyyMMdd')
	const time = DateTime.fromJSDate(date, { zone: 'Asia/Seoul' }).toFormat('HHmmss')
	const product = options.product ? products[options.product] : '109'
	const query = stringify({
		Device: 'IP',
		// Sid: 'GZSeQnD/q53ni/oohPUFlQ==',
		// Version: '180314001',
		ebizCrossCheck: 'Y',
		key: 'korail1234567890',
		radJobId: (options.transfers === 0) ? '1' : '5',
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

// default options
const defaults = () => ({
	// fpti options
	when: null,
	departureAfter: null,
	results: null,
	transfers: null,
	interval: null,

	// module-specific options
	product: null
})

const journeys = async (origin, destination, opt = {}) => {
	// merge options with defaults
	const def = defaults()
	if (!(opt.departureAfter || opt.when)) def.departureAfter = new Date()
	const options = merge({}, def, opt)

	// validate arguments, prepare origin and destination
	const stationList = await stations
	if (typeof origin === 'string') origin = stationList.find(s => s.id === origin)
	else origin = stationList.find(s => s.id === origin.id)
	if (typeof destination === 'string') destination = stationList.find(s => s.id === destination)
	else destination = stationList.find(s => s.id === destination.id)
	validateArguments(origin, destination, options)
	if (typeof origin !== 'string') origin = origin.name
	if (typeof destination !== 'string') destination = destination.name

	// validate module-specific options
	if (options.product && !Object.keys(products).includes(options.product)) throw new Error('`opt.product` must be one of ' + JSON.stringify(Object.keys(products)))

	const date = options.when || options.departureAfter
	const endDate = DateTime.fromJSDate(date, { zone: 'Asia/Seoul' }).plus({ minutes: options.interval || 0 }).toJSDate()

	let endOfIntervalReachedOrNoIntervalSet = !options.interval
	let currentDate = date
	let journeys = []
	do {
		const newJourneys = await fetchJourneysForDate(origin, destination, options, currentDate)
		if (newJourneys.length === 0) {
			currentDate = DateTime.fromJSDate(currentDate, { zone: 'Asia/Seoul' }).plus({ minutes: 120 }).toJSDate() // @todo
		} else {
			journeys.push(...newJourneys)

			const newJourneysSortedByDeparture = sortBy(newJourneys, journey => +new Date(journey.legs[0].departure))
			const latestJourneyDate = new Date(last(newJourneysSortedByDeparture).legs[0].departure)
			const newCurrentDate = DateTime.fromJSDate(latestJourneyDate, { zone: 'Asia/Seoul' }).plus({ minutes: 1 }).toJSDate()
			if (+newCurrentDate === +currentDate) break
			currentDate = newCurrentDate
		}
		endOfIntervalReachedOrNoIntervalSet = !options.interval || (+currentDate > +endDate)
	} while (!endOfIntervalReachedOrNoIntervalSet)

	journeys = journeys.filter(j => +new Date(j.legs[0].departure) >= +date)
	if (typeof options.interval === 'number') journeys = journeys.filter(j => +new Date(j.legs[0].departure) <= +endDate)
	if (typeof options.transfers === 'number') journeys = journeys.filter(j => j.legs.length <= options.transfers + 1)
	if (typeof options.results === 'number') journeys = take(journeys, options.results)
	return journeys
}
journeys.features = { // required by fpti
	when: 'Journey date, synonym to departureAfter',
	departureAfter: 'List journeys with a departure (first leg) after this date',
	results: 'Max. number of results returned',
	transfers: 'Max. number of transfers',
	interval: 'Results for how many minutes after / before when (depending on whenRepresents)',
	product: 'Filter for journeys that use the given product'
}

module.exports = journeys
