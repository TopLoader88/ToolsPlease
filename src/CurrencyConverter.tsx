import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { formatMoney, parseAmount } from './calculator';
import { currencies, convertCurrency, getExchangeRate, parseExchangeRate, type Currency } from './currencyConversion';
import { makeToolStyles } from './toolStyles';
import { calculatorThemes } from './themes';

export function CurrencyConverter({ fontsLoaded }: { fontsLoaded: boolean }) {
  const theme = calculatorThemes.currency;
  const styles = makeToolStyles(fontsLoaded, theme);
  const [from, setFrom] = useState<Currency>(currencies[0]);
  const [to, setTo] = useState<Currency>(currencies[1]);
  const [amountText, setAmountText] = useState('');
  const [manual, setManual] = useState(false);
  const [manualText, setManualText] = useState('');
  const [onlineRate, setOnlineRate] = useState<{ text: string; date: string } | null>(null);
  const [choosing, setChoosing] = useState<'from' | 'to' | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState('');
  const activeRequest = useRef<AbortController | null>(null);
  const sameCurrency = from.code === to.code;
  const rateText = sameCurrency ? '1' : manual ? manualText : onlineRate?.text ?? '';
  const amount = parseAmount(amountText, from.digits);
  const rate = parseExchangeRate(rateText);
  let conversionError = '';
  let converted: number | null = null;
  if (amount !== null && rate !== null) {
    try { converted = convertCurrency(amount, from.digits, to.digits, rateText); }
    catch (cause) { conversionError = cause instanceof Error ? cause.message : 'Could not convert this amount.'; }
  }

  useEffect(() => () => { activeRequest.current?.abort(); activeRequest.current = null; }, []);

  function cancelRequest() {
    activeRequest.current?.abort();
    activeRequest.current = null;
    setLoading(false);
    setRequestError('');
    setOnlineRate(null);
  }

  async function loadRate() {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoading(true);
    setRequestError('');
    setOnlineRate(null);
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, 15000);
    try {
      const next = await getExchangeRate(from.code, to.code, controller.signal);
      if (activeRequest.current === controller && !controller.signal.aborted) setOnlineRate(next);
    } catch (cause) {
      if (activeRequest.current === controller) {
        setRequestError(timedOut ? 'Rate lookup timed out. Try again or use a manual rate.'
          : `Could not load the exchange rate. ${cause instanceof Error ? cause.message : 'Check your connection or use a manual rate.'}`);
      }
    } finally {
      clearTimeout(timer);
      if (activeRequest.current === controller) { activeRequest.current = null; setLoading(false); }
    }
  }

  return <View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Currency conversion</Text>
    <View>
      <Text style={styles.label}>Amount ({from.code})</Text>
      <TextInput accessibilityLabel="Amount to convert" value={amountText} onChangeText={setAmountText}
        keyboardType={from.digits === 0 ? 'number-pad' : 'decimal-pad'} maxLength={9}
        placeholder={from.digits === 0 ? '0' : '0.00'} style={styles.input} />
    </View>
    {amount === null && <Text accessibilityRole="alert" style={styles.error}>
      {from.digits === 0 ? 'Enter a whole-number amount up to 999999.' : 'Enter an amount up to 999999.99 with no more than 2 decimal places.'}
    </Text>}
    <View style={styles.row}>
      {(['from', 'to'] as const).map(side => <View key={side} style={styles.grow}>
        <Text style={styles.label}>{side === 'from' ? 'From' : 'To'}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Choose ${side} currency`}
          accessibilityState={{ expanded: choosing === side }} onPress={() => setChoosing(choosing === side ? null : side)} style={styles.button}>
          <View style={styles.row}>
            <Text style={styles.buttonText}>{side === 'from' ? from.code : to.code}</Text>
            <Feather name="chevron-down" size={16} color={theme.accent} />
          </View>
        </Pressable>
      </View>)}
      <Pressable accessibilityRole="button" accessibilityLabel="Swap currencies" style={styles.button} onPress={() => {
        cancelRequest(); setFrom(to); setTo(from); setManualText(''); setAmountText(''); setChoosing(null);
      }}>
        <Text style={styles.buttonText}>Swap</Text>
      </Pressable>
    </View>
    {choosing && <View>
      <Text style={styles.label}>{choosing === 'from' ? 'Convert from' : 'Convert to'}</Text>
      {currencies.map(currency => <Pressable key={currency.code} accessibilityRole="radio"
        accessibilityLabel={`${currency.code} ${currency.name}`}
        accessibilityState={{ checked: (choosing === 'from' ? from.code : to.code) === currency.code }}
        style={styles.option} onPress={() => {
          if ((choosing === 'from' ? from.code : to.code) !== currency.code) {
            cancelRequest(); setManualText('');
            if (choosing === 'from') { setFrom(currency); setAmountText(''); } else setTo(currency);
          }
          setChoosing(null);
        }}>
        <Text style={styles.text}>{currency.code} - {currency.name}</Text>
        {(choosing === 'from' ? from.code : to.code) === currency.code && <Text style={styles.buttonText}>Selected</Text>}
      </Pressable>)}
    </View>}
    {!sameCurrency && <>
      <View style={styles.row}>
        {[false, true].map(value => <Pressable key={String(value)} accessibilityRole="button"
          accessibilityLabel={value ? 'Manual exchange rate' : 'Online exchange rate'} accessibilityState={{ selected: manual === value }}
          onPress={() => { if (manual !== value) { cancelRequest(); setManual(value); } }}
          style={[styles.button, styles.grow, manual === value && styles.active]}>
          <Text style={[styles.buttonText, manual === value && styles.activeText]}>{value ? 'Manual rate' : 'Online rate'}</Text>
        </Pressable>)}
      </View>
      {manual ? <View>
        <Text style={styles.label}>1 {from.code} equals how many {to.code}?</Text>
        <TextInput accessibilityLabel="Manual exchange rate" value={manualText} onChangeText={setManualText}
          keyboardType="decimal-pad" maxLength={20} placeholder="Enter rate" style={styles.input} />
        {rate === null && <Text accessibilityRole="alert" style={styles.error}>Enter a positive rate up to 1,000,000, with up to 12 decimal places.</Text>}
      </View> : <>
        <Pressable accessibilityRole="button" accessibilityLabel="Get latest exchange rate" disabled={loading} onPress={loadRate}
          style={[styles.button, loading && styles.disabled]}>
          {loading ? <ActivityIndicator color={theme.accent} /> : <Text style={styles.buttonText}>{onlineRate ? 'Refresh rate' : 'Get latest rate'}</Text>}
        </Pressable>
        <Text style={styles.note}>On request, sends only the currency pair to Frankfurter (api.frankfurter.dev). Daily reference rates, not live bank quotes. No account or API key required.</Text>
      </>}
    </>}
    {!!requestError && <Text accessibilityRole="alert" style={styles.error}>{requestError}</Text>}
    {!!conversionError && <Text accessibilityRole="alert" style={styles.error}>{conversionError}</Text>}
    <View style={styles.result} accessibilityLiveRegion="polite">
      <Text style={styles.label}>Converted amount ({to.code})</Text>
      <Text accessibilityLabel={`Converted amount ${converted !== null ? formatMoney(converted, to.code, to.digits) : 'unavailable'}`}
        numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.35} style={styles.amount}>
        {converted !== null ? formatMoney(converted, to.code, to.digits) : '--'}
      </Text>
      {rate !== null && <Text style={styles.note}>1 {from.code} = {rateText} {to.code}</Text>}
      {!sameCurrency && !manual && onlineRate && <Text style={styles.note}>Frankfurter reference date: {onlineRate.date}</Text>}
      {sameCurrency && <Text style={styles.note}>Same currency; no exchange rate needed.</Text>}
      {!sameCurrency && manual && <Text style={styles.note}>Using your manually entered rate.</Text>}
      {!sameCurrency && !manual && !onlineRate && <Text style={styles.note}>Get a rate above or choose Manual rate.</Text>}
    </View>
    <Text style={styles.note}>Rounded to the destination currency's minor unit. Estimates exclude fees and bank markups. Rates and amounts are not saved, and do not change your tip settings.</Text>
  </View>;
}
