# codebase-ctx -- Specification

## 1. Overview

`codebase-ctx` is a static analysis tool that generates compressed, AI-optimized summaries of a codebase's structure, dependencies, architecture, patterns, and API surface -- without calling any LLM. It reads configuration files (`package.json`, `tsconfig.json`, `.eslintrc`, `biome.json`), scans directory structure, parses export statements, analyzes import graphs, and detects coding patterns to produce a structured context dump that maximizes information density per token. The output is designed to be injected into AI instruction files (`CLAUDE.md`, `.cursorrules`), passed directly as prompt context, or consumed programmatically by other tools.

The gap this package fills is specific and well-defined. AI coding tools perform dramatically better when they understand the project they are operating in -- the language, framework, directory layout, API surface, dependency purposes, and coding patterns. Without this context, AI assistants generate code that uses wrong APIs, ignores existing utility functions, mismatches the project's async style, and contradicts established patterns. Today, developers solve this problem manually: they write `CLAUDE.md` files by hand, describing their project's architecture and conventions. This is slow, error-prone, and goes stale as the codebase evolves.

Existing tools attempt to solve adjacent problems but miss the mark for AI context generation. `repomix` and `repo-to-text` pack the entire repository into a single file -- every source file concatenated verbatim. This is the wrong approach for AI context: it is massively token-wasteful (a 50,000-line codebase produces 200,000+ tokens of raw source), unstructured (the AI must parse raw code to understand architecture), and indiscriminate (test fixtures and generated files get the same treatment as core API modules). `aider`'s repository map uses tree-sitter to build a symbol index, which is useful but framework-coupled to aider and focused on navigation rather than comprehension. Claude Code's `/init` command generates a `CLAUDE.md` by analyzing the codebase, but it requires an LLM call -- it is slow, costs money, requires API keys, and produces non-deterministic output. No existing tool performs structured, LLM-free static analysis focused specifically on generating token-efficient context for AI consumption.

`codebase-ctx` takes a fundamentally different approach. Instead of dumping raw source code, it runs a pipeline of modular analyzers -- each extracting a specific dimension of project context (metadata, dependencies, architecture, API surface, patterns, configuration) -- and compresses the results into a structured summary. A typical output is 300-800 tokens: enough to convey what a developer learns in their first hour with a codebase, compact enough to leave the vast majority of the context window for the actual task. The output is deterministic (same codebase produces the same context), fast (under 500ms for most projects), offline (no network calls), and format-flexible (markdown for instruction files, JSON for programmatic use, compact text for direct prompt injection).

`codebase-ctx` provides both a TypeScript/JavaScript API for programmatic use and a CLI for terminal use. The API returns structured `CodebaseContext` objects that can be formatted into any output representation. The CLI prints context to stdout or writes to a file, with configurable format, detail level, and analyzer selection. Both interfaces support exclude patterns, custom analyzers, and configurable output templates.

---

## 2. Goals and Non-Goals

### Goals

- Provide a function (`analyze`) that reads a project directory and returns a structured `CodebaseContext` object containing project metadata, dependencies, architecture, API surface, coding patterns, configuration, build/test commands, and file statistics -- all extracted via static analysis without running the project's code or calling any LLM.
- Run a pipeline of modular analyzers, each responsible for one dimension of context extraction (project metadata, dependencies, directory structure, TypeScript configuration, API surface, npm scripts, linter/formatter configuration, git history, file statistics, coding patterns). Analyzers are independent, configurable, and fail gracefully when their input files are missing.
- Detect project architecture automatically: flat (all files in root), layered (`src/`/`lib/`/`tests/` separation), feature-based (feature directories with co-located files), monorepo (`packages/` or `apps/` with workspaces), and MVC/MVVM patterns. Report the detected pattern with confidence and evidence.
- Extract the public API surface by finding entry points (`main`, `exports` field in `package.json`, `index.ts`/`index.js` files), parsing export statements (named exports, default exports, re-exports), and extracting function signatures, class names, type/interface definitions, and constant exports -- for both TypeScript and JavaScript.
- Detect coding patterns: async style (callbacks, promises, async/await), error handling approach (try/catch, Result types, error-first callbacks), import style (ESM vs CommonJS), component patterns (functional vs class-based), naming conventions (camelCase, snake_case, PascalCase), and module organization.
- Format the extracted context into multiple output representations: structured markdown (for `CLAUDE.md` injection), JSON (for programmatic consumption), and compact text (minimal tokens, maximum information density for direct prompt injection). Support custom output templates.
- Maximize token efficiency in all output formats. Use compact notation, omit redundant information, prioritize high-signal context (language, framework, architecture pattern) over low-signal detail (individual file names), and support configurable detail levels (minimal, standard, detailed).
- Provide a CLI (`codebase-ctx`) with format selection, detail level control, analyzer selection, exclude patterns, and output to stdout or file. Exit with conventional codes (0 for success, 1 for analysis errors, 2 for configuration errors).
- Provide a programmatic API (`analyze`, `format`, `createAnalyzer`) for embedding in other tools -- `ai-env-init` (enriching instruction file templates), `ai-rules-lint` (validating instruction file accuracy against actual codebase), prompt construction pipelines, and IDE extensions.
- Keep dependencies at zero. All analysis uses Node.js built-ins (`node:fs`, `node:path`, `node:child_process`). No AST parsers, no tree-sitter, no external CLI tools required. Export parsing uses regex-based heuristics, not full parsing, to avoid heavy dependencies while covering the vast majority of real-world export patterns.

### Non-Goals

- **Not a source code dumper.** This package does not concatenate source files or produce a full-text representation of the codebase. That is what `repomix` and `repo-to-text` do. `codebase-ctx` extracts structured metadata and summaries, not raw source. The output for a 100,000-line codebase should still be under 2,000 tokens.
- **Not an LLM-based analyzer.** This package does not call any LLM API to understand the codebase. All analysis is deterministic, regex-based, and heuristic. LLM-based analysis would be slow, expensive, non-deterministic, and require API keys. `codebase-ctx` runs offline in milliseconds.
- **Not an AST parser.** This package does not build a full abstract syntax tree of the codebase. It uses regex-based heuristics to extract export statements, function signatures, and coding patterns. This means it will miss some edge cases (re-exports through complex barrel files, dynamically constructed exports, metaprogramming patterns). The tradeoff is zero dependencies and fast execution. For projects that need full AST analysis, use tree-sitter or the TypeScript compiler API directly.
- **Not a dependency auditor.** This package reads `package.json` dependencies and infers their purposes (framework, utility, testing, build tool), but it does not audit dependency versions for vulnerabilities, check for outdated packages, or resolve the full dependency tree. Use `npm audit` or `socket` for security auditing.
- **Not an instruction file generator.** This package produces raw context data, not formatted instruction files. It does not generate `CLAUDE.md` or `.cursorrules` content. For instruction file generation, use `ai-env-init`, which can optionally consume `codebase-ctx` output to enrich its templates with deeper codebase analysis.
- **Not a documentation generator.** This package does not produce API documentation, README files, or developer guides. It extracts structural metadata for AI consumption. For documentation generation, use TypeDoc, JSDoc, or similar tools.
- **Not a linter or code quality tool.** This package observes patterns and reports them; it does not evaluate whether those patterns are good or bad. For code quality analysis, use ESLint, Biome, or SonarQube.
- **Not a multi-language polyglot analyzer.** The v1 implementation focuses on the Node.js/TypeScript/JavaScript ecosystem. It reads `package.json`, `tsconfig.json`, and parses JavaScript/TypeScript export syntax. It does not parse Python, Go, Rust, or other language source files. Language-specific analyzers for other ecosystems can be added in future versions.

---

## 3. Target Users and Use Cases

### AI Instruction File Authors

Developers maintaining `CLAUDE.md`, `.cursorrules`, or similar instruction files who need accurate, up-to-date codebase context to include in those files. Instead of manually describing the project's architecture, dependencies, and API surface, they run `codebase-ctx` and paste the output into the relevant section of their instruction file. When the codebase evolves, they re-run the tool to refresh the context.

### Prompt Engineers

Engineers constructing prompts for LLM-based code generation, review, or analysis. They need compact project context to prepend to prompts so the LLM understands the codebase before processing a task. `codebase-ctx --format compact` produces a token-efficient context block that can be injected directly into a system prompt or user message.

### Tool Authors Building on AI Context

Developers building tools that need programmatic access to codebase structure -- scaffolding generators that adapt to project architecture, IDE extensions that display project summaries, CI checks that validate instruction file accuracy against the actual codebase, or meta-tools that compare codebases structurally.

### Developers Onboarding to New Codebases

A developer joining a team or exploring an open-source project runs `codebase-ctx` to get an instant structural overview: what language, what framework, how the code is organized, what the public API looks like, what dependencies are used and why, what testing and build commands exist. This is faster than reading `README.md` (which may be stale) or browsing files manually.

### CI/CD Pipelines Validating Context Freshness

Teams that include codebase context in their instruction files want to verify that the context stays in sync with the actual codebase. A CI step runs `codebase-ctx`, compares the output against the context section in `CLAUDE.md`, and flags drift. This prevents the common problem of instruction files referencing files, APIs, or patterns that no longer exist.

---

## 4. Core Concepts

### Static Analysis

