import { join } from 'node:path';
import type { DependencyInfo, DependencyEntry } from '../types';
import { readJsonFile } from '../utils/file';
import { categorize } from '../registries/dependencies';

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

function mapDeps(
  deps: Record<string, string> | undefined,
  isDev: boolean,
): DependencyEntry[] {
  if (!deps) return [];
  return Object.entries(deps).map(([name, version]) => ({
    name,
    version,
    category: categorize(name, isDev),
  }));
}

export function analyzeDependencies(projectPath: string): DependencyInfo {
  const pkg = readJsonFile<PackageJson>(join(projectPath, 'package.json'));

  if (!pkg) {
    return {
      production: [],
      dev: [],
      peer: [],
      optional: [],
      summary: {
        totalProduction: 0,
        totalDev: 0,
        frameworks: [],
        databases: [],
        testingTools: [],
      },
    };
  }

  const production = mapDeps(pkg.dependencies, false);
  const dev = mapDeps(pkg.devDependencies, true);
  const peer = mapDeps(pkg.peerDependencies, false);
  const optional = mapDeps(pkg.optionalDependencies, false);
  const all = [...production, ...dev, ...peer, ...optional];

  return {
    production,
    dev,
    peer,
    optional,
    summary: {
      totalProduction: production.length,
      totalDev: dev.length,
      frameworks: all.filter((d) => d.category === 'framework').map((d) => d.name),
      databases: all.filter((d) => d.category === 'database').map((d) => d.name),
      testingTools: all.filter((d) => d.category === 'testing').map((d) => d.name),
    },
  };
}
