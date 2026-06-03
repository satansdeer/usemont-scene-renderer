#!/usr/bin/env node
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const repoRoot = process.cwd();
const tempRoot = await mkdtemp(path.join(tmpdir(), 'usemont-renderer-packages-'));
const packDir = path.join(tempRoot, 'packs');
const consumerDir = path.join(tempRoot, 'consumer');
const npmCacheDir = path.join(tempRoot, 'npm-cache');
const publicPackages = [
  {
    name: '@usemont/scene-model',
    directory: path.join(repoRoot, 'packages/scene-model'),
    tarballPrefix: 'usemont-scene-model-'
  },
  {
    name: '@usemont/programmatic-spans',
    directory: path.join(repoRoot, 'packages/programmatic-spans'),
    tarballPrefix: 'usemont-programmatic-spans-'
  },
  {
    name: '@usemont/scene-renderer',
    directory: path.join(repoRoot, 'packages/scene-renderer'),
    tarballPrefix: 'usemont-scene-renderer-'
  }
];

try {
  await run('pnpm', ['packages:build'], repoRoot);
  await run('install', ['-d', packDir, consumerDir], repoRoot);

  const tarballs = new Map();
  for (const packageInfo of publicPackages) {
    await run('pnpm', ['pack', '--pack-destination', packDir], packageInfo.directory);
    const packedFiles = await readdir(packDir);
    const tarball = packedFiles.find((file) =>
      file.startsWith(packageInfo.tarballPrefix) && file.endsWith('.tgz')
    );
    if (!tarball) {
      throw new Error(`Package ${packageInfo.name} did not produce a tarball.`);
    }
    const tarballPath = path.join(packDir, tarball);
    tarballs.set(packageInfo.name, tarballPath);
    await validatePackageMetadata(packageInfo, tarballPath);
  }

  await writeFile(
    path.join(consumerDir, 'package.json'),
    JSON.stringify({ name: 'usemont-renderer-consumer-smoke', private: true, type: 'module' }, null, 2)
  );
  await run(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--cache',
      npmCacheDir,
      tarballs.get('@usemont/scene-model'),
      tarballs.get('@usemont/programmatic-spans'),
      tarballs.get('@usemont/scene-renderer')
    ],
    consumerDir
  );
  await writeFile(
    path.join(consumerDir, 'smoke.mjs'),
    [
      "import { createVisual } from '@usemont/scene-model';",
      "import { compileProgrammaticSpanTsx } from '@usemont/programmatic-spans';",
      "import { createProgrammaticSceneFramePlan, drawProgrammaticSceneFrame } from '@usemont/scene-renderer';",
      "const visual = createVisual('shape', 'shape-kf', 'rect', { x: 0, y: 0, width: 10, height: 10 });",
      "if (visual.type !== 'rect') throw new Error('scene-model import failed');",
      "const compiled = compileProgrammaticSpanTsx('export default defineSpanScene({ id: \"smoke\", width: 100, height: 100, durationMs: 1000, render() { return <Scene><Rect id=\"box\" x={0} y={0} width={10} height={10} /></Scene>; } });');",
      "if (!compiled.spec) throw new Error('programmatic-spans import failed');",
      "if (typeof drawProgrammaticSceneFrame !== 'function') throw new Error('scene-renderer import failed');",
      "const plan = createProgrammaticSceneFramePlan({ visuals: [visual] });",
      "if (plan.visuals[0]?.id !== 'shape') throw new Error('scene-renderer frame plan failed');"
    ].join('\n')
  );
  await run('node', ['smoke.mjs'], consumerDir);

  console.log('Public renderer package validation passed.');
} finally {
  await rm(tempRoot, { recursive: true, force: true });
}

async function validatePackageMetadata(packageInfo, tarballPath) {
  const { stdout } = await execFileAsync('tar', ['-xOf', tarballPath, 'package/package.json'], {
    cwd: repoRoot,
    encoding: 'utf8'
  });
  const packageJson = JSON.parse(stdout);
  if (packageJson.name !== packageInfo.name) {
    throw new Error(`Expected ${packageInfo.name} tarball, got ${packageJson.name}.`);
  }
  if (packageJson.private === true) {
    throw new Error(`${packageInfo.name} is still marked private.`);
  }
  if (packageJson.license !== 'Apache-2.0') {
    throw new Error(`${packageInfo.name} must declare Apache-2.0 license.`);
  }
  if (packageJson.publishConfig?.access !== 'public') {
    throw new Error(`${packageInfo.name} must publish with public access.`);
  }
  for (const [dependencyName, dependencySpec] of Object.entries(packageJson.dependencies ?? {})) {
    if (/^(workspace:|file:|link:)/.test(String(dependencySpec))) {
      throw new Error(`${packageInfo.name} leaks local dependency ${dependencyName}@${dependencySpec}.`);
    }
  }
}

async function run(command, args, cwd) {
  try {
    await execFileAsync(command, args, {
      cwd,
      stdio: 'inherit',
      encoding: 'utf8'
    });
  } catch (error) {
    const details = [error.stdout, error.stderr].filter(Boolean).join('\n');
    throw new Error(`${command} ${args.join(' ')} failed${details ? `:\n${details}` : ''}`);
  }
}
