export function parseClockTime(text: string): number | null {
  const value = text.trim();
  const twelveHour = /^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)$/i.exec(value);
  if (twelveHour) {
    const hours = Number(twelveHour[1]);
    if (hours < 1 || hours > 12) return null;
    return (hours % 12 + (twelveHour[3].toLowerCase() === 'pm' ? 12 : 0)) * 60 + Number(twelveHour[2] ?? 0);
  }
  const twentyFourHour = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(value);
  return twentyFourHour ? Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]) : null;
}

export function parseBreakMinutes(text: string): number | null {
  if (!/^\d{1,4}$/.test(text.trim())) return null;
  const minutes = Number(text.trim());
  return minutes <= 1440 ? minutes : null;
}

export function parseWorkDuration(hoursText: string, minutesText: string): number | null {
  const hours = hoursText.trim();
  const minutes = minutesText.trim();
  if (!hours && !minutes) return null;
  if ((hours && !/^\d{1,2}$/.test(hours)) || (minutes && !/^\d{1,2}$/.test(minutes))) return null;
  const total = Number(hours || '0') * 60 + Number(minutes || '0');
  return Number(minutes || '0') < 60 && total <= 1440 ? total : null;
}

function subtractBreaks(elapsed: number, breaks: number[]) {
  if (breaks.some(value => !Number.isInteger(value) || value < 0 || value > 1440)) {
    throw new Error('Enter each break in whole minutes from 0 to 1440.');
  }
  const breakMinutes = breaks.reduce((sum, value) => sum + value, 0);
  if (breakMinutes > elapsed) throw new Error("Breaks cannot exceed the day's duration.");
  return { elapsed, breakMinutes, worked: elapsed - breakMinutes };
}

export function calculateWorkTime(start: number, end: number, breaks: number[], nextDay: boolean) {
  if (![start, end].every(value => Number.isInteger(value) && value >= 0 && value < 1440)) {
    throw new Error('Enter valid start and end times.');
  }
  const elapsed = end - start + (nextDay ? 1440 : 0);
  if (elapsed < 0) throw new Error('End is before start. Select "End is next day" for an overnight shift.');
  if (elapsed > 1440) throw new Error('Shifts must be 24 hours or less. Check the next-day option.');
  return subtractBreaks(elapsed, breaks);
}

export function formatDuration(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function evaluateWorkDay(day: WorkDayInput) {
  const empty = day.breaks.length === 0 && (day.mode === 'duration'
    ? !day.hoursText.trim() && !day.minutesText.trim()
    : !day.startText.trim() && !day.endText.trim());
  if (empty) return { empty: true, result: null, error: '' };
  const breaks = day.breaks.map(parseBreakMinutes);
  if (breaks.some(value => value === null)) {
    return { empty: false, result: null, error: 'Enter each break in whole minutes from 0 to 1440, or remove it.' };
  }
  const breakMinutes = breaks.filter(value => value !== null);
  try {
    if (day.mode === 'duration') {
      const duration = parseWorkDuration(day.hoursText, day.minutesText);
      if (duration === null) {
        return { empty: false, result: null, error: 'Enter whole hours and minutes, up to 24 hours total. Minutes must be 0 to 59.' };
      }
      return { empty: false, result: subtractBreaks(duration, breakMinutes), error: '' };
    }
    const start = parseClockTime(day.startText);
    const end = parseClockTime(day.endText);
    if (start === null || end === null) {
      return { empty: false, result: null, error: 'Enter both times, such as 9am and 5pm, or choose Hours only.' };
    }
    return { empty: false, result: calculateWorkTime(start, end, breakMinutes, day.nextDay), error: '' };
  } catch (cause) {
    return { empty: false, result: null, error: cause instanceof Error ? cause.message : 'Could not calculate this shift.' };
  }
}

export function calculateWorkWeek(days: readonly WorkDayInput[]) {
  if (days.length < 1 || days.length > MAX_WORK_DAYS) throw new Error('Enter between 1 and 7 days.');
  const results = days.map(evaluateWorkDay);
  const totals = results.reduce<ReturnType<typeof calculateWorkTime> | null>((total, day) => {
    if (day.empty) return total;
    return total && day.result ? {
      elapsed: total.elapsed + day.result.elapsed,
      breakMinutes: total.breakMinutes + day.result.breakMinutes,
      worked: total.worked + day.result.worked,
    } : null;
  }, { elapsed: 0, breakMinutes: 0, worked: 0 });
  return { days: results, totals };
}
export const MAX_WORK_DAYS = 7;

export type WorkDayInput = {
  breaks: readonly string[];
} & ({
  mode?: 'times';
  startText: string;
  endText: string;
  nextDay: boolean;
} | {
  mode: 'duration';
  hoursText: string;
  minutesText: string;
});
