#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { createVisual } from '../packages/scene-model/dist/index.js';
import {
  compileProgrammaticSpanTsx,
  ensureProgrammaticSpanLayoutEngineReady,
  evaluateProgrammaticSpanFrame,
  getProgrammaticSpanExample
} from '../packages/programmatic-spans/dist/index.js';
import {
  createProgrammaticSceneFramePlan,
  drawProgrammaticSceneFrame,
  readVisualAttribute
} from '../packages/scene-renderer/dist/index.js';

const EXPECTED_FRAME_SIGNATURES = {
  'product-promo': 'f2ac597bcc9edd425513',
  'text-effects-showcase': '974db9af1da8c680de3c',
  'media-showcase': 'af88d6afec93650e9419',
  'shape-showcase': 'a0f0a30c062cf9f6962d',
  'render-effects-showcase': 'e464a06ceb43e0d2ccc1',
  procedural: '7b3bc36fc585ca4a4063'
};

const exampleCases = [
  {
    id: 'product-promo',
    timeMs: 1800,
    settings: {
      primary: '#ef4444',
      ctaLabel: 'Launch',
      metricValue: 6.2
    },
    assertFrame(frame) {
      assert.equal(readVisualAttribute(requiredVisual(frame, 'cta'), 'fill'), '#ef4444');
      assert.equal(readVisualAttribute(requiredVisual(frame, 'cta-label'), 'text'), 'Launch');
      assert.equal(readVisualAttribute(requiredVisual(frame, 'headline'), 'text'), 'Ship the exact\ndemo');
      assert.ok(Number(readVisualAttribute(requiredVisual(frame, 'metric-value'), 'size')) >= 48);
    }
  },
  {
    id: 'text-effects-showcase',
    timeMs: 2600,
    assertFrame(frame) {
      assert.ok(frame.visuals.some((visual) => visual.id.startsWith('word-text-reveal-')));
      assert.ok(frame.visuals.some((visual) => visual.id.startsWith('letter-text-reveal-')));
      assert.equal(readVisualAttribute(requiredVisual(frame, 'count-text'), 'text'), '4.2x');
    }
  },
  {
    id: 'media-showcase',
    timeMs: 2400,
    assertFrame(frame) {
      assert.equal(requiredVisual(frame, 'vector-logo').type, 'image');
      assert.equal(requiredVisual(frame, 'bitmap-logo').type, 'image');
      assert.equal(requiredVisual(frame, 'gif-swatch').type, 'image');
      assert.equal(requiredVisual(frame, 'pulse-lottie').type, 'lottie');
      assert.equal(requiredVisual(frame, 'duck-model').type, 'model3d');
    }
  },
  {
    id: 'shape-showcase',
    timeMs: 2400,
    assertFrame(frame) {
      for (const [id, type] of [
        ['star-shape', 'star'],
        ['arrow-shape', 'arrow'],
        ['callout-shape', 'calloutBox'],
        ['arc-shape', 'arc'],
        ['line-shape', 'line'],
        ['turn-shape', 'turnArrow'],
        ['triangle-shape', 'triangle'],
        ['diamond-shape', 'diamond']
      ]) {
        assert.equal(requiredVisual(frame, id).type, type);
      }
    }
  },
  {
    id: 'render-effects-showcase',
    timeMs: 2400,
    assertFrame(frame) {
      assert.equal(readVisualAttribute(requiredVisual(frame, 'blur-backdrop'), 'blur'), 9);
      assert.equal(readVisualAttribute(requiredVisual(frame, 'shadow-card'), 'shadowColor'), '#020617');
      assert.equal(readVisualAttribute(requiredVisual(frame, 'glow-arc'), 'shadowColor'), '#67e8f9');
      assert.equal(readVisualAttribute(requiredVisual(frame, 'tilt-callout'), 'tiltShiftBlur'), 13);
    }
  }
];

