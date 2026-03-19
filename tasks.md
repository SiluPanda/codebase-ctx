# codebase-ctx — Implementation Tasks

This file tracks all tasks needed to implement `codebase-ctx` per the SPEC.md. Tasks are grouped into phases matching the implementation roadmap.

---

## Phase 0: Project Scaffolding and Foundation

- [ ] **Install dev dependencies** — Add `typescript`, `vitest`, and `eslint` as devDependencies in `package.json`. Run `npm install`. | Status: not_done
- [ ] **Add CLI bin entry to package.json** — Add `"bin": { "codebase-ctx": "./dist/cli.js" }` to `package.json` so the CLI is available as `codebase-ctx` when installed globally or via npx. | Status: not_done
- [ ] **Create `src/types.ts`** — Define all TypeScript interfaces and types from the spec: `ProjectInfo`, `DependencyInfo`, `DependencyEntry`, `DependencyCategory`, `StructureInfo`, `DirectoryEntry`, `ArchitecturePattern`, `TypeScriptInfo`, `APISurface`, `APIEntry`, `ScriptInfo`, `ScriptEntry`, `ConfigInfo`, `ConfigEntry`, `GitInfo`, `StatsInfo`, `LanguageStat`, `FileStat`, `PatternInfo`, `DetectedPattern`, `CodebaseContext`, `AnalysisMeta`, `AnalyzeOptions`, `AnalyzerName`, `DetailLevel`, `FormatOptions`, `OutputFormat`, `AnalyzerConfig`, `Analyzer`. | Status: not_done
- [ ] **Create `src/utils/file.ts`** — Implement file reading helpers: `readJsonFile(path)` that reads and parses JSON with graceful error handling, `fileExists(path)` wrapper around `existsSync`, `readFileContent(path)` that reads a file as UTF-8 string, `readLines(path)` that returns an array of lines. All using `node:fs` sync methods. | Status: not_done
- [ ] **Create `src/utils/token-estimate.ts`** — Implement `estimateTokens(text: string): number` that returns `Math.ceil(text.length / 4)` per the spec's token estimation formula. | Status: not_done
- [ ] **Create `src/utils/patterns.ts`** — Define all regex patterns for export parsing as named exports from a central file: named function exports, named const/let exports, named class exports, type/interface exports, enum exports, default exports, re-exports (`export { } from`), star re-exports (`export * from`), namespace re-exports (`export * as`). Each regex should match the patterns specified in Section 7 of the spec. | Status: not_done
- [ ] **Create `src/analyzers/index.ts`** — Implement the analyzer registry: a map from `AnalyzerName` to analyzer functions, and a `runPipeline` function that takes a list of analyzer names and options, runs each sequentially, collects results (capturing `null` for failed/skipped analyzers), and returns the assembled `CodebaseContext` with `AnalysisMeta`. | Status: not_done
- [ ] **Create `src/formatters/index.ts`** — Implement the formatter registry: a map from `OutputFormat` to formatter functions, and a `format` dispatch function that selects the correct formatter and calls it with `CodebaseContext` and `FormatOptions`. Support `'custom'` format by invoking the user-provided `formatter` function from `FormatOptions`. | Status: not_done
- [ ] **Create default exclusion list constant** — Define the default exclude patterns as a constant array: `['node_modules', 'dist', 'build', '.git', 'coverage', '.next', '.turbo', '.cache', '.output', '__pycache__']`. Create a helper function `isExcluded(filePath, excludePatterns)` that checks if a file/directory path should be skipped using string prefix matching and includes checks (not full glob). Place in `src/utils/file.ts` or a dedicated `src/utils/exclude.ts`. | Status: not_done
- [ ] **Create directory structure** — Create all subdirectories under `src/`: `analyzers/`, `formatters/`, `registries/`, `utils/`, `__tests__/`, `__tests__/analyzers/`, `__tests__/formatters/`, `__tests__/fixtures/`. | Status: not_done

---

## Phase 1: Core Analyzers and Markdown Output (v0.1.0)

### Project Analyzer

