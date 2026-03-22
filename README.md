# codebase-ctx

Generate AI-optimized codebase summaries via static analysis.

[![npm version](https://img.shields.io/npm/v/codebase-ctx)](https://www.npmjs.com/package/codebase-ctx)
[![npm downloads](https://img.shields.io/npm/dt/codebase-ctx.svg)](https://www.npmjs.com/package/codebase-ctx)
[![license](https://img.shields.io/npm/l/codebase-ctx)](https://github.com/SiluPanda/codebase-ctx/blob/master/LICENSE)
[![node](https://img.shields.io/node/v/codebase-ctx)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)

`codebase-ctx` is a zero-dependency static analysis tool that reads a project directory and produces structured, token-efficient context about its setup, dependencies, scripts, language, runtime, and architecture. The output is designed to be injected into AI instruction files (`CLAUDE.md`, `.cursorrules`), passed as prompt context, or consumed programmatically by other tools.

Unlike source code dumpers that concatenate entire repositories (producing hundreds of thousands of tokens), `codebase-ctx` runs a pipeline of modular analyzers that each extract a specific dimension of project context and compress the results into a structured summary. A typical output is 300--800 tokens: enough to convey what a developer learns in their first hour with a codebase, compact enough to leave the vast majority of the context window for the actual task.

All analysis is deterministic, offline, and fast (under 500ms for most projects). No LLM calls, no network requests, no API keys required.

---

## Installation

```bash
npm install codebase-ctx
```

Or install globally for CLI usage:

```bash
npm install -g codebase-ctx
```

Requires Node.js >= 18.

---

## Quick Start

```typescript
import { analyzeProject, analyzeDependencies, analyzeScripts } from 'codebase-ctx';

// Analyze project metadata
const project = analyzeProject('/path/to/project');
console.log(project);
// {
//   name: 'my-app',
//   version: '1.0.0',
//   description: 'My application',
//   license: 'MIT',
//   language: 'TypeScript',
//   runtime: 'Node.js',
//   repository: 'https://github.com/user/my-app',
//   nodeVersion: '>=18',
// }

// Analyze dependencies with automatic categorization
const deps = analyzeDependencies('/path/to/project');
console.log(deps.summary);
// {
//   totalProduction: 5,
//   totalDev: 3,
//   frameworks: ['react', 'next'],
//   databases: ['@prisma/client'],
//   testingTools: ['vitest'],
// }

// Analyze npm scripts
const scripts = analyzeScripts('/path/to/project');
console.log(scripts.hasBuild, scripts.hasTest);
// true true
```

---

## Features

- **Zero dependencies** -- all analysis uses Node.js built-ins (`node:fs`, `node:path`). No AST parsers, no tree-sitter, no external tools.
- **Modular analyzers** -- each analyzer extracts one dimension of context (project metadata, dependencies, scripts) and runs independently. Analyzers fail gracefully when their input files are missing.
- **Dependency categorization** -- a built-in registry of 190+ common npm packages automatically classifies dependencies into categories: framework, database, testing, build, lint, ui, auth, api, observability, and type-definitions.
- **Language detection** -- infers TypeScript or JavaScript from `tsconfig.json`, file extensions in `src/`, or the presence of `typescript` in dependencies.
- **Runtime detection** -- infers Node.js, Bun, Deno, or Browser from `engines` fields and framework dependencies.
- **Script categorization** -- classifies npm scripts into build, test, lint, start, deploy, and other categories by name pattern matching.
- **Token estimation** -- estimates LLM token counts for any text using `ceil(chars / 4)`.
- **Deterministic output** -- same codebase always produces the same analysis result.
- **TypeScript-first** -- full type definitions shipped with the package.

---

## API Reference

### Analyzers

#### `analyzeProject(projectPath: string): ProjectInfo`

Reads `package.json` and inspects the project directory to produce a `ProjectInfo` summary.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `projectPath` | `string` | Absolute path to the project directory |

**Returns:** `ProjectInfo`

| Field | Type | Description |
|---|---|---|
| `name` | `string \| null` | Package name from `package.json`, or directory name as fallback |
| `version` | `string \| null` | Package version |
| `description` | `string \| null` | Package description |
| `license` | `string \| null` | License identifier (e.g. `"MIT"`) |
| `language` | `string` | Detected language: `"TypeScript"`, `"JavaScript"`, or `"unknown"` |
| `runtime` | `string` | Detected runtime: `"Node.js"`, `"Bun"`, `"Deno"`, `"Browser"`, or `"unknown"` |
| `repository` | `string \| null` | Repository URL (cleaned of `git+` prefix and `.git` suffix) |
| `nodeVersion` | `string \| null` | Node.js version constraint from `engines.node` |

**Language detection** checks in order: `tsconfig.json` existence, `.ts`/`.tsx` files in `src/`, `typescript` in dependencies. Falls back to `"JavaScript"`.

**Runtime detection** checks in order: `engines.bun`, `engines.deno`, browser-only framework dependencies (React/Vue/Angular/Svelte without an SSR framework like Next/Nuxt), then defaults to `"Node.js"`.

**Fallback behavior:** When no `package.json` exists, returns the directory name as `name`, `"unknown"` as `language` and `runtime`, and `null` for all other fields.

**Example:**

```typescript
import { analyzeProject } from 'codebase-ctx';

const info = analyzeProject('/home/user/my-express-app');
// info.language === 'TypeScript'
// info.runtime === 'Node.js'
// info.repository === 'https://github.com/user/my-express-app'
```

---

#### `analyzeDependencies(projectPath: string): DependencyInfo`

Reads `package.json` and extracts all dependency sections, categorizing each dependency by its purpose using a built-in registry.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `projectPath` | `string` | Absolute path to the project directory |

**Returns:** `DependencyInfo`

| Field | Type | Description |
|---|---|---|
| `production` | `DependencyEntry[]` | Dependencies from `dependencies` |
| `dev` | `DependencyEntry[]` | Dependencies from `devDependencies` |
| `peer` | `DependencyEntry[]` | Dependencies from `peerDependencies` |
| `optional` | `DependencyEntry[]` | Dependencies from `optionalDependencies` |
| `summary` | `object` | Aggregated summary (see below) |

**`summary` fields:**

| Field | Type | Description |
|---|---|---|
| `totalProduction` | `number` | Count of production dependencies |
| `totalDev` | `number` | Count of dev dependencies |
| `frameworks` | `string[]` | Names of all framework dependencies across all sections |
| `databases` | `string[]` | Names of all database dependencies across all sections |
| `testingTools` | `string[]` | Names of all testing dependencies across all sections |

Each `DependencyEntry` has the shape:

```typescript
{
  name: string;      // Package name (e.g. "react")
  version: string;   // Version range (e.g. "^18.2.0")
  category: DependencyCategory;
}
```

**Category inference:** Known packages are mapped via a built-in registry of 190+ entries. Unrecognized packages in `dependencies` default to `"utility"`; unrecognized packages in `devDependencies` default to `"build"`. Packages matching `@types/*` are always categorized as `"type-definitions"`.

**Fallback behavior:** When `package.json` does not exist, returns empty arrays and zero counts for all fields.

**Example:**

```typescript
import { analyzeDependencies } from 'codebase-ctx';

const deps = analyzeDependencies('/home/user/my-project');

// Inspect categorized production deps
for (const dep of deps.production) {
  console.log(`${dep.name} (${dep.category}): ${dep.version}`);
}
// react (framework): ^18.2.0
// @prisma/client (database): ^5.0.0
// winston (observability): ^3.0.0

// Use the summary for quick context
console.log(deps.summary.frameworks);  // ['react']
console.log(deps.summary.databases);   // ['@prisma/client']
```

---

#### `analyzeScripts(projectPath: string): ScriptInfo`

Reads the `scripts` field from `package.json` and categorizes each script by name.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `projectPath` | `string` | Absolute path to the project directory |

**Returns:** `ScriptInfo`

| Field | Type | Description |
|---|---|---|
| `scripts` | `ScriptEntry[]` | All scripts with their names, commands, and categories |
| `hasBuild` | `boolean` | `true` if any script is categorized as `"build"` |
| `hasTest` | `boolean` | `true` if any script is categorized as `"test"` |
| `hasLint` | `boolean` | `true` if any script is categorized as `"lint"` |
| `hasStart` | `boolean` | `true` if any script is categorized as `"start"` |

Each `ScriptEntry` has the shape:

```typescript
{
  name: string;      // Script name (e.g. "build")
  command: string;   // Script command (e.g. "tsc")
  category: 'build' | 'test' | 'lint' | 'start' | 'deploy' | 'other';
}
```

**Category mapping:**

| Category | Matched script names |
|---|---|
| `build` | `build`, `compile`, `bundle`, `tsc`, `build:*` |
| `test` | `test`, `spec`, `e2e`, `coverage`, `test:*` |
| `lint` | `lint`, `check`, `format`, `prettier`, `lint:*` |
| `start` | `start`, `dev`, `serve`, `develop` |
| `deploy` | `deploy`, `release`, `publish` |
| `other` | Everything else |

Scripts prefixed with `pre` or `post` (e.g. `pretest`, `postbuild`, `prepublishOnly`) inherit the category of their base script.

**Fallback behavior:** When `package.json` has no `scripts` field or does not exist, returns an empty array and all boolean flags as `false`.

**Example:**

```typescript
import { analyzeScripts } from 'codebase-ctx';

const scripts = analyzeScripts('/home/user/my-project');

if (scripts.hasTest) {
  const testScripts = scripts.scripts.filter(s => s.category === 'test');
  for (const s of testScripts) {
    console.log(`${s.name}: ${s.command}`);
  }
}
// test: vitest run
// test:unit: vitest run src/
```

---

### Dependency Registry

#### `DEPENDENCY_REGISTRY`

A `Record<string, DependencyCategory>` mapping 190+ common npm package names to their categories. This is the lookup table used by `analyzeDependencies`.

```typescript
import { DEPENDENCY_REGISTRY } from 'codebase-ctx';

console.log(DEPENDENCY_REGISTRY['react']);      // 'framework'
console.log(DEPENDENCY_REGISTRY['prisma']);      // 'database'
console.log(DEPENDENCY_REGISTRY['vitest']);      // 'testing'
console.log(DEPENDENCY_REGISTRY['typescript']);  // 'build'
console.log(DEPENDENCY_REGISTRY['eslint']);      // 'lint'
console.log(DEPENDENCY_REGISTRY['tailwindcss']); // 'ui'
console.log(DEPENDENCY_REGISTRY['passport']);    // 'auth'
console.log(DEPENDENCY_REGISTRY['axios']);       // 'api'
console.log(DEPENDENCY_REGISTRY['winston']);     // 'observability'
```

**Categories covered:** `framework`, `database`, `testing`, `build`, `lint`, `ui`, `auth`, `api`, `observability`.

---

#### `categorize(name: string, isDevDep: boolean): DependencyCategory`

Categorizes a single package name. Checks the built-in registry first, then `@types/*` prefix, then falls back to `"utility"` for production dependencies or `"build"` for dev dependencies.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | The npm package name |
| `isDevDep` | `boolean` | Whether the package is a devDependency |

**Returns:** `DependencyCategory` -- one of `"framework"`, `"database"`, `"testing"`, `"build"`, `"lint"`, `"utility"`, `"type-definitions"`, `"ui"`, `"auth"`, `"api"`, `"observability"`.

**Example:**

```typescript
import { categorize } from 'codebase-ctx';

categorize('react', false);          // 'framework'
categorize('@types/node', true);     // 'type-definitions'
categorize('some-unknown-pkg', false); // 'utility'
categorize('some-unknown-pkg', true);  // 'build'
```

---

### File Utilities

#### `fileExists(filePath: string): boolean`

Synchronously checks whether a file exists at the given path.

```typescript
import { fileExists } from 'codebase-ctx';

if (fileExists('/path/to/tsconfig.json')) {
  // TypeScript project
}
```

---

#### `readFileContent(filePath: string): string`

Reads a file synchronously and returns its contents as a UTF-8 string. Throws if the file does not exist.

```typescript
import { readFileContent } from 'codebase-ctx';

const content = readFileContent('/path/to/package.json');
```

---

#### `readLines(filePath: string): string[]`

Reads a file and splits it into an array of lines. Throws if the file does not exist.

```typescript
import { readLines } from 'codebase-ctx';

const lines = readLines('/path/to/src/index.ts');
console.log(`${lines.length} lines`);
```

---

#### `readJsonFile<T>(filePath: string): T | null`

Reads and parses a JSON file. Returns `null` if the file does not exist or contains invalid JSON. Never throws.

**Type parameter:** `T` -- the expected shape of the parsed JSON object.

```typescript
import { readJsonFile } from 'codebase-ctx';

interface PkgJson {
  name: string;
  version: string;
}

const pkg = readJsonFile<PkgJson>('/path/to/package.json');
if (pkg) {
  console.log(pkg.name, pkg.version);
}
```

---

#### `estimateTokens(text: string): number`

Estimates the LLM token count for a string using the approximation `Math.ceil(text.length / 4)`.

Returns `0` for empty strings.

```typescript
import { estimateTokens } from 'codebase-ctx';

const tokens = estimateTokens('Hello, world!');
// 4 (ceil(13 / 4))
```

---

## Configuration

### `AnalyzeOptions`

Options accepted by the analysis pipeline:

```typescript
interface AnalyzeOptions {
  analyzers?: AnalyzerName[];   // Which analyzers to run (default: all)
  exclude?: string[];           // Directory/file patterns to exclude
  detailLevel?: DetailLevel;    // 'minimal' | 'standard' | 'detailed'
  maxSampleFiles?: number;      // Max files for pattern sampling
  maxDepth?: number;            // Max directory traversal depth
}
```

### `FormatOptions`

Options for formatting output:

```typescript
interface FormatOptions {
  detailLevel?: DetailLevel;                    // 'minimal' | 'standard' | 'detailed'
  formatter?: (context: CodebaseContext) => string;  // Custom formatter function
  includeTokenCount?: boolean;                  // Append token count to output
}
```

### `AnalyzerName`

Valid analyzer names:

`"project"` | `"dependencies"` | `"structure"` | `"typescript"` | `"api"` | `"scripts"` | `"config"` | `"git"` | `"stats"` | `"patterns"`

### `DependencyCategory`

Valid dependency categories:

`"framework"` | `"database"` | `"testing"` | `"build"` | `"lint"` | `"utility"` | `"type-definitions"` | `"ui"` | `"auth"` | `"api"` | `"observability"`

### `DetailLevel`

Controls information density in formatted output:

| Level | Target tokens | Description |
|---|---|---|
| `minimal` | 150--300 | Language, framework, architecture, entry point, build/test commands only |
| `standard` | 400--800 | All major context dimensions with summaries |
| `detailed` | 800--2,000 | Full dependency lists, complete API surface, all patterns with evidence |

### `OutputFormat`

Supported output formats:

| Format | Description |
|---|---|
| `markdown` | Structured markdown for `CLAUDE.md` / `.cursorrules` injection |
| `json` | Machine-readable JSON for programmatic consumption |
| `compact` | Minimal token count, maximum information density |
| `custom` | User-provided formatter function via `FormatOptions.formatter` |

---

## Error Handling

All analyzers follow a graceful degradation pattern:

- **Missing `package.json`**: Analyzers that depend on `package.json` return sensible defaults -- empty arrays, zero counts, `null` fields, or the directory name as a fallback project name.
- **Invalid JSON**: `readJsonFile` returns `null` when a file contains malformed JSON. Analyzers that use it handle the `null` case explicitly.
- **Missing files**: `fileExists` returns `false`; analyzers skip analysis for files that do not exist rather than throwing.
- **No matching data**: Analyzers return empty result objects (empty arrays, `false` flags) rather than throwing when the data they look for is absent.

The general contract: individual analyzers never throw. If an analyzer cannot extract data, it returns a typed fallback value. Only infrastructure-level errors (directory does not exist, permission denied) produce exceptions.

---

## Advanced Usage

### Combining Analyzers

Run multiple analyzers against the same project and assemble the results:

```typescript
import { analyzeProject, analyzeDependencies, analyzeScripts } from 'codebase-ctx';

const projectPath = '/home/user/my-app';

const project = analyzeProject(projectPath);
const deps = analyzeDependencies(projectPath);
const scripts = analyzeScripts(projectPath);

// Build a context summary for prompt injection
const summary = [
  `Project: ${project.name} v${project.version}`,
  `Language: ${project.language}, Runtime: ${project.runtime}`,
  `Frameworks: ${deps.summary.frameworks.join(', ') || 'none'}`,
  `Databases: ${deps.summary.databases.join(', ') || 'none'}`,
  `Testing: ${deps.summary.testingTools.join(', ') || 'none'}`,
  `Build: ${scripts.hasBuild ? 'yes' : 'no'}, Test: ${scripts.hasTest ? 'yes' : 'no'}`,
].join('\n');

console.log(summary);
```

### Extending the Dependency Registry

You can use `categorize` alongside your own logic to handle packages not in the built-in registry:

```typescript
import { categorize, DEPENDENCY_REGISTRY } from 'codebase-ctx';
import type { DependencyCategory } from 'codebase-ctx';

const CUSTOM_REGISTRY: Record<string, DependencyCategory> = {
  'my-internal-framework': 'framework',
  '@company/auth-sdk': 'auth',
};

function customCategorize(name: string, isDev: boolean): DependencyCategory {
  if (CUSTOM_REGISTRY[name]) return CUSTOM_REGISTRY[name];
  return categorize(name, isDev);
}
```

### Estimating Prompt Budget

Use `estimateTokens` to verify that your assembled context fits within a model's context window:

```typescript
import { estimateTokens } from 'codebase-ctx';

const context = '... assembled context string ...';
const tokens = estimateTokens(context);

const MODEL_LIMIT = 128_000;
const TASK_BUDGET = MODEL_LIMIT - tokens;
console.log(`Context: ${tokens} tokens, leaving ${TASK_BUDGET} for the task`);
```

### Implementing the Analyzer Interface

The `Analyzer` interface provides a contract for custom analyzer implementations:

```typescript
import type { Analyzer, CodebaseContext, OutputFormat, FormatOptions } from 'codebase-ctx';

const myAnalyzer: Analyzer = {
  async analyze(projectPath?: string): Promise<CodebaseContext> {
    // Run analysis and return a CodebaseContext
  },
  async analyzeAndFormat(
    projectPath?: string,
    outputFormat?: OutputFormat,
    formatOptions?: FormatOptions,
  ): Promise<string> {
    // Analyze and return formatted string
  },
};
```

---

## TypeScript

This package is written in TypeScript and ships type declarations (`dist/index.d.ts`). All public interfaces and type aliases are exported from the package root:

```typescript
import type {
  // Core result types
  CodebaseContext,
  ProjectInfo,
  DependencyInfo,
  DependencyEntry,
  ScriptInfo,
  ScriptEntry,

  // Additional analyzer result types
  StructureInfo,
  DirectoryEntry,
  TypeScriptInfo,
  APISurface,
  APIEntry,
  ConfigInfo,
  ConfigEntry,
  GitInfo,
  StatsInfo,
  FileStat,
  LanguageStat,
  PatternInfo,
  DetectedPattern,
  AnalysisMeta,

  // Option and configuration types
  AnalyzeOptions,
  FormatOptions,
  AnalyzerConfig,
  Analyzer,

  // String union types
  DetailLevel,
  OutputFormat,
  AnalyzerName,
  DependencyCategory,
} from 'codebase-ctx';
```

Compiled with `target: ES2022`, `module: commonjs`, `strict: true`.

---

## License

MIT