async function main() {
  await ensureProgrammaticSpanLayoutEngineReady();

  const actualSignatures = {};
  for (const exampleCase of exampleCases) {
    const example = getProgrammaticSpanExample(exampleCase.id);
    const compiled = compileProgrammaticSpanTsx(example.source);
    assertNoErrors(`${exampleCase.id} compile`, compiled.diagnostics);
    assert.ok(compiled.spec, `${exampleCase.id} should compile to a spec`);

    const frame = evaluateProgrammaticSpanFrame(
      compiled.spec,
      exampleCase.timeMs,
      exampleCase.variables ?? {},
      exampleCase.settings ?? {}
    );
    assertNoErrors(`${exampleCase.id} frame`, frame.diagnostics);
    exampleCase.assertFrame(frame);

    const render = renderFrame(compiled.spec, frame, exampleCase.timeMs);
    assert.deepEqual(render.plan.unsupportedVisualTypes, [], `${exampleCase.id} has unsupported plan types`);
    assert.deepEqual(render.result.unsupportedVisualTypes, [], `${exampleCase.id} has unsupported visual types`);
    assert.ok(render.operations.length > 40, `${exampleCase.id} should issue visible draw operations`);
    actualSignatures[exampleCase.id] = render.signature;
  }

  const procedural = compileProgrammaticSpanTsx(PROCEDURAL_SMOKE_SOURCE);
  assertNoErrors('procedural compile', procedural.diagnostics);
  assert.ok(procedural.spec, 'procedural source should compile');
  const proceduralFrame = evaluateProgrammaticSpanFrame(
    procedural.spec,
    1000,
    {},
    { accent: '#22c55e', label: 'Voronoi field' }
  );
  assertNoErrors('procedural frame', proceduralFrame.diagnostics);
  assert.ok(proceduralFrame.visuals.some((visual) => visual.type === 'rect'));
  assert.ok(proceduralFrame.visuals.some((visual) => readVisualAttribute(visual, 'proceduralKind') === 'mesh2d'));
  assert.ok(proceduralFrame.visuals.some((visual) => readVisualAttribute(visual, 'proceduralKind') === 'scene3d'));
  assert.ok(proceduralFrame.visuals.some((visual) => readVisualAttribute(visual, 'proceduralKind') === 'shader'));
  const proceduralRender = renderFrame(procedural.spec, proceduralFrame, 1000);
  assert.deepEqual(proceduralRender.plan.unsupportedVisualTypes, [], 'procedural source has unsupported plan types');
  assert.deepEqual(proceduralRender.result.unsupportedVisualTypes, [], 'procedural source has unsupported visual types');
  actualSignatures.procedural = proceduralRender.signature;

  const unsupportedRender = renderUnsupportedVisual();
  assert.deepEqual(unsupportedRender.result.unsupportedVisualTypes, ['video']);
  assert.ok(
    unsupportedRender.operations.some((operation) => operation.name === 'fillText' && operation.args[0] === 'video'),
    'unsupported visuals should draw an explicit placeholder label'
  );

  if (process.env.UPDATE_RENDERER_SMOKE_GOLDENS === '1') {
    console.log(JSON.stringify(actualSignatures, null, 2));
  } else {
    assert.deepEqual(actualSignatures, EXPECTED_FRAME_SIGNATURES);
  }

  console.log('Programmatic renderer smoke passed.');
}

function renderFrame(spec, frame, timestampMs) {
  const canvas = new RecordingCanvas();
  const plan = createProgrammaticSceneFramePlan({ visuals: frame.visuals });
  const result = drawProgrammaticSceneFrame({
    canvas,
    visuals: frame.visuals,
    sceneWidth: spec.width,
    sceneHeight: spec.height,
    timestampMs,
    background: '#0f172a',
    devicePixelRatio: 1
  });
  const signature = signatureForOperations(canvas.context.operations);
  return { plan, result, operations: canvas.context.operations, signature };
}

function renderUnsupportedVisual() {
  const canvas = new RecordingCanvas();
  const result = drawProgrammaticSceneFrame({
    canvas,
    visuals: [
      createVisual('foreign-video', 'foreign-video-kf', 'video', {
        x: 24,
        y: 32,
        width: 240,
        height: 136,
        layer: 4
      })
    ],
    sceneWidth: 320,
    sceneHeight: 200,
    timestampMs: 0,
    devicePixelRatio: 1
  });
  return { result, operations: canvas.context.operations };
}

function requiredVisual(frame, id) {
  const visual = frame.visuals.find((candidate) => candidate.id === id);
  assert.ok(visual, `Expected visual "${id}"`);
  return visual;
}

function assertNoErrors(label, diagnostics) {
  const errors = diagnostics.filter((diagnostic) => diagnostic.severity === 'error');
  assert.deepEqual(errors, [], `${label} emitted errors`);
}

function signatureForOperations(operations) {
  return createHash('sha256').update(JSON.stringify(operations)).digest('hex').slice(0, 20);
}

class RecordingCanvas {
  constructor() {
    this.width = 0;
    this.height = 0;
    this.style = {};
    this.context = new RecordingCanvasContext2D();
  }

  getContext(kind) {
    return kind === '2d' ? this.context : null;
  }
}

class RecordingCanvasContext2D {
  constructor() {
    this.operations = [];
    this.state = {
      fillStyle: '#000000',
      strokeStyle: '#000000',
      lineWidth: 1,
      lineCap: 'butt',
      lineJoin: 'miter',
      globalAlpha: 1,
      filter: 'none',
      shadowColor: 'transparent',
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      textAlign: 'start',
      textBaseline: 'alphabetic',
      font: '10px sans-serif',
      globalCompositeOperation: 'source-over'
    };
  }

