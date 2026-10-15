import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculatorThemes } from '../src/themes';

function luminance(hex: string) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(first: string, second: string) {
  const values = [luminance(first), luminance(second)];
  return (Math.max(...values) + 0.05) / (Math.min(...values) + 0.05);
}

test('each calculator has the requested title and a distinct color theme', () => {
  assert.equal(calculatorThemes.tip.title, 'Tip, please.');
  assert.equal(calculatorThemes.time.title, 'Hours, please.');
  assert.equal(calculatorThemes.currency.title, 'Currency, Converter.');
  assert.equal(calculatorThemes.tip.accent, '#146D4D');
  assert.equal(calculatorThemes.time.accent, '#713AA6');
  assert.equal(calculatorThemes.currency.accent, '#205FA8');
  for (const property of ['accent', 'surface', 'background', 'border'] as const) {
    assert.equal(new Set(Object.values(calculatorThemes).map(theme => theme[property])).size, 3);
  }
});

test('theme text meets 4.5:1 contrast on white, tinted cards and active controls', () => {
  for (const theme of Object.values(calculatorThemes)) {
    assert.ok(contrast(theme.accent, '#FFFFFF') >= 4.5, `${theme.title} active control text`);
    assert.ok(contrast(theme.accent, theme.surface) >= 4.5, `${theme.title} tinted card text`);
    assert.ok(contrast('#606B65', theme.background) >= 4.5, `${theme.title} secondary text`);
  }
});