Static analysis means examining code and configuration files without executing them. `codebase-ctx` reads files, parses their structure using regular expressions and string processing, and extracts metadata. It does not run `node`, import modules, execute scripts, or call external services. This makes it safe to run on any codebase, including untrusted code, without side effects.

### Analyzer

An analyzer is a modular unit of analysis responsible for extracting one dimension of codebase context. Each analyzer reads specific files or directory structures, extracts structured information, and returns a typed result object. Analyzers are independent: the dependency analyzer does not depend on the structure analyzer, and either can run alone. Analyzers fail gracefully: if the files an analyzer needs are missing (e.g., no `tsconfig.json` for the TypeScript analyzer), it returns `null` rather than throwing.

### Analyzer Pipeline

The analyzer pipeline is the ordered execution of all enabled analyzers against a project directory. The pipeline runs each analyzer, collects results, and assembles them into a `CodebaseContext` object. Analyzers run sequentially (they are fast enough that parallelization adds complexity without meaningful speedup). The pipeline respects exclude patterns, skipping files and directories that match configured ignore globs.

### CodebaseContext

`CodebaseContext` is the central data structure: the complete result of analyzing a codebase. It contains the output of every analyzer that ran successfully. This object is the input to all formatters and the return value of the `analyze()` API function.

### Formatter

A formatter transforms a `CodebaseContext` object into a string representation in a specific output format. Built-in formatters produce markdown, JSON, and compact text. Custom formatters can be provided as functions.

### Token Efficiency

Token efficiency is the ratio of useful information to token count in the output. `codebase-ctx` is designed to maximize this ratio. A 500-token output should convey the same information a developer would learn by spending an hour browsing the codebase. Techniques include: abbreviation (using compact notation for common patterns), omission (not listing every file, instead describing the structure), prioritization (language and framework before individual file names), and compression (using tables and structured notation instead of prose).

### Detail Level

The detail level controls how much information each analyzer includes in its output. Three levels are supported:

- **minimal**: Only the highest-signal information. Language, framework, architecture pattern, entry point, build/test commands. Target: 150-300 tokens.
- **standard**: All major context dimensions. Dependencies with categories, directory structure, API surface summary, detected patterns, configuration highlights. Target: 400-800 tokens.
- **detailed**: Everything the analyzers can extract. Full dependency list with inferred purposes, complete API surface with signatures, all detected patterns with evidence, file statistics, git activity. Target: 800-2,000 tokens.

---

## 5. Analyzers

### 5.1 Project Analyzer

**What it reads**: `package.json`, `Cargo.toml`, `go.mod`, `pyproject.toml`, `.git/config`

**What it extracts**:
- **name**: Project name from the package manifest.
- **version**: Current version string.
- **description**: Project description, if present.
- **license**: License identifier (MIT, Apache-2.0, etc.).
- **language**: Primary language (TypeScript, JavaScript, etc.), inferred from the presence of `tsconfig.json`, file extensions in `src/`, or manifest type.
- **runtime**: Target runtime (Node.js, Bun, Deno, browser), inferred from `engines` field, framework, and module configuration.
- **repository**: Repository URL from the `repository` field.
- **nodeVersion**: Required Node.js version from `engines.node`.

**Output format**:
```typescript
interface ProjectInfo {
  name: string | null;
  version: string | null;
  description: string | null;
  license: string | null;
  language: string;
  runtime: string;
  repository: string | null;
  nodeVersion: string | null;
}
```

**Fallback**: If no recognized package manifest exists, the analyzer returns the directory name as `name`, `'unknown'` as `language`, and `null` for all other fields.

---

### 5.2 Dependency Analyzer

**What it reads**: `package.json` (`dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`)

**What it extracts**: A categorized list of dependencies with inferred purposes. Each dependency is classified into one of these categories:

