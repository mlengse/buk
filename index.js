require('dotenv').config()
const navigator = require("./navigator");
const { schedule } = require('node-cron')
const moment = require('moment')
const cron = process.env.CRON
schedule(cron, () => {
  console.log('start')
  console.log(moment().format('LLLL'))
  navigator()
})
