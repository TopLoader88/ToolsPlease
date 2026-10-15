import { useRef, useState } from 'react';
import { Keyboard, Pressable, Switch, Text, TextInput, View } from 'react-native';
import { calculateWorkWeek, formatDuration, MAX_WORK_DAYS, type WorkDayInput } from './workTime';
import { makeToolStyles } from './toolStyles';
import { calculatorThemes } from './themes';
import { TimeField } from './TimeField';

interface Day {
  id: number;
  mode: 'times' | 'duration';
  startText: string;
  endText: string;
  hoursText: string;
  minutesText: string;
  nextDay: boolean;
  breaks: { id: number; text: string }[];
}

export function TimeCalculator({ fontsLoaded, onScrollToOffset }: {
  fontsLoaded: boolean;
  onScrollToOffset: (offset: number) => void;
}) {
  const theme = calculatorThemes.time;
  const styles = makeToolStyles(fontsLoaded, theme);
  const [days, setDays] = useState<Day[]>([{
    id: 0, mode: 'times', startText: '9:00 AM', endText: '5:00 PM', hoursText: '', minutesText: '', nextDay: false, breaks: [],
  }]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [saveNotice, setSaveNotice] = useState('');
  const nextDayId = useRef(1);
  const nextBreakId = useRef(1);
  const dayEditorOffset = useRef(0);
  const weeklyTotalOffset = useRef(0);
  const day = days[selectedDay];
  const week = calculateWorkWeek(days.map<WorkDayInput>(entry => {
    const breaks = entry.breaks.map(item => item.text);
    return entry.mode === 'duration'
      ? { mode: 'duration', hoursText: entry.hoursText, minutesText: entry.minutesText, breaks }
      : { mode: 'times', startText: entry.startText, endText: entry.endText, nextDay: entry.nextDay, breaks };
  }));
  const { result, error, empty } = week.days[selectedDay];
  const emptyDays = week.days.filter(entry => entry.empty).length;

  function updateDay(patch: Partial<Day>) {
    setSaveNotice('');
    setDays(current => current.map((entry, index) => index === selectedDay ? { ...entry, ...patch } : entry));
  }

  function selectDay(index: number) {
    setSaveNotice('');
    setSelectedDay(index);
  }

  return <View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Hours calculator</Text>
    <Text style={styles.note}>Add each day's hours. Your weekly total updates automatically.</Text>
    <View style={styles.wrap}>
      {days.map((entry, index) => <Pressable key={entry.id} accessibilityRole="tab" accessibilityLabel={`Day ${index + 1}`}
        accessibilityState={{ selected: selectedDay === index }} onPress={() => selectDay(index)}
        style={[styles.button, styles.dayButton, selectedDay === index && styles.active]}>
        <Text style={[styles.buttonText, selectedDay === index && styles.activeText]}>Day {index + 1}</Text>
      </Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Add day" disabled={days.length === MAX_WORK_DAYS}
      style={[styles.button, days.length === MAX_WORK_DAYS && styles.disabled]} onPress={() => {
        if (days.length < MAX_WORK_DAYS) {
          const id = nextDayId.current++;
          setDays([...days, { id, mode: 'times', startText: '', endText: '', hoursText: '', minutesText: '', nextDay: false, breaks: [] }]);
          selectDay(days.length);
        }
      }}>
      <Text style={styles.buttonText}>{days.length === MAX_WORK_DAYS ? '7 days added (maximum)' : '+ Add day'}</Text>
    </Pressable>
    <View style={styles.row} onLayout={event => { dayEditorOffset.current = event.nativeEvent.layout.y; }}>
      <Text accessibilityRole="header" style={[styles.label, styles.grow]}>Day {selectedDay + 1}</Text>
      {days.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Remove day ${selectedDay + 1}`}
        style={styles.button} onPress={() => {
          setDays(current => current.filter((_, index) => index !== selectedDay));
          selectDay(0);
        }}>
        <Text style={styles.buttonText}>Remove day</Text>
      </Pressable>}
    </View>
    <View style={styles.row}>
      {(['times', 'duration'] as const).map(mode => <Pressable key={mode} accessibilityRole="radio"
        accessibilityLabel={mode === 'times' ? 'Start/end times' : 'Hours only'} accessibilityState={{ checked: day.mode === mode }}
        onPress={() => updateDay({ mode })} style={[styles.button, styles.grow, day.mode === mode && styles.active]}>
        <Text style={[styles.buttonText, day.mode === mode && styles.activeText]}>{mode === 'times' ? 'Start/end times' : 'Hours only'}</Text>
      </Pressable>)}
    </View>
    {day.mode === 'times' ? <>
    <View>
      <Text style={styles.label}>Start time</Text>
      <TimeField key={day.id} label="Start time" value={day.startText} onChange={startText => updateDay({ startText })}
        fontsLoaded={fontsLoaded} />
    </View>
    <View>
      <Text style={styles.label}>End time</Text>
      <TimeField key={day.id} label="End time" value={day.endText} onChange={endText => updateDay({ endText })}
        fontsLoaded={fontsLoaded} />
    </View>
    <View style={styles.row}>
      <Text style={[styles.text, styles.grow]}>End is next day</Text>
      <Switch accessibilityLabel="End is next day" value={day.nextDay} onValueChange={nextDay => updateDay({ nextDay })}
        trackColor={{ false: theme.border, true: theme.accent }} thumbColor="#FFFFFF" />
    </View>
    </> : <>
      <Text style={styles.note}>Enter hours before breaks.</Text>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text style={styles.label}>Hours</Text>
          <TextInput accessibilityLabel="Day hours" value={day.hoursText} onChangeText={hoursText => updateDay({ hoursText })}
            keyboardType="number-pad" maxLength={2} placeholder="Enter hours" style={styles.input} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.label}>Minutes (optional)</Text>
          <TextInput accessibilityLabel="Day minutes" value={day.minutesText} onChangeText={minutesText => updateDay({ minutesText })}
            keyboardType="number-pad" maxLength={2} placeholder="Optional" style={styles.input} />
        </View>
      </View>
    </>}
    <View>
      <Text style={styles.label}>Breaks (minutes)</Text>
      {day.breaks.map((item, index) => <View key={item.id} style={[styles.row, { marginBottom: 8 }]}>
        <TextInput accessibilityLabel={`Break ${index + 1} minutes`} value={item.text}
          onChangeText={text => updateDay({ breaks: day.breaks.map(entry => entry.id === item.id ? { ...entry, text } : entry) })}
          placeholder="Minutes" keyboardType="number-pad" maxLength={4} style={[styles.input, styles.grow]} />
        <Pressable accessibilityRole="button" accessibilityLabel={`Remove break ${index + 1}`}
          onPress={() => updateDay({ breaks: day.breaks.filter(entry => entry.id !== item.id) })} style={styles.button}>
          <Text style={styles.buttonText}>Remove</Text>
        </Pressable>
      </View>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Add break" style={styles.button}
        onPress={() => { const id = nextBreakId.current++; updateDay({ breaks: [...day.breaks, { id, text: '' }] }); }}>
        <Text style={styles.buttonText}>+ Add break</Text>
      </Pressable>
    </View>
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {empty && <Text style={styles.note}>Enter times or choose Hours only to add this day.</Text>}
    <Pressable accessibilityRole="button" accessibilityLabel="Save day and view weekly total" disabled={empty || !!error}
      style={[styles.button, styles.active, (empty || !!error) && styles.disabled]} onPress={() => {
        Keyboard.dismiss();
        setSaveNotice(`Day ${selectedDay + 1} saved for this session.`);
        onScrollToOffset(weeklyTotalOffset.current);
      }}>
      <Text style={[styles.buttonText, styles.activeText]}>Save day & view weekly total</Text>
    </Pressable>
    <Text style={styles.note}>Entries stay in this session only.</Text>
    <View style={styles.result} accessibilityLiveRegion="polite">
      <Text style={styles.label}>Day {selectedDay + 1} total after breaks</Text>
      <Text accessibilityLabel={empty ? `No hours entered for day ${selectedDay + 1}`
        : `Time after breaks ${result ? formatDuration(result.worked) : 'unavailable'}`} style={styles.amount}>
        {empty ? 'No hours yet' : result ? formatDuration(result.worked) : '--'}
      </Text>
      {result && <>
        <Text style={styles.text}>{day.mode === 'duration' ? 'Before breaks' : 'Elapsed'}: {formatDuration(result.elapsed)}</Text>
        <Text style={styles.text}>Breaks: {formatDuration(result.breakMinutes)}</Text>
        <Text style={styles.note}>Decimal hours: {(result.worked / 60).toFixed(2)}</Text>
      </>}
    </View>
    <View style={styles.result} accessibilityLiveRegion="polite"
      onLayout={event => { weeklyTotalOffset.current = event.nativeEvent.layout.y; }}>
      <Text accessibilityRole="header" style={styles.label}>Weekly total after breaks</Text>
      {!!saveNotice && <Text accessibilityLiveRegion="polite" style={styles.buttonText}>{saveNotice}</Text>}
      <Text accessibilityLabel={`Weekly total ${week.totals ? formatDuration(week.totals.worked) : 'unavailable'}`} style={styles.amount}>
        {week.totals ? formatDuration(week.totals.worked) : '--'}
      </Text>
      {week.totals ? <>
        <Text style={styles.text}>Total elapsed: {formatDuration(week.totals.elapsed)}</Text>
        <Text style={styles.text}>Total breaks: {formatDuration(week.totals.breakMinutes)}</Text>
        <Text style={styles.note}>Decimal hours: {(week.totals.worked / 60).toFixed(2)}</Text>
      </> : <Text accessibilityRole="alert" style={styles.error}>Fix incomplete or invalid entries to see the weekly total.</Text>}
      {emptyDays > 0 && <Text style={styles.note}>{emptyDays} blank {emptyDays === 1 ? 'day is' : 'days are'} not included.</Text>}
      {week.days.map((entry, index) => <Pressable key={days[index].id} accessibilityRole="button"
        accessibilityLabel={`Edit day ${index + 1}`} onPress={() => {
          Keyboard.dismiss();
          selectDay(index);
          onScrollToOffset(dayEditorOffset.current);
        }} style={styles.option}>
        <Text style={styles.text}>Day {index + 1}</Text>
        <Text style={entry.empty ? styles.note : entry.result ? styles.buttonText : styles.error}>
          {entry.empty ? 'Add hours' : entry.result ? formatDuration(entry.result.worked) : 'Needs attention'}
        </Text>
      </Pressable>)}
    </View>
    <Text style={styles.note}>Use AM/PM or 24-hour times (HH:mm). Calculates wall-clock time for shifts up to 24 hours, without date, daylight-saving, or time-zone adjustments.</Text>
  </View>;
}