- [ ] **Implement `src/analyzers/project.ts`** — Create the project analyzer function that reads `package.json` and extracts `name`, `version`, `description`, `license`, `repository` (handling string and object forms), and `nodeVersion` from `engines.node`. | Status: not_done
- [ ] **Implement language detection in project analyzer** — Detect `language` by checking for `tsconfig.json` existence (TypeScript), then falling back to scanning file extensions in `src/` or root. Return `'TypeScript'`, `'JavaScript'`, or `'unknown'`. | Status: not_done
- [ ] **Implement runtime detection in project analyzer** — Infer `runtime` from `engines` field (Node.js, Bun, Deno), framework dependencies (browser if React/Vue/Angular without SSR), and module configuration. Default to `'Node.js'`. | Status: not_done
- [ ] **Implement project analyzer fallback** — When no `package.json` exists, return directory name as `name`, `'unknown'` as `language`, and `null` for all other fields. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/project.test.ts`** — Unit tests: test with full `package.json`, test with minimal `package.json` (name only), test with no `package.json`, test language detection from `tsconfig.json` presence, test runtime detection from `engines` field, test repository extraction from both string and object forms. | Status: not_done

### Dependency Analyzer

- [ ] **Create `src/registries/dependencies.ts`** — Build the known dependency-to-category mapping registry with ~200 common npm packages. Categories: `framework` (react, next, express, fastify, vue, angular, svelte, etc.), `database` (prisma, mongoose, pg, mysql2, redis, drizzle-orm, typeorm, etc.), `testing` (vitest, jest, mocha, cypress, playwright, supertest, etc.), `build` (typescript, esbuild, vite, webpack, rollup, tsup, etc.), `lint` (eslint, prettier, biome, oxlint, stylelint, etc.), `ui` (tailwindcss, @mui/material, @chakra-ui/react, etc.), `auth` (passport, jsonwebtoken, next-auth, clerk, etc.), `api` (axios, node-fetch, graphql, trpc, openapi, etc.), `observability` (winston, pino, sentry, datadog, opentelemetry, etc.), `type-definitions` (@types/* prefix check). | Status: not_done
- [ ] **Implement `src/analyzers/dependencies.ts`** — Create the dependency analyzer that reads `package.json` and extracts `dependencies`, `devDependencies`, `peerDependencies`, `optionalDependencies`. For each dependency, look up its category in the registry. Unrecognized `dependencies` entries default to `'utility'`; unrecognized `devDependencies` entries default to `'build'`. | Status: not_done
- [ ] **Implement dependency summary in dependency analyzer** — Compute the `summary` object: `totalProduction`, `totalDev`, `frameworks` (list of framework dependency names), `databases` (list of database dependency names), `testingTools` (list of testing dependency names). | Status: not_done
- [ ] **Implement dependency analyzer fallback** — When `package.json` does not exist or has no dependency fields, return empty arrays and zero counts. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/dependencies.test.ts`** — Unit tests: test with dependencies spanning all categories, test category inference for known packages, test `@types/*` prefix detection, test unknown dependency fallback (utility for deps, build for devDeps), test with empty dependencies, test with only devDependencies, test summary computation. | Status: not_done

### Structure Analyzer

- [ ] **Create `src/registries/directories.ts`** — Build the known directory-to-purpose mapping: `src/` -> "Source code", `lib/` -> "Library code", `tests/`/`test/`/`__tests__/` -> "Test files", `dist/`/`build/` -> "Compiled output", `docs/` -> "Documentation", `scripts/` -> "Build/utility scripts", `config/` -> "Configuration", `public/` -> "Static assets", `assets/` -> "Static assets", `components/` -> "UI components", `pages/`/`app/` -> "Application pages/routes", `api/` -> "API endpoints", `hooks/` -> "React hooks", `utils/`/`helpers/` -> "Utility functions", `types/` -> "Type definitions", `services/` -> "Service layer", `middleware/` -> "Middleware", `models/` -> "Data models", `views/` -> "View templates", `controllers/` -> "Route controllers", `routes/` -> "Route handlers", `schemas/` -> "Validation schemas", `plugins/` -> "Plugins", `migrations/` -> "Database migrations", `seeds/` -> "Database seed data", `fixtures/` -> "Test fixtures", `mocks/` -> "Test mocks", `packages/` -> "Monorepo packages", `apps/` -> "Monorepo applications". | Status: not_done
- [ ] **Implement `src/analyzers/structure.ts` — directory scanning** — Scan the project directory tree to the configured `maxDepth` (default 3), excluding ignored directories. For each directory, record its relative path, look up its purpose label from the directory registry, and count the number of files it contains. | Status: not_done
- [ ] **Implement architecture detection — flat pattern** — Detect flat architecture: all or nearly all source files in the project root, no `src/` or `lib/` directory, fewer than 3 directories total. Set confidence to `'high'` if fewer than 2 subdirectories, `'medium'` if 2-3 subdirectories. Evidence string: `"All source files in root, no src/ or lib/ directory"`. | Status: not_done
- [ ] **Implement architecture detection — layered pattern** — Detect layered architecture: `src/` directory exists containing most source files, test directory exists (`tests/`, `test/`, `__tests__/`, `src/__tests__/`), `dist/` or `build/` directory exists or is referenced in `package.json`. Confidence `'high'` if `src/` and test dir exist, `'medium'` if only `src/`. Evidence string: `"src/ + tests/ separation, output to dist/"`. | Status: not_done
- [ ] **Implement architecture detection — monorepo pattern** — Detect monorepo: `workspaces` field in `package.json`, `pnpm-workspace.yaml` exists, `turbo.json` or `nx.json` exists, `packages/` or `apps/` directory with multiple sub-`package.json` files, `lerna.json` exists. Confidence `'high'` if workspaces/config file present, `'medium'` if only `packages/` with sub-package.json. Evidence string: `"Workspaces in package.json, packages/ with N sub-packages"`. | Status: not_done
- [ ] **Implement entry point detection in structure analyzer** — Identify entry points by checking `package.json` `main` and `exports` fields, then falling back to convention-based discovery: `src/index.ts`, `src/index.js`, `index.ts`, `index.js`, `src/main.ts`, `src/main.js`. | Status: not_done
- [ ] **Implement key file detection in structure analyzer** — Detect and list key configuration/metadata files present in the project root: `tsconfig.json`, `.eslintrc.*`, `eslint.config.*`, `.prettierrc.*`, `biome.json`, `Dockerfile`, `docker-compose.yml`, `.github/workflows/`, `.env.example`, `Makefile`, `turbo.json`, `nx.json`, `lerna.json`, `pnpm-workspace.yaml`, etc. | Status: not_done
- [ ] **Implement structure analyzer fallback** — When the project directory is empty or contains only dotfiles, return empty directory list and `{ type: 'flat', confidence: 'low', evidence: 'No recognized directory structure' }`. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/structure.test.ts`** — Unit tests: test with fixture directories representing flat, layered, and monorepo architectures. Verify correct pattern detection, confidence, and evidence. Test with empty directory. Test exclusion of `node_modules` and other ignored directories. Test entry point detection. Test key file detection. | Status: not_done

### Script Analyzer

- [ ] **Implement `src/analyzers/scripts.ts`** — Create the script analyzer that reads `package.json` `scripts` field and categorizes each script by name pattern: `build`/`compile`/`bundle`/`tsc` -> `'build'`, `test`/`test:*`/`spec`/`e2e`/`coverage` -> `'test'`, `lint`/`lint:*`/`check`/`format`/`prettier` -> `'lint'`, `start`/`dev`/`serve`/`develop` -> `'start'`, `deploy`/`release`/`publish` -> `'deploy'`, everything else -> `'other'`. Set boolean flags `hasBuild`, `hasTest`, `hasLint`, `hasStart`. | Status: not_done
- [ ] **Implement script analyzer fallback** — When `package.json` has no `scripts` field, return empty array and all boolean flags as `false`. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/scripts.test.ts`** — Unit tests: test with scripts spanning all categories, test script category inference, test with no scripts field, test boolean flags. | Status: not_done

