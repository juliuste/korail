'use strict'

const got = require('got')
const moment = require('moment-timezone')
const isString = require('lodash.isstring')
const isObject = require('lodash.isobject')
const isBoolean = require('lodash.isboolean')
const groupBy = require('lodash.groupby')
const sortBy = require('lodash.sortby')
const toArray = require('lodash.toarray')
const isDate = require('lodash.isdate')
const merge = require('lodash.merge')

const createStopover = s => {
    let arrival = null
    if (s.h_arv_tm !== '999999') {
        arrival = moment.tz(`${s.h_arv_dt}_${s.h_arv_tm}`, 'YYYYMMDD_HHmmss', 'Asia/Seoul').format()
    }
    let departure = null
    if (s.h_dpt_tm !== '999999') {
        departure = moment.tz(`${s.h_dpt_dt}_${s.h_dpt_tm}`, 'YYYYMMDD_HHmmss', 'Asia/Seoul').format()
    }

    return ({
        station: {
            type: 'station',
            id: s.h_stop_rs_stn_cd+'',
            name: s.h_stop_rs_stn_nm
        },
        arrival,
        departure
        // todo: h_act_arv_dlay_tnum
    })
}

const journeyLeg = async (lineId, departureDate) => {
    if (!isString(lineId) || lineId.length === 0) throw new Error('invalid or missing `lineId`, must be string')

    if(!isDate(departureDate)) throw new Error('`departureDate` must be a JS Date() object')
    // const day = moment.tz(departureDate, 'Asia/Seoul').format('YYYYMMDD')
    const day = '20180620'

    const results = await (got.post('https://smart.letskorail.com/classes/com.korail.mobile.trainsInfo.TrainSchedule', {
        query: {
            Device: 'IP',
            // Sid: '1QihOasC3e4vT2ld1RRiMw==',
            // Version: '180314001',
            srtCheckYn: 'Y',
            txtRunDt: day,
            txtTrnNo: lineId,
        },
        json: true
    }).then(res => res.body))

    if (results.strResult !== 'SUCC') throw new Error(JSON.stringify(results))

    return results.time_infos.time_info.map(createStopover)
}

module.exports = journeyLeg
