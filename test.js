'use strict'

const tapeWithoutPromise = require('tape')
const addPromiseSupport = require('tape-promise').default
const tape = addPromiseSupport(tapeWithoutPromise)
const validate = require('validate-fptf')()
const { DateTime } = require('luxon')
const isObject = require('lodash/isObject')
const fptiTests = require('fpti-tests')
const getStream = require('get-stream').array

const korail = require('.')
const pkg = require('./package.json')

tape('korail fpti tests', async t => {
	await t.doesNotReject(fptiTests.packageJson(pkg), 'valid package.json')
	t.doesNotThrow(() => fptiTests.packageExports(korail, ['stations.all', 'journeys']), 'valid module exports')
	t.doesNotThrow(() => fptiTests.stationsAllFeatures(korail.stations.all.features, []), 'valid stations.all features')
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

const isSeoul = (s) => (s.name === '서울')
const isBusan = (s) => (s.name === '부산')
const isMokpo = (s) => (s.name === '목포')

tape('korail.journeys', async (t) => {
	const when = DateTime.fromJSDate(new Date(), { zone: 'Asia/Seoul' }).plus({ days: 10 }).startOf('day').plus({ hours: 8 }).toJSDate()

	// Seoul -> Busan, direct, KTX
	const j1 = await korail.journeys('0001', { id: '0020', type: 'station' }, when, { direct: true, product: 'KTX' })
	t.ok(j1.length >= 5, 'journeys length')
	for (let journey of j1) {
		validate(journey)
		t.ok(journey.legs.length === 1, 'legs length')
		const leg = journey.legs[0]
		t.ok(isSeoul(leg.origin), 'leg origin')
		t.ok(isBusan(leg.destination), 'leg destination')
		t.ok(+new Date(leg.departure) - (+when) <= 12 * 60 * 60 * 1000, 'leg departure')
		t.ok(leg.mode === 'train', 'leg mode')
		t.ok(leg.operator === 'korail', 'leg operator')
		t.ok(leg.line.type === 'line', 'leg line type')
		t.ok(leg.line.id.length > 0, 'leg line id')
		t.ok(leg.line.name.length > 0, 'leg line name')
		t.ok(leg.line.product.id === '100', 'leg line product id')
		t.ok(leg.line.product.name === 'KTX', 'leg line product name')
		t.ok(leg.line.mode === 'train', 'leg line mode')
		t.ok(leg.line.operator === 'korail', 'leg line operator')
	}
	const pricedJ1 = j1.filter(j => j.price)
	t.ok(pricedJ1.length > 0, 'priced journeys')
	for (let journey of pricedJ1) {
		t.ok(journey.price.amount > 0, 'price amount')
		t.ok(journey.price.currency === 'KRW', 'price currency')
	}

	// Mokpo -> Busan, direct
	const j2 = await korail.journeys({ id: '0041', type: 'station' }, '0020', when, { direct: true })
	t.ok(j2.length === 0, 'journeys length')

	// Mokpo -> Busan, not direct
	const j3 = await korail.journeys({ id: '0041', type: 'station' }, '0020', when)
	t.ok(j3.length > 0, 'journeys length')
	for (let journey of j3) {
		validate(journey)
		t.ok(journey.legs.length > 1, 'legs length')
		for (let leg of journey.legs) {
			t.ok(+new Date(leg.departure) - (+when) <= 24 * 60 * 60 * 1000, 'leg departure')
			t.ok(leg.mode === 'train', 'leg mode')
			t.ok(leg.operator === 'korail', 'leg operator')
			t.ok(leg.line.type === 'line', 'leg line type')
			t.ok(leg.line.id.length > 0, 'leg line id')
			t.ok(leg.line.name.length > 0, 'leg line name')
			t.ok(leg.line.product.id.length > 0, 'leg line product id')
			t.ok(leg.line.product.name.length > 0, 'leg line product name')
			t.ok(leg.line.mode === 'train', 'leg line mode')
			t.ok(leg.line.operator === 'korail', 'leg line operator')
		}
		t.ok(isMokpo(journey.legs[0].origin), 'first leg origin')
		t.ok(isBusan(journey.legs[journey.legs.length - 1].destination), 'last leg destination')
	}
	const pricedJ3 = j3.filter(j => j.price)
	t.ok(pricedJ3.length === 0, 'priced journeys')

	t.end()
})

tape('korail.journeyLeg', async (t) => {
	const when = DateTime.fromJSDate(new Date(), { zone: 'Asia/Seoul' }).plus({ days: 10 }).startOf('day').toJSDate()

	const s = await korail.journeyLeg('524', when)
	t.ok(s.length > 5, 'journeyLeg length')

	for (let stopover of s) {
		t.ok(isObject(stopover.station) && stopover.station.type === 'station', 'station')
		validate(stopover.station)

		// check departure/arrival
		t.ok(stopover.departure || stopover.arrival, 'departure/arrival')
		if (stopover.arrival) {
			t.ok(Math.abs(+new Date(stopover.arrival) - (+when) <= 24 * 60 * 60 * 1000), 'arrival')
		}
		if (stopover.departure) {
			t.ok(Math.abs(+new Date(stopover.departure) - (+when) <= 24 * 60 * 60 * 1000), 'departure')
		}
		if (stopover.arrival && stopover.departure) {
			t.ok(+new Date(stopover.arrival) <= +new Date(stopover.departure), 'arrival before departure')
		}
	}

	t.end()
})
