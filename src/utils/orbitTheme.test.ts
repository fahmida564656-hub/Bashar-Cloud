import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ORBIT_THEME_PRESETS,
  normalizeOrbitThemePreset,
  getOrbitThemePresetById,
} from './orbitTheme';

test('provides 5 distinct numbered professional orbit presets with Preset 4 marked Pro', () => {
  assert.equal(ORBIT_THEME_PRESETS.length, 5);
  assert.deepEqual(
    ORBIT_THEME_PRESETS.map((p) => p.id),
    ['1', '2', '3', '4', '5']
  );
  const preset1 = getOrbitThemePresetById('1');
  assert.equal(preset1.name, 'Aurora Prism');

  const preset4 = getOrbitThemePresetById('4');
  assert.equal(preset4.name, 'Executive Luxe');
  assert.equal(preset4.badge, 'Pro');
});

test('normalizeOrbitThemePreset sanitizes invalid values safely to default 1', () => {
  assert.equal(normalizeOrbitThemePreset('1'), '1');
  assert.equal(normalizeOrbitThemePreset('4'), '4');
  assert.equal(normalizeOrbitThemePreset(5), '5');
  assert.equal(normalizeOrbitThemePreset('99'), '1');
  assert.equal(normalizeOrbitThemePreset(null), '1');
  assert.equal(normalizeOrbitThemePreset(undefined, '4'), '4');
});
