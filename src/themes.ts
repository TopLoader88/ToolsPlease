export const calculatorThemes = {
  tip: {
    title: 'Tip, please.',
    icon: 'percent',
    accent: '#146D4D',
    surface: '#E6F3EB',
    background: '#F3F6F4',
    border: '#DCE4DF',
  },
  time: {
    title: 'Hours, please.',
    icon: 'clock',
    accent: '#713AA6',
    surface: '#F1E8FA',
    background: '#F7F3FA',
    border: '#E2D8EC',
  },
  currency: {
    title: 'Currency, Converter.',
    icon: 'dollar-sign',
    accent: '#205FA8',
    surface: '#E7F0FC',
    background: '#F2F6FC',
    border: '#D6E2F0',
  },
} as const;

export type CalculatorMode = keyof typeof calculatorThemes;
export type CalculatorTheme = typeof calculatorThemes[CalculatorMode];
