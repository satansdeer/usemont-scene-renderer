#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { chromium } from 'playwright';

import {
  compileProgrammaticSpanTsx,
  ensureProgrammaticSpanLayoutEngineReady,
  evaluateProgrammaticSpanFrame,
  getProgrammaticSpanExample
} from '../packages/programmatic-spans/dist/index.js';

const repoRoot = process.cwd();
const example = getProgrammaticSpanExample('product-promo');
const compiled = compileProgrammaticSpanTsx(example.source);
assert.deepEqual(
  compiled.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
  [],
  'product-promo should compile without errors'
);
assert.ok(compiled.spec, 'product-promo should compile to a spec');

await ensureProgrammaticSpanLayoutEngineReady();
const frame = evaluateProgrammaticSpanFrame(compiled.spec, 3200, {}, {
  primary: '#14b8a6',
  ctaLabel: 'Create scene',
  metricValue: 4.8
});
assert.deepEqual(
  frame.diagnostics.filter((diagnostic) => diagnostic.severity === 'error'),
  [],
  'product-promo should evaluate without errors'
);

const server = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://127.0.0.1');
    if (requestUrl.pathname === '/') {
      response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      response.end(renderSmokeHtml({
        width: compiled.spec.width,
        height: compiled.spec.height,
        timestampMs: 3200,
        visuals: frame.visuals.map(plainVisual)
      }));
      return;
    }

    const filePath = path.normalize(path.join(repoRoot, requestUrl.pathname));
    if (!filePath.startsWith(repoRoot)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    response.writeHead(200, { 'content-type': contentTypeForPath(filePath) });
    response.end(await readFile(filePath));
  } catch (error) {
    response.writeHead(404);
    response.end(error instanceof Error ? error.message : String(error));
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert.ok(address && typeof address === 'object', 'browser smoke server should bind to a TCP port');

let browser;
try {
  browser = await chromium.launch({ headless: true });
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`Unable to launch Playwright Chromium. Run \`pnpm exec playwright install chromium\` first.\n${message}`);
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__rendererSmokeDone === true, null, { timeout: 10000 });
  const result = await page.evaluate(() => window.__rendererSmokeResult);
  assert.deepEqual(pageErrors, [], 'browser smoke should not emit page errors');
  assert.deepEqual(result.unsupportedVisualTypes, [], 'browser smoke should not hit unsupported visual types');
  assert.equal(result.width, 1280);
  assert.equal(result.height, 720);
  assert.ok(result.nonBackgroundPixels > 20000, `expected visible content, got ${result.nonBackgroundPixels} changed pixels`);
  console.log('Browser renderer smoke passed.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

function renderSmokeHtml(payload) {
  const json = JSON.stringify(payload).replaceAll('</script', '<\\/script');
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Usemont renderer browser smoke</title>
    <script type="importmap">
      {
        "imports": {
          "@usemont/scene-model": "/packages/scene-model/dist/index.js"
        }
      }
    </script>
  </head>
  <body style="margin:0;background:#0f172a">
    <canvas id="stage"></canvas>
    <script type="module">
      import { drawProgrammaticSceneFrame } from '/packages/scene-renderer/dist/index.js';
      const payload = ${json};
      const canvas = document.getElementById('stage');
      const result = drawProgrammaticSceneFrame({
        canvas,
        visuals: payload.visuals,
        sceneWidth: payload.width,
        sceneHeight: payload.height,
        timestampMs: payload.timestampMs,
        background: '#0f172a',
        devicePixelRatio: 1
      });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const context = canvas.getContext('2d');
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let nonBackgroundPixels = 0;
      for (let index = 0; index < data.length; index += 4) {
        if (data[index] !== 15 || data[index + 1] !== 23 || data[index + 2] !== 42) {
          nonBackgroundPixels += 1;
        }
      }
      window.__rendererSmokeResult = {
        width: result.width,
        height: result.height,
        unsupportedVisualTypes: result.unsupportedVisualTypes,
        pendingAssetCount: result.pendingAssetCount,
        nonBackgroundPixels
      };
      window.__rendererSmokeDone = true;
    </script>
  </body>
</html>`;
}

function plainVisual(visual) {
  return {
    ...visual,
    attributes: Object.fromEntries(visual.attributes),
    ...(visual.children ? { children: visual.children.map(plainVisual) } : {})
  };
}

function contentTypeForPath(filePath) {
  switch (path.extname(filePath)) {
    case '.js':
      return 'text/javascript; charset=utf-8';
    case '.json':
      return 'application/json; charset=utf-8';
    case '.wasm':
      return 'application/wasm';
    case '.html':
      return 'text/html; charset=utf-8';
    default:
      return 'text/plain; charset=utf-8';
  }
}
