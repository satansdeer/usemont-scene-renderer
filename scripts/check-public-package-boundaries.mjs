#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const packagesRoot = path.join(repoRoot, 'packages');
const bannedImportPathPatterns = [
  /\$lib\//,
  /\$types\//,
  /types\/protos/,
  /project_pb/,
  /\$lib\/auth/,
  /supabase/i,
  /telemetry/i,
  /mcp/i,
  /backend/i,
  /api-server/i
];
const checkedExtensions = new Set(['.ts', '.svelte']);
const failures = [];

for (const packageName of await safeReaddir(packagesRoot)) {
  const sourceRoot = path.join(packagesRoot, packageName, 'src');
  await checkDirectory(sourceRoot);
}

if (failures.length > 0) {
  console.error('Public package boundary check failed:');
  for (const failure of failures) {
    console.error(`- ${path.relative(repoRoot, failure.file)}: ${failure.pattern}`);
  }
  process.exit(1);
}

console.log('Public package boundary check passed.');

async function checkDirectory(directory) {
  for (const entry of await safeReaddir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await checkDirectory(entryPath);
      continue;
    }
    if (!checkedExtensions.has(path.extname(entry.name))) {
      continue;
    }
    const source = await readFile(entryPath, 'utf8');
    const importSpecifiers = Array.from(
      source.matchAll(/(?:from\s+|import\s*\(?\s*)['"]([^'"]+)['"]/g),
      (match) => match[1]
    );
    for (const importSpecifier of importSpecifiers) {
      for (const pattern of bannedImportPathPatterns) {
        if (pattern.test(importSpecifier)) {
          failures.push({ file: entryPath, pattern: `${String(pattern)} in ${importSpecifier}` });
        }
      }
    }
  }
}

async function safeReaddir(directory, options) {
  try {
    return await readdir(directory, options);
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}
