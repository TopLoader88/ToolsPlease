import { useRef, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { calculateWorkWeek, formatDuration, MAX_WORK_DAYS, type WorkDayInput } from './workTime';
import { makeToolStyles } from './toolStyles';
import { calculatorThemes } from './themes';

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

export function TimeCalculator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const theme = calculatorThemes.time;
  const styles = makeToolStyles(fontsLoaded, theme);
  const [days, setDays] = useState<Day[]>([{
    id: 0, mode: 'times', startText: '9:00 AM', endText: '5:00 PM', hoursText: '', minutesText: '', nextDay: false, breaks: [],
  }]);
  const [selectedDay, setSelectedDay] = useState(0);
  const nextDayId = useRef(1);
  const nextBreakId = useRef(1);
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
    setDays(current => current.map((entry, index) => index === selectedDay ? { ...entry, ...patch } : entry));
  }

  return <View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Hours calculator</Text>
    <Text style={styles.note}>Enter start/end times or hours only, subtract unpaid breaks, and add up to seven days for a weekly total.</Text>
    <View style={styles.wrap}>
      {days.map((entry, index) => <Pressable key={entry.id} accessibilityRole="tab" accessibilityLabel={`Day ${index + 1}`}
        accessibilityState={{ selected: selectedDay === index }} onPress={() => setSelectedDay(index)}
        style={[styles.button, styles.dayButton, selectedDay === index && styles.active]}>
        <Text style={[styles.buttonText, selectedDay === index && styles.activeText]}>Day {index + 1}</Text>
      </Pressable>)}
    </View>
    <Pressable accessibilityRole="button" accessibilityLabel="Add day" disabled={days.length === MAX_WORK_DAYS}
      style={[styles.button, days.length === MAX_WORK_DAYS && styles.disabled]} onPress={() => {
        if (days.length < MAX_WORK_DAYS) {
          const id = nextDayId.current++;
          setDays([...days, { id, mode: 'times', startText: '', endText: '', hoursText: '', minutesText: '', nextDay: false, breaks: [] }]);
          setSelectedDay(days.length);
        }
      }}>
      <Text style={styles.buttonText}>{days.length === MAX_WORK_DAYS ? '7 days added (maximum)' : '+ Add day'}</Text>
    </Pressable>
    <View style={styles.row}>
      <Text accessibilityRole="header" style={[styles.label, styles.grow]}>Day {selectedDay + 1}</Text>
      {days.length > 1 && <Pressable accessibilityRole="button" accessibilityLabel={`Remove day ${selectedDay + 1}`}
        style={styles.button} onPress={() => {
          setDays(current => current.filter((_, index) => index !== selectedDay));
          setSelectedDay(0);
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
      <TextInput accessibilityLabel="Start time" value={day.startText} onChangeText={startText => updateDay({ startText })}
        autoCapitalize="characters" autoCorrect={false} maxLength={12} placeholder="9:00 AM" style={styles.input} />
    </View>
    <View>
      <Text style={styles.label}>End time</Text>
      <TextInput accessibilityLabel="End time" value={day.endText} onChangeText={endText => updateDay({ endText })}
        autoCapitalize="characters" autoCorrect={false} maxLength={12} placeholder="5:00 PM" style={styles.input} />
    </View>
    <View style={styles.row}>
      <Text style={[styles.text, styles.grow]}>End is next day</Text>
      <Switch accessibilityLabel="End is next day" value={day.nextDay} onValueChange={nextDay => updateDay({ nextDay })}
        trackColor={{ false: theme.border, true: theme.accent }} thumbColor="#FFFFFF" />
    </View>
    </> : <>
      <Text style={styles.note}>Enter the day's duration before breaks. Leave minutes blank for whole hours.</Text>
      <View style={styles.row}>
        <View style={styles.grow}>
          <Text style={styles.label}>Hours</Text>
          <TextInput accessibilityLabel="Day hours" value={day.hoursText} onChangeText={hoursText => updateDay({ hoursText })}
            keyboardType="number-pad" maxLength={2} placeholder="8" style={styles.input} />
        </View>
        <View style={styles.grow}>
          <Text style={styles.label}>Minutes (optional)</Text>
          <TextInput accessibilityLabel="Day minutes" value={day.minutesText} onChangeText={minutesText => updateDay({ minutesText })}
            keyboardType="number-pad" maxLength={2} placeholder="0" style={styles.input} />
        </View>
      </View>
    </>}
    <View>
      <Text style={styles.label}>Breaks (minutes)</Text>
      {day.breaks.map((item, index) => <View key={item.id} style={[styles.row, { marginBottom: 8 }]}>
        <TextInput accessibilityLabel={`Break ${index + 1} minutes`} value={item.text}
          onChangeText={text => updateDay({ breaks: day.breaks.map(entry => entry.id === item.id ? { ...entry, text } : entry) })}
          placeholder="30" keyboardType="number-pad" maxLength={4} style={[styles.input, styles.grow]} />
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
    {empty && <Text style={styles.note}>This day is blank and adds zero to the weekly total. Enter start/end times or choose Hours only.</Text>}
    <View style={styles.result} accessibilityLiveRegion="polite">
      <Text style={styles.label}>Time after breaks</Text>
      <Text accessibilityLabel={`Time after breaks ${result ? formatDuration(result.worked) : 'unavailable'}`} style={styles.amount}>
        {result ? formatDuration(result.worked) : '--'}
      </Text>
      {result && <>
        <Text style={styles.text}>{day.mode === 'duration' ? 'Before breaks' : 'Elapsed'}: {formatDuration(result.elapsed)}</Text>
        <Text style={styles.text}>Breaks: {formatDuration(result.breakMinutes)}</Text>
        <Text style={styles.note}>Decimal hours: {(result.worked / 60).toFixed(2)}</Text>
      </>}
    </View>
    <View style={styles.result} accessibilityLiveRegion="polite">
      <Text accessibilityRole="header" style={styles.label}>Weekly total after breaks</Text>
      <Text accessibilityLabel={`Weekly total ${week.totals ? formatDuration(week.totals.worked) : 'unavailable'}`} style={styles.amount}>
        {week.totals ? formatDuration(week.totals.worked) : '--'}
      </Text>
      {week.totals ? <>
        <Text style={styles.text}>Total elapsed: {formatDuration(week.totals.elapsed)}</Text>
        <Text style={styles.text}>Total breaks: {formatDuration(week.totals.breakMinutes)}</Text>
        <Text style={styles.note}>Decimal hours: {(week.totals.worked / 60).toFixed(2)}</Text>
      </> : <Text accessibilityRole="alert" style={styles.error}>Fix incomplete or invalid entries to see the weekly total.</Text>}
      {emptyDays > 0 && <Text style={styles.note}>{emptyDays} blank {emptyDays === 1 ? 'day adds' : 'days add'} zero to this total.</Text>}
      {week.days.map((entry, index) => <Pressable key={days[index].id} accessibilityRole="button"
        accessibilityLabel={`Edit day ${index + 1}`} onPress={() => setSelectedDay(index)} style={styles.option}>
        <Text style={styles.text}>Day {index + 1}</Text>
        <Text style={entry.empty ? styles.note : entry.result ? styles.buttonText : styles.error}>
          {entry.empty ? 'Not entered (0h)' : entry.result ? formatDuration(entry.result.worked) : 'Needs attention'}
        </Text>
      </Pressable>)}
    </View>
    <Text style={styles.note}>Use AM/PM or 24-hour times (HH:mm). Calculates wall-clock time for shifts up to 24 hours, without date, daylight-saving, or time-zone adjustments.</Text>
  </View>;
}