| Category | Examples | Inference Signal |
|---|---|---|
| `framework` | react, next, express, fastify, vue, angular, svelte | Known framework package names |
| `database` | prisma, mongoose, pg, mysql2, redis, drizzle-orm, typeorm | Known database/ORM package names |
| `testing` | vitest, jest, mocha, cypress, playwright, supertest | Presence in `devDependencies` + known test package names |
| `build` | typescript, esbuild, vite, webpack, rollup, tsup | Presence in `devDependencies` + known build tool names |
| `lint` | eslint, prettier, biome, oxlint, stylelint | Presence in `devDependencies` + known lint/format package names |
| `utility` | lodash, zod, date-fns, uuid, dotenv | Everything else in `dependencies` |
| `type-definitions` | @types/* | `@types/` prefix |
| `ui` | tailwindcss, @mui/material, @chakra-ui/react, shadcn | Known UI library names |
| `auth` | passport, jsonwebtoken, next-auth, clerk | Known auth library names |
| `api` | axios, node-fetch, graphql, trpc, openapi | Known API/HTTP client names |
| `observability` | winston, pino, sentry, datadog, opentelemetry | Known logging/monitoring names |

Purpose inference uses a built-in registry of ~200 common npm packages mapped to categories. Unrecognized dependencies in `dependencies` are categorized as `utility`; unrecognized dependencies in `devDependencies` are categorized as `build` (assumed to be development tooling).

**Output format**:
```typescript
interface DependencyInfo {
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

interface DependencyEntry {
  name: string;
  version: string;
  category: DependencyCategory;
}

type DependencyCategory =
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
```

**Fallback**: If `package.json` does not exist or has no dependency fields, the analyzer returns empty arrays and zero counts.

---

### 5.3 Structure Analyzer

**What it reads**: The project's directory tree (top two levels, excluding `node_modules`, `dist`, `build`, `.git`, `coverage`, `.next`, `.turbo`, and other common generated directories).

**What it extracts**:
- **directories**: A list of top-level and second-level directories with their purpose labels.
- **architecturePattern**: The detected project architecture classification (see Section 6).
- **entryPoints**: Files identified as entry points (`src/index.ts`, `src/main.ts`, `src/app.ts`, `index.js`, as referenced by `package.json` `main` or `exports`).
- **keyFiles**: Configuration and metadata files present in the root (`tsconfig.json`, `.eslintrc.*`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, etc.).
- **depth**: Maximum meaningful directory depth (excluding `node_modules` and generated directories).

**Output format**:
```typescript
interface StructureInfo {
  directories: DirectoryEntry[];
  architecturePattern: ArchitecturePattern;
  entryPoints: string[];
  keyFiles: string[];
  depth: number;
}

interface DirectoryEntry {
  path: string;
  purpose: string | null;
  fileCount: number;
}

interface ArchitecturePattern {
  type: 'flat' | 'layered' | 'feature-based' | 'monorepo' | 'mvc' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}
```

**Fallback**: If the project directory is empty or contains only dotfiles, the analyzer returns an empty directory list and `{ type: 'flat', confidence: 'low', evidence: 'No recognized directory structure' }`.

---

### 5.4 TypeScript Analyzer

**What it reads**: `tsconfig.json` (and `tsconfig.build.json`, `tsconfig.app.json` if referenced via `extends`)

**What it extracts**:
- **strict**: Whether `strict` mode is enabled.
- **target**: Compilation target (`ES2020`, `ES2022`, `ESNext`, etc.).
- **module**: Module system (`commonjs`, `esnext`, `nodenext`, etc.).
- **moduleResolution**: Resolution strategy (`node`, `nodenext`, `bundler`).
- **paths**: Path aliases defined in `compilerOptions.paths` (e.g., `@/*` mapped to `src/*`).
- **jsx**: JSX configuration (`react-jsx`, `react`, `preserve`), indicating React or similar framework use.
- **outDir**: Output directory for compiled files.
- **rootDir**: Root source directory.
- **declaration**: Whether declaration files (`.d.ts`) are generated.
- **notableFlags**: Other significant compiler options that affect coding patterns (`esModuleInterop`, `resolveJsonModule`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).

**Output format**:
```typescript
interface TypeScriptInfo {
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
```

**Fallback**: If `tsconfig.json` does not exist, the analyzer returns `null`. The project is assumed to be JavaScript-only.

---

### 5.5 API Surface Analyzer

**What it reads**: Entry point files identified by the project analyzer and structure analyzer (`package.json` `main`, `exports`, `types` fields; `src/index.ts`, `src/index.js`, `index.ts`, `index.js`).

**What it extracts**: The public API surface of the package -- everything that consumers can import.

**Export parsing strategy**:

The analyzer uses regex-based parsing to extract export statements from entry point files. It handles these patterns:

1. **Named exports**: `export function foo(...)`, `export const bar = ...`, `export class Baz`, `export interface Qux`, `export type Quux = ...`, `export enum Corge`.
2. **Default exports**: `export default function ...`, `export default class ...`, `export default ...`.
3. **Re-exports**: `export { foo, bar } from './module'`, `export * from './module'`, `export { default as Foo } from './module'`.
4. **Type exports**: `export type { Foo, Bar } from './types'`.

For each exported symbol, the analyzer extracts:
- **name**: The exported identifier.
- **kind**: `function`, `class`, `type`, `interface`, `enum`, `const`, `default`.
- **signature**: For functions, the parameter list and return type annotation (if present). For classes, the class name only (methods are not enumerated at this level). For types/interfaces, the name only.
- **source**: The file where the export originates (for re-exports, the original source module path).

For `export * from './module'` re-exports, the analyzer follows one level of indirection: it reads the referenced module and extracts its named exports. It does not follow chains longer than one level (to avoid infinite loops and keep analysis fast).

**Output format**:
```typescript
interface APISurface {
  exports: APIEntry[];
  entryPoint: string;
  totalExports: number;
}

interface APIEntry {
  name: string;
  kind: 'function' | 'class' | 'type' | 'interface' | 'enum' | 'const' | 'default';
  signature: string | null;
  source: string;
}
```

**Fallback**: If no entry point files are found or no exports are detected, the analyzer returns an empty exports array and `totalExports: 0`.

---

### 5.6 Script Analyzer

**What it reads**: `package.json` `scripts` field.

**What it extracts**: Build, test, lint, start, and other npm scripts, categorized by purpose.

| Category | Script Name Patterns |
|---|---|
| `build` | `build`, `compile`, `bundle`, `tsc` |
| `test` | `test`, `test:*`, `spec`, `e2e`, `coverage` |
| `lint` | `lint`, `lint:*`, `check`, `format`, `prettier` |
| `start` | `start`, `dev`, `serve`, `develop` |
| `deploy` | `deploy`, `release`, `publish` |
| `other` | Everything else |

**Output format**:
```typescript
interface ScriptInfo {
  scripts: ScriptEntry[];
  hasBuild: boolean;
  hasTest: boolean;
  hasLint: boolean;
  hasStart: boolean;
}

interface ScriptEntry {
  name: string;
  command: string;
  category: 'build' | 'test' | 'lint' | 'start' | 'deploy' | 'other';
}
```

**Fallback**: If `package.json` has no `scripts` field, the analyzer returns an empty array and all flags as `false`.

---

### 5.7 Config Analyzer

**What it reads**: `.eslintrc.*`, `eslint.config.*`, `.prettierrc.*`, `biome.json`, `biome.jsonc`, `.editorconfig`, `jest.config.*`, `vitest.config.*`, `vite.config.*`, `webpack.config.*`, `tailwind.config.*`, `.env.example`

**What it extracts**: A summary of which configuration files exist and key settings that affect coding style.

For each detected config file:
- **tool**: The tool name (ESLint, Prettier, Biome, Vite, etc.).
- **file**: The config file name.
- **highlights**: Key settings extracted from the config. For ESLint: notable rules and extends. For Prettier: printWidth, tabWidth, singleQuote, semi, trailingComma. For Biome: formatter and linter settings. For Vite: plugins. For Tailwind: presence and content paths.

The analyzer reads config files as JSON when possible. For JavaScript config files (`.eslintrc.js`, `vite.config.ts`), it extracts limited information via regex (looking for string literals and object keys) rather than executing the file.

**Output format**:
```typescript
interface ConfigInfo {
  configs: ConfigEntry[];
  linter: string | null;
  formatter: string | null;
  bundler: string | null;
  testRunner: string | null;
}

interface ConfigEntry {
  tool: string;
  file: string;
  highlights: Record<string, string | boolean | number>;
}
```

**Fallback**: If no recognized configuration files exist, the analyzer returns an empty array and all tool fields as `null`.

---

### 5.8 Git Analyzer

**What it reads**: `.git/` directory (checking existence), `git log` output (last 20 commits), `git branch` output, `.gitignore`

**What it extracts**:
- **initialized**: Whether the project is a git repository.
- **defaultBranch**: The default branch name (`main`, `master`, or other).
- **recentCommitCount**: Number of commits in the last 30 days (indicator of activity level).
- **commitConvention**: Detected commit message convention from the last 20 commits (conventional commits, scope-prefixed, freeform).
- **contributors**: Number of unique commit authors in the last 20 commits.
- **hasGitHubActions**: Whether `.github/workflows/` exists.
- **hasHusky**: Whether `.husky/` exists (git hook management).

The git analyzer uses `child_process.execSync` to run `git log` and `git branch`. If `git` is not available or the directory is not a git repository, the analyzer returns a minimal result with `initialized: false`.

**Output format**:
```typescript
interface GitInfo {
  initialized: boolean;
  defaultBranch: string | null;
  recentCommitCount: number;
  commitConvention: 'conventional' | 'scope-prefixed' | 'freeform' | null;
  contributors: number;
  hasGitHubActions: boolean;
  hasHusky: boolean;
}
```

**Fallback**: If `.git/` does not exist, the analyzer returns `{ initialized: false }` with all other fields as `null`, `0`, or `false`.

---

### 5.9 Stats Analyzer

**What it reads**: All files in the project directory (excluding `node_modules`, `dist`, `build`, `.git`, `coverage`, and other generated directories).

**What it extracts**:
- **totalFiles**: Total number of source and configuration files.
- **totalLines**: Total line count across all source files.
- **languageBreakdown**: File count and line count per language/extension.
- **largestFiles**: The 5 largest source files by line count (to flag potential god files).
- **averageFileSize**: Average lines per file.

The stats analyzer uses `node:fs` to traverse the directory tree and count lines (by counting newline characters, not by parsing). It skips binary files (detected by checking for null bytes in the first 512 bytes).

**Output format**:
```typescript
interface StatsInfo {
  totalFiles: number;
  totalLines: number;
  languageBreakdown: LanguageStat[];
  largestFiles: FileStat[];
  averageFileSize: number;
}

interface LanguageStat {
  extension: string;
  language: string;
  fileCount: number;
  lineCount: number;
  percentage: number;
}

interface FileStat {
  path: string;
  lines: number;
}
```

**Fallback**: If the project directory is empty (no non-ignored files), the analyzer returns zero counts and empty arrays.

---

### 5.10 Pattern Analyzer

**What it reads**: A sample of source files (up to 20 `.ts`, `.tsx`, `.js`, `.jsx` files, selected from `src/` or the project root, prioritizing entry points and files with the most exports).

**What it extracts**: Coding patterns detected via regex-based heuristics.

| Pattern Dimension | Detection Method | Possible Values |
|---|---|---|
| **Async style** | Scan for `async function`, `.then(`, `callback(err` patterns | `async-await`, `promises`, `callbacks`, `mixed` |
| **Error handling** | Scan for `try {`, `catch (`, `.catch(`, `Result<`, `Either<` | `try-catch`, `result-types`, `error-first-callbacks`, `mixed` |
| **Import style** | Scan for `import ... from`, `require(`, `import()` | `esm`, `commonjs`, `mixed` |
| **Component style** | Scan for `function Component(`, `class Component extends`, `React.FC<` | `functional`, `class-based`, `mixed`, `none` |
| **Export style** | Scan for `export default`, `export function`, `export const`, `module.exports` | `named`, `default`, `mixed`, `commonjs` |
| **Naming convention** | Sample variable and function names, check casing | `camelCase`, `snake_case`, `PascalCase`, `mixed` |
| **Type usage** | Scan for type annotations, `as` casts, `any` usage, generics | `strict-types`, `moderate-types`, `minimal-types`, `no-types` |

Each detected pattern includes a confidence level based on the number of files that exhibit the pattern and the consistency across files. A pattern seen in 18 of 20 sampled files has `high` confidence; 10 of 20 has `medium`; fewer than 10 has `low`.

**Output format**:
```typescript
interface PatternInfo {
  patterns: DetectedPattern[];
}

interface DetectedPattern {
  dimension: string;
  value: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string;
}
```

**Fallback**: If no source files are found to sample, the analyzer returns an empty patterns array.

---

## 6. Architecture Detection

Architecture detection is performed by the structure analyzer. It classifies the project into one of several recognized architectural patterns based on directory structure heuristics.

### Flat

**Detection**: All or nearly all source files are in the project root directory. No `src/`, `lib/`, or `app/` directory exists. The project has fewer than 3 directories total (excluding `node_modules` and other ignored directories).

**Evidence string**: `"All source files in root, no src/ or lib/ directory"`

**Confidence**: `high` if fewer than 2 subdirectories, `medium` if 2-3 subdirectories with most source files in root.

**Example projects**: Small scripts, single-file CLIs, proof-of-concept projects.

### Layered

**Detection**: The project has a clear separation between source code, tests, and build artifacts. Indicators:
- `src/` directory exists and contains most source files.
- `tests/`, `test/`, `__tests__/`, or `src/__tests__/` directory exists.
- `lib/` or `dist/` directory exists (or is referenced in `package.json` `main` or `outDir`).
- Source files are organized by technical layer rather than by feature.

**Evidence string**: `"src/ + tests/ separation, output to dist/"`

**Confidence**: `high` if `src/` and a test directory exist, `medium` if only `src/` exists.

**Example projects**: Most npm packages, libraries, CLI tools.

### Feature-Based

**Detection**: The source directory contains subdirectories named after business features or domain concepts rather than technical layers. Indicators:
- `src/` contains directories like `users/`, `auth/`, `billing/`, `products/` rather than `controllers/`, `models/`, `views/`.
- Each feature directory contains mixed file types (component, hook, test, style, type co-located).
- No clear `models/`, `views/`, `controllers/` separation.

**Evidence string**: `"Feature directories: users/, auth/, billing/ with co-located files"`

**Confidence**: `high` if 3+ feature directories detected with co-located file types, `medium` if 2 feature directories.

**Example projects**: Modern React applications, domain-driven design projects.

### Monorepo

**Detection**: The project uses workspace-based multi-package structure. Indicators:
- `package.json` has a `workspaces` field.
- `pnpm-workspace.yaml` exists.
- `turbo.json` or `nx.json` exists.
- `packages/` or `apps/` directory exists with multiple subdirectories, each containing their own `package.json`.
- `lerna.json` exists.

**Evidence string**: `"Workspaces in package.json, packages/ with 5 sub-packages"`

**Confidence**: `high` if workspaces field or workspace config file exists, `medium` if only a `packages/` directory with multiple `package.json` files exists.

**Example projects**: Multi-package repositories, monorepos managed by Turborepo, Nx, or Lerna.

### MVC

**Detection**: The project has directories or file organization following the Model-View-Controller or Model-View-ViewModel pattern. Indicators:
- `models/` or `model/` directory exists.
- `views/` or `view/` directory exists.
- `controllers/` or `controller/` directory exists.
- `routes/` directory exists alongside `controllers/`.
- `middleware/` directory exists.

**Evidence string**: `"models/ + controllers/ + routes/ directories"`

**Confidence**: `high` if all three of models/views/controllers exist, `medium` if two of three exist.

**Example projects**: Express.js applications, Ruby on Rails-style Node.js apps.

### Unknown

**Detection**: No recognized pattern matches with medium or high confidence. The project has a directory structure that does not fit any of the above patterns.

**Evidence string**: `"No recognized architecture pattern detected"`

**Confidence**: `low`

---

## 7. API Surface Extraction

### Finding Entry Points

Entry points are discovered in this priority order:

1. **`package.json` `exports` field**: The modern way to define a package's public API. The analyzer reads all export paths and their resolved file paths.
   ```json
   {
     "exports": {
       ".": "./dist/index.js",
       "./utils": "./dist/utils.js"
     }
   }
   ```
   Each export path is an entry point. The analyzer reads the source equivalent (replacing `dist/` with `src/` and `.js` with `.ts` if a `tsconfig.json` exists).

2. **`package.json` `main` field**: The traditional entry point. Resolved to a source file using the same `dist/` to `src/` heuristic.

3. **`package.json` `types` or `typings` field**: Points to the TypeScript declaration entry point. Used as a fallback when `main` points to a compiled file that does not exist yet.

4. **Convention-based**: If none of the above fields exist or point to valid files, the analyzer checks for `src/index.ts`, `src/index.js`, `index.ts`, `index.js`, `src/main.ts`, `src/main.js` in that order.

### Parsing Export Statements

The analyzer reads each entry point file and extracts export statements using these regex patterns:

**Named function exports**:
```
/export\s+(async\s+)?function\s+(\w+)\s*(\([^)]*\))\s*(?::\s*([^\n{]+))?/g
```
Captures: function name, parameter list, return type annotation (if present).

**Named const/let exports**:
```
/export\s+const\s+(\w+)\s*(?::\s*([^=\n]+))?\s*=/g
```
Captures: variable name, type annotation (if present).

**Named class exports**:
```
/export\s+class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([^\n{]+))?/g
```
Captures: class name, superclass (if present), implemented interfaces (if present).

**Type and interface exports**:
```
/export\s+(?:type|interface)\s+(\w+)(?:<[^>]+>)?\s*(?:=|{|\n)/g
```
Captures: type/interface name.

**Enum exports**:
```
/export\s+(?:const\s+)?enum\s+(\w+)/g
```
Captures: enum name.

**Default exports**:
```
/export\s+default\s+(?:function|class)\s*(\w*)/g
```
Captures: name (if named default export).

**Re-exports**:
```
/export\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g
/export\s+\*\s+from\s+['"]([^'"]+)['"]/g
/export\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g
```
For `export * from` re-exports, the analyzer follows the import path one level, resolving relative paths against the current file's directory. It reads the target file and extracts its named exports. Absolute paths and bare specifiers (node_modules packages) are not followed.

### Signature Extraction

For functions, the analyzer extracts a compact signature string:

```
analyzeFn(projectPath: string, options?: AnalyzeOptions): Promise<CodebaseContext>
```

The signature is extracted directly from the source text. If TypeScript type annotations are present, they are included. If absent (JavaScript), the signature shows parameter names without types:

```
analyzeFn(projectPath, options)
```

For classes, only the class name and superclass/interfaces are captured. Method-level analysis is not performed (it would require multi-line regex parsing that is fragile and slow).

For types and interfaces, only the name is captured. The full type body is not included in the output (it would be too verbose for context purposes).

---

## 8. Output Formats

### 8.1 Markdown Format

Structured markdown with headers and sections. Designed for injection into `CLAUDE.md` or similar instruction files, or for human reading.

**Example output (standard detail level)**:

```markdown
## Codebase Context

**Project**: my-api v2.1.0
**Language**: TypeScript (strict mode, ES2022 target)
**Runtime**: Node.js >= 18
**Architecture**: Layered (src/ + tests/ separation, output to dist/)

### Dependencies
- **Framework**: express, cors
- **Database**: prisma, redis
- **Testing**: vitest, supertest
- **Build**: typescript, tsup
- **Lint**: eslint, prettier

### Structure
```
src/
  routes/        # HTTP route handlers
  services/      # Business logic
  middleware/     # Express middleware
  utils/         # Shared utilities
  types/         # TypeScript type definitions
tests/           # Vitest test files
```

### API Surface (src/index.ts)
- `createApp(config: AppConfig): Express` — fn
- `startServer(app: Express, port: number): Promise<void>` — fn
- `AppConfig` — type
- `DatabaseClient` — class

### Scripts
- build: `tsup src/index.ts`
- test: `vitest run`
- lint: `eslint src/`
- start: `node dist/index.js`

### Patterns
- Async: async/await (high confidence)
- Errors: try/catch (high confidence)
- Imports: ESM (high confidence)
- Exports: named (high confidence)
```

### 8.2 JSON Format

Machine-readable JSON containing the full `CodebaseContext` object. Designed for programmatic consumption by other tools.

**Example output** (abbreviated):

```json
{
  "project": {
    "name": "my-api",
    "version": "2.1.0",
    "language": "TypeScript",
    "runtime": "Node.js"
  },
  "dependencies": {
    "production": [
      { "name": "express", "version": "^4.18.0", "category": "framework" },
      { "name": "prisma", "version": "^5.0.0", "category": "database" }
    ],
    "dev": [
      { "name": "vitest", "version": "^1.0.0", "category": "testing" }
    ]
  },
  "structure": {
    "architecturePattern": {
      "type": "layered",
      "confidence": "high"
    },
    "directories": [
      { "path": "src/routes", "purpose": "HTTP route handlers", "fileCount": 8 }
    ]
  },
  "api": {
    "exports": [
      { "name": "createApp", "kind": "function", "signature": "(config: AppConfig): Express" }
    ]
  },
  "patterns": [
    { "dimension": "async-style", "value": "async-await", "confidence": "high" }
  ]
}
```

### 8.3 Compact Text Format

Minimal tokens, maximum information density. Designed for direct injection into LLM prompts where every token counts. Uses abbreviations, omits redundancy, and compresses structure into terse notation.

**Abbreviation conventions**:
- `fn` for function
- `dep` for dependency
- `cfg` for configuration
- `TS` for TypeScript
- `JS` for JavaScript
- `ESM` for ES Modules
- `CJS` for CommonJS

**Example output (standard detail level)**:

```
[codebase-ctx] my-api v2.1.0 | TS strict ES2022 | Node>=18 | Layered (src/tests/dist)
deps: express cors prisma redis | dev: vitest supertest typescript tsup eslint prettier
src: routes/(8) services/(5) middleware/(3) utils/(4) types/(6)
api: createApp(cfg:AppConfig):Express, startServer(app,port):Promise<void>, AppConfig(type), DatabaseClient(class)
scripts: build=tsup test=vitest lint=eslint start=node
patterns: async/await, try/catch, ESM, named-exports, camelCase
stats: 47 files, 3.2k lines, 95% TS
```

### 8.4 Custom Format

Users can provide a custom formatter function that receives the `CodebaseContext` object and returns a string.

```typescript
const output = format(context, 'custom', {
  formatter: (ctx) => {
    return `Project: ${ctx.project.name}\nLang: ${ctx.project.language}`;
  },
});
```

### Token Estimates by Format and Detail Level

| Format | Minimal | Standard | Detailed |
|---|---|---|---|
| Markdown | 150-300 | 400-800 | 800-2,000 |
| JSON | 200-400 | 600-1,200 | 1,200-3,000 |
| Compact | 80-150 | 200-400 | 400-800 |

Estimates assume a typical mid-size project (30-100 source files, 10-30 dependencies, 5-15 API exports). Token count is estimated as character count divided by 4.

---

## 9. Token Efficiency

Token efficiency is a core design constraint, not an afterthought. Every output decision is evaluated against the question: "Does this token carry information the AI does not already know?"

### Principles

**Omit the obvious.** Do not state that a TypeScript project uses `.ts` files. Do not list `node_modules/` as a directory. Do not report that `npm install` installs dependencies. The AI knows these things from training. Spend tokens on project-specific information.

**Prioritize by impact.** Language and framework identification has the highest impact on AI behavior (it determines the entire code generation style). Architecture pattern has the second-highest impact (it determines where to put new files and how to organize code). Individual file names have low impact (the AI can discover them on demand). Token budget should match impact: spend 20% of tokens on language/framework/architecture, 30% on dependencies and API surface, 30% on patterns and configuration, 20% on structure and scripts.

**Use compact notation.** Instead of:
```
The project uses the following production dependencies:
- express (version ^4.18.0) - A web framework for Node.js
- prisma (version ^5.0.0) - An ORM for database access
```
Write:
```
deps: express prisma redis | dev: vitest typescript eslint
```
The AI knows what express and prisma are. Stating their purposes wastes tokens.

**Structure for scanning.** AI models attend to structured content (tables, lists, key-value pairs) more reliably than to prose paragraphs. Use structured notation consistently.

**Configurable depth.** Not every use case needs the same detail level. A quick prompt prefix needs 100 tokens of context. A `CLAUDE.md` section needs 500. A comprehensive onboarding document needs 1,500. The detail level parameter controls this tradeoff.

### Detail Level Behavior

**Minimal**:
- Project: name, language, framework only
- Dependencies: framework and database names only (no version, no dev deps)
- Structure: architecture pattern only (no directory listing)
- API: export count only (no signatures)
- Patterns: primary async and error handling style only
- Scripts: build and test commands only
- Stats: omitted
- Git: omitted
- Config: omitted

**Standard**:
- Project: name, version, language, runtime, strict mode
- Dependencies: all production deps categorized, dev deps summarized by category
- Structure: architecture pattern + top-level directory listing with purposes
- API: all exports with names and kinds, signatures for functions
- Patterns: all detected patterns with confidence
- Scripts: all categorized scripts
- Stats: total files, total lines, primary language percentage
- Git: commit convention only
- Config: linter and formatter names

**Detailed**:
- Everything in standard, plus:
- Dependencies: full list with versions
- Structure: two-level directory listing with file counts
- API: all exports with full signatures
- Stats: language breakdown, largest files, average file size
- Git: all fields (activity, contributors, CI)
- Config: all detected configs with key settings
- TypeScript: all notable compiler flags

---

## 10. API Surface

### Installation

```bash
npm install codebase-ctx
```

### Main Export: `analyze`

The primary API function. Analyzes a project directory and returns a `CodebaseContext` object.

```typescript
import { analyze } from 'codebase-ctx';

const context = await analyze('/path/to/project');

console.log(context.project.name);         // 'my-api'
console.log(context.project.language);     // 'TypeScript'
console.log(context.structure.architecturePattern.type);  // 'layered'
console.log(context.api?.exports.length);  // 12
```

**Signature**:

```typescript
function analyze(
  projectPath?: string,
  options?: AnalyzeOptions,
): Promise<CodebaseContext>;
```

**Parameters**:
- `projectPath`: Absolute or relative path to the project directory. Defaults to `process.cwd()`.
- `options`: Configuration for the analysis run. See `AnalyzeOptions` below.

**Returns**: A `CodebaseContext` object containing the results of all enabled analyzers.

**Throws**: Only on unrecoverable errors (project path does not exist, permission denied). Analyzer-level failures are captured as `null` values in the result, not thrown.

### Export: `format`

Transforms a `CodebaseContext` object into a string representation.

```typescript
import { analyze, format } from 'codebase-ctx';

const context = await analyze('/path/to/project');

const markdown = format(context, 'markdown');
const json = format(context, 'json');
const compact = format(context, 'compact');
```

**Signature**:

```typescript
function format(
  context: CodebaseContext,
  outputFormat?: OutputFormat,
  options?: FormatOptions,
): string;
```

**Parameters**:
- `context`: The `CodebaseContext` to format.
- `outputFormat`: `'markdown'`, `'json'`, `'compact'`, or `'custom'`. Defaults to `'markdown'`.
- `options`: Formatting options (detail level, custom formatter). See `FormatOptions` below.

**Returns**: The formatted context string.

### Export: `createAnalyzer`

Factory function that creates a configured analyzer for reuse. Useful when analyzing multiple projects with the same configuration.

```typescript
import { createAnalyzer } from 'codebase-ctx';

const analyzer = createAnalyzer({
  analyzers: ['project', 'dependencies', 'structure', 'api'],
  exclude: ['**/*.test.ts', 'fixtures/'],
  detailLevel: 'standard',
});

