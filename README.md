# codebase-ctx

Generate AI-optimized codebase summaries via static analysis.

`codebase-ctx` analyzes a project directory and produces structured context about its setup, dependencies, language, runtime, and more -- designed to feed into LLM prompts.

## Installation

```bash
npm install codebase-ctx
```

## Quick Start

```typescript
import { analyzeProject } from 'codebase-ctx';

const info = analyzeProject('/path/to/project');
console.log(info);
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
```

## Available Exports

### Types

All TypeScript interfaces and type aliases are exported:

```typescript
import type {
  ProjectInfo,
  CodebaseContext,
  AnalyzeOptions,
  DetailLevel,
  OutputFormat,
  AnalyzerName,
  // ... and more
} from 'codebase-ctx';
```

### Utilities

- `fileExists(filePath)` -- Check if a file exists (sync).
- `readFileContent(filePath)` -- Read a file as a UTF-8 string.
- `readLines(filePath)` -- Read a file and return an array of lines.
- `readJsonFile<T>(filePath)` -- Read and parse a JSON file. Returns `null` on failure.
- `estimateTokens(text)` -- Estimate LLM token count using `ceil(chars / 4)`.

### Analyzers

- `analyzeProject(projectPath)` -- Analyze a project directory and return a `ProjectInfo` object.

## API

### `analyzeProject(projectPath: string): ProjectInfo`

Reads `package.json` and inspects the project directory to produce a `ProjectInfo` summary:

| Field | Type | Description |
|---|---|---|
| `name` | `string \| null` | Package name from `package.json`, or directory name as fallback |
| `version` | `string \| null` | Package version |
| `description` | `string \| null` | Package description |
| `license` | `string \| null` | License identifier |
| `language` | `string` | Detected language (`TypeScript`, `JavaScript`, or `unknown`) |
| `runtime` | `string` | Detected runtime (`Node.js`, `Bun`, `Deno`, `Browser`, or `unknown`) |
| `repository` | `string \| null` | Repository URL (cleaned of `git+` prefix and `.git` suffix) |
| `nodeVersion` | `string \| null` | Node.js version constraint from `engines.node` |

**Language detection** checks (in order): `tsconfig.json` existence, `.ts` files in `src/`, `typescript` in dependencies.

**Runtime detection** checks (in order): `engines.bun`, `engines.deno`, browser framework deps without SSR framework deps, default `Node.js`.

### `fileExists(filePath: string): boolean`

Returns `true` if the file exists on disk.

### `readJsonFile<T>(filePath: string): T | null`

Reads and parses a JSON file. Returns `null` if the file does not exist or contains invalid JSON.

### `estimateTokens(text: string): number`

Returns an estimated token count using `Math.ceil(text.length / 4)`.

## License

MIT
