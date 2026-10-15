import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateWorkTime, calculateWorkWeek, formatClockTime, formatDuration, MAX_WORK_DAYS, parseBreakMinutes, parseClockTime, parseWorkDuration, type WorkDayInput } from '../src/workTime';

test('clock times accept AM/PM and 24-hour input including noon and midnight', () => {
  for (const [text, expected] of [
    ['8am', 480], [' 8:00 AM ', 480], ['5pm', 1020], ['5:30 pM', 1050],
    ['12am', 0], ['12pm', 720], ['00:00', 0], ['23:59', 1439], ['8:05', 485],
  ] as const) assert.equal(parseClockTime(text), expected, text);
  for (const text of ['', '8', '24:00', '13pm', '0am', '8:60am', '8:5am', '8am later', '-1:00', 'NaN']) {
    assert.equal(parseClockTime(text), null, text);
  }
});

test('8am to 5pm subtracts multiple breaks and formats exact minutes', () => {
  const result = calculateWorkTime(480, 1020, [30, 15], false);
  assert.deepEqual(result, { elapsed: 540, breakMinutes: 45, worked: 495 });
  assert.equal(formatDuration(result.worked), '8h 15m');
  assert.equal(result.worked / 60, 8.25);
  assert.equal(calculateWorkTime(480, 1020, [], false).worked, 540);
});

test('picker selections format and round-trip every minute including noon and midnight', () => {
  assert.equal(formatClockTime(0), '12:00 AM');
  assert.equal(formatClockTime(720), '12:00 PM');
  assert.equal(formatClockTime(540), '9:00 AM');
  assert.equal(formatClockTime(1020), '5:00 PM');
  for (let minute = 0; minute < 1440; minute++) assert.equal(parseClockTime(formatClockTime(minute)), minute);
  for (const minute of [-1, 1440, 2.5, NaN]) assert.throws(() => formatClockTime(minute));
});

test('overnight shifts require explicit next-day selection', () => {
  assert.throws(() => calculateWorkTime(1320, 360, [], false), /next day/);
  assert.deepEqual(calculateWorkTime(1320, 360, [30], true), { elapsed: 480, breakMinutes: 30, worked: 450 });
  assert.equal(calculateWorkTime(480, 480, [], false).worked, 0);
  assert.equal(calculateWorkTime(480, 480, [], true).worked, 1440);
  assert.throws(() => calculateWorkTime(480, 1020, [], true), /24 hours/);
});

test('break input rejects empty, negative, fractional and excessive durations', () => {
  assert.equal(parseBreakMinutes('0'), 0);
  assert.equal(parseBreakMinutes(' 30 '), 30);
  assert.equal(parseBreakMinutes('1440'), 1440);
  for (const text of ['', '-1', '1.5', '30m', '1441', 'Infinity']) assert.equal(parseBreakMinutes(text), null);
  assert.equal(calculateWorkTime(480, 1020, [540], false).worked, 0);
  assert.throws(() => calculateWorkTime(480, 1020, [541], false), /cannot exceed/);
  assert.throws(() => calculateWorkTime(480, 1020, [300, 300], false), /cannot exceed/);
  for (const minutes of [-1, 1.5, NaN, 1441]) {
    assert.throws(() => calculateWorkTime(480, 1020, [minutes], false), /whole minutes/);
  }
  for (const time of [-1, 1440, 2.5, NaN]) assert.throws(() => calculateWorkTime(time, 1020, [], false), /valid start/);
});

test('weekly totals add exact daily minutes and each day has independent breaks', () => {
  const week = calculateWorkWeek([
    { startText: '8am', endText: '5pm', breaks: ['30', '15'], nextDay: false },
    { startText: '9am', endText: '5pm', breaks: ['60'], nextDay: false },
    { startText: '10pm', endText: '6am', breaks: ['30'], nextDay: true },
  ]);
  assert.deepEqual(week.days.map(day => day.result?.worked), [495, 420, 450]);
  assert.deepEqual(week.totals, { elapsed: 1500, breakMinutes: 135, worked: 1365 });
  assert.equal(formatDuration(week.totals!.worked), '22h 45m');
});

test('weekly totals reject partially entered or invalid days instead of silently skipping them', () => {
  const valid: WorkDayInput = { startText: '8am', endText: '5pm', breaks: ['30'], nextDay: false };
  for (const invalid of [
    { ...valid, startText: '' }, { ...valid, endText: '' }, { ...valid, breaks: [''] },
    { ...valid, breaks: ['600'] }, { ...valid, startText: '10pm', endText: '6am' },
  ]) {
    const week = calculateWorkWeek([valid, invalid, valid]);
    assert.equal(week.totals, null);
    assert.equal(week.days[0].result?.worked, 510);
    assert.equal(week.days[1].result, null);
    assert.notEqual(week.days[1].error, '');
    assert.equal(week.days[2].result?.worked, 510);
  }
});

