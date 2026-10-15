import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView, Linking, Modal, Platform,
  Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Feather from '@expo/vector-icons/Feather';
import * as Location from 'expo-location';
import { useFonts } from 'expo-font';
import { Manrope_500Medium } from '@expo-google-fonts/manrope/500Medium';
import { Manrope_600SemiBold } from '@expo-google-fonts/manrope/600SemiBold';
import { Manrope_700Bold } from '@expo-google-fonts/manrope/700Bold';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { calculate, formatMoney, MAX_PEOPLE, parseAmount, parsePercentage } from './src/calculator';
import { findRegion, regions, REVIEWED_DATE, type RegionCode } from './src/regions';
import { usePreferences } from './src/usePreferences';
import { SalesTaxPanel } from './src/SalesTaxPanel';
import { CurrencyConverter } from './src/CurrencyConverter';
import { TimeCalculator } from './src/TimeCalculator';
import { calculatorThemes, type CalculatorMode, type CalculatorTheme } from './src/themes';

const colors = {
  ink: '#202624', muted: '#606B65', paper: '#FFFFFF', background: '#F3F6F4',
  green: '#146D4D', mint: '#E6F3EB', line: '#DCE4DF', pink: '#F9EBEF', error: '#AD3545',
};
type IconName = ComponentProps<typeof Feather>['name'];
type Panel = 'custom' | 'split' | 'location' | 'salesTax' | null;

function IconButton({ icon, label, onPress, disabled = false }: {
  icon: IconName; label: string; onPress: () => void; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled}
      {...(Platform.OS === 'web' ? { title: label } : {})}
      onPress={onPress} style={({ pressed }) => [base.iconButton, pressed && base.pressed, disabled && base.disabled]}>
      <Feather name={icon} size={21} color={colors.ink} />
    </Pressable>
  );
}

