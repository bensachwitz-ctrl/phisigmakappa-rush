import { describe, it, expect } from 'vitest';
import { safeHex, hexToHslTriple, buildBrandThemeStyle, BRAND_DEFAULTS } from '../lib/brand-theme';

describe('safeHex', () => {
  const fallback = '#000000';

  it('should return fallback for undefined input', () => {
    expect(safeHex(undefined, fallback)).toBe(fallback);
  });

  it('should return fallback for empty string', () => {
    expect(safeHex('', fallback)).toBe(fallback);
  });

  it('should return valid 6-character hex with #', () => {
    expect(safeHex('#1a2b3c', fallback)).toBe('#1a2b3c');
    expect(safeHex('#1A2B3C', fallback)).toBe('#1A2B3C');
  });

  it('should return valid 3-character hex with # (expanded)', () => {
    expect(safeHex('#123', fallback)).toBe('#112233');
    expect(safeHex('#abc', fallback)).toBe('#aabbcc');
  });

  it('should handle whitespace around valid hex', () => {
    expect(safeHex('  #ffffff  ', fallback)).toBe('#ffffff');
  });

  it('should return fallback for invalid hex colors', () => {
    expect(safeHex('red', fallback)).toBe(fallback);
    expect(safeHex('#1234', fallback)).toBe(fallback);
    expect(safeHex('#12345', fallback)).toBe(fallback);
    expect(safeHex('#1234567', fallback)).toBe(fallback);
  });

  it('should return fallback for malicious inputs', () => {
    expect(safeHex('<script>', fallback)).toBe(fallback);
    expect(safeHex('https://example.com', fallback)).toBe(fallback);
    expect(safeHex('javascript:alert(1)', fallback)).toBe(fallback);
  });
});

describe('hexToHslTriple', () => {
  it('should convert 6-character hex correctly', () => {
    // Pure red
    expect(hexToHslTriple('#ff0000')).toBe('0 100% 50%');
    // Pure green
    expect(hexToHslTriple('#00ff00')).toBe('120 100% 50%');
    // Pure blue
    expect(hexToHslTriple('#0000ff')).toBe('240 100% 50%');
    // White
    expect(hexToHslTriple('#ffffff')).toBe('0 0% 100%');
    // Black
    expect(hexToHslTriple('#000000')).toBe('0 0% 0%');
    // Gray
    expect(hexToHslTriple('#808080')).toBe('0 0% 50%');
  });

  it('should handle 3-character hex correctly', () => {
    expect(hexToHslTriple('#f00')).toBe('0 100% 50%');
    expect(hexToHslTriple('#0f0')).toBe('120 100% 50%');
    expect(hexToHslTriple('#00f')).toBe('240 100% 50%');
  });

  it('should handle mixed max cases', () => {
    // case r: g < b
    expect(hexToHslTriple('#ff00ff')).toBe('300 100% 50%');
    // case g:
    expect(hexToHslTriple('#00ffff')).toBe('180 100% 50%');
  });
});

describe('buildBrandThemeStyle', () => {
  it('should build theme with default values', () => {
    const style = buildBrandThemeStyle({});
    expect(style).toContain(`--brand-primary:${BRAND_DEFAULTS.primary}`);
    expect(style).toContain(`--brand-primary-dark:${BRAND_DEFAULTS.primaryDark}`);
    expect(style).toContain(`--brand-primary-soft:${BRAND_DEFAULTS.primarySoft}`);
    expect(style).toContain(`--brand-secondary:${BRAND_DEFAULTS.secondary}`);
    expect(style).toContain(`--primary:221 83% 53%`);
  });

  it('should use configured hex values', () => {
    const style = buildBrandThemeStyle({
      'brand.primaryHex': '#ff0000',
      'brand.primaryDarkHex': '#cc0000',
      'brand.primarySoftHex': '#ffcccc',
      'brand.secondaryHex': '#00ff00'
    });
    expect(style).toContain('--brand-primary:#ff0000');
    expect(style).toContain('--brand-primary-dark:#cc0000');
    expect(style).toContain('--brand-primary-soft:#ffcccc');
    expect(style).toContain('--brand-secondary:#00ff00');
    expect(style).toContain('--primary:0 100% 50%');
    expect(style).toContain('--ring:0 100% 50%');
  });

  it('should fallback for invalid configs', () => {
    const style = buildBrandThemeStyle({
      'brand.primaryHex': 'invalid',
    });
    expect(style).toContain(`--brand-primary:${BRAND_DEFAULTS.primary}`);
  });
});
