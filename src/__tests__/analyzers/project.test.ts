import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { analyzeProject } from '../../analyzers/project';

describe('analyzeProject', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'codebase-ctx-test-'));
  });

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('extracts all fields from a full package.json', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({
        name: 'my-project',
        version: '2.1.0',
        description: 'A test project',
        license: 'MIT',
        repository: 'https://github.com/user/repo',
        engines: { node: '>=18' },
        dependencies: { express: '^4.0.0' },
        devDependencies: { typescript: '^5.0.0' },
      }),
    );
    writeFileSync(join(tempDir, 'tsconfig.json'), '{}');

    const result = analyzeProject(tempDir);

    expect(result.name).toBe('my-project');
    expect(result.version).toBe('2.1.0');
    expect(result.description).toBe('A test project');
    expect(result.license).toBe('MIT');
    expect(result.repository).toBe('https://github.com/user/repo');
    expect(result.nodeVersion).toBe('>=18');
    expect(result.language).toBe('TypeScript');
    expect(result.runtime).toBe('Node.js');
  });

  it('returns null for missing fields in a minimal package.json', () => {
    writeFileSync(
      join(tempDir, 'package.json'),
      JSON.stringify({ name: 'minimal' }),
    );

    const result = analyzeProject(tempDir);

    expect(result.name).toBe('minimal');
    expect(result.version).toBeNull();
    expect(result.description).toBeNull();
    expect(result.license).toBeNull();
    expect(result.repository).toBeNull();
    expect(result.nodeVersion).toBeNull();
  });

  it('returns dir name and unknown language/runtime when no package.json exists', () => {
    const result = analyzeProject(tempDir);

    // tempDir ends with a random suffix, but it should be the dir name
    const dirName = tempDir.split('/').pop()!;
    expect(result.name).toBe(dirName);
    expect(result.version).toBeNull();
    expect(result.description).toBeNull();
    expect(result.license).toBeNull();
    expect(result.language).toBe('unknown');
    expect(result.runtime).toBe('unknown');
    expect(result.repository).toBeNull();
    expect(result.nodeVersion).toBeNull();
  });

  describe('language detection', () => {
    it('returns TypeScript when tsconfig.json is present', () => {
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
      writeFileSync(join(tempDir, 'tsconfig.json'), '{}');

      const result = analyzeProject(tempDir);
      expect(result.language).toBe('TypeScript');
    });

    it('returns TypeScript when .ts files exist in src/', () => {
      writeFileSync(join(tempDir, 'package.json'), JSON.stringify({ name: 'test' }));
      mkdirSync(join(tempDir, 'src'));
      writeFileSync(join(tempDir, 'src', 'index.ts'), 'export {};');

      const result = analyzeProject(tempDir);
      expect(result.language).toBe('TypeScript');
    });

    it('returns TypeScript when typescript is a devDependency', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          devDependencies: { typescript: '^5.0.0' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.language).toBe('TypeScript');
    });

    it('returns JavaScript when no TypeScript indicators exist', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { express: '^4.0.0' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.language).toBe('JavaScript');
    });
  });

  describe('runtime detection', () => {
    it('returns Bun when engines.bun is set', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          engines: { bun: '>=1.0.0' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.runtime).toBe('Bun');
    });

    it('returns Deno when engines.deno is set', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          engines: { deno: '>=1.30' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.runtime).toBe('Deno');
    });

    it('returns Browser when react dep is present without next', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { react: '^18.0.0', 'react-dom': '^18.0.0' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.runtime).toBe('Browser');
    });

    it('returns Node.js when react and next are both present', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { react: '^18.0.0', next: '^14.0.0' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.runtime).toBe('Node.js');
    });

    it('returns Node.js by default', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          dependencies: { express: '^4.0.0' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.runtime).toBe('Node.js');
    });
  });

  describe('repository extraction', () => {
    it('returns string repository as-is', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          repository: 'https://github.com/user/repo',
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.repository).toBe('https://github.com/user/repo');
    });

    it('extracts url from repository object', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          repository: { type: 'git', url: 'https://github.com/user/repo' },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.repository).toBe('https://github.com/user/repo');
    });

    it('strips git+ prefix and .git suffix from repository url', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({
          name: 'test',
          repository: {
            type: 'git',
            url: 'git+https://github.com/user/repo.git',
          },
        }),
      );

      const result = analyzeProject(tempDir);
      expect(result.repository).toBe('https://github.com/user/repo');
    });

    it('returns null when repository is not provided', () => {
      writeFileSync(
        join(tempDir, 'package.json'),
        JSON.stringify({ name: 'test' }),
      );

      const result = analyzeProject(tempDir);
      expect(result.repository).toBeNull();
    });
  });
});