const context1 = await analyzer.analyze('/path/to/project-a');
const context2 = await analyzer.analyze('/path/to/project-b');
```

**Signature**:

```typescript
function createAnalyzer(
  config: AnalyzerConfig,
): Analyzer;
```

### Type Definitions

```typescript
// ── Analyze Options ─────────────────────────────────────────────────

interface AnalyzeOptions {
  /**
   * Which analyzers to run. Default: all analyzers.
   * Specify a subset to speed up analysis or exclude irrelevant dimensions.
   */
  analyzers?: AnalyzerName[];

  /**
   * Glob patterns for files and directories to exclude from analysis.
   * Default: ['node_modules', 'dist', 'build', '.git', 'coverage',
   *           '.next', '.turbo', '.cache', '.output', '__pycache__'].
   */
  exclude?: string[];

  /**
   * Detail level for analyzer output.
   * Affects how much information each analyzer collects.
   * Default: 'standard'.
   */
  detailLevel?: DetailLevel;

  /**
   * Maximum number of source files to sample for pattern analysis.
   * Default: 20.
   */
  maxSampleFiles?: number;

  /**
   * Maximum directory depth to traverse for structure analysis.
   * Default: 3.
   */
  maxDepth?: number;
}

type AnalyzerName =
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

type DetailLevel = 'minimal' | 'standard' | 'detailed';