function Calculator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { preferences, updatePreferences, storageError } = usePreferences();
  const [billText, setBillText] = useState('');
  const [mode, setMode] = useState<CalculatorMode>('tip');
  const theme = calculatorThemes[mode];
  const styles = makeStyles(fontsLoaded, theme);
  const [taxText, setTaxText] = useState('');
  const [excludeTax, setExcludeTax] = useState(false);
  const [people, setPeople] = useState(1);
  const [panel, setPanel] = useState<Panel>(null);
  const [customText, setCustomText] = useState('15');
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState('');
  const [linkError, setLinkError] = useState('');
  const locationRequest = useRef(0);
  const region = findRegion(preferences.region);
  const currency = region?.currency ?? 'USD';
  const digits = region?.digits ?? 2;
  const bill = parseAmount(billText, digits);
  const tax = excludeTax ? parseAmount(taxText, digits) : 0;
  const billError = bill === null ? (digits === 0 ? 'Enter a whole-yen amount.' : 'Enter an amount with up to 2 decimal places.') : '';
  const taxError = tax === null ? 'Enter a valid tax amount.' : bill !== null && tax > bill ? 'Tax cannot exceed the bill.' : '';
  const valid = bill !== null && tax !== null && tax <= bill;
  const result = valid ? calculate(bill, preferences.percentage, people, tax) : null;
  const money = (amount: number) => formatMoney(amount, currency, digits);
  const customPercentage = parsePercentage(customText);
  const customSelected = ![15, 18, 20].includes(preferences.percentage);

  useEffect(() => {
    if (Platform.OS === 'web') document.title = theme.title;
  }, [theme.title]);

  function openPanel(next: Panel) {
    Keyboard.dismiss();
    if (next === 'custom') setCustomText(String(preferences.percentage));
    setPanel(next);
  }

  function closePanel() {
    locationRequest.current += 1;
    setLocating(false);
    setPanel(null);
  }

  function selectRegion(code: RegionCode | null) {
    locationRequest.current += 1;
    setLocating(false);
    if ((findRegion(code)?.currency ?? 'USD') !== currency) {
      setBillText('');
      setTaxText('');
      setExcludeTax(false);
    }
    updatePreferences({ region: code });
    setLocationMessage('');
  }

  async function locate() {
    const request = ++locationRequest.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setLocating(true);
    setLocationMessage('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (request !== locationRequest.current) return;
      if (permission.status !== 'granted') {
        setLocationMessage('Location was not allowed. You can choose a country below.');
        return;
      }
      const lookup = async () => {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
        const addresses = await Location.reverseGeocodeAsync(position.coords);
        return addresses[0]?.isoCountryCode?.toUpperCase();
      };
      const country = await Promise.race([
        lookup(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Location lookup timed out')), 15000);
        }),
      ]);
      if (request !== locationRequest.current) return;
      const detected = findRegion(country);
      if (detected) {
        selectRegion(detected.code);
        setLocationMessage(`Found ${detected.name}. Your tip percentage is unchanged.`);
      } else {
        setLocationMessage('This location is not covered by the offline guide yet. Choose a country manually; your previous selection is unchanged.');
      }
    } catch {
      if (request === locationRequest.current) setLocationMessage('Could not find your country. Check location services or choose it below.');
    } finally {
      if (timer) clearTimeout(timer);
      if (request === locationRequest.current) setLocating(false);
    }
  }

  async function openSource() {
    if (!region) return;
    setLinkError('');
    try { await Linking.openURL(region.url); }
    catch { setLinkError('The source could not be opened. Try again when online.'); }
  }

  function sheet(title: string, children: ReactNode) {
    return (
      <Modal visible={panel !== null} transparent animationType="slide" onRequestClose={closePanel}>
        <KeyboardAvoidingView style={base.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable accessibilityLabel="Close panel" accessibilityRole="button" onPress={closePanel} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['bottom']} style={base.sheet}>
            <View style={styles.sheetHeader}>
              <Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text>
              <IconButton icon="x" label="Close panel" onPress={closePanel} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
              {children}
            </ScrollView>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={[base.safe, { backgroundColor: theme.background }]}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={base.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.page}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <View style={styles.brandIcon}><Feather name={theme.icon} size={19} color={theme.accent} /></View>
              <Text accessibilityRole="header" style={styles.brandName}>{theme.title}</Text>
            </View>
            <View style={[styles.headerActions, mode !== 'tip' && base.hidden]}>
              <IconButton icon="rotate-ccw" label="Clear bill and split" onPress={() => {
                setBillText(''); setTaxText(''); setExcludeTax(false); setPeople(1);
              }} />
              <IconButton icon="map-pin" label="Location and tipping customs" onPress={() => openPanel('location')} />
            </View>
          </View>

          <View style={styles.modeRow}>
            {(['tip', 'time', 'currency'] as const).map(option => (
              <Pressable key={option} accessibilityRole="tab" accessibilityLabel={`${option === 'tip' ? 'Tip' : option === 'currency' ? 'Currency' : 'Hours'} calculator`}
                accessibilityState={{ selected: mode === option }}
                onPress={() => { Keyboard.dismiss(); setMode(option); }}
                style={({ pressed }) => [styles.modeButton, mode === option && styles.percentActive, pressed && base.pressed]}>
                <Text style={[styles.modeText, mode === option && styles.percentTextActive]}>
                  {option === 'tip' ? 'Tip' : option === 'currency' ? 'Currency' : 'Hours'}
                </Text>
              </Pressable>
            ))}
          </View>
          <View style={mode !== 'currency' && base.hidden}>
            <CurrencyConverter fontsLoaded={fontsLoaded} />
          </View>
          <View style={mode !== 'time' && base.hidden}>
            <TimeCalculator fontsLoaded={fontsLoaded} />
          </View>
          <View style={mode !== 'tip' && base.hidden}>
          <View style={styles.billSection}>
            <Text style={styles.label}>Bill total</Text>
            <View style={[styles.billInputRow, !!billError && styles.invalidInput]}>
              <Text style={styles.currency}>{currency}</Text>
              <TextInput accessibilityLabel="Bill total" placeholder={digits === 0 ? '0' : '0.00'}
                placeholderTextColor="#A1ABA5" value={billText} onChangeText={setBillText}
                keyboardType={digits === 0 ? 'number-pad' : 'decimal-pad'} maxLength={9}
                selectTextOnFocus style={styles.billInput} returnKeyType="done" />
            </View>
            {!!billError && <Text accessibilityRole="alert" style={styles.error}>{billError}</Text>}
          </View>

          <View style={styles.tipSection}>
            <Text style={styles.label}>Tip percentage</Text>
            <View style={styles.percentRow}>
              {[15, 18, 20].map(percentage => (
                <Pressable key={percentage} accessibilityRole="button" accessibilityLabel={`${percentage}% tip`}
                  accessibilityState={{ selected: preferences.percentage === percentage }}
                  onPress={() => updatePreferences({ percentage })}
                  style={({ pressed }) => [styles.percentButton, preferences.percentage === percentage && styles.percentActive, pressed && base.pressed]}>
                  <Text style={[styles.percentText, preferences.percentage === percentage && styles.percentTextActive]}>{percentage}%</Text>
                </Pressable>
              ))}
              <Pressable accessibilityRole="button" accessibilityLabel="Custom tip percentage"
                accessibilityState={{ selected: customSelected }} onPress={() => openPanel('custom')}
                style={({ pressed }) => [styles.percentButton, customSelected && styles.percentActive, pressed && base.pressed]}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}
                  style={[styles.customText, customSelected && styles.percentTextActive]}>
                  {customSelected ? `${preferences.percentage}%` : 'Custom'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.results}>
            <View style={styles.resultHeading}>
              <Text style={styles.resultLabel}>Tip for receipt</Text>
              <Text style={styles.rateLabel}>{preferences.percentage}%</Text>
            </View>
            <Text accessibilityLabel={`Tip amount ${result ? money(result.tip) : 'unavailable'}`}
              numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35} style={styles.tipAmount}>
              {result ? money(result.tip) : '--'}
            </Text>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total with tip</Text>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}
                accessibilityLabel={`Total with tip ${result ? money(result.total) : 'unavailable'}`} style={styles.totalAmount}>
                {result ? money(result.total) : '--'}
              </Text>
            </View>
          </View>

          <Pressable accessibilityRole="button" accessibilityLabel="Split bill and tax" onPress={() => openPanel('split')}
            style={({ pressed }) => [styles.splitButton, pressed && base.pressed]}>
            <Feather name="users" size={19} color={colors.ink} />
            <Text style={styles.splitLabel}>{people > 1 ? `Split between ${people} people` : 'Split bill & tax'}</Text>
            <Feather name="chevron-right" size={19} color={colors.muted} />
          </Pressable>
          {excludeTax && <Text style={styles.activeNote}>Tip excludes {tax !== null ? money(tax) : '--'} in receipt tax</Text>}
          {!!taxError && <Text accessibilityRole="alert" style={styles.error}>{taxError}</Text>}
          {!!storageError && <Text accessibilityRole="alert" style={styles.error}>{storageError}</Text>}
          </View>
          <View style={styles.footer}>
            <View style={styles.footerRule} />
            <Feather name="check" size={14} color={theme.accent} />
            <Text style={styles.footerText}>All settled.</Text>
            <View style={styles.footerRule} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {panel === 'custom' && sheet('Custom tip', <>
        <Text style={styles.label}>Percentage</Text>
        <View style={styles.fieldRow}>
          <TextInput accessibilityLabel="Custom percentage" autoFocus value={customText} onChangeText={setCustomText}
            keyboardType="decimal-pad" maxLength={6} style={styles.fieldInput} returnKeyType="done"
            onSubmitEditing={() => {
              if (customPercentage !== null) { updatePreferences({ percentage: customPercentage }); closePanel(); }
            }} />
          <Text style={styles.fieldSuffix}>%</Text>
        </View>
        {customPercentage === null && <Text accessibilityRole="alert" style={styles.error}>Enter a percentage from 0 to 100, with up to 2 decimal places.</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel={`Use ${customPercentage ?? '--'}%`} disabled={customPercentage === null}
          style={({ pressed }) => [styles.primaryButton, customPercentage === null && base.disabled, pressed && base.pressed]}
          onPress={() => { if (customPercentage !== null) { updatePreferences({ percentage: customPercentage }); closePanel(); } }}>
          <Feather name="check" size={18} color="#FFFFFF" />
          <Text style={styles.primaryText}>Use {customPercentage ?? '--'}%</Text>
        </Pressable>
      </>)}

      {panel === 'split' && sheet('Split bill & tax', <>
        <Pressable accessibilityRole="button" accessibilityLabel="Sales tax and private purchases"
          onPress={() => openPanel('salesTax')} style={styles.locationButton}>
          <Feather name="percent" size={18} color={colors.green} />
          <Text style={styles.locationButtonText}>Sales tax & private purchases</Text>
        </Pressable>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>People</Text>
          <View style={styles.stepper}>
            <IconButton icon="minus" label="Remove person" disabled={people === 1} onPress={() => setPeople(people - 1)} />
            <Text accessibilityLabel={`${people} people`} style={styles.peopleCount}>{people}</Text>
            <IconButton icon="plus" label="Add person" disabled={people === MAX_PEOPLE} onPress={() => setPeople(people + 1)} />
          </View>
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Tip before tax</Text>
          <Switch accessibilityLabel="Tip before tax" value={excludeTax} onValueChange={setExcludeTax}
            trackColor={{ false: '#CBD5CE', true: '#146D4D' }} thumbColor="#FFFFFF" />
        </View>
        {excludeTax && <>
          <Text style={styles.label}>Tax already in bill ({currency})</Text>
          <View style={styles.fieldRow}>
            <TextInput accessibilityLabel="Tax included in bill" value={taxText} onChangeText={setTaxText}
              keyboardType={digits === 0 ? 'number-pad' : 'decimal-pad'} placeholder={digits === 0 ? '0' : '0.00'}
              maxLength={9} style={styles.fieldInput} />
          </View>
          {!!taxError && <Text accessibilityRole="alert" style={styles.error}>{taxError}</Text>}
          <Text style={styles.helpText}>Use the actual tax from the receipt. The bill total stays the same.</Text>
        </>}
        <View style={styles.shareHeader}>
          <Text style={styles.tablePerson}>Person</Text>
          <Text style={styles.tableNumber}>Tip</Text>
          <Text style={styles.tableNumber}>Pays</Text>
        </View>
        {result ? result.shares.map((share, index) => (
          <View key={index} style={styles.shareRow}>
            <Text style={styles.personName}>{people === 1 ? 'You' : `Person ${index + 1}`}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={styles.shareNumber}>{money(share.tip)}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={styles.shareNumber}>{money(share.total)}</Text>
          </View>
        )) : <Text accessibilityRole="alert" style={styles.error}>Fix the bill or tax amount to see each share.</Text>}
        {people > 1 && <Text style={styles.helpText}>Equal split. Any leftover {digits === 0 ? 'yen' : 'pennies'} go to the first people listed so every share adds up exactly.</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Done" style={styles.primaryButton} onPress={closePanel}>
          <Feather name="check" size={18} color="#FFFFFF" /><Text style={styles.primaryText}>Done</Text>
        </Pressable>
      </>)}

      {panel === 'location' && sheet('Location & tipping', <>
        <Pressable accessibilityRole="button" accessibilityLabel="Use device location" disabled={locating || Platform.OS === 'web'}
          style={({ pressed }) => [styles.locationButton, (locating || Platform.OS === 'web') && base.disabled, pressed && base.pressed]}
          onPress={locate}>
          {locating ? <ActivityIndicator color={colors.green} /> : <Feather name="navigation" size={18} color={colors.green} />}
          <Text style={styles.locationButtonText}>{locating ? 'Finding country...' : 'Use device location'}</Text>
        </Pressable>
        <Text style={styles.helpText}>{Platform.OS === 'web'
          ? 'Device lookup is available in the Android app. Choose a country here.'
          : 'Location is optional and checked only on request. Only your country choice is saved; no background tracking. Country lookup may need internet.'}</Text>
        {!!locationMessage && <Text accessibilityRole="alert" style={styles.helpText}>{locationMessage}</Text>}
        <Text style={[styles.label, styles.countryLabel]}>Country</Text>
        {[{ code: null, name: 'No location / USD' }, ...regions].map(option => (
          <Pressable key={option.code ?? 'none'} accessibilityRole="radio" accessibilityLabel={option.name}
            accessibilityState={{ checked: preferences.region === option.code }} onPress={() => selectRegion(option.code)}
            style={({ pressed }) => [styles.countryRow, pressed && base.pressed]}>
            <Text style={styles.countryName}>{option.name}</Text>
            <Feather name={preferences.region === option.code ? 'check-circle' : 'circle'} size={21}
              color={preferences.region === option.code ? colors.green : colors.muted} />
          </Pressable>
        ))}
        <Text style={styles.helpText}>Changing currency clears the bill and tax amounts. Your saved tip percentage stays unchanged.</Text>
        {region && <View style={styles.guidance}>
          <Text style={styles.guidanceTitle}>{region.headline}</Text>
          <Text style={styles.helpText}>{region.guidance}</Text>
          <Text style={styles.helpText}>{region.tax}</Text>
          <Pressable accessibilityRole="link" accessibilityLabel={region.source} style={styles.sourceLink} onPress={openSource}>
            <Text style={styles.sourceText}>{region.source}</Text><Feather name="external-link" size={14} color={colors.green} />
          </Pressable>
          <Text style={styles.reviewed}>Guide reviewed {REVIEWED_DATE}. General guidance, not a rule.</Text>
          {!!linkError && <Text accessibilityRole="alert" style={styles.error}>{linkError}</Text>}
        </View>}
      </>)}
      {panel === 'salesTax' && sheet('Sales tax', <>
        <SalesTaxPanel regionCode={preferences.region} fontsLoaded={fontsLoaded} />
        <Pressable accessibilityRole="button" accessibilityLabel="Back to split and tax" style={styles.primaryButton} onPress={() => openPanel('split')}>
          <Feather name="arrow-left" size={18} color="#FFFFFF" /><Text style={styles.primaryText}>Back to split & tax</Text>
        </Pressable>
      </>)}
    </SafeAreaView>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({ Manrope: Manrope_500Medium, ManropeSemi: Manrope_600SemiBold, ManropeBold: Manrope_700Bold });
  return <SafeAreaProvider><Calculator fontsLoaded={fontsLoaded} /></SafeAreaProvider>;
}

const base = StyleSheet.create({
  flex: { flex: 1 },
  hidden: { display: 'none' },
  safe: { flex: 1, backgroundColor: colors.background },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
  overlay: { flex: 1, backgroundColor: 'rgba(20,35,26,0.35)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 560, maxHeight: '92%', backgroundColor: colors.paper, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
});

function makeStyles(fontsLoaded: boolean, theme: CalculatorTheme) {
  const regular = fontsLoaded ? 'Manrope' : undefined;
  const semi = fontsLoaded ? 'ManropeSemi' : undefined;
  const bold = fontsLoaded ? 'ManropeBold' : undefined;
  return StyleSheet.create({
    page: { flexGrow: 1, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: colors.paper, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 24 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 16 },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 30 },
    modeButton: { flex: 1, minHeight: 48, borderRadius: 6, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 8 },
    modeText: { fontFamily: semi, fontSize: 14, color: colors.ink },
    brand: { flexDirection: 'row', gap: 9, alignItems: 'center', flexShrink: 1 },
    brandIcon: { width: 32, height: 32, backgroundColor: theme.surface, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    brandName: { fontFamily: bold, fontWeight: fontsLoaded ? undefined : '700', fontSize: 19, color: colors.ink, flexShrink: 1 },
    headerActions: { flexDirection: 'row' },
    label: { fontFamily: semi, fontSize: 14, color: colors.muted, marginBottom: 10 },
    billSection: { marginBottom: 30 },
    billInputRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1.5, borderBottomColor: colors.line, paddingBottom: 10, height: 74 },
    invalidInput: { borderBottomColor: colors.error },
    currency: { fontFamily: semi, color: colors.muted, fontSize: 15 },
    billInput: { fontFamily: regular, fontSize: 38, color: colors.ink, flex: 1, minWidth: 0, height: 62, padding: 0 },
    tipSection: { marginBottom: 32 },
    percentRow: { flexDirection: 'row', gap: 8 },
    percentButton: { flex: 1, minWidth: 0, height: 52, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.line, borderRadius: 6, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
    percentActive: { backgroundColor: theme.accent, borderColor: theme.accent },
    percentText: { fontFamily: semi, color: colors.ink, fontSize: 19 },
    customText: { fontFamily: semi, color: colors.ink, fontSize: 14 },
    percentTextActive: { color: '#FFFFFF' },
    results: { backgroundColor: colors.mint, paddingHorizontal: 24, paddingTop: 22, paddingBottom: 23, marginHorizontal: -24 },
    resultHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    resultLabel: { fontFamily: semi, color: colors.green, fontSize: 15 },
    rateLabel: { fontFamily: semi, color: colors.green, fontSize: 15 },
    tipAmount: { fontFamily: bold, fontWeight: fontsLoaded ? undefined : '700', color: colors.green, fontSize: 58, height: 92, paddingTop: 4, fontVariant: ['tabular-nums'] },
    totalRow: { borderTopWidth: 1, borderColor: '#C7DFCF', paddingTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
    totalLabel: { fontFamily: regular, color: colors.ink, fontSize: 15, flexShrink: 0 },
    totalAmount: { fontFamily: bold, fontWeight: fontsLoaded ? undefined : '700', color: colors.ink, fontSize: 24, flex: 1, textAlign: 'right', fontVariant: ['tabular-nums'] },
    splitButton: { height: 58, flexDirection: 'row', gap: 12, alignItems: 'center', borderBottomWidth: 1, borderColor: colors.line, marginTop: 14 },
    splitLabel: { fontFamily: semi, color: colors.ink, fontSize: 15, flex: 1 },
    activeNote: { fontFamily: regular, color: colors.muted, fontSize: 12, marginTop: 12 },
    error: { fontFamily: regular, color: colors.error, fontSize: 13, lineHeight: 20, marginTop: 8 },
    footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 36, marginTop: 'auto' },
    footerRule: { height: 1, backgroundColor: theme.border, flex: 1 },
    footerText: { fontFamily: regular, color: colors.muted, fontSize: 12 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 24, paddingRight: 14, paddingTop: 10, paddingBottom: 10, borderBottomWidth: 1, borderColor: colors.line },
    sheetTitle: { fontFamily: bold, fontWeight: fontsLoaded ? undefined : '700', fontSize: 20, color: colors.ink, flex: 1 },
    sheetContent: { padding: 24, gap: 10 },
    fieldRow: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
    fieldInput: { flex: 1, minWidth: 0, fontFamily: regular, color: colors.ink, fontSize: 24, height: 54, padding: 0 },
    fieldSuffix: { fontFamily: semi, color: colors.muted, fontSize: 22 },
    primaryButton: { minHeight: 50, borderRadius: 6, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, padding: 12, marginTop: 12 },
    primaryText: { color: '#FFFFFF', fontFamily: semi, fontSize: 16 },
    settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 56, borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 12, marginBottom: 8 },
    settingLabel: { fontFamily: semi, color: colors.ink, fontSize: 16, flex: 1 },
    stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, borderRadius: 6 },
    peopleCount: { width: 40, fontFamily: bold, color: colors.ink, fontSize: 22, textAlign: 'center' },
    shareHeader: { flexDirection: 'row', borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 12, marginTop: 12 },
    tablePerson: { flex: 1, fontFamily: semi, color: colors.muted, fontSize: 13 },
    tableNumber: { flex: 1, textAlign: 'right', fontFamily: semi, color: colors.muted, fontSize: 13 },
    shareRow: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderBottomWidth: 1, borderColor: colors.line, gap: 8 },
    personName: { flex: 1, fontFamily: regular, color: colors.ink, fontSize: 14 },
    shareNumber: { flex: 1, textAlign: 'right', fontFamily: semi, color: colors.ink, fontSize: 16, fontVariant: ['tabular-nums'] },
    helpText: { fontFamily: regular, color: colors.muted, fontSize: 13, lineHeight: 21 },
    locationButton: { flexDirection: 'row', gap: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#BBD4C5', backgroundColor: colors.mint, minHeight: 52, borderRadius: 6, padding: 12 },
    locationButtonText: { fontFamily: semi, color: colors.green, fontSize: 15 },
    countryLabel: { marginTop: 18, marginBottom: 0 },
    countryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, minHeight: 52, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.line },
    countryName: { fontFamily: regular, color: colors.ink, fontSize: 15, flex: 1 },
    guidance: { borderTopWidth: 3, borderColor: colors.green, paddingTop: 18, marginTop: 14, gap: 12 },
    guidanceTitle: { fontFamily: bold, color: colors.ink, fontSize: 18 },
    sourceLink: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
    sourceText: { fontFamily: semi, color: colors.green, fontSize: 13, flexShrink: 1 },
    reviewed: { fontFamily: regular, color: colors.muted, fontSize: 11, lineHeight: 18 },
  });
}