  record(name, args = []) {
    this.operations.push({ name, args: args.map(normalizeOperationValue) });
  }

  save() { this.record('save'); }
  restore() { this.record('restore'); }
  setTransform(...args) { this.record('setTransform', args); }
  clearRect(...args) { this.record('clearRect', args); }
  fillRect(...args) { this.record('fillRect', args); }
  beginPath() { this.record('beginPath'); }
  closePath() { this.record('closePath'); }
  moveTo(...args) { this.record('moveTo', args); }
  lineTo(...args) { this.record('lineTo', args); }
  quadraticCurveTo(...args) { this.record('quadraticCurveTo', args); }
  arc(...args) { this.record('arc', args); }
  ellipse(...args) { this.record('ellipse', args); }
  fill(...args) { this.record('fill', args); }
  stroke() { this.record('stroke'); }
  translate(...args) { this.record('translate', args); }
  rotate(...args) { this.record('rotate', args); }
  scale(...args) { this.record('scale', args); }
  drawImage(...args) { this.record('drawImage', args); }
  fillText(text, x, y) { this.record('fillText', [String(text), x, y]); }

  measureText(text) {
    const fontSize = Number(/(\d+(?:\.\d+)?)px/.exec(this.state.font)?.[1] ?? 16);
    const weight = /(?:^|\s)(800|900|bold)\s/.test(this.state.font) ? 0.62 : 0.56;
    return { width: String(text).length * fontSize * weight };
  }
}

for (const property of [
  'fillStyle',
  'strokeStyle',
  'lineWidth',
  'lineCap',
  'lineJoin',
  'globalAlpha',
  'filter',
  'shadowColor',
  'shadowBlur',
  'shadowOffsetX',
  'shadowOffsetY',
  'textAlign',
  'textBaseline',
  'font',
  'globalCompositeOperation'
]) {
  Object.defineProperty(RecordingCanvasContext2D.prototype, property, {
    get() {
      return this.state[property];
    },
    set(value) {
      this.state[property] = value;
      this.record(`set:${property}`, [value]);
    }
  });
}

function normalizeOperationValue(value) {
  if (typeof value === 'number') return Number(value.toFixed(3));
  if (typeof value === 'string') return value.length > 180 ? `${value.slice(0, 177)}...` : value;
  if (value == null) return value;
  return String(value);
}

const PROCEDURAL_SMOKE_SOURCE = `export default defineSpanScene({
  id: "procedural-renderer-smoke",
  width: 640,
  height: 360,
  durationMs: 2000,
  settings: {
    accent: colorSetting("#14b8a6", { label: "Accent" }),
    label: stringSetting("Procedural field", { label: "Label" })
  },
  tokens: {
    backdrop: color.darken(settings.accent, 0.74),
    glow: color.mix(settings.accent, "#ffffff", 0.42)
  },
  render({ settings, tokens }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={640} height={360} fill={tokens.backdrop} layer={0} />
        <Text id="label" text={settings.label} x={48} y={32} width={420} height={58} size={38} color="#f8fafc" layer={4} />
        <Procedural.Visual
          id="procedural"
          x={64}
          y={104}
          width={512}
          height={190}
          seed={9}
          layer={2}
          render={(api) => {
            const layer = api.layer2d("paint").fill(api.tokens.glow, 0.82).stroke("#ffffff", 2);
            for (let i = 0; i < 8; i += 1) {
              const x = api.random.range(i, 12, api.width - 52);
              const y = api.random.range(i + 20, 18, api.height - 42);
              layer.circle(x, y, api.random.range(i + 40, 12, 26), { layer: i % 3 });
            }
            const mesh = api.mesh2d("mesh").fill(api.settings.accent, 0.42).stroke("#ccfbf1", 1);
            mesh.triangle({ x: 0, y: api.height }, { x: api.width * 0.34, y: 24 }, { x: api.width * 0.72, y: api.height }, { layer: 3 });
            mesh.triangle({ x: api.width * 0.24, y: api.height }, { x: api.width * 0.64, y: 18 }, { x: api.width, y: api.height }, { fill: "#38bdf8", opacity: 0.34, layer: 4 });
            const scene = api.scene3d("objects").fill(api.settings.accent, 0.76).stroke("#0f172a");
            scene.box({ x: -78, y: -22, z: -12, width: 74, height: 62, depth: 44, layer: 6 });
            scene.sphere({ x: 82, y: 16, z: 20, radius: 34, fill: "#bae6fd", layer: 7 });
            const shader = api.shader.wgsl({
              id: "scanlines",
              code: "@fragment fn main() -> @location(0) vec4f { return vec4f(0.0, 1.0, 1.0, 1.0); }",
              opacity: 0.32,
              layer: 8
            });
            return api.frame([layer, mesh, scene, shader]);
          }}
        />
      </Scene>
    );
  }
});`;

await main();