// ── Format Options ──────────────────────────────────────────────────

interface FormatOptions {
  /**
   * Detail level for output formatting.
   * Controls which fields are included and how verbose the output is.
   * Default: 'standard'.
   */
  detailLevel?: DetailLevel;

  /**
   * Custom formatter function. Required when outputFormat is 'custom'.
   */
  formatter?: (context: CodebaseContext) => string;

  /**
   * Whether to include estimated token count in the output.
   * Default: false.
   */
  includeTokenCount?: boolean;
}

type OutputFormat = 'markdown' | 'json' | 'compact' | 'custom';

// ── Analyzer Config ─────────────────────────────────────────────────

interface AnalyzerConfig {
  /** Which analyzers to enable. Default: all. */
  analyzers?: AnalyzerName[];

  /** Glob patterns to exclude. */
  exclude?: string[];

  /** Detail level. Default: 'standard'. */
  detailLevel?: DetailLevel;

  /** Max files to sample for patterns. Default: 20. */
  maxSampleFiles?: number;

  /** Max directory depth. Default: 3. */
  maxDepth?: number;
}

interface Analyzer {
  /** Analyze a project directory. */
  analyze(projectPath?: string): Promise<CodebaseContext>;

  /** Analyze and format in one call. */
  analyzeAndFormat(
    projectPath?: string,
    outputFormat?: OutputFormat,
    formatOptions?: FormatOptions,
  ): Promise<string>;
}

// ── CodebaseContext ─────────────────────────────────────────────────

interface CodebaseContext {
  /** Project metadata. Null if project analyzer was not run or failed. */
  project: ProjectInfo;

  /** Dependency information. Null if dependency analyzer was not run or no package.json. */
  dependencies: DependencyInfo | null;

  /** Directory structure and architecture. Null if structure analyzer was not run. */
  structure: StructureInfo | null;

  /** TypeScript configuration. Null if no tsconfig.json or analyzer not run. */
  typescript: TypeScriptInfo | null;

  /** Public API surface. Null if no entry points found or analyzer not run. */
  api: APISurface | null;

  /** npm scripts. Null if no package.json scripts or analyzer not run. */
  scripts: ScriptInfo | null;

  /** Configuration file summary. Null if no config files found or analyzer not run. */
  config: ConfigInfo | null;

  /** Git repository information. Null if not a git repo or analyzer not run. */
  git: GitInfo | null;

  /** File statistics. Null if stats analyzer was not run. */
  stats: StatsInfo | null;

  /** Detected coding patterns. Null if pattern analyzer was not run. */
  patterns: PatternInfo | null;

  /** Metadata about the analysis run itself. */
  meta: AnalysisMeta;
}

interface AnalysisMeta {
  /** Absolute path of the analyzed project directory. */
  projectPath: string;

  /** Which analyzers were run. */
  analyzersRun: AnalyzerName[];

  /** Which analyzers returned null (input files missing). */
  analyzersSkipped: AnalyzerName[];

  /** Total analysis duration in milliseconds. */
  durationMs: number;

  /** ISO 8601 timestamp of the analysis. */
  timestamp: string;

  /** codebase-ctx version that produced this context. */
  version: string;
}
```

### Example: Analyze and Format

```typescript
import { analyze, format } from 'codebase-ctx';

const context = await analyze('/path/to/project', {
  analyzers: ['project', 'dependencies', 'structure', 'api', 'patterns'],
  detailLevel: 'standard',
});

// Markdown for CLAUDE.md injection
const markdown = format(context, 'markdown', { detailLevel: 'standard' });

// Compact for prompt injection
const compact = format(context, 'compact', { detailLevel: 'minimal' });

// JSON for programmatic use
const json = format(context, 'json', { detailLevel: 'detailed' });
```

### Example: Reusable Analyzer

```typescript
import { createAnalyzer } from 'codebase-ctx';

