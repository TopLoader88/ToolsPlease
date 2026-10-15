import type { TimeFieldProps } from './TimeField';
import { parseClockTime } from './workTime';
import { calculatorThemes } from './themes';

export function TimeField({ label, value, onChange, fontsLoaded }: TimeFieldProps) {
  const theme = calculatorThemes.time;
  const minutes = parseClockTime(value);
  const inputValue = minutes === null ? ''
    : `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;

  return <input type="time" aria-label={label} value={inputValue} step={60}
    onChange={event => onChange(event.currentTarget.value)}
    style={{
      boxSizing: 'border-box', width: '100%', minWidth: 0, minHeight: 52, padding: 12,
      border: `1px solid ${theme.border}`, borderRadius: 6, backgroundColor: '#FFFFFF',
      color: '#202624', colorScheme: 'light', accentColor: theme.accent, fontSize: 20,
      fontFamily: fontsLoaded ? 'Manrope' : 'system-ui',
    }} />;
}
