import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeDependencies } from '../../analyzers/dependencies';
import { categorize, DEPENDENCY_REGISTRY } from '../../registries/dependencies';

describe('analyzeDependencies', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codebase-ctx-deps-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('categorizes dependencies from all sections correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'react': '^18.0.0',
          'express': '^4.18.0',
          '@prisma/client': '^5.0.0',
          'axios': '^1.0.0',
        },
        devDependencies: {
          'vitest': '^1.0.0',
          'typescript': '^5.0.0',
          'eslint': '^8.0.0',
        },
        peerDependencies: {
          'react-dom': '^18.0.0',
        },
        optionalDependencies: {
          'fsevents': '^2.3.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    expect(result.production).toHaveLength(4);
    expect(result.dev).toHaveLength(3);
    expect(result.peer).toHaveLength(1);
    expect(result.optional).toHaveLength(1);
  });

  it('maps known packages to correct categories', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'react': '^18.0.0',
          'prisma': '^5.0.0',
          'winston': '^3.0.0',
          'passport': '^0.7.0',
          'tailwindcss': '^3.0.0',
          'zod': '^3.0.0',
        },
        devDependencies: {
          'vitest': '^1.0.0',
          'typescript': '^5.0.0',
          'eslint': '^8.0.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    const findProd = (name: string) =>
      result.production.find((d) => d.name === name);
    const findDev = (name: string) =>
      result.dev.find((d) => d.name === name);

    expect(findProd('react')!.category).toBe('framework');
    expect(findProd('prisma')!.category).toBe('database');
    expect(findProd('winston')!.category).toBe('observability');
    expect(findProd('passport')!.category).toBe('auth');
    expect(findProd('tailwindcss')!.category).toBe('ui');
    expect(findProd('zod')!.category).toBe('api');

    expect(findDev('vitest')!.category).toBe('testing');
    expect(findDev('typescript')!.category).toBe('build');
    expect(findDev('eslint')!.category).toBe('lint');
  });

  it('detects @types/* packages as type-definitions', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        devDependencies: {
          '@types/node': '^20.0.0',
          '@types/express': '^4.0.0',
          '@types/react': '^18.0.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    for (const dep of result.dev) {
      expect(dep.category).toBe('type-definitions');
    }
  });

  it('defaults unknown deps to utility, unknown devDeps to build', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'some-unknown-pkg': '^1.0.0',
          'another-mystery': '^2.0.0',
        },
        devDependencies: {
          'unknown-dev-tool': '^1.0.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    for (const dep of result.production) {
      expect(dep.category).toBe('utility');
    }
    for (const dep of result.dev) {
      expect(dep.category).toBe('build');
    }
  });

  it('returns empty arrays when dependencies are empty', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'empty-deps',
        dependencies: {},
        devDependencies: {},
      }),
    );

    const result = analyzeDependencies(tempDir);

    expect(result.production).toEqual([]);
    expect(result.dev).toEqual([]);
    expect(result.peer).toEqual([]);
    expect(result.optional).toEqual([]);
    expect(result.summary.totalProduction).toBe(0);
    expect(result.summary.totalDev).toBe(0);
  });

  it('returns fallback when no package.json exists', () => {
    const result = analyzeDependencies(tempDir);

    expect(result.production).toEqual([]);
    expect(result.dev).toEqual([]);
    expect(result.peer).toEqual([]);
    expect(result.optional).toEqual([]);
    expect(result.summary).toEqual({
      totalProduction: 0,
      totalDev: 0,
      frameworks: [],
      databases: [],
      testingTools: [],
    });
  });

  it('computes summary correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'react': '^18.0.0',
          'next': '^14.0.0',
          '@prisma/client': '^5.0.0',
          'pg': '^8.0.0',
          'axios': '^1.0.0',
        },
        devDependencies: {
          'vitest': '^1.0.0',
          'jest': '^29.0.0',
          'typescript': '^5.0.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    expect(result.summary.totalProduction).toBe(5);
    expect(result.summary.totalDev).toBe(3);
    expect(result.summary.frameworks).toContain('react');
    expect(result.summary.frameworks).toContain('next');
    expect(result.summary.databases).toContain('@prisma/client');
    expect(result.summary.databases).toContain('pg');
    expect(result.summary.testingTools).toContain('vitest');
    expect(result.summary.testingTools).toContain('jest');
  });

  it('includes peer and optional deps in summary lists', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'express': '^4.0.0',
        },
        peerDependencies: {
          'react': '^18.0.0',
        },
        optionalDependencies: {
          'mongodb': '^6.0.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    expect(result.summary.frameworks).toContain('express');
    expect(result.summary.frameworks).toContain('react');
    expect(result.summary.databases).toContain('mongodb');
  });

  it('handles package.json with only devDependencies', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'dev-only',
        devDependencies: {
          'typescript': '^5.0.0',
          'vitest': '^1.0.0',
          'eslint': '^8.0.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    expect(result.production).toEqual([]);
    expect(result.dev).toHaveLength(3);
    expect(result.summary.totalProduction).toBe(0);
    expect(result.summary.totalDev).toBe(3);
    expect(result.summary.testingTools).toContain('vitest');
  });

  it('preserves version strings from package.json', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        dependencies: {
          'express': '~4.18.2',
          'react': '^18.2.0',
        },
      }),
    );

    const result = analyzeDependencies(tempDir);

    const express = result.production.find((d) => d.name === 'express');
    const react = result.production.find((d) => d.name === 'react');

    expect(express!.version).toBe('~4.18.2');
    expect(react!.version).toBe('^18.2.0');
  });
});

describe('categorize', () => {
  it('returns the registry category for known packages', () => {
    expect(categorize('react', false)).toBe('framework');
    expect(categorize('prisma', false)).toBe('database');
    expect(categorize('vitest', true)).toBe('testing');
    expect(categorize('eslint', true)).toBe('lint');
  });

  it('returns type-definitions for @types/* packages', () => {
    expect(categorize('@types/node', true)).toBe('type-definitions');
    expect(categorize('@types/express', true)).toBe('type-definitions');
    expect(categorize('@types/react', false)).toBe('type-definitions');
  });

  it('defaults unknown packages to utility (prod) or build (dev)', () => {
    expect(categorize('unknown-pkg', false)).toBe('utility');
    expect(categorize('unknown-pkg', true)).toBe('build');
  });
});

describe('DEPENDENCY_REGISTRY', () => {
  it('contains 100+ entries', () => {
    const count = Object.keys(DEPENDENCY_REGISTRY).length;
    expect(count).toBeGreaterThanOrEqual(100);
  });

  it('maps all expected categories', () => {
    const categories = new Set(Object.values(DEPENDENCY_REGISTRY));
    expect(categories).toContain('framework');
    expect(categories).toContain('database');
    expect(categories).toContain('testing');
    expect(categories).toContain('build');
    expect(categories).toContain('lint');
    expect(categories).toContain('ui');
    expect(categories).toContain('auth');
    expect(categories).toContain('api');
    expect(categories).toContain('observability');
  });
});
