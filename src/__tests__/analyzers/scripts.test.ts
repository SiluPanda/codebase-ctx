import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeScripts } from '../../analyzers/scripts';

describe('analyzeScripts', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codebase-ctx-scripts-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('categorizes scripts spanning all categories correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          build: 'tsc',
          test: 'vitest run',
          lint: 'eslint src/',
          start: 'node dist/index.js',
          deploy: 'aws deploy',
          clean: 'rm -rf dist',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    expect(result.scripts).toHaveLength(6);

    const find = (name: string) => result.scripts.find((s) => s.name === name);
    expect(find('build')!.category).toBe('build');
    expect(find('test')!.category).toBe('test');
    expect(find('lint')!.category).toBe('lint');
    expect(find('start')!.category).toBe('start');
    expect(find('deploy')!.category).toBe('deploy');
    expect(find('clean')!.category).toBe('other');
  });

  it('categorizes build-related scripts correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          build: 'tsc',
          compile: 'tsc -p tsconfig.build.json',
          bundle: 'rollup -c',
          tsc: 'tsc --noEmit',
          'build:prod': 'tsc -p tsconfig.prod.json',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    for (const script of result.scripts) {
      expect(script.category).toBe('build');
    }
  });

  it('categorizes test-related scripts correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          test: 'vitest run',
          spec: 'jasmine',
          e2e: 'playwright test',
          coverage: 'vitest --coverage',
          'test:unit': 'vitest run src/',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    for (const script of result.scripts) {
      expect(script.category).toBe('test');
    }
  });

  it('categorizes lint-related scripts correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          lint: 'eslint src/',
          check: 'tsc --noEmit',
          format: 'prettier --write .',
          prettier: 'prettier --check .',
          'lint:fix': 'eslint --fix src/',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    for (const script of result.scripts) {
      expect(script.category).toBe('lint');
    }
  });

  it('categorizes start-related scripts correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          start: 'node dist/index.js',
          dev: 'tsx watch src/index.ts',
          serve: 'http-server dist/',
          develop: 'nodemon src/index.ts',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    for (const script of result.scripts) {
      expect(script.category).toBe('start');
    }
  });

  it('categorizes deploy-related scripts correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          deploy: 'aws s3 sync dist/ s3://bucket',
          release: 'semantic-release',
          publish: 'npm publish',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    for (const script of result.scripts) {
      expect(script.category).toBe('deploy');
    }
  });

  it('categorizes unknown scripts as other', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          clean: 'rm -rf dist',
          docs: 'typedoc src/',
          migrate: 'prisma migrate dev',
          seed: 'tsx src/seed.ts',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    for (const script of result.scripts) {
      expect(script.category).toBe('other');
    }
  });

  it('returns empty array and all flags false when no scripts field', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'no-scripts' }),
    );

    const result = analyzeScripts(tempDir);

    expect(result.scripts).toEqual([]);
    expect(result.hasBuild).toBe(false);
    expect(result.hasTest).toBe(false);
    expect(result.hasLint).toBe(false);
    expect(result.hasStart).toBe(false);
  });

  it('returns fallback when no package.json exists', () => {
    const result = analyzeScripts(tempDir);

    expect(result.scripts).toEqual([]);
    expect(result.hasBuild).toBe(false);
    expect(result.hasTest).toBe(false);
    expect(result.hasLint).toBe(false);
    expect(result.hasStart).toBe(false);
  });

  it('sets hasBuild/hasTest/hasLint/hasStart flags correctly', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          build: 'tsc',
          test: 'vitest run',
          lint: 'eslint src/',
          start: 'node dist/index.js',
          clean: 'rm -rf dist',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    expect(result.hasBuild).toBe(true);
    expect(result.hasTest).toBe(true);
    expect(result.hasLint).toBe(true);
    expect(result.hasStart).toBe(true);
  });

  it('sets flags false when only other scripts are present', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          clean: 'rm -rf dist',
          docs: 'typedoc src/',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    expect(result.hasBuild).toBe(false);
    expect(result.hasTest).toBe(false);
    expect(result.hasLint).toBe(false);
    expect(result.hasStart).toBe(false);
  });

  it('categorizes prepublishOnly as deploy', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          prepublishOnly: 'npm run build',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    expect(result.scripts[0].category).toBe('deploy');
  });

  it('categorizes pretest as test and postbuild as build', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          pretest: 'npm run lint',
          postbuild: 'cp README.md dist/',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    const find = (name: string) => result.scripts.find((s) => s.name === name);
    expect(find('pretest')!.category).toBe('test');
    expect(find('postbuild')!.category).toBe('build');
  });

  it('categorizes prelint as lint and prestart as start', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          prelint: 'echo linting...',
          prestart: 'npm run build',
          postdeploy: 'echo deployed',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    const find = (name: string) => result.scripts.find((s) => s.name === name);
    expect(find('prelint')!.category).toBe('lint');
    expect(find('prestart')!.category).toBe('start');
    expect(find('postdeploy')!.category).toBe('deploy');
  });

  it('preserves command strings from package.json', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        scripts: {
          build: 'tsc -p tsconfig.build.json',
          test: 'vitest run --reporter verbose',
          lint: 'eslint src/ --ext .ts,.tsx',
        },
      }),
    );

    const result = analyzeScripts(tempDir);

    const find = (name: string) => result.scripts.find((s) => s.name === name);
    expect(find('build')!.command).toBe('tsc -p tsconfig.build.json');
    expect(find('test')!.command).toBe('vitest run --reporter verbose');
    expect(find('lint')!.command).toBe('eslint src/ --ext .ts,.tsx');
  });

  it('handles empty scripts object', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'empty-scripts',
        scripts: {},
      }),
    );

    const result = analyzeScripts(tempDir);

    expect(result.scripts).toEqual([]);
    expect(result.hasBuild).toBe(false);
    expect(result.hasTest).toBe(false);
    expect(result.hasLint).toBe(false);
    expect(result.hasStart).toBe(false);
  });
});
