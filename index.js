require('dotenv').config();
const base64 = require('base-64');
const ical = require('node-ical');
const ics = require('ics');

const Koa = require('koa');

const auth = base64.encode(`${process.env.CAL_USERNAME}:${process.env.CAL_PASSWORD}`);

const dateToArray = (date) => {
  return [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
    date.getHours(),
    date.getMinutes()
  ]
}
const convert = async () => {
  console.debug("fetching fresh events")
  const _res = await ical.async.fromURL(process.env.CAL_CALENDAR, {
    headers: {
      "Authorization": `Basic ${auth}`
    }
  });

  const res = Object.values(_res);
  const buzyEvts = []

  for (let evt of res) {
    if (!evt.start || !evt.end) continue;
    buzyEvts.push({
      start: dateToArray(evt.start),
      end: dateToArray(evt.end),
      startInputType: 'local',
      endInputType: 'local',
      title: "busy",
      uid: evt.uid,
      busyStatus: "BUSY",
      created: dateToArray(evt.dtstamp),
      calName: "stadolfs buzy times"
    })
  }

  return new Promise((resolve, reject) => {
    ics.createEvents(buzyEvts, (err, done) => {
      if (err) reject(err)
      resolve(done);
    })
  })
}

let buzyCalendar;
let last;

const App = new Koa();
App.use(async ctx => {
  if (!buzyCalendar || !last || ((new Date() - last) / 1000 > 600)) {
    buzyCalendar = await convert();
    last = new Date();
    ctx.headers = {
      "Content-Type": "text/calendar"
    }
  }

  ctx.body = buzyCalendar;
});
App.listen(process.env.PORT || 3000);
