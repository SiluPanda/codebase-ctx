import { join } from 'node:path';
import { existsSync, readdirSync } from 'node:fs';
import type { ProjectInfo } from '../types';
import { readJsonFile } from '../utils/file';

interface PackageJson {
  name?: string;
  version?: string;
  description?: string;
  license?: string;
  repository?: string | { url?: string; type?: string };
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function analyzeProject(projectPath: string): ProjectInfo {
  const pkgPath = join(projectPath, 'package.json');
  const pkg = readJsonFile<PackageJson>(pkgPath);

  if (!pkg) {
    const dirName = projectPath.split('/').pop() || 'unknown';
    return {
      name: dirName,
      version: null,
      description: null,
      license: null,
      language: 'unknown',
      runtime: 'unknown',
      repository: null,
      nodeVersion: null,
    };
  }

  return {
    name: pkg.name || null,
    version: pkg.version || null,
    description: pkg.description || null,
    license: pkg.license || null,
    language: detectLanguage(projectPath, pkg),
    runtime: detectRuntime(pkg),
    repository: extractRepository(pkg.repository),
    nodeVersion: pkg.engines?.node || null,
  };
}

function detectLanguage(projectPath: string, pkg: PackageJson): string {
  // Check for tsconfig.json
  if (existsSync(join(projectPath, 'tsconfig.json'))) {
    return 'TypeScript';
  }

  // Check for .ts files in src/
  const srcDir = join(projectPath, 'src');
  if (existsSync(srcDir)) {
    try {
      const files = readdirSync(srcDir);
      if (files.some((f) => f.endsWith('.ts') || f.endsWith('.tsx'))) {
        return 'TypeScript';
      }
    } catch {
      // ignore read errors
    }
  }

  // Check if typescript is a dependency
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };
  if (allDeps['typescript']) {
    return 'TypeScript';
  }

  return 'JavaScript';
}

function detectRuntime(pkg: PackageJson): string {
  const engines = pkg.engines || {};

  if (engines['bun']) {
    return 'Bun';
  }

  if (engines['deno']) {
    return 'Deno';
  }

  // Check for browser-only frameworks (without SSR frameworks)
  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  const browserFrameworks = ['react', 'vue', 'angular', '@angular/core', 'svelte'];
  const ssrFrameworks = ['next', 'nuxt', 'sveltekit', '@sveltejs/kit'];

  const hasBrowserFramework = browserFrameworks.some((f) => f in allDeps);
  const hasSSRFramework = ssrFrameworks.some((f) => f in allDeps);

  if (hasBrowserFramework && !hasSSRFramework) {
    return 'Browser';
  }

  return 'Node.js';
}

function extractRepository(
  repo: string | { url?: string; type?: string } | undefined,
): string | null {
  if (!repo) {
    return null;
  }

  if (typeof repo === 'string') {
    return repo;
  }

  if (repo.url) {
    let url = repo.url;
    // Strip git+ prefix
    if (url.startsWith('git+')) {
      url = url.slice(4);
    }
    // Strip .git suffix
    if (url.endsWith('.git')) {
      url = url.slice(0, -4);
    }
    return url;
  }

  return null;
}
