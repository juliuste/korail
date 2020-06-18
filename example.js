'use strict'

const korail = require('.')

/* eslint-disable no-unused-vars */
const seoul = '0001'
const busan = '0020'
/* eslint-enable no-unused-vars */

// korail.stations.all().on('data', console.log)
korail.journeys(seoul, busan, { interval: 2 * 60 })
	.then(console.log)
	.catch(console.error)
