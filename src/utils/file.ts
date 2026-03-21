import { existsSync, readFileSync } from 'node:fs';

export function fileExists(filePath: string): boolean {
  return existsSync(filePath);
}

export function readFileContent(filePath: string): string {
  return readFileSync(filePath, 'utf-8');
}

export function readLines(filePath: string): string[] {
  return readFileContent(filePath).split('\n');
}

export function readJsonFile<T = unknown>(filePath: string): T | null {
  try {
    const content = readFileContent(filePath);
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}
