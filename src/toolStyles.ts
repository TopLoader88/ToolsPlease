import { StyleSheet } from 'react-native';
import type { CalculatorTheme } from './themes';

export function makeToolStyles(fontsLoaded: boolean, theme: CalculatorTheme) {
  const regular = fontsLoaded ? 'Manrope' : undefined;
  const semi = fontsLoaded ? 'ManropeSemi' : undefined;
  const bold = fontsLoaded ? 'ManropeBold' : undefined;
  return StyleSheet.create({
    content: { gap: 16 },
    title: { fontFamily: bold, fontSize: 22, color: '#202624' },
    label: { fontFamily: semi, fontSize: 14, color: '#606B65', marginBottom: 8 },
    note: { fontFamily: regular, fontSize: 13, lineHeight: 21, color: '#606B65' },
    text: { fontFamily: regular, fontSize: 15, color: '#202624', flexShrink: 1 },
    input: { fontFamily: regular, fontSize: 20, color: '#202624', borderWidth: 1, borderColor: theme.border, borderRadius: 6, minHeight: 52, padding: 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    dayButton: { minWidth: 64 },
    grow: { flex: 1, minWidth: 0 },
    button: { minHeight: 48, backgroundColor: theme.surface, borderRadius: 6, padding: 12, alignItems: 'center', justifyContent: 'center' },
    buttonText: { fontFamily: semi, fontSize: 14, color: theme.accent, textAlign: 'center' },
    active: { backgroundColor: theme.accent },
    activeText: { color: '#FFFFFF' },
    disabled: { opacity: 0.4 },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 48, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 10, gap: 8 },
    result: { backgroundColor: theme.surface, padding: 20, borderRadius: 6, gap: 8 },
    amount: { fontFamily: bold, fontSize: 34, color: theme.accent, fontVariant: ['tabular-nums'] },
    error: { fontFamily: regular, fontSize: 13, lineHeight: 20, color: '#AD3545' },
  });
}
