import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Feather from '@expo/vector-icons/Feather';
import { formatClockTime, parseClockTime } from './workTime';
import { makeToolStyles } from './toolStyles';
import { calculatorThemes } from './themes';

export interface TimeFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  fontsLoaded: boolean;
}

export function TimeField({ label, value, onChange, fontsLoaded }: TimeFieldProps) {
  const [open, setOpen] = useState(false);
  const theme = calculatorThemes.time;
  const styles = makeToolStyles(fontsLoaded, theme);
  const minutes = parseClockTime(value);
  const date = new Date();
  if (minutes !== null) date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);

  return <View style={styles.content}>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={label}
        accessibilityValue={{ text: minutes === null ? 'Not set' : formatClockTime(minutes) }}
        onPress={() => setOpen(true)} style={[styles.input, styles.row, styles.grow]}>
        <Text style={[styles.text, styles.grow, { fontSize: 20 }]}>
          {minutes === null ? 'Choose time' : formatClockTime(minutes)}
        </Text>
        <Feather name="clock" size={20} color={theme.accent} />
      </Pressable>
      {value !== '' && <Pressable accessibilityRole="button" accessibilityLabel={`Clear ${label.toLowerCase()}`}
        style={styles.button} onPress={() => { setOpen(false); onChange(''); }}>
        <Feather name="x" size={20} color={theme.accent} />
      </Pressable>}
    </View>
    {open && <DateTimePicker value={date} mode="time" display={Platform.OS === 'android' ? 'clock' : 'spinner'}
      is24Hour={false} onChange={(event, selected) => {
        if (Platform.OS === 'android') setOpen(false);
        if (event.type === 'set' && selected) onChange(formatClockTime(selected.getHours() * 60 + selected.getMinutes()));
      }} />}
    {open && Platform.OS === 'ios' && <Pressable accessibilityRole="button" accessibilityLabel="Done choosing time"
      style={styles.button} onPress={() => setOpen(false)}>
      <Text style={styles.buttonText}>Done</Text>
    </Pressable>}
  </View>;
}
