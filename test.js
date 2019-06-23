'use strict'

const tapeWithoutPromise = require('tape')
const addPromiseSupport = require('tape-promise').default
const tape = addPromiseSupport(tapeWithoutPromise)
const validate = require('validate-fptf')()
const { DateTime } = require('luxon')
const fptiTests = require('fpti-tests')
const getStream = require('get-stream').array

const korail = require('.')
const pkg = require('./package.json')

const when = DateTime.fromObject({ zone: 'Asia/Seoul', weekday: 4 }).plus({ weeks: 1, hours: 6 }).toJSDate() // next thursday, 06:00
const isStationWithName = (s, name) => (s.type === 'station' && s.name === name)

tape('korail fpti tests', async t => {
	await t.doesNotReject(fptiTests.packageJson(pkg), 'valid package.json')
	t.doesNotThrow(() => fptiTests.packageExports(korail, ['stations.all', 'journeys']), 'valid module exports')
	t.doesNotThrow(() => fptiTests.stationsAllFeatures(korail.stations.all.features, []), 'valid stations.all features')
	t.doesNotThrow(() => fptiTests.journeysFeatures(korail.journeys.features, ['when', 'departureAfter', 'results', 'interval', 'transfers']), 'valid journeys features')
})

tape('korail.stations.all', async t => {
	const stations = await getStream(korail.stations.all())

	// base-check all stations
	t.ok(stations.length > 100, 'number of stations')
	for (let station of stations) {
		t.doesNotThrow(() => validate(station), 'valid fptf')
		t.ok(station.location.longitude > 100, 'station location longitude')
		t.ok(station.group.length >= 1, 'station group')
	}

	// deep-check busan station
	const busan = stations.find(x => x.name === '부산')
	t.ok(!!busan, 'busan found')
	t.ok(!!busan.major, 'busan major')
})

tape('korail.journeys non-direct', async t => {
	const mokpo = { id: '0041', type: 'station' }
	const busan = '0020'

	const journeys = await korail.journeys(mokpo, busan, { when })
	t.ok(journeys.length > 0, 'number of journeys')
	for (let journey of journeys) {
		t.doesNotThrow(() => validate(journey), 'valid fptf')
		t.ok(isStationWithName(journey.legs[0].origin, '목포'), 'origin')
		t.ok(isStationWithName(journey.legs[journey.legs.length - 1].destination, '부산'), 'destination')
		t.ok(+new Date(journey.legs[0].departure) >= +when, 'departure')

		t.ok(journey.legs.length > 1, 'legs length')
		for (let leg of journey.legs) {
			t.ok(leg.mode === 'train', 'leg mode')
			t.ok(leg.operator.id === 'korail', 'leg operator')
			t.doesNotThrow(() => validate(leg.line), 'valid fptf')
			t.ok(leg.line.product.id.length > 0, 'leg line product id')
			t.ok(leg.line.product.name.length > 0, 'leg line product name')
			t.ok(leg.line.mode === 'train', 'leg line mode')
			t.ok(leg.line.operator.id === 'korail', 'leg line operator')
		}
	}
	const journeysWithPrice = journeys.filter(j => j.price)
	t.ok(journeysWithPrice.length === 0, 'number of journeys with price')
	for (let journey of journeysWithPrice) {
		t.ok(journey.price.amount > 0, 'price amount')
		t.ok(journey.price.currency === 'KRW', 'price currency')
	}
})

tape('korail.journeys opt.product, opt.departureAfter', async t => {
	const seoul = '0001'
	const busan = '0020'

	const journeys = await korail.journeys(seoul, busan, { departureAfter: when, transfers: 0, product: 'KTX' })
	t.ok(journeys.length >= 5, 'number of journeys')
	for (let journey of journeys) {
		t.doesNotThrow(() => validate(journey), 'valid fptf')
		t.ok(isStationWithName(journey.legs[0].origin, '서울'), 'origin')
		t.ok(isStationWithName(journey.legs[journey.legs.length - 1].destination, '부산'), 'destination')
		t.ok(+new Date(journey.legs[0].departure) >= +when, 'departure')
		t.ok(journey.legs.some(leg => leg.line.product.id === '100' && leg.line.product.name === 'KTX'), 'KTX leg')
	}
})

tape('korail.journeys opt.results', async t => {
	const seoul = '0001'
	const busan = '0020'

	const journeys = await korail.journeys(seoul, busan, { when, results: 2 })
	t.ok(journeys.length === 2, 'number of journeys')
})

tape('korail.journeys opt.transfers', async t => {
	const mokpo = '0041'
	const busan = { id: '0020', type: 'station' }

	const journeysWithoutTransfer = await korail.journeys(mokpo, busan, { when, transfers: 0 })
	t.ok(journeysWithoutTransfer.length === 0, 'number of journeys')

	const journeysWithTransfer = await korail.journeys(mokpo, busan, { when, transfers: 2 })
	t.ok(journeysWithTransfer.length > 0, 'number of journeys')
	for (let journey of journeysWithTransfer) t.doesNotThrow(() => validate(journey), 'valid fptf')
})

tape('korail.journeys opt.interval', async t => {
	const mokpo = '0041'
	const busan = '0020'
	const dayAfterWhen = DateTime.fromJSDate(when, { zone: 'Asia/Seoul' }).plus({ days: 1 }).toJSDate()

	const journeysWithoutInterval = await korail.journeys(mokpo, busan, { when })
	for (let journey of journeysWithoutInterval) t.doesNotThrow(() => validate(journey), 'valid fptf')
	t.ok(journeysWithoutInterval.length > 0, 'precondition')
	const journeysWithoutIntervalDayAfterWhen = journeysWithoutInterval.filter(journey => +new Date(journey.legs[0].departure) >= +dayAfterWhen)
	t.ok(journeysWithoutIntervalDayAfterWhen.length === 0, 'number of journeys')

	const journeysWithInterval = await korail.journeys(mokpo, busan, { when, interval: 30 * 60 }) // journeys for the next 30h
	for (let journey of journeysWithInterval) t.doesNotThrow(() => validate(journey), 'valid fptf')
	t.ok(journeysWithInterval.length > 0, 'precondition')
	const journeysWithIntervalDayAfterWhen = journeysWithInterval.filter(journey => +new Date(journey.legs[0].departure) >= +dayAfterWhen)
	t.ok(journeysWithIntervalDayAfterWhen.length > 0, 'number of journeys')
})

tape('korail.tripStopovers', async (t) => {
	const mokpo = '0041'
	const busan = '0020'

	const journeys = await korail.journeys(mokpo, busan, { when })
	const tripId = journeys[0].legs[0].tripId
	t.ok(typeof tripId === 'string' && tripId.length > 0, 'precondition')

	const tripStopovers = await korail.tripStopovers(tripId)
	t.ok(tripStopovers.length > 5, 'number of stopovers')
	for (let stopover of tripStopovers) t.doesNotThrow(() => validate(stopover), 'valid fptf')
})
