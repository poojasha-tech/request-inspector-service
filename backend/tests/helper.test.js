import { describe, test, expect } from 'vitest';
import { generateSignedId, validateSignedId } from '../helper.js';

describe('generateSignedId', () => {
  test('returns a string with id and signature separated by a dot', () => {
    const result = generateSignedId();
    expect(result).toContain('.');
    expect(result.split('.')).toHaveLength(2);
  });

  test('generates different ids on each call', () => {
    expect(generateSignedId()).not.toBe(generateSignedId());
  });

  test('the signature part is 6 hex characters', () => {
    const [, signature] = generateSignedId().split('.');
    expect(signature).toMatch(/^[0-9a-f]{6}$/);
  });
});

describe('validateSignedId', () => {
  test('returns the bare id when the signature is valid', () => {
    const signed = generateSignedId();
    const [bareId] = signed.split('.');
    expect(validateSignedId(signed)).toBe(bareId);
  });

  test('returns false when the signature is tampered', () => {
    const [id] = generateSignedId().split('.');
    const tampered = `${id}.000000`;
    expect(validateSignedId(tampered)).toBe(false);
  });

  test('returns false when the input has no dot', () => {
    expect(validateSignedId('no-dot-here')).toBe(false);
  });

  test('returns false when the input is an empty string', () => {
    expect(validateSignedId('')).toBe(false);
  });

  test('returns false when the input is null or undefined', () => {
    expect(validateSignedId(null)).toBe(false);
    expect(validateSignedId(undefined)).toBe(false);
  });
});
