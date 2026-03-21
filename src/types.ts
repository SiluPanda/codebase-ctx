// ── String union types ────────────────────────────────────────────────────────

export type DetailLevel = 'minimal' | 'standard' | 'detailed';

export type OutputFormat = 'markdown' | 'json' | 'compact' | 'custom';

export type AnalyzerName =
  | 'project'
  | 'dependencies'
  | 'structure'
  | 'typescript'
  | 'api'
  | 'scripts'
  | 'config'
  | 'git'
  | 'stats'
  | 'patterns';

export type DependencyCategory =
  | 'framework'
  | 'database'
  | 'testing'
  | 'build'
  | 'lint'
  | 'utility'
  | 'type-definitions'
  | 'ui'
  | 'auth'
  | 'api'
  | 'observability';

// ── Project ───────────────────────────────────────────────────────────────────

export interface ProjectInfo {
  name: string | null;
  version: string | null;
  description: string | null;
  license: string | null;
  language: string;
  runtime: string;
  repository: string | null;
  nodeVersion: string | null;
}

// ── Dependencies ──────────────────────────────────────────────────────────────

export interface DependencyEntry {
  name: string;
  version: string;
  category: DependencyCategory;
}

export interface DependencyInfo {
  production: DependencyEntry[];
  dev: DependencyEntry[];
  peer: DependencyEntry[];
  optional: DependencyEntry[];
  summary: {
    totalProduction: number;
    totalDev: number;
    frameworks: string[];
    databases: string[];
    testingTools: string[];
  };
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export interface FileStat {
  path: string;
  lines: number;
}

export interface LanguageStat {
  extension: string;
  language: string;
  fileCount: number;
  lineCount: number;
  percentage: number;
}

export interface StatsInfo {
  totalFiles: number;
  totalLines: number;
  languageBreakdown: LanguageStat[];
  largestFiles: FileStat[];
  averageFileSize: number;
}

// ── Structure ─────────────────────────────────────────────────────────────────

export interface DirectoryEntry {
  path: string;
  purpose: string | null;
  fileCount: number;
}

export interface StructureInfo {
  directories: DirectoryEntry[];
  architecturePattern: {
    type: 'flat' | 'layered' | 'feature-based' | 'monorepo' | 'mvc' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
    evidence: string;
  };
  entryPoints: string[];
  keyFiles: string[];
  depth: number;
}

// ── Patterns ──────────────────────────────────────────────────────────────────

export interface DetectedPattern {
  dimension: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}

export interface PatternInfo {
  patterns: DetectedPattern[];
}

// ── TypeScript ────────────────────────────────────────────────────────────────

export interface TypeScriptInfo {
  strict: boolean;
  target: string;
  module: string;
  moduleResolution: string | null;
  paths: Record<string, string[]> | null;
  jsx: string | null;
  outDir: string | null;
  rootDir: string | null;
  declaration: boolean;
  notableFlags: string[];
}

// ── API Surface ───────────────────────────────────────────────────────────────

export interface APIEntry {
  name: string;
  kind: 'function' | 'class' | 'type' | 'interface' | 'enum' | 'const' | 'default';
  signature: string | null;
  source: string;
}

export interface APISurface {
  exports: APIEntry[];
  entryPoint: string;
  totalExports: number;
}

// ── Scripts ───────────────────────────────────────────────────────────────────

export interface ScriptEntry {
  name: string;
  command: string;
  category: 'build' | 'test' | 'lint' | 'start' | 'deploy' | 'other';
}

export interface ScriptInfo {
  scripts: ScriptEntry[];
  hasBuild: boolean;
  hasTest: boolean;
  hasLint: boolean;
  hasStart: boolean;
}

// ── Config ────────────────────────────────────────────────────────────────────

export interface ConfigEntry {
  tool: string;
  file: string;
  highlights: Record<string, string | boolean | number>;
}

export interface ConfigInfo {
  configs: ConfigEntry[];
  linter: string | null;
  formatter: string | null;
  bundler: string | null;
  testRunner: string | null;
}

// ── Git ───────────────────────────────────────────────────────────────────────

export interface GitInfo {
  initialized: boolean;
  defaultBranch: string | null;
  recentCommitCount: number;
  commitConvention: 'conventional' | 'scope-prefixed' | 'freeform' | null;
  contributors: number;
  hasGitHubActions: boolean;
  hasHusky: boolean;
}

// ── Analysis meta ─────────────────────────────────────────────────────────────

export interface AnalysisMeta {
  projectPath: string;
  analyzersRun: AnalyzerName[];
  analyzersSkipped: AnalyzerName[];
  durationMs: number;
  timestamp: string;
  version: string;
}

// ── Codebase context (top-level result) ───────────────────────────────────────

export interface CodebaseContext {
  project: ProjectInfo;
  dependencies: DependencyInfo | null;
  structure: StructureInfo | null;
  typescript: TypeScriptInfo | null;
  api: APISurface | null;
  scripts: ScriptInfo | null;
  config: ConfigInfo | null;
  git: GitInfo | null;
  stats: StatsInfo | null;
  patterns: PatternInfo | null;
  meta: AnalysisMeta;
}

// ── Options ───────────────────────────────────────────────────────────────────

export interface AnalyzeOptions {
  analyzers?: AnalyzerName[];
  exclude?: string[];
  detailLevel?: DetailLevel;
  maxSampleFiles?: number;
  maxDepth?: number;
}

export interface FormatOptions {
  detailLevel?: DetailLevel;
  formatter?: (context: CodebaseContext) => string;
  includeTokenCount?: boolean;
}

export interface AnalyzerConfig {
  analyzers?: AnalyzerName[];
  exclude?: string[];
  detailLevel?: DetailLevel;
  maxSampleFiles?: number;
  maxDepth?: number;
}

// ── Analyzer interface ────────────────────────────────────────────────────────

export interface Analyzer {
  analyze(projectPath?: string): Promise<CodebaseContext>;
  analyzeAndFormat(
    projectPath?: string,
    outputFormat?: OutputFormat,
    formatOptions?: FormatOptions,
  ): Promise<string>;
}
