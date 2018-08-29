'use strict'

const tape = require('tape')
const validate = require('validate-fptf')()
const moment = require('moment-timezone')
const isObject = require('lodash/isObject')
const korail = require('./index')

tape('korail.stations', async (t) => {
	const s = await korail.stations()
	t.ok(s.length > 100, 'stations length')

	for(let station of s) {
		validate(station)
		t.ok(station.location.longitude > 100, 'station location longitude')
		t.ok(station.group.length >= 1, 'station group')
	}

	const busan = s.find(x => x.name === '부산')
	t.ok(!!busan, 'busan found')
	t.ok(!!busan.major, 'busan major')

	t.end()
})

const isSeoul = (s) => (s.name === '서울')
const isBusan = (s) => (s.name === '부산')
const isMokpo = (s) => (s.name === '목포')

tape('korail.journeys', async (t) => {
	const when = moment.tz('Asia/Seoul').startOf('day').add(10, 'days').add(8, 'hours').toDate()

	// Seoul -> Busan, direct, KTX
	const j1 = await korail.journeys('0001', {id: '0020', type: 'station'}, when, {direct: true, product: 'KTX'})
	t.ok(j1.length >= 5, 'journeys length')
	for(let journey of j1) {
		validate(journey)
		t.ok(journey.legs.length === 1, 'legs length')
		const leg = journey.legs[0]
		t.ok(isSeoul(leg.origin), 'leg origin')
		t.ok(isBusan(leg.destination), 'leg destination')
		t.ok(+new Date(leg.departure) - (+when) <= 12*60*60*1000, 'leg departure')
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
	const j2 = await korail.journeys({id: '0041', type: 'station'}, '0020', when, {direct: true})
	t.ok(j2.length === 0, 'journeys length')

	// Mokpo -> Busan, not direct
	const j3 = await korail.journeys({id: '0041', type: 'station'}, '0020', when)
	t.ok(j3.length > 0, 'journeys length')
	for(let journey of j3) {
		validate(journey)
		t.ok(journey.legs.length > 1, 'legs length')
		for (let leg of journey.legs) {
			t.ok(+new Date(leg.departure) - (+when) <= 24*60*60*1000, 'leg departure')
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
	const when = moment.tz('Asia/Seoul').add(10, 'days').startOf('day').toDate()

	const s = await korail.journeyLeg('524', when)
	t.ok(s.length > 5, 'journeyLeg length')

	for (let stopover of s) {
		t.ok(isObject(stopover.station) && stopover.station.type === 'station', 'station')
		validate(stopover.station)

		// check departure/arrival
		t.ok(stopover.departure || stopover.arrival, 'departure/arrival')
		if (stopover.arrival) {
			t.ok(Math.abs(+new Date(stopover.arrival) - (+when) <= 24*60*60*1000), 'arrival')
		}
		if (stopover.departure) {
			t.ok(Math.abs(+new Date(stopover.departure) - (+when) <= 24*60*60*1000), 'departure')
		}
		if (stopover.arrival && stopover.departure) {
			t.ok(+new Date(stopover.arrival) <= +new Date(stopover.departure), 'arrival before departure')
		}
	}

	t.end()
})
