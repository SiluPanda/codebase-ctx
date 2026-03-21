import { describe, it, expect } from 'vitest';
import type {
  CodebaseContext,
  AnalyzeOptions,
  DetailLevel,
  OutputFormat,
  AnalyzerName,
  Analyzer,
  AnalysisMeta,
  ProjectInfo,
} from '../types';

describe('types', () => {
  it('CodebaseContext can be constructed with only meta and project (all analyzers optional)', () => {
    const meta: AnalysisMeta = {
      projectPath: '/tmp/test',
      analyzersRun: [],
      analyzersSkipped: [],
      durationMs: 0,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };

    const project: ProjectInfo = {
      name: 'test',
      version: '1.0.0',
      description: null,
      license: null,
      language: 'TypeScript',
      runtime: 'Node.js',
      repository: null,
      nodeVersion: null,
    };

    const ctx: CodebaseContext = {
      project,
      dependencies: null,
      structure: null,
      typescript: null,
      api: null,
      scripts: null,
      config: null,
      git: null,
      stats: null,
      patterns: null,
      meta,
    };

    expect(ctx.meta.projectPath).toBe('/tmp/test');
    expect(ctx.dependencies).toBeNull();
    expect(ctx.structure).toBeNull();
    expect(ctx.typescript).toBeNull();
    expect(ctx.api).toBeNull();
    expect(ctx.scripts).toBeNull();
    expect(ctx.config).toBeNull();
    expect(ctx.git).toBeNull();
    expect(ctx.stats).toBeNull();
    expect(ctx.patterns).toBeNull();
  });

  it('AnalyzeOptions has all-optional fields', () => {
    const opts: AnalyzeOptions = {};
    expect(opts).toBeDefined();

    const full: AnalyzeOptions = {
      analyzers: ['project', 'dependencies'],
      exclude: ['node_modules'],
      detailLevel: 'standard',
      maxSampleFiles: 20,
      maxDepth: 3,
    };
    expect(full.detailLevel).toBe('standard');
  });

  it('DetailLevel covers expected values', () => {
    const values: DetailLevel[] = ['minimal', 'standard', 'detailed'];
    expect(values).toHaveLength(3);
    expect(values).toContain('minimal');
    expect(values).toContain('standard');
    expect(values).toContain('detailed');
  });

  it('OutputFormat covers expected values', () => {
    const values: OutputFormat[] = ['markdown', 'json', 'compact', 'custom'];
    expect(values).toHaveLength(4);
    expect(values).toContain('markdown');
    expect(values).toContain('json');
    expect(values).toContain('compact');
    expect(values).toContain('custom');
  });

  it('AnalyzerName covers expected values', () => {
    const values: AnalyzerName[] = [
      'project',
      'dependencies',
      'structure',
      'typescript',
      'api',
      'scripts',
      'config',
      'git',
      'stats',
      'patterns',
    ];
    expect(values).toHaveLength(10);
    expect(values).toContain('project');
    expect(values).toContain('patterns');
  });

  it('Analyzer interface can be implemented by a mock', async () => {
    const meta: AnalysisMeta = {
      projectPath: '/tmp/mock',
      analyzersRun: ['project'],
      analyzersSkipped: [],
      durationMs: 1,
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };

    const project: ProjectInfo = {
      name: 'mock',
      version: '0.0.1',
      description: null,
      license: null,
      language: 'JavaScript',
      runtime: 'Node.js',
      repository: null,
      nodeVersion: null,
    };

    const mockAnalyzer: Analyzer = {
      async analyze(): Promise<CodebaseContext> {
        return {
          project,
          dependencies: null,
          structure: null,
          typescript: null,
          api: null,
          scripts: null,
          config: null,
          git: null,
          stats: null,
          patterns: null,
          meta,
        };
      },
      async analyzeAndFormat(): Promise<string> {
        return 'formatted';
      },
    };

    const result = await mockAnalyzer.analyze('/tmp/mock');
    expect(result.project.name).toBe('mock');

    const formatted = await mockAnalyzer.analyzeAndFormat('/tmp/mock', 'compact');
    expect(formatted).toBe('formatted');
  });
});