### Core `analyze()` Function

- [ ] **Implement `src/analyze.ts`** — Create the core `analyze(projectPath?, options?)` function. It should: validate the project path exists, resolve defaults for `AnalyzeOptions`, load configuration file if present (defer to Phase 3), run the analyzer pipeline via `runPipeline`, record timing in `AnalysisMeta`, and return the assembled `CodebaseContext`. Throw only on unrecoverable errors (path not found, permission denied). | Status: not_done
- [ ] **Implement project path validation** — In `analyze()`, verify the project path exists and is a directory. If `projectPath` is not provided, default to `process.cwd()`. Resolve relative paths to absolute. Throw a descriptive error if the path does not exist or is not a directory. | Status: not_done
- [ ] **Implement AnalysisMeta population** — After the pipeline runs, populate `AnalysisMeta`: `projectPath` (absolute), `analyzersRun` (which analyzers actually executed), `analyzersSkipped` (which returned null), `durationMs` (measured with `Date.now()` or `performance.now()`), `timestamp` (ISO 8601), `version` (read from own `package.json`). | Status: not_done

### Markdown Formatter

- [ ] **Implement `src/formatters/markdown.ts`** — Create the markdown formatter that takes a `CodebaseContext` and `FormatOptions` and produces structured markdown output. Include sections for: Project header (name, version, language, runtime, architecture), Dependencies (categorized), Structure (directory tree with purposes), API Surface (exports list), Scripts (categorized), Patterns (detected patterns with confidence). Omit sections for null analyzer results. | Status: not_done
- [ ] **Implement markdown formatter standard detail level** — For standard detail level: include name, version, language, runtime, strict mode; all production deps categorized, dev deps summarized by category; architecture pattern + top-level directory listing with purposes; all exports with names and kinds, signatures for functions; all categorized scripts; all detected patterns with confidence; total files, total lines, primary language percentage; commit convention; linter and formatter names. | Status: not_done
- [ ] **Write `src/__tests__/formatters/markdown.test.ts`** — Unit tests: verify output structure (headers, sections, code blocks), test standard detail level, test with null analyzer results (sections should be omitted), verify token estimates fall within expected ranges. | Status: not_done

### `format()` Function

- [ ] **Implement the `format()` function in `src/formatters/index.ts`** — The public `format(context, outputFormat?, options?)` function that dispatches to the correct formatter. Default `outputFormat` to `'markdown'`. Default `detailLevel` in options to `'standard'`. | Status: not_done

### Public API Exports

- [ ] **Update `src/index.ts`** — Export `analyze`, `format`, `createAnalyzer` (stub for Phase 2), and all public types from `src/types.ts`. This is the package's public API surface. | Status: not_done

### CLI (Basic)

