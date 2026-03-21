import { join } from 'node:path';
import type { ScriptInfo, ScriptEntry } from '../types';
import { readJsonFile } from '../utils/file';

type ScriptCategory = 'build' | 'test' | 'lint' | 'start' | 'deploy' | 'other';

function categorizeScript(name: string): ScriptCategory {
  // Build
  if (/^(build|compile|bundle|tsc)$/i.test(name) || name.startsWith('build:')) return 'build';
  // Test
  if (/^(test|spec|e2e|coverage)$/i.test(name) || name.startsWith('test:')) return 'test';
  // Lint
  if (/^(lint|check|format|prettier)$/i.test(name) || name.startsWith('lint:')) return 'lint';
  // Start
  if (/^(start|dev|serve|develop)$/i.test(name)) return 'start';
  // Deploy
  if (/^(deploy|release|publish)$/i.test(name)) return 'deploy';
  // Prepublish/pretest etc map to parent category
  if (name.startsWith('pre') || name.startsWith('post')) {
    const base = name.replace(/^(pre|post)/, '');
    if (/^(build|compile|bundle|tsc)/i.test(base)) return 'build';
    if (/^(test|spec)/i.test(base)) return 'test';
    if (/^(lint|check|format)/i.test(base)) return 'lint';
    if (/^(start|dev|serve)/i.test(base)) return 'start';
    if (/^(deploy|release|publish)/i.test(base)) return 'deploy';
  }
  return 'other';
}

interface PackageJson {
  scripts?: Record<string, string>;
}

export function analyzeScripts(projectPath: string): ScriptInfo {
  const pkg = readJsonFile<PackageJson>(join(projectPath, 'package.json'));

  if (!pkg || !pkg.scripts) {
    return { scripts: [], hasBuild: false, hasTest: false, hasLint: false, hasStart: false };
  }

  const scripts: ScriptEntry[] = Object.entries(pkg.scripts).map(([name, command]) => ({
    name,
    command,
    category: categorizeScript(name),
  }));

  return {
    scripts,
    hasBuild: scripts.some((s) => s.category === 'build'),
    hasTest: scripts.some((s) => s.category === 'test'),
    hasLint: scripts.some((s) => s.category === 'lint'),
    hasStart: scripts.some((s) => s.category === 'start'),
  };
}
