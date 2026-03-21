import { describe, it, expect } from 'vitest';
import { estimateTokens } from '../../utils/token-estimate';

describe('estimateTokens', () => {
  it('returns 0 for an empty string', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('returns 1 for a 4-char string', () => {
    expect(estimateTokens('abcd')).toBe(1);
  });

  it('returns 2 for a 5-char string (ceil)', () => {
    expect(estimateTokens('abcde')).toBe(2);
  });

  it('returns 25 for a 100-char string', () => {
    expect(estimateTokens('a'.repeat(100))).toBe(25);
  });

  it('returns 250 for a 1000-char string', () => {
    expect(estimateTokens('a'.repeat(1000))).toBe(250);
  });

  it('returns 251 for a 1001-char string (ceil)', () => {
    expect(estimateTokens('a'.repeat(1001))).toBe(251);
  });
});