const analyzer = createAnalyzer({
  analyzers: ['project', 'dependencies', 'structure'],
  detailLevel: 'minimal',
  exclude: ['fixtures/', '**/*.test.ts'],
});

// Analyze multiple projects
const projects = ['/path/to/project-a', '/path/to/project-b', '/path/to/project-c'];

for (const projectPath of projects) {
  const summary = await analyzer.analyzeAndFormat(projectPath, 'compact');
  console.log(`${projectPath}: ${summary}`);
}
```

### Example: Generating CLAUDE.md Context Section

```typescript
import { analyze, format } from 'codebase-ctx';
import { readFileSync, writeFileSync } from 'node:fs';

const context = await analyze('.');
const contextSection = format(context, 'markdown', { detailLevel: 'standard' });

const claudeMd = readFileSync('CLAUDE.md', 'utf-8');
const marker = '<!-- codebase-ctx:start -->';
const endMarker = '<!-- codebase-ctx:end -->';

const startIdx = claudeMd.indexOf(marker);
const endIdx = claudeMd.indexOf(endMarker);

if (startIdx !== -1 && endIdx !== -1) {
  const updated =
    claudeMd.substring(0, startIdx + marker.length) +
    '\n' + contextSection + '\n' +
    claudeMd.substring(endIdx);
  writeFileSync('CLAUDE.md', updated);
}
```

---

## 11. CLI Interface

### Installation and Invocation

```bash
# npx (no install)
npx codebase-ctx

# Global install
npm install -g codebase-ctx
codebase-ctx

# Package script
# package.json: { "scripts": { "ctx": "codebase-ctx" } }
npm run ctx
```

### CLI Binary Name

`codebase-ctx`

### Commands and Flags

The CLI has no subcommands. It analyzes the current (or specified) directory and outputs the formatted context.

```
codebase-ctx [project-path] [options]

Arguments:
  project-path              Project directory to analyze.
                            Default: current directory.

Output options:
  --format <format>         Output format. Values: markdown, json, compact.
                            Default: markdown.
  --detail <level>          Detail level. Values: minimal, standard, detailed.
                            Default: standard.
  --output, -o <path>       Write output to a file instead of stdout.
  --tokens                  Include estimated token count in the output.

Analyzer options:
  --analyzers <list>        Comma-separated list of analyzers to run.
                            Values: project, dependencies, structure, typescript,
                            api, scripts, config, git, stats, patterns.
                            Default: all.
  --exclude <patterns>      Comma-separated glob patterns to exclude.
                            Added to the default exclusion list.
  --max-depth <n>           Maximum directory depth for structure analysis.
                            Default: 3.
  --max-sample <n>          Maximum source files to sample for pattern analysis.
                            Default: 20.

Meta:
  --version                 Print version and exit.
  --help                    Print help and exit.
```

### Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success. Analysis completed and output was produced. |
| `1` | Analysis error. The project path does not exist, is not readable, or all analyzers failed. |
| `2` | Configuration error. Invalid flags, unknown analyzer name, or invalid format. |

### CLI Output Examples

**Default (markdown, standard)**:

```
$ codebase-ctx

## Codebase Context

**Project**: my-api v2.1.0
**Language**: TypeScript (strict mode, ES2022 target)
**Runtime**: Node.js >= 18
**Architecture**: Layered (src/ + tests/ separation, output to dist/)

### Dependencies
- **Framework**: express, cors
- **Database**: prisma, redis
...
```

**Compact, minimal**:

```
$ codebase-ctx --format compact --detail minimal

[codebase-ctx] my-api v2.1.0 | TS strict | Node>=18 | Layered
deps: express prisma redis
scripts: build=tsup test=vitest
```

**JSON, detailed**:

```
$ codebase-ctx --format json --detail detailed

{
  "project": { "name": "my-api", "version": "2.1.0", ... },
  "dependencies": { ... },
  ...
}
```

**Write to file**:

```
$ codebase-ctx --format markdown --detail standard -o .context.md
Context written to .context.md (743 tokens)
```

**Selective analyzers**:

```
$ codebase-ctx --analyzers project,dependencies,structure --format compact

[codebase-ctx] my-api v2.1.0 | TS strict | Node>=18 | Layered
deps: express prisma redis | dev: vitest typescript eslint
src: routes/(8) services/(5) middleware/(3)
```

### Environment Variables

| Environment Variable | Equivalent Flag |
|---------------------|-----------------|
| `CODEBASE_CTX_FORMAT` | `--format` |
| `CODEBASE_CTX_DETAIL` | `--detail` |
| `CODEBASE_CTX_ANALYZERS` | `--analyzers` (comma-separated) |
| `CODEBASE_CTX_EXCLUDE` | `--exclude` (comma-separated) |
| `CODEBASE_CTX_OUTPUT` | `--output` |

---

## 12. Configuration

### Programmatic Configuration

All configuration is passed via the `AnalyzeOptions` and `FormatOptions` objects. There is no config file format for the programmatic API. See Section 10 for the full type definitions.

### Configuration File

`codebase-ctx` optionally reads a configuration file from the project directory:

1. `codebase-ctx.json`
2. `.codebase-ctx.json`
3. `codebase-ctx` key in `package.json`

**Configuration file format**:

```json
{
  "analyzers": ["project", "dependencies", "structure", "api", "patterns"],
  "exclude": ["fixtures/", "**/*.generated.ts"],
  "detailLevel": "standard",
  "format": "markdown",
  "maxDepth": 3,
  "maxSampleFiles": 20
}
```

CLI flags override configuration file values. Configuration file values override defaults.

### Default Values

| Option | Default | Description |
|--------|---------|-------------|
| `analyzers` | All 10 analyzers | Which analyzers to run. |
| `exclude` | `['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.turbo', '.cache', '.output', '__pycache__']` | Glob patterns to exclude. |
| `detailLevel` | `'standard'` | Analysis and formatting detail level. |
| `format` | `'markdown'` | Output format. |
| `maxDepth` | `3` | Max directory traversal depth. |
| `maxSampleFiles` | `20` | Max files to sample for pattern analysis. |

---

## 13. Integration

### Integration with ai-env-init

`ai-env-init` can optionally use `codebase-ctx` to enrich its template context with deeper codebase analysis. When `codebase-ctx` is installed, `ai-env-init`'s detection step can call `analyze()` and merge the resulting `CodebaseContext` into the template rendering context. This produces richer instruction files with more specific architecture descriptions, dependency categorizations, and coding pattern documentation.

```typescript
// Inside ai-env-init's detection pipeline
import { analyze } from 'codebase-ctx';

const ctx = await analyze(projectPath, {
  analyzers: ['project', 'dependencies', 'structure', 'patterns'],
  detailLevel: 'standard',
});

// Merge into template context
templateContext.architecture = ctx.structure?.architecturePattern;
templateContext.dependencyCategories = ctx.dependencies?.summary;
templateContext.codingPatterns = ctx.patterns?.patterns;
```

If `codebase-ctx` is not installed, `ai-env-init` falls back to its built-in detection (which is simpler but sufficient).

### Integration with ai-rules-lint

`ai-rules-lint`'s `stale-reference` rule can use `codebase-ctx` to validate that file paths, function names, and API references mentioned in instruction files actually exist in the codebase. Instead of performing its own file-system scanning, the rule can query the `CodebaseContext` for known entry points, exported symbols, and directory structure.

```typescript
// Inside ai-rules-lint's stale-reference rule
import { analyze } from 'codebase-ctx';

const ctx = await analyze(projectRoot, {
  analyzers: ['structure', 'api'],
  detailLevel: 'minimal',
});

const knownPaths = ctx.structure?.directories.map(d => d.path) ?? [];
const knownExports = ctx.api?.exports.map(e => e.name) ?? [];

// Validate references against known paths and exports
```

### Integration with prompt-inherit

`prompt-inherit` manages hierarchical prompt context (workspace-level, project-level, file-level). `codebase-ctx` can provide the project-level context layer automatically, ensuring that every prompt in the hierarchy includes accurate, up-to-date codebase structural information.

### npm Script Integration

```json
{
  "scripts": {
    "ctx": "codebase-ctx",
    "ctx:compact": "codebase-ctx --format compact --detail minimal",
    "ctx:update": "codebase-ctx --format markdown --detail standard -o .context.md"
  }
}
```

### CI Integration: Context Drift Detection

```yaml
name: Check Context Freshness
on: [push]

jobs:
  context-drift:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Generate current context
        run: npx codebase-ctx --format markdown --detail standard -o .context-current.md

      - name: Compare with committed context
        run: |
          if ! diff -q .context.md .context-current.md > /dev/null 2>&1; then
            echo "::warning::Codebase context is out of date. Run 'npx codebase-ctx -o .context.md' to refresh."
          fi