- [ ] **Implement `src/cli.ts`** — Create the CLI entry point using `node:util.parseArgs`. Parse arguments: positional `project-path`, `--format` (markdown/json/compact, default markdown), `--detail` (minimal/standard/detailed, default standard), `--output`/`-o` (file path), `--tokens`, `--version`, `--help`. Add the `#!/usr/bin/env node` shebang line. | Status: not_done
- [ ] **Implement CLI help output** — When `--help` is passed, print usage information matching the format shown in Section 11 of the spec, then exit with code 0. | Status: not_done
- [ ] **Implement CLI version output** — When `--version` is passed, read the version from `package.json` and print it, then exit with code 0. | Status: not_done
- [ ] **Implement CLI analysis execution** — In the main CLI flow: call `analyze()` with the parsed project path and options, then call `format()` with the returned context and parsed format/detail options. Print the formatted output to stdout, or write to the file specified by `--output`. | Status: not_done
- [ ] **Implement CLI exit codes** — Exit with code 0 on success. Exit with code 1 on analysis errors (project path doesn't exist, all analyzers failed). Exit with code 2 on configuration errors (invalid flags, unknown analyzer name, invalid format). | Status: not_done
- [ ] **Implement CLI token count display** — When `--tokens` is passed, append the estimated token count to the output. When writing to a file with `-o`, print a message to stderr: `"Context written to <path> (<N> tokens)"`. | Status: not_done

### Phase 1 Integration Test

- [ ] **Create fixture: `src/__tests__/fixtures/typescript-express/`** — Create a fixture directory representing a TypeScript + Express project with layered architecture. Include `package.json` (with express, prisma, vitest, typescript as deps, scripts for build/test/lint/start), `tsconfig.json` (strict, ES2022, commonjs), `src/index.ts` (with named function and type exports), `src/routes/` and `src/services/` directories with sample files, and a `tests/` directory. | Status: not_done
- [ ] **Write `src/__tests__/analyze.test.ts` — Phase 1 integration test** — Run `analyze()` against the `typescript-express` fixture. Verify: project name/version/language/runtime are correct, dependencies are categorized correctly (express=framework, prisma=database, vitest=testing, typescript=build), architecture is detected as `'layered'` with `'high'` confidence, scripts are categorized correctly, the full `CodebaseContext` is structurally valid. | Status: not_done

---

## Phase 2: API Surface, TypeScript, Patterns, Config, and Additional Formatters (v0.2.0)

### TypeScript Analyzer

- [ ] **Implement `src/analyzers/typescript.ts`** — Create the TypeScript analyzer that reads `tsconfig.json` and extracts: `strict` (boolean), `target`, `module`, `moduleResolution`, `paths` (path aliases), `jsx`, `outDir`, `rootDir`, `declaration` (boolean), and `notableFlags` (array of notable compiler options like `esModuleInterop`, `resolveJsonModule`, `skipLibCheck`, `forceConsistentCasingInFileNames`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`). | Status: not_done
- [ ] **Implement tsconfig extends resolution** — When `tsconfig.json` has an `extends` field, resolve the referenced config file (`tsconfig.build.json`, `tsconfig.app.json`, or a path) and merge its `compilerOptions` with the base config, with the extending config taking precedence. Follow only one level of extends to avoid circular references. | Status: not_done
- [ ] **Implement TypeScript analyzer fallback** — Return `null` if `tsconfig.json` does not exist. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/typescript.test.ts`** — Unit tests: test with strict mode on/off, test various targets, test path aliases extraction, test JSX config detection, test `extends` resolution, test notable flags extraction, test with no `tsconfig.json` (returns null). | Status: not_done

### API Surface Analyzer

- [ ] **Implement entry point discovery in `src/analyzers/api-surface.ts`** — Find entry points in priority order: 1) `package.json` `exports` field (read all export paths, resolve to source equivalents by replacing `dist/` with `src/` and `.js` with `.ts` when `tsconfig.json` exists), 2) `package.json` `main` field (resolve to source), 3) `package.json` `types`/`typings` field (fallback), 4) convention-based: check `src/index.ts`, `src/index.js`, `index.ts`, `index.js`, `src/main.ts`, `src/main.js` in order. | Status: not_done
- [ ] **Implement export statement parsing** — Parse entry point files using the regex patterns from `src/utils/patterns.ts`. Extract named function exports (name, params, return type), named const/let exports (name, type annotation), named class exports (name, superclass, interfaces), type/interface exports (name), enum exports (name), default exports (name if named). Build `APIEntry` objects with `name`, `kind`, `signature`, and `source`. | Status: not_done
- [ ] **Implement re-export following** — For `export { foo, bar } from './module'` patterns, record each named re-export with its source. For `export * from './module'` patterns, resolve the relative path against the current file's directory, read the target file, extract its named exports, and include them with the original source. Follow only one level of indirection. Skip absolute paths and bare specifiers (node_modules packages). Handle missing target files gracefully. | Status: not_done
- [ ] **Implement function signature extraction** — For function exports, extract a compact signature string including parameter list and return type annotation (if present). For TypeScript files, include type annotations. For JavaScript files, include parameter names without types. | Status: not_done
- [ ] **Implement API surface analyzer fallback** — When no entry point files are found or no exports are detected, return empty exports array and `totalExports: 0`. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/api-surface.test.ts`** — Unit tests: test all supported export patterns (named functions, classes, types, interfaces, enums, default exports, re-exports, `export *`), test signature extraction with and without type annotations, test with JavaScript files, test barrel file re-exports, test empty entry point, test missing re-export target files, test complex `package.json` exports field with conditional exports. | Status: not_done
- [ ] **Create fixture: `src/__tests__/fixtures/exports/`** — Create fixture files for export parsing tests: `named-exports.ts` (functions, consts, classes, types, interfaces, enums), `default-export.ts`, `re-exports.ts` (named re-exports from another file), `barrel.ts` (`export *` from multiple files), `mixed.js` (JavaScript exports without type annotations). | Status: not_done

### Pattern Analyzer

- [ ] **Implement `src/analyzers/patterns.ts` — file sampling** — Select up to `maxSampleFiles` (default 20) source files (`.ts`, `.tsx`, `.js`, `.jsx`) from `src/` or the project root. Prioritize entry points and files with the most exports. Skip test files, fixture files, and generated files. | Status: not_done
- [ ] **Implement async style detection** — Scan sampled files for `async function`/`async (` patterns (async-await), `.then(` patterns (promises), `callback(err`/`function(err,` patterns (callbacks). Determine dominant style: `'async-await'`, `'promises'`, `'callbacks'`, or `'mixed'`. | Status: not_done
- [ ] **Implement error handling detection** — Scan for `try {`/`catch (` patterns (try-catch), `Result<`/`Either<`/`Ok(`/`Err(` patterns (result-types), `callback(err`/`if (err)` patterns (error-first-callbacks). Determine dominant style. | Status: not_done
- [ ] **Implement import style detection** — Scan for `import ... from` patterns (ESM), `require(` patterns (CommonJS), `import(` patterns (dynamic import). Determine dominant style: `'esm'`, `'commonjs'`, or `'mixed'`. | Status: not_done
- [ ] **Implement component style detection** — Scan for `function Component(`/`const Component =`/`React.FC<` patterns (functional), `class Component extends` patterns (class-based). Determine style: `'functional'`, `'class-based'`, `'mixed'`, or `'none'` (no component patterns found). | Status: not_done
- [ ] **Implement export style detection** — Scan for `export default` (default), `export function`/`export const` (named), `module.exports` (commonjs). Determine dominant style: `'named'`, `'default'`, `'mixed'`, `'commonjs'`. | Status: not_done
- [ ] **Implement naming convention detection** — Sample variable and function names from the source files. Check casing patterns: camelCase, snake_case, PascalCase. Determine dominant convention: `'camelCase'`, `'snake_case'`, `'PascalCase'`, `'mixed'`. | Status: not_done
- [ ] **Implement type usage detection** — Scan for type annotations (`: string`, `: number`, etc.), `as` casts, `any` usage, generics (`<T>`). Classify usage level: `'strict-types'` (annotations on most declarations, no/minimal `any`), `'moderate-types'` (some annotations), `'minimal-types'` (few annotations), `'no-types'` (no TypeScript annotations). | Status: not_done
- [ ] **Implement pattern confidence calculation** — For each pattern dimension, calculate confidence based on consistency across sampled files: `'high'` if the pattern is seen in 90%+ of files (18/20), `'medium'` if seen in 50%+ (10/20), `'low'` if seen in fewer than 50%. Include evidence string (e.g., `"18/20 files use async/await"`). | Status: not_done
- [ ] **Implement pattern analyzer fallback** — Return empty patterns array if no source files are found to sample. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/patterns.test.ts`** — Unit tests: test each pattern dimension individually with source files that clearly exhibit each pattern, test mixed patterns, test confidence calculation, test with no source files. | Status: not_done

### Config Analyzer

- [ ] **Implement `src/analyzers/config.ts` — config file detection** — Check for existence of all supported config files: `.eslintrc.*` (json, js, cjs, yaml, yml), `eslint.config.*` (js, cjs, mjs, ts), `.prettierrc.*`, `biome.json`, `biome.jsonc`, `.editorconfig`, `jest.config.*`, `vitest.config.*`, `vite.config.*`, `webpack.config.*`, `tailwind.config.*`, `.env.example`. | Status: not_done
- [ ] **Implement config analyzer — JSON config parsing** — For JSON config files (`.eslintrc.json`, `biome.json`, `.prettierrc`), read and parse the file. Extract key settings: for ESLint JSON configs, extract `extends` and notable rules; for Prettier, extract `printWidth`, `tabWidth`, `singleQuote`, `semi`, `trailingComma`; for Biome, extract formatter and linter settings. | Status: not_done
- [ ] **Implement config analyzer — JS config regex extraction** — For JavaScript/TypeScript config files (`.eslintrc.js`, `vite.config.ts`, `tailwind.config.js`), use regex to extract limited information (looking for string literals and object keys) without executing the file. Extract tool name and file name at minimum. | Status: not_done
- [ ] **Implement config analyzer summary fields** — Populate `linter` (ESLint, Biome, or null), `formatter` (Prettier, Biome, or null), `bundler` (Vite, Webpack, Rollup, esbuild, tsup, or null), `testRunner` (Vitest, Jest, Mocha, or null) based on detected configs. | Status: not_done
- [ ] **Implement config analyzer fallback** — Return empty configs array and all tool fields as `null` if no recognized config files exist. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/config.test.ts`** — Unit tests: test with each supported config file type, test key setting extraction from JSON configs, test regex extraction from JS configs, test summary field population, test with no config files. | Status: not_done

### Compact Text Formatter

- [ ] **Implement `src/formatters/compact.ts`** — Create the compact text formatter that produces minimal-token output using abbreviations: `fn` for function, `dep` for dependency, `cfg` for configuration, `TS` for TypeScript, `JS` for JavaScript, `ESM` for ES Modules, `CJS` for CommonJS. Format should match the example in Section 8.3: header line with project/lang/runtime/architecture, deps line, src directory line with file counts, api exports line, scripts line, patterns line, stats line. Omit sections for null analyzer results. | Status: not_done
- [ ] **Write `src/__tests__/formatters/compact.test.ts`** — Unit tests: verify abbreviation usage, verify token efficiency (compact output significantly smaller than markdown), test each detail level, test with null analyzer results. | Status: not_done

### JSON Formatter

- [ ] **Implement `src/formatters/json.ts`** — Create the JSON formatter that serializes the `CodebaseContext` object to a JSON string. For `'standard'` detail level, include all major fields. For `'minimal'`, include only highest-signal fields. For `'detailed'`, include everything. The output must be valid JSON. | Status: not_done
- [ ] **Write `src/__tests__/formatters/json.test.ts`** — Unit tests: verify output is valid JSON, verify round-trip (parse output and compare with input context), test each detail level, test with null analyzer results. | Status: not_done

### Detail Level Implementation

- [ ] **Implement minimal detail level across all formatters** — Minimal: project name/language/framework only, framework and database dep names only (no version, no dev deps), architecture pattern only (no directory listing), export count only (no signatures), primary async and error handling style only, build and test commands only, stats/git/config omitted. Target: 150-300 tokens for markdown. | Status: not_done
- [ ] **Implement detailed detail level across all formatters** — Detailed: everything in standard plus full dependency list with versions, two-level directory listing with file counts, all exports with full signatures, language breakdown/largest files/average file size in stats, all git fields, all detected configs with key settings, all TypeScript compiler flags. Target: 800-2,000 tokens for markdown. | Status: not_done

### `createAnalyzer()` Factory

- [ ] **Implement `createAnalyzer()` in `src/index.ts` or `src/analyze.ts`** — Factory function that takes `AnalyzerConfig` and returns an `Analyzer` object with `analyze(projectPath?)` and `analyzeAndFormat(projectPath?, outputFormat?, formatOptions?)` methods. The returned analyzer reuses the same configuration for each call. | Status: not_done

### Phase 2 Integration Tests

- [ ] **Create fixture: `src/__tests__/fixtures/react-nextjs/`** — Create a fixture representing a React + Next.js app with feature-based architecture. Include `package.json` (react, next, tailwindcss), `tsconfig.json` (jsx: react-jsx), `app/` directory with feature subdirectories, component files. | Status: not_done
- [ ] **Create fixture: `src/__tests__/fixtures/monorepo/`** — Create a fixture representing a monorepo with workspaces. Include root `package.json` (with workspaces field), `turbo.json`, `packages/` directory with 2-3 sub-packages each having their own `package.json`. | Status: not_done
- [ ] **Write Phase 2 integration tests in `src/__tests__/analyze.test.ts`** — Test `analyze()` against react-nextjs fixture (verify feature-based architecture detection, JSX config in TypeScript analyzer, component pattern detection). Test against monorepo fixture (verify monorepo architecture detection, workspaces handling). Test `createAnalyzer()` with multiple project analyses. | Status: not_done

---

## Phase 3: Git, Stats, Configuration File Support, and Polish (v0.3.0)

### Git Analyzer

- [ ] **Implement `src/analyzers/git.ts` — basic git detection** — Check if `.git/` directory exists to set `initialized`. If not a git repo, return `{ initialized: false }` with all other fields as `null`, `0`, or `false`. | Status: not_done
- [ ] **Implement git default branch detection** — Use `child_process.execSync` to run `git branch` or check `.git/HEAD` to determine the default branch name (`main`, `master`, or other). | Status: not_done
- [ ] **Implement git recent commit counting** — Run `git log --oneline --since="30 days ago"` to count commits in the last 30 days. Parse the output to get `recentCommitCount`. | Status: not_done
- [ ] **Implement commit convention detection** — Run `git log --oneline -20` to get the last 20 commit messages. Analyze them: check for conventional commits pattern (`type(scope): message` or `type: message`), scope-prefixed pattern, or freeform. Return the dominant convention. | Status: not_done
- [ ] **Implement contributor counting** — Run `git log --format="%ae" -20` to get the last 20 commit author emails. Count unique authors to get `contributors`. | Status: not_done
- [ ] **Implement CI and hook detection** — Check for `.github/workflows/` directory existence (`hasGitHubActions`). Check for `.husky/` directory existence (`hasHusky`). | Status: not_done
- [ ] **Implement git analyzer error handling** — Wrap all `execSync` calls in try/catch. If `git` is not available or any command fails, fall back gracefully: return `initialized: true` (if `.git/` exists) but with null/0/false for other fields. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/git.test.ts`** — Unit tests: create temporary git repositories with known commit histories. Test commit convention detection for conventional, scope-prefixed, and freeform patterns. Test contributor counting. Test with a non-git directory. Test CI and hook detection. | Status: not_done

### Stats Analyzer

- [ ] **Implement `src/analyzers/stats.ts` — directory traversal** — Traverse the project directory tree recursively using `node:fs` sync methods, excluding ignored directories. For each non-excluded file, collect its path and count its lines (by counting newline characters). | Status: not_done
- [ ] **Implement binary file detection** — Before counting lines, check if a file is binary by reading the first 512 bytes and checking for null bytes. Skip binary files. | Status: not_done
- [ ] **Implement language breakdown** — Map file extensions to language names (`.ts` -> TypeScript, `.tsx` -> TypeScript (JSX), `.js` -> JavaScript, `.jsx` -> JavaScript (JSX), `.json` -> JSON, `.css` -> CSS, `.html` -> HTML, `.md` -> Markdown, `.yaml`/`.yml` -> YAML, etc.). Count files and lines per language. Calculate percentage of total lines for each language. | Status: not_done
- [ ] **Implement largest files detection** — Track the 5 largest source files by line count. Return their relative paths and line counts as `FileStat[]`. | Status: not_done
- [ ] **Implement average file size calculation** — Calculate `averageFileSize` as total lines divided by total files (rounded to nearest integer). | Status: not_done
- [ ] **Implement stats analyzer fallback** — Return zero counts and empty arrays if the project directory has no non-ignored files. | Status: not_done
- [ ] **Write `src/__tests__/analyzers/stats.test.ts`** — Unit tests: test line counting accuracy, test language breakdown calculation, test binary file detection and exclusion, test deeply nested directories, test with empty directory, test largest files detection, test average file size. | Status: not_done

### Architecture Detection — Additional Patterns

- [ ] **Implement architecture detection — feature-based pattern** — Detect feature-based architecture: `src/` contains directories named after business features/domain concepts (not technical layers). Each feature directory has co-located mixed file types. 3+ feature directories -> `'high'` confidence, 2 -> `'medium'`. Evidence: `"Feature directories: users/, auth/, billing/ with co-located files"`. | Status: not_done
- [ ] **Implement architecture detection — MVC pattern** — Detect MVC: `models/` or `model/` directory, `views/` or `view/` directory, `controllers/` or `controller/` directory, `routes/` directory alongside controllers, `middleware/` directory. All three of models/views/controllers -> `'high'`, two of three -> `'medium'`. Evidence: `"models/ + controllers/ + routes/ directories"`. | Status: not_done

### Configuration File Support

- [ ] **Implement configuration file loading** — In the `analyze()` function (or a dedicated config loader), look for configuration files in priority order: 1) `codebase-ctx.json`, 2) `.codebase-ctx.json`, 3) `"codebase-ctx"` key in `package.json`. Parse the config file and merge with defaults. Supported fields: `analyzers`, `exclude`, `detailLevel`, `format`, `maxDepth`, `maxSampleFiles`. | Status: not_done
- [ ] **Implement config file override precedence** — Ensure CLI flags override configuration file values, and configuration file values override defaults. Document this precedence chain. | Status: not_done

### Environment Variable Support

- [ ] **Implement environment variable reading** — Read environment variables: `CODEBASE_CTX_FORMAT` -> `--format`, `CODEBASE_CTX_DETAIL` -> `--detail`, `CODEBASE_CTX_ANALYZERS` -> `--analyzers` (comma-separated), `CODEBASE_CTX_EXCLUDE` -> `--exclude` (comma-separated), `CODEBASE_CTX_OUTPUT` -> `--output`. Apply before config file but after defaults, with CLI flags having highest precedence. | Status: not_done

### CLI Enhancements

- [ ] **Implement `--analyzers` CLI flag** — Parse comma-separated list of analyzer names. Validate each name against the known `AnalyzerName` type. Pass to `analyze()` options. Exit with code 2 for unknown analyzer names. | Status: not_done
- [ ] **Implement `--exclude` CLI flag** — Parse comma-separated glob patterns. Append to the default exclusion list (don't replace it). Pass to `analyze()` options. | Status: not_done
- [ ] **Implement `--max-depth` CLI flag** — Parse as integer. Pass to `analyze()` options as `maxDepth`. | Status: not_done
- [ ] **Implement `--max-sample` CLI flag** — Parse as integer. Pass to `analyze()` options as `maxSampleFiles`. | Status: not_done

### Token Count Estimation

- [ ] **Implement `--tokens` flag behavior** — When `--tokens` is passed and outputting to stdout, append a line with the estimated token count. When writing to file with `-o`, print to stderr: `"Context written to <path> (<N> tokens)"`. Use `estimateTokens()` from `src/utils/token-estimate.ts`. | Status: not_done
- [ ] **Implement `includeTokenCount` format option** — When `FormatOptions.includeTokenCount` is true, append the estimated token count to the formatted output string. | Status: not_done

### CLI End-to-End Tests

- [ ] **Write `src/__tests__/cli.test.ts`** — CLI end-to-end tests: run the CLI binary against fixture directories using `child_process.execSync`. Test each format (`--format markdown`, `--format json`, `--format compact`). Test each detail level. Test `--output` flag (verify file is written). Test `--analyzers` flag with a subset. Test `--exclude` flag. Test `--tokens` flag. Test `--version` and `--help` flags. Test exit codes: 0 for success, 1 for non-existent path, 2 for invalid flags. | Status: not_done

### Phase 3 Edge Case Tests

- [ ] **Write edge case test: no package.json** — Test analysis of a directory with no `package.json` (non-Node.js project or bare directory). Verify project analyzer returns fallback values, dependency/script analyzers return null/empty. | Status: not_done
- [ ] **Write edge case test: invalid JSON in package.json** — Test with a `package.json` containing invalid JSON. Verify graceful failure (null result, not thrown exception). | Status: not_done
- [ ] **Write edge case test: circular tsconfig extends** — Test with a `tsconfig.json` that extends itself or creates a circular chain. Verify the TypeScript analyzer does not infinite loop. | Status: not_done
- [ ] **Write edge case test: missing entry point file** — Test when `package.json` `main` references a file that doesn't exist. Verify the API surface analyzer returns fallback values. | Status: not_done
- [ ] **Write edge case test: missing re-export target** — Test `export * from './nonexistent'` where the target module doesn't exist. Verify graceful handling. | Status: not_done
- [ ] **Write edge case test: source files with syntax errors** — Test with source files containing syntax errors. Verify the regex-based parser does not crash. | Status: not_done
- [ ] **Write edge case test: extremely large files** — Test with a file having 100,000+ lines. Verify the stats analyzer does not run out of memory. | Status: not_done
- [ ] **Write edge case test: deeply nested directories** — Test with directory structure nested 50+ levels deep with `maxDepth` set to 3. Verify the structure analyzer respects maxDepth. | Status: not_done
- [ ] **Write edge case test: symlinks** — Test with symlinks in the directory tree. Verify they are followed or handled gracefully (no infinite loop from circular symlinks). | Status: not_done
- [ ] **Write edge case test: binary files mixed with source** — Test with binary files (images, compiled binaries) mixed with source files. Verify they are detected and skipped by the stats analyzer. | Status: not_done
- [ ] **Write edge case test: empty source files** — Test with 0-byte source files. Verify they are counted but don't cause errors. | Status: not_done
- [ ] **Write edge case test: non-UTF-8 encoding** — Test with source files in non-UTF-8 encoding. Verify graceful handling (may produce garbled content but should not crash). | Status: not_done
- [ ] **Write edge case test: complex conditional exports** — Test with `package.json` `exports` field using conditional exports (`node` vs `browser`, `import` vs `require`). Verify correct entry point resolution. | Status: not_done

---

## Phase 4: Ecosystem Integration, Documentation, and v1.0 (v1.0.0)

### Custom Formatter Support

- [ ] **Implement custom formatter invocation** — When `format()` is called with `outputFormat: 'custom'`, invoke the `formatter` function from `FormatOptions` with the `CodebaseContext` and return its result. Throw a clear error if `outputFormat` is `'custom'` but no `formatter` function is provided. | Status: not_done
- [ ] **Write test for custom formatter** — Verify custom formatter is called with the context, verify its return value is used as the output. Test error case: custom format without formatter function. | Status: not_done

### ANSI Color Output for CLI

- [ ] **Implement ANSI color in CLI output** — For terminal output (not file output), add basic ANSI coloring to markdown format: bold for headers, dim for less important info. Use ANSI escape codes directly (no chalk dependency). Detect if stdout is a TTY; disable colors for piped output. | Status: not_done

### Analyze-and-Format Roundtrip Tests

- [ ] **Write roundtrip tests** — For each combination of format (markdown, json, compact) and detail level (minimal, standard, detailed), run `analyze()` on a fixture then `format()` the result. Verify the output is non-empty and well-formed. For JSON, verify it parses. For markdown, verify it has expected section headers. For compact, verify it's within expected token ranges. | Status: not_done

### Additional Fixtures

- [ ] **Create fixture: `src/__tests__/fixtures/javascript-flat/`** — Plain JavaScript project with flat structure: `package.json` (no TypeScript), `index.js` (with CommonJS exports), no src/ directory. | Status: not_done
- [ ] **Create fixture: `src/__tests__/fixtures/empty-project/`** — Empty directory (no files at all). | Status: not_done
- [ ] **Write integration tests for additional fixtures** — Test `analyze()` against javascript-flat fixture (verify JavaScript language detection, flat architecture, CommonJS pattern detection). Test against empty-project fixture (verify graceful handling, minimal/fallback results). | Status: not_done

### Documentation

- [ ] **Write README.md** — Comprehensive README with: installation instructions (npm, npx, global), quick start examples, API documentation for `analyze()`, `format()`, `createAnalyzer()`, CLI usage with all flags, output format examples (markdown, JSON, compact), detail level descriptions, configuration file documentation, environment variable documentation, integration examples (CLAUDE.md injection, prompt engineering, ai-env-init, ai-rules-lint), performance characteristics, zero-dependency philosophy explanation. | Status: not_done

### Performance Validation

- [ ] **Validate performance targets** — Create or use fixtures of varying sizes and measure analysis time. Verify: small project (<50 files) under 100ms, medium (50-500 files) under 300ms, large (500-5,000 files) under 500ms. Document results. Optimize if targets are not met. | Status: not_done

### Pre-publish Checklist

- [ ] **Verify package.json completeness** — Ensure `package.json` has correct: `name`, `version`, `description`, `main`, `types`, `bin`, `files`, `engines`, `license`, `keywords` (add relevant keywords: codebase, context, AI, static analysis, TypeScript, CLI), `repository`, `author`. | Status: not_done
- [ ] **Verify TypeScript declarations are generated** — Run `npm run build` and verify `dist/` contains `.d.ts` files for all public types. Verify `dist/index.d.ts` exports all public types correctly. | Status: not_done
- [ ] **Verify CLI binary works after build** — Run `node dist/cli.js --version` and verify it prints the version. Run `node dist/cli.js --help` and verify help output. Run `node dist/cli.js .` against the project itself and verify output. | Status: not_done
- [ ] **Run full test suite** — Run `npm run test` and verify all tests pass. Run `npm run lint` and verify no lint errors. Run `npm run build` and verify clean build. | Status: not_done
- [ ] **Version bump to 1.0.0** — Bump `package.json` version to `1.0.0` for the stable release. | Status: not_done