test('weeks allow one to seven days, including zero time and a full 168-hour week', () => {
  const day: WorkDayInput = { startText: '8am', endText: '8am', breaks: [], nextDay: false };
  assert.equal(MAX_WORK_DAYS, 7);
  assert.equal(calculateWorkWeek([day]).totals?.worked, 0);
  const fullWeek = Array.from({ length: MAX_WORK_DAYS }, () => ({ ...day, nextDay: true }));
  assert.equal(calculateWorkWeek(fullWeek).totals?.worked, 10080);
  assert.equal(formatDuration(10080), '168h 0m');
  assert.throws(() => calculateWorkWeek([]), /1 and 7 days/);
  assert.throws(() => calculateWorkWeek([...fullWeek, day]), /1 and 7 days/);
});

test('hours-only input parses whole hours and optional minutes exactly', () => {
  for (const [hours, minutes, expected] of [
    ['8', '', 480], [' 8 ', ' 0 ', 480], ['7', '30', 450], ['', '45', 45],
    ['0', '', 0], ['', '0', 0], ['24', '0', 1440], ['23', '59', 1439],
  ] as const) assert.equal(parseWorkDuration(hours, minutes), expected);
  for (const [hours, minutes] of [
    ['', ''], ['8.5', ''], ['-1', ''], ['8', '60'], ['24', '1'], ['25', ''],
    ['8', '-1'], ['8', '0.5'], ['NaN', ''], ['8', 'abc'],
  ]) assert.equal(parseWorkDuration(hours, minutes), null);
});

test('adding blank days preserves the weekly total and marks them as not entered', () => {
  const openingDay: WorkDayInput = { startText: '9am', endText: '5pm', nextDay: false, breaks: [] };
  const blank: WorkDayInput = { startText: '', endText: '', nextDay: false, breaks: [] };
  const blankDuration: WorkDayInput = { mode: 'duration', hoursText: ' ', minutesText: '', breaks: [] };
  const week = calculateWorkWeek([openingDay, blank, blankDuration]);
  assert.deepEqual(week.totals, { elapsed: 480, breakMinutes: 0, worked: 480 });
  for (const day of week.days.slice(1)) {
    assert.equal(day.empty, true);
    assert.equal(day.result, null);
    assert.equal(day.error, '');
  }
  assert.deepEqual(calculateWorkWeek([blank, blankDuration]).totals, { elapsed: 0, breakMinutes: 0, worked: 0 });
});

test('entering eight hours on a blank day updates the weekly total without clock times', () => {
  const openingDay: WorkDayInput = { startText: '9am', endText: '5pm', nextDay: false, breaks: [] };
  const blank: WorkDayInput = { startText: '', endText: '', nextDay: false, breaks: [] };
  const eightHours: WorkDayInput = { mode: 'duration', hoursText: '8', minutesText: '', breaks: [] };
  assert.equal(calculateWorkWeek([openingDay, blank]).totals?.worked, 480);
  assert.equal(calculateWorkWeek([openingDay, eightHours]).totals?.worked, 960);
  assert.equal(calculateWorkWeek([eightHours]).days[0].empty, false);
  assert.equal(calculateWorkWeek([openingDay]).totals?.worked, 480);
});

test('weekly totals mix clock-time days, duration-only days, breaks and blank days', () => {
  const week = calculateWorkWeek([
    { startText: '9am', endText: '5pm', nextDay: false, breaks: [] },
    { mode: 'duration', hoursText: '7', minutesText: '30', breaks: ['15'] },
    { mode: 'duration', hoursText: '', minutesText: '', breaks: [] },
    { startText: '', endText: '', nextDay: false, breaks: [] },
  ]);
  assert.deepEqual(week.totals, { elapsed: 930, breakMinutes: 15, worked: 915 });
  assert.equal(formatDuration(week.totals!.worked), '15h 15m');
});

test('duration-only days validate breaks and distinguish entered zero from blank', () => {
  const zero: WorkDayInput = { mode: 'duration', hoursText: '0', minutesText: '', breaks: [] };
  const zeroWeek = calculateWorkWeek([zero]);
  assert.equal(zeroWeek.days[0].empty, false);
  assert.equal(zeroWeek.days[0].result?.worked, 0);
  for (const day of [
    { ...zero, hoursText: '25' }, { ...zero, hoursText: '24', minutesText: '1' },
    { ...zero, hoursText: '8', breaks: ['481'] }, { ...zero, hoursText: '8', breaks: [''] },
    { ...zero, hoursText: '', breaks: ['30'] },
  ]) {
    const week = calculateWorkWeek([day]);
    assert.equal(week.totals, null);
    assert.equal(week.days[0].empty, false);
    assert.notEqual(week.days[0].error, '');
  }
  assert.equal(calculateWorkWeek([{ ...zero, hoursText: '24' }]).totals?.worked, 1440);
  assert.equal(calculateWorkWeek([{ ...zero, hoursText: '8', breaks: ['480'] }]).totals?.worked, 0);
});

test('duration-only weekly totals sum integer minutes before decimal-hour rounding', () => {
  const minute: WorkDayInput = { mode: 'duration', hoursText: '', minutesText: '1', breaks: [] };
  const week = calculateWorkWeek([minute, minute, minute]);
  assert.equal(week.totals?.worked, 3);
  assert.equal((week.totals!.worked / 60).toFixed(2), '0.05');
});