```

---

## 14. Testing Strategy

### Unit Tests

Unit tests verify each analyzer in isolation using fixture project directories.

- **Project analyzer tests**: Test with fixture directories containing `package.json` with various fields (name, version, description, license, engines, repository). Test with no `package.json`. Test with `package.json` containing only a name. Test language detection from `tsconfig.json` presence.
- **Dependency analyzer tests**: Test with `package.json` containing dependencies across all categories (framework, database, testing, build, lint, utility, type-definitions, ui, auth, api, observability). Test category inference for known packages. Test with empty dependencies. Test with only devDependencies.
- **Structure analyzer tests**: Test with fixture directories representing each architecture pattern (flat, layered, feature-based, monorepo, MVC). Verify correct pattern detection and confidence. Test with empty directories. Test exclusion of `node_modules` and other ignored directories.
- **TypeScript analyzer tests**: Test with various `tsconfig.json` configurations (strict mode on/off, different targets, path aliases, JSX config). Test with `tsconfig.json` that extends another config. Test with no `tsconfig.json`.
- **API surface analyzer tests**: Test with entry point files containing all supported export patterns (named functions, classes, types, interfaces, enums, default exports, re-exports, `export *`). Test signature extraction for functions with and without type annotations. Test with JavaScript files (no types). Test with barrel files that re-export from multiple modules. Test with empty entry point.
- **Script analyzer tests**: Test with `package.json` containing scripts in all categories (build, test, lint, start, deploy, other). Test script category inference. Test with no scripts.
- **Config analyzer tests**: Test with fixture directories containing each supported config file (`.eslintrc.json`, `.prettierrc`, `biome.json`, `vitest.config.ts`, etc.). Test key setting extraction. Test with JavaScript config files (regex-based extraction).
- **Git analyzer tests**: These tests require creating temporary git repositories with known commit histories. Test commit convention detection. Test contributor counting. Test with a non-git directory.
- **Stats analyzer tests**: Test line counting accuracy. Test language breakdown calculation. Test binary file detection and exclusion. Test with deeply nested directories.
- **Pattern analyzer tests**: Test each pattern dimension (async, error handling, import style, component style, export style, naming, type usage) with source files that clearly exhibit each pattern. Test mixed patterns. Test confidence calculation.

### Formatter Tests

- **Markdown formatter tests**: Verify output structure (headers, sections, code blocks). Test each detail level. Test with null analyzer results (sections should be omitted, not produce errors). Verify token estimates.
- **JSON formatter tests**: Verify output is valid JSON. Verify round-trip (parse output and compare with input context). Test each detail level.
- **Compact formatter tests**: Verify abbreviation usage. Verify token efficiency (compact output should be significantly smaller than markdown). Test each detail level.

### Integration Tests

- **Full pipeline tests**: Create temporary project directories with realistic file structures, run `analyze()`, and verify the complete `CodebaseContext`. Test projects:
  - TypeScript + Express API with layered architecture.
  - React + Next.js app with feature-based architecture.
  - Monorepo with multiple packages.
  - Plain JavaScript project with no configuration.
  - Empty directory.
- **CLI end-to-end tests**: Run the CLI binary against fixture directories and verify stdout output, exit codes, and file output (`-o` flag). Test each format and detail level combination. Test error cases (non-existent path, invalid flags).
- **Analyze-and-format roundtrip tests**: Run `analyze()` then `format()` for each format/detail combination. Verify the output is non-empty and well-formed.

### Edge Cases to Test

- Project with no `package.json` (non-Node.js project or bare directory).
- `package.json` with invalid JSON.
- `tsconfig.json` with circular `extends` references.
- Entry point file that does not exist (referenced in `package.json` `main` but missing).
- `export * from './module'` where the referenced module does not exist.
- Source files with syntax errors (the regex-based parser should not crash).
- Extremely large files (100,000+ lines) -- stats analyzer should not run out of memory.
- Deeply nested directory structures (50+ levels) with `maxDepth` set to 3.
- Symlinks in the directory tree (should be followed or handled gracefully).
- Binary files mixed with source files (should be detected and skipped).
- Empty source files (0 bytes).
- Source files with non-UTF-8 encoding.
- `package.json` with `exports` field using complex conditional exports (node vs browser, import vs require).

### Test Framework

Tests use Vitest, matching the project's existing configuration. Fixture directories are created as temporary directories using `node:fs/promises.mkdtemp` and cleaned up after each test.

---

## 15. Performance

### Analysis Speed

Each analyzer reads a small, fixed set of files. The total number of file reads for a full analysis run is bounded:

- **Project analyzer**: 1-4 file reads (`package.json`, `tsconfig.json`, `.git/config`).
- **Dependency analyzer**: 1 file read (`package.json`).
- **Structure analyzer**: Directory listing of top 2-3 levels. For a project with 100 directories, this is ~100 `readdirSync` calls.
- **TypeScript analyzer**: 1-2 file reads (`tsconfig.json`, extended config).
- **API surface analyzer**: 1-10 file reads (entry points + one level of re-export resolution).
- **Script analyzer**: 1 file read (`package.json`, already read by project analyzer -- cached).
- **Config analyzer**: 5-15 file existence checks + reads for detected configs.
- **Git analyzer**: 2-3 `execSync` calls (`git log`, `git branch`).
- **Stats analyzer**: Full directory traversal -- this is the most expensive analyzer. For a project with 1,000 files, this takes 50-200ms.
- **Pattern analyzer**: 20 file reads (sampled source files).

**Target performance**:
- Small project (< 50 files): under 100ms total.
- Medium project (50-500 files): under 300ms total.
- Large project (500-5,000 files): under 500ms total.
- Very large project (5,000+ files): under 2 seconds total (dominated by stats analyzer directory traversal).

For very large projects, disabling the `stats` analyzer (which requires traversing every file) brings analysis time under 500ms regardless of project size.

### Memory

Memory usage is proportional to the number of files counted (stats analyzer) and the number of export symbols extracted (API analyzer). For a project with 5,000 files and 200 exports, peak memory usage is under 20 MB above baseline Node.js process memory.

### Caching

v1 does not implement caching. Each `analyze()` call reads files from disk. For projects that need repeated analysis (watch mode, CI), the caller can cache the `CodebaseContext` object and invalidate on file changes. Caching may be added in a future version with file-hash-based invalidation.

### File System Access

All file reads are synchronous (`readFileSync`, `readdirSync`, `existsSync`). This simplifies the implementation and is fast enough for the bounded number of reads performed. The stats analyzer uses synchronous traversal to avoid the complexity of async directory walking. For the file counts involved (thousands, not millions), synchronous I/O adds negligible overhead compared to the process startup cost.

---

## 16. Dependencies

### Runtime Dependencies

None. `codebase-ctx` has zero runtime dependencies.

All functionality is implemented using Node.js built-ins:

- **`node:fs`**: File reading, directory listing, existence checks.
- **`node:path`**: Path resolution, joining, and manipulation.
- **`node:child_process`**: Running `git log` and `git branch` for the git analyzer.
- **`node:util`**: `parseArgs` for CLI argument parsing (Node.js 18+).

### Why Zero Dependencies

- **No AST parser**: Export parsing uses regex-based heuristics. This sacrifices coverage of exotic export patterns for zero-dependency simplicity. The regex approach handles the vast majority (estimated 95%+) of real-world TypeScript/JavaScript export patterns. For the remaining 5%, the analyzer fails gracefully (omits unrecognized exports, does not crash).
- **No glob library**: File exclusion uses simple string prefix matching and extension checks rather than full glob pattern matching. `node_modules` and `dist` are excluded by checking `path.includes('node_modules')`, not by evaluating a glob. For the fixed, well-known set of directories that need excluding, this is sufficient and avoids depending on `minimatch` or `micromatch`.
- **No chalk/colors**: Terminal coloring uses ANSI escape codes directly. Color is used only in CLI output, not in the library API.
- **No CLI framework**: Argument parsing uses `node:util.parseArgs` (available since Node.js 18).
- **No JSON schema validator**: Configuration files are validated with simple property checks, not JSON Schema.

### Dev Dependencies

| Dependency | Purpose |
|---|---|
| `typescript` | TypeScript compiler. |
| `vitest` | Test runner. |
| `eslint` | Linter. |

---

## 17. File Structure

```
codebase-ctx/
├── package.json
├── tsconfig.json
├── SPEC.md
├── README.md
├── src/
│   ├── index.ts                      # Public API exports: analyze, format,
│   │                                 #   createAnalyzer, types
│   ├── cli.ts                        # CLI entry point: argument parsing,
│   │                                 #   output formatting, exit codes
│   ├── types.ts                      # All TypeScript type definitions
│   ├── analyze.ts                    # Core analyze() function: runs analyzer
│   │                                 #   pipeline, assembles CodebaseContext
│   ├── analyzers/
│   │   ├── index.ts                  # Analyzer registry and pipeline runner
│   │   ├── project.ts                # Project metadata analyzer
│   │   ├── dependencies.ts           # Dependency categorization analyzer
│   │   ├── structure.ts              # Directory structure and architecture
│   │   │                             #   detection analyzer
│   │   ├── typescript.ts             # TypeScript configuration analyzer
│   │   ├── api-surface.ts            # Public API export extraction analyzer
│   │   ├── scripts.ts                # npm scripts analyzer
│   │   ├── config.ts                 # Configuration file summary analyzer
│   │   ├── git.ts                    # Git repository information analyzer
│   │   ├── stats.ts                  # File statistics analyzer
│   │   └── patterns.ts               # Coding pattern detection analyzer
│   ├── formatters/
│   │   ├── index.ts                  # Formatter registry and dispatch
│   │   ├── markdown.ts               # Markdown output formatter
│   │   ├── json.ts                   # JSON output formatter
│   │   └── compact.ts                # Compact text output formatter
│   ├── registries/
│   │   ├── dependencies.ts           # Known dependency → category mapping
│   │   │                             #   (~200 common npm packages)
│   │   └── directories.ts            # Known directory → purpose mapping
│   └── utils/
│       ├── file.ts                   # File reading helpers (readJsonFile,
│       │                             #   fileExists, readLines)
│       ├── token-estimate.ts         # Token count estimation (characters / 4)
│       └── patterns.ts               # Regex patterns for export parsing
├── src/__tests__/
│   ├── analyzers/
│   │   ├── project.test.ts
│   │   ├── dependencies.test.ts
│   │   ├── structure.test.ts
│   │   ├── typescript.test.ts
│   │   ├── api-surface.test.ts
│   │   ├── scripts.test.ts
│   │   ├── config.test.ts
│   │   ├── git.test.ts
│   │   ├── stats.test.ts
│   │   └── patterns.test.ts
│   ├── formatters/
│   │   ├── markdown.test.ts
│   │   ├── json.test.ts
│   │   └── compact.test.ts
│   ├── analyze.test.ts               # Full pipeline integration tests
│   ├── cli.test.ts                   # CLI end-to-end tests
│   └── fixtures/
│       ├── typescript-express/        # Fixture: TS + Express layered project
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   └── src/
│       ├── react-nextjs/              # Fixture: React + Next.js app
│       │   ├── package.json
│       │   ├── tsconfig.json
│       │   └── app/
│       ├── monorepo/                  # Fixture: monorepo with workspaces
│       │   ├── package.json
│       │   ├── turbo.json
│       │   └── packages/
│       ├── javascript-flat/           # Fixture: plain JS, flat structure
│       │   ├── package.json
│       │   └── index.js
│       ├── empty-project/             # Fixture: empty directory
│       └── exports/                   # Fixture: various export patterns
│           ├── named-exports.ts
│           ├── default-export.ts
│           ├── re-exports.ts
│           ├── barrel.ts
│           └── mixed.js
└── dist/                              # Compiled output (gitignored)
```

---

## 18. Implementation Roadmap

### Phase 1: Core Analyzers and Markdown Output (v0.1.0)

Implement the foundational analyzers and the primary output format.

**Deliverables**:
- Project analyzer: name, version, description, language, runtime.
- Dependency analyzer: categorized dependency list with purpose inference.
- Structure analyzer: directory tree + architecture pattern detection (flat, layered, monorepo).
- Script analyzer: npm scripts categorized by purpose.
- `analyze()` API function.
- Markdown formatter with standard detail level.
- `format()` API function.
- CLI with `--format`, `--detail`, `--output` flags.
- Unit tests for all four analyzers.
- Integration test with TypeScript/Express fixture.

### Phase 2: API Surface and TypeScript Analysis (v0.2.0)

Add the analyzers that provide the highest-value context for AI tools.

**Deliverables**:
- TypeScript analyzer: tsconfig.json parsing, strict mode, paths, target, module.
- API surface analyzer: export parsing from entry points, signature extraction, re-export following.
- Pattern analyzer: async style, error handling, import style, export style, naming convention.
- Config analyzer: ESLint, Prettier, Biome, Vite, Tailwind detection and key setting extraction.
- Compact text formatter.
- JSON formatter.
- All three detail levels (minimal, standard, detailed) for all formatters.
- `createAnalyzer()` factory function.
- Unit tests for all new analyzers.
- Integration tests with React/Next.js and monorepo fixtures.

### Phase 3: Git, Stats, and Polish (v0.3.0)

Add remaining analyzers, refine output quality, and add configuration file support.

**Deliverables**:
- Git analyzer: commit history, convention detection, contributor count, CI detection.
- Stats analyzer: file counts, line counts, language breakdown, largest files.
- Architecture detection for feature-based and MVC patterns.
- Configuration file support (`codebase-ctx.json`).
- Environment variable configuration.
- `--analyzers` and `--exclude` CLI flags.
- Token count estimation and `--tokens` flag.
- CLI end-to-end tests.
- Edge case tests (binary files, empty directories, invalid JSON, circular configs).

### Phase 4: Ecosystem Integration and v1.0 (v1.0.0)

Stabilize the API, document integrations, and prepare for broad adoption.

**Deliverables**:
- API stability guarantee (semver major version).
- Complete README with usage examples, output samples, and integration guide.
- Published npm package with TypeScript declarations.
- Documented integration with `ai-env-init`, `ai-rules-lint`, and `prompt-inherit`.
- Performance benchmarks for small, medium, and large projects.
- Custom formatter API documentation.
- Example scripts for CI context drift detection.

---

## 19. Example Use Cases

### 19.1 Generating a CLAUDE.md Context Section

A developer has a `CLAUDE.md` file and wants to add an accurate, auto-generated codebase context section. They add marker comments to their `CLAUDE.md` and run `codebase-ctx` to populate the section.

```bash
$ codebase-ctx --format markdown --detail standard

