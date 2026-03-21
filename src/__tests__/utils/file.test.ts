import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { fileExists, readFileContent, readLines, readJsonFile } from '../../utils/file';

const PKG_PATH = join(__dirname, '../../../package.json');
const NONEXISTENT = join(__dirname, '../../../nonexistent-file-xyz.json');

describe('fileExists', () => {
  it('returns true for an existing file', () => {
    expect(fileExists(PKG_PATH)).toBe(true);
  });

  it('returns false for a non-existent path', () => {
    expect(fileExists(NONEXISTENT)).toBe(false);
  });
});

describe('readFileContent', () => {
  it('reads a known file and contains expected content', () => {
    const content = readFileContent(PKG_PATH);
    expect(content).toContain('codebase-ctx');
  });
});

describe('readLines', () => {
  it('splits content by newline and returns at least one line', () => {
    const lines = readLines(PKG_PATH);
    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThanOrEqual(1);
  });
});

describe('readJsonFile', () => {
  it('parses package.json correctly and checks name field', () => {
    const pkg = readJsonFile<{ name: string }>(PKG_PATH);
    expect(pkg).not.toBeNull();
    expect(pkg!.name).toBe('codebase-ctx');
  });

  it('returns null for a non-existent path', () => {
    const result = readJsonFile(NONEXISTENT);
    expect(result).toBeNull();
  });

  it('returns null for invalid JSON content', () => {
    // Test by passing a path that cannot be valid JSON — use SPEC.md which is markdown
    const specPath = join(__dirname, '../../../SPEC.md');
    const result = readJsonFile(specPath);
    expect(result).toBeNull();
  });
});
