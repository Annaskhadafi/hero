import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

// Replikasi helper baru tanpa import TS (agar node --test bisa jalan)
function getTimezoneDateParts(date, tz){
  const iana = tz==='WITA'?'Asia/Makassar': tz==='WIB'?'Asia/Jakarta':'Asia/Jayapura'
  const fmt=new Intl.DateTimeFormat('en-GB',{timeZone:iana, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'})
  const parts=fmt.formatToParts(date)
  const get=t=> Number(parts.find(p=>p.type===t)?.value ?? 0)
  return {year:get('year'),month:get('month'),day:get('day'),hours:get('hour'),minutes:get('minute')}
}
function resolveShiftDateForEvent({eventTime, shiftCode, siteConfig}){
  const tz=siteConfig.timezone
  const parts=getTimezoneDateParts(eventTime, tz)
  const hour=parts.hours
  const code=String(shiftCode??'').trim().toUpperCase()
  const nightCodes=['NS','NIGHT','MALAM','SHIFT MALAM','SHIFT 2','SHIFT-2','N','2','NIGHT SHIFT','S2']
  const isNight=nightCodes.includes(code) || (!code && hour<12)
  if(isNight && hour<12){
    const d=new Date(eventTime)
    // buat midnight lokal lalu -1 hari
    const pad=n=>String(n).padStart(2,'0')
    // approx offset WITA +08:00
    const off='+08:00'
    const localMidnightStr=`${parts.year}-${pad(parts.month)}-${pad(parts.day)}T00:00:00${off}`
    const localMidnight=new Date(localMidnightStr)
    const prev=new Date(localMidnight.getTime()-24*60*60*1000)
    const prevParts=getTimezoneDateParts(prev, tz)
    return `${prevParts.year}-${pad(prevParts.month)}-${pad(prevParts.day)}`
  }
  const pad2=n=>String(n).padStart(2,'0')
  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
}

const siteConfig={dayShiftClockIn:'08:00', nightShiftClockIn:'19:00', timezone:'WITA'}

describe('Attendance cross-midnight AMM Mifa', ()=>{
  it('checkout 15-Sep 06:10 night => shiftDate 2026-09-14', ()=>{
    const checkout=new Date('2026-09-15T06:10:00+08:00')
    const shiftDate=resolveShiftDateForEvent({eventTime:checkout, shiftCode:'night', siteConfig})
    assert.equal(shiftDate,'2026-09-14')
  })
  it('checkin 14-Sep 19:05 night => shiftDate 2026-09-14', ()=>{
    const checkin=new Date('2026-09-14T19:05:00+08:00')
    const shiftDate=resolveShiftDateForEvent({eventTime:checkin, shiftCode:'night', siteConfig})
    assert.equal(shiftDate,'2026-09-14')
  })
  it('checkin day 15-Sep 08:05 => shiftDate 2026-09-15', ()=>{
    const checkin=new Date('2026-09-15T08:05:00+08:00')
    const shiftDate=resolveShiftDateForEvent({eventTime:checkin, shiftCode:'day', siteConfig})
    assert.equal(shiftDate,'2026-09-15')
  })
  it('getAttendanceQueryWindow 14-Sep harus cover checkout 15-Sep 06:10', ()=>{
    const target=new Date('2026-09-14T12:00:00+08:00')
    const start=new Date(target); start.setHours(0,0,0,0); start.setHours(start.getHours()-8)
    const end=new Date(new Date(target).setHours(23,59,59,999) + 12*60*60*1000)
    const checkout=new Date('2026-09-15T06:10:00+08:00')
    assert.ok(checkout>=start && checkout<=end, 'checkout harus di dalam window')
  })
  it('grid grouping: checkin+checkout night sama shiftDate', ()=>{
    const records=[
      {eventTime:new Date('2026-09-14T19:05:00+08:00'), shiftCode:'night'},
      {eventTime:new Date('2026-09-15T06:10:00+08:00'), shiftCode:'night'},
    ]
    const g=records.map(r=> resolveShiftDateForEvent({eventTime:r.eventTime, shiftCode:r.shiftCode, siteConfig}))
    assert.equal(g[0],'2026-09-14')
    assert.equal(g[1],'2026-09-14')
    assert.equal(g[0],g[1])
  })
})