## Codebase Context

**Project**: payment-service v3.2.1
**Language**: TypeScript (strict mode, ES2022 target)
**Runtime**: Node.js >= 20
**Architecture**: Layered (src/ + tests/ separation, output to dist/)

### Dependencies
- **Framework**: fastify, @fastify/cors, @fastify/swagger
- **Database**: prisma, redis
- **Auth**: jsonwebtoken, bcrypt
- **Utility**: zod, date-fns, uuid
- **Testing**: vitest, supertest
- **Build**: typescript, tsup

### Structure
src/
  routes/        # Fastify route handlers (12 files)
  services/      # Business logic layer (8 files)
  middleware/     # Auth, logging, error middleware (4 files)
  schemas/       # Zod validation schemas (6 files)
  types/         # TypeScript type definitions (5 files)
  utils/         # Shared utilities (3 files)

### API Surface (src/index.ts)
- `createApp(config: AppConfig): FastifyInstance` — fn
- `AppConfig` — type
- `PaymentService` — class
- `TransactionSchema` — const

### Patterns
- Async: async/await (high)
- Errors: try/catch (high)
- Imports: ESM (high)
- Exports: named (high)
- Naming: camelCase (high)
- Types: strict (high)
```

The developer copies this into the `## Codebase Context` section of their `CLAUDE.md`. When the codebase changes, they re-run the command to refresh.

### 19.2 Prompt Injection for One-Shot Code Generation

A prompt engineer building a code generation pipeline needs compact project context to prepend to each prompt.

```typescript
import { analyze, format } from 'codebase-ctx';

const context = await analyze('/path/to/project', {
  analyzers: ['project', 'dependencies', 'structure', 'api', 'patterns'],
  detailLevel: 'minimal',
});

const compactCtx = format(context, 'compact', { detailLevel: 'minimal' });

const prompt = `${compactCtx}

Given the above project context, implement a new route handler for POST /api/payments
that validates the request body using Zod, calls PaymentService.processPayment(),
and returns a 201 response with the transaction ID.`;
```

The compact context adds ~100 tokens of project-specific information, enabling the LLM to generate code that matches the project's framework (Fastify, not Express), validation library (Zod, not Joi), naming convention (camelCase), and architecture (route handler in `src/routes/`, using service layer).

### 19.3 Onboarding Context for New Developers

A developer joins a team and wants a quick structural overview of the codebase before diving in.

```bash
$ codebase-ctx --format markdown --detail detailed

# Detailed output with full dependency list, complete API surface,
# all detected patterns with evidence, file statistics, git activity,
# and configuration details.
```

The detailed output serves as a machine-generated orientation document, faster than reading the README (which may be stale) and more structured than browsing files manually.

### 19.4 CI Validation of Instruction File Accuracy

A CI pipeline verifies that the codebase context in `CLAUDE.md` matches the actual codebase.

```yaml
- name: Check context freshness
  run: |
    npx codebase-ctx --format markdown --detail standard -o .context-current.md
    # Extract the context section from CLAUDE.md and compare
    # Flag drift as a CI warning
```

### 19.5 Comparing Two Codebases Structurally

A developer evaluating two libraries for adoption wants a side-by-side structural comparison.

```bash
$ codebase-ctx /path/to/library-a --format json -o ctx-a.json
$ codebase-ctx /path/to/library-b --format json -o ctx-b.json

# Programmatically compare: dependency counts, API surface size,
# architecture patterns, TypeScript strictness, test coverage.
```

### 19.6 Enriching ai-env-init Templates

An `ai-env-init` integration uses `codebase-ctx` to generate richer instruction files.

```typescript
import { analyze, format } from 'codebase-ctx';
import { init } from 'ai-env-init';

const ctx = await analyze('/path/to/project', {
  analyzers: ['project', 'dependencies', 'structure', 'patterns'],
  detailLevel: 'standard',
});

const contextSection = format(ctx, 'markdown', { detailLevel: 'standard' });

await init({
  projectPath: '/path/to/project',
  nonInteractive: true,
  answers: {
    project: {
      description: ctx.project.description ?? 'A project',
      language: ctx.project.language,
      framework: ctx.dependencies?.summary.frameworks[0] ?? null,
    },
  },
  // Inject codebase context into the template rendering
  templates: {
    claude: `# {{project.name}}\n\n${contextSection}\n\n## Workflow\n...`,
  },
});
```
