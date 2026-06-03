import { parse } from '@babel/parser';
import {
  createVisual,
  type ShapeObjectType,
  type Visual,
  type VisualType
} from '@usemont/scene-model';

import type {
  ProgrammaticSpanDiagnostic,
  ProgrammaticSpanLiteral,
  ProgrammaticSpanSettings,
  ProgrammaticSpanTokens,
  ProgrammaticSpanVariables
} from './types.js';

type BabelNode = Record<string, any>;

export type ProceduralRenderProgram = {
  source: string;
  param: string;
  settingRefs: string[];
  tokenRefs: string[];
};

type ProceduralRuntimeContext = {
  id: string;
  timeMs: number;
  durationMs: number;
  sceneWidth: number;
  sceneHeight: number;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  opacity: number;
  layerOffset: number;
  variables: ProgrammaticSpanVariables;
  settings: ProgrammaticSpanSettings;
  tokens: ProgrammaticSpanTokens;
  diagnostics: ProgrammaticSpanDiagnostic[];
  seed: number;
};

type ProceduralLayer =
  | ProceduralDraw2dLayer
  | ProceduralMesh2dLayer
  | ProceduralScene3dLayer
  | ProceduralShaderLayer;

type ProceduralDraw2dLayer = {
  kind: 'draw2d';
  id: string;
  visuals: Visual[];
};

type ProceduralPoint2d = {
  x: number;
  y: number;
};

type ProceduralPoint3d = ProceduralPoint2d & {
  z: number;
};

type ProceduralMeshTriangle = {
  points: [ProceduralPoint2d, ProceduralPoint2d, ProceduralPoint2d];
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  layer: number;
};

type ProceduralMesh2dLayer = {
  kind: 'mesh2d';
  id: string;
  triangles: ProceduralMeshTriangle[];
};

type ProceduralScene3dObject = {
  kind: 'box' | 'sphere' | 'plane';
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  radius: number;
  fill: string;
  stroke: string;
  opacity: number;
  layer: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
};

type ProceduralScene3dLayer = {
  kind: 'scene3d';
  id: string;
  objects: ProceduralScene3dObject[];
  cameraConfig: Record<string, ProgrammaticSpanLiteral>;
};

type ProceduralShaderLayer = {
  kind: 'shader';
  id: string;
  language: 'wgsl';
  code: string;
  uniforms: Record<string, ProgrammaticSpanLiteral>;
  target: string;
  opacity: number;
  layer: number;
};

type ProceduralFrame = {
  kind: 'frame';
  layers: unknown[];
};

type DrawState = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  layer: number;
  blur: number;
  dx: number;
  dy: number;
};

type ProceduralBudget = {
  apiCalls: number;
  visuals: number;
  vertices: number;
  objects3d: number;
  shaderPasses: number;
};

const MAX_SOURCE_LENGTH = 16000;
const MAX_AST_NODES = 3200;
const MAX_FOR_LOOP_ITERATIONS = 1400;
const MAX_API_CALLS = 8000;
const MAX_VISUALS = 900;
const MAX_LAYERS = 24;
const MAX_MESH_VERTICES = 6000;
const MAX_3D_OBJECTS = 160;
const MAX_SHADER_PASSES = 4;
const MAX_SHADER_SOURCE_LENGTH = 8000;
const MAX_SHADER_UNIFORMS = 32;

const BLOCKED_IDENTIFIERS = new Set([
  'Array',
  'BigInt',
  'Date',
  'Function',
  'Map',
  'Object',
  'Promise',
  'Proxy',
  'Reflect',
  'RegExp',
  'Set',
  'Symbol',
  'XMLHttpRequest',
  'WeakMap',
  'WeakSet',
  'Worker',
  'WebSocket',
  'console',
  'crypto',
  'document',
  'eval',
  'fetch',
  'frames',
  'globalThis',
  'indexedDB',
  'importScripts',
  'localStorage',
  'location',
  'navigator',
  'parent',
  'performance',
  'process',
  'queueMicrotask',
  'require',
  'requestAnimationFrame',
  'self',
  'sessionStorage',
  'setInterval',
  'setTimeout',
  'top',
  'window'
]);

const BLOCKED_MEMBER_PROPERTIES = new Set([
  '__defineGetter__',
  '__defineSetter__',
  '__lookupGetter__',
  '__lookupSetter__',
  '__proto__',
  'constructor',
  'prototype'
]);

const ALLOWED_MATH_PROPERTIES = new Set([
  'E',
  'LN10',
  'LN2',
  'LOG10E',
  'LOG2E',
  'PI',
  'SQRT1_2',
  'SQRT2',
  'abs',
  'acos',
  'asin',
  'atan',
  'atan2',
  'ceil',
  'cos',
  'exp',
  'floor',
  'hypot',
  'max',
  'min',
  'pow',
  'round',
  'sign',
  'sin',
  'sqrt',
  'tan',
  'trunc'
]);

export function compileProceduralRenderProgram(
  source: string,
  param: string,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string
): ProceduralRenderProgram | null {
  const trimmed = source.trim();
  if (!trimmed || trimmed.length > MAX_SOURCE_LENGTH) {
    diagnostics.push({
      severity: 'warning',
      message: `Procedural render source must be between 1 and ${MAX_SOURCE_LENGTH} characters.`,
      path
    });
    return null;
  }

  let ast: BabelNode;
  try {
    ast = parse(`const __render = ${trimmed};`, {
      sourceType: 'module',
      plugins: ['typescript']
    }) as unknown as BabelNode;
  } catch (error) {
    diagnostics.push({
      severity: 'warning',
      message: `Procedural render did not parse: ${error instanceof Error ? error.message : String(error)}`,
      path
    });
    return null;
  }

  const validation = validateProceduralAst(ast, param);
  for (const message of validation.messages) {
    diagnostics.push({ severity: 'warning', message, path });
  }
  if (!validation.ok) return null;

  return {
    source: trimmed,
    param,
    settingRefs: [...validation.settingRefs].sort(),
    tokenRefs: [...validation.tokenRefs].sort()
  };
}

export function evaluateProceduralRenderProgram(
  program: ProceduralRenderProgram,
  context: ProceduralRuntimeContext
): Visual[] {
  const validationDiagnostics: ProgrammaticSpanDiagnostic[] = [];
  const validation = compileProceduralRenderProgram(
    program.source,
    program.param,
    validationDiagnostics,
    context.id
  );
  if (!validation) {
    context.diagnostics.push(...validationDiagnostics);
    return proceduralDiagnosticVisual(context, 'Procedural source rejected by static validation');
  }

  const budget: ProceduralBudget = {
    apiCalls: 0,
    visuals: 0,
    vertices: 0,
    objects3d: 0,
    shaderPasses: 0
  };
  const api = createProceduralApi(context, budget);
  let output: unknown;
  try {
    const render = createSandboxedRenderFunction(program.source);
    output = render(api, safeMath());
  } catch (error) {
    context.diagnostics.push({
      severity: 'warning',
      message: `Procedural render failed: ${error instanceof Error ? error.message : String(error)}`,
      path: context.id
    });
    return proceduralDiagnosticVisual(context, 'Procedural render failed');
  }

  return proceduralOutputToVisuals(output, context);
}

function validateProceduralAst(ast: BabelNode, apiParam: string): {
  ok: boolean;
  messages: string[];
  settingRefs: Set<string>;
  tokenRefs: Set<string>;
} {
  const messages: string[] = [];
  const settingRefs = new Set<string>();
  const tokenRefs = new Set<string>();
  let nodeCount = 0;

  const visit = (node: BabelNode | null | undefined) => {
    if (!node || typeof node !== 'object') return;
    nodeCount += 1;
    if (nodeCount > MAX_AST_NODES) {
      messages.push(`Procedural render exceeds ${MAX_AST_NODES} syntax nodes.`);
      return;
    }

    if (node.type === 'Identifier') {
      if (BLOCKED_IDENTIFIERS.has(node.name)) {
        messages.push(`Procedural render cannot access "${node.name}".`);
      }
    } else if (node.type === 'MemberExpression') {
      const property = memberPropertyName(node.property);
      if (property && BLOCKED_MEMBER_PROPERTIES.has(property)) {
        messages.push(`Procedural render cannot access member "${property}".`);
      }
      const path = memberExpressionPath(node);
      if (path[0] === 'Math' && path[1] && !ALLOWED_MATH_PROPERTIES.has(path[1])) {
        messages.push(`Math.${path[1]} is not available in procedural renders.`);
      }
      if (path[0] === apiParam && path[1] === 'settings' && path[2]) settingRefs.add(path[2]);
      if (path[0] === apiParam && path[1] === 'tokens' && path[2]) tokenRefs.add(path[2]);
    } else if (node.type === 'ForStatement') {
      const maxIterations = staticForLoopBound(node);
      if (maxIterations === null || maxIterations > MAX_FOR_LOOP_ITERATIONS) {
        messages.push(`Procedural for-loops need a static bound up to ${MAX_FOR_LOOP_ITERATIONS}.`);
      }
    } else if (node.type === 'WhileStatement' || node.type === 'DoWhileStatement') {
      messages.push('Procedural renders cannot use while/do-while loops; use bounded for-loops.');
    } else if (node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
      messages.push('Procedural renders cannot use for-in/for-of loops; use bounded numeric for-loops.');
    } else if (
      node.type === 'ImportExpression' ||
      node.type === 'AwaitExpression' ||
      node.type === 'YieldExpression' ||
      node.type === 'NewExpression' ||
      node.type === 'ThisExpression'
    ) {
      messages.push(`Procedural renders cannot use ${node.type}.`);
    }

    for (const [key, value] of Object.entries(node)) {
      if (key === 'loc' || key === 'start' || key === 'end' || key === 'extra') continue;
      if (Array.isArray(value)) {
        for (const item of value) visit(item as BabelNode);
      } else if (value && typeof value === 'object') {
        visit(value as BabelNode);
      }
    }
  };

  visit(ast);
  return {
    ok: messages.length === 0,
    messages: [...new Set(messages)],
    settingRefs,
    tokenRefs
  };
}

function createSandboxedRenderFunction(source: string): (api: unknown, math: Math) => unknown {
  const blocked = [
    'Array',
    'BigInt',
    'Date',
    'Function',
    'Map',
    'Object',
    'Promise',
    'Proxy',
    'Reflect',
    'RegExp',
    'Set',
    'Symbol',
    'XMLHttpRequest',
    'WeakMap',
    'WeakSet',
    'Worker',
    'WebSocket',
    'console',
    'crypto',
    'document',
    'fetch',
    'frames',
    'globalThis',
    'indexedDB',
    'importScripts',
    'localStorage',
    'location',
    'navigator',
    'parent',
    'performance',
    'process',
    'queueMicrotask',
    'require',
    'requestAnimationFrame',
    'self',
    'sessionStorage',
    'setInterval',
    'setTimeout',
    'top',
    'window'
  ];
  const body = `
    "use strict";
    const render = (${source});
    return render(api);
  `;
  return Function(...blocked, 'api', 'Math', body).bind(null, ...blocked.map(() => undefined)) as (api: unknown, math: Math) => unknown;
}

function safeMath(): Math {
  const math = Object.create(null);
  for (const key of ALLOWED_MATH_PROPERTIES) {
    Object.defineProperty(math, key, {
      value: (Math as unknown as Record<string, unknown>)[key],
      enumerable: true,
      configurable: false,
      writable: false
    });
  }
  return Object.freeze(math) as Math;
}

function createProceduralApi(context: ProceduralRuntimeContext, budget: ProceduralBudget): Record<string, unknown> {
  const seed = Number.isFinite(context.seed) ? context.seed : 1;
  const randomRange = (index: number, min = 0, max = 1) => min + seeded01(seed, index) * (max - min);
  const noise = (...values: number[]) => valueNoise(seed, values);
  const api: Record<string, unknown> = {
    width: context.width,
    height: context.height,
    sceneWidth: context.sceneWidth,
    sceneHeight: context.sceneHeight,
    settings: freezeRecord(context.settings),
    tokens: freezeRecord(context.tokens),
    variables: freezeRecord(context.variables),
    time: Object.freeze({
      ms: context.timeMs,
      seconds: context.timeMs / 1000,
      normalized: context.durationMs > 0 ? clamp(context.timeMs / context.durationMs, 0, 1) : 0
    }),
    math: Object.freeze({
      abs: Math.abs,
      clamp,
      cos: Math.cos,
      lerp,
      map: mapRange,
      max: Math.max,
      min: Math.min,
      sin: Math.sin
    }),
    random: Object.freeze({
      value: (index = 0) => randomRange(Number(index), 0, 1),
      range: (index = 0, min = 0, max = 1) => randomRange(Number(index), Number(min), Number(max))
    }),
    noise: Object.assign(noise, {
      value: noise,
      wave: (index = 0, speed = 1) => {
        const phase = randomRange(Number(index), 0, Math.PI * 2);
        return Math.sin(context.timeMs / 1000 * Number(speed) + phase) * 0.5 + 0.5;
      }
    }),
    layer2d: (id = 'layer') => {
      tickBudget(budget);
      return createDraw2dLayer(String(id), context, budget);
    },
    mesh2d: (id = 'mesh') => {
      tickBudget(budget);
      return createMesh2dLayer(String(id), context, budget);
    },
    layerMesh2d: (id = 'mesh') => {
      tickBudget(budget);
      return createMesh2dLayer(String(id), context, budget);
    },
    scene3d: (id = 'scene3d') => {
      tickBudget(budget);
      return createScene3dLayer(String(id), context, budget);
    },
    layer3d: (id = 'scene3d') => {
      tickBudget(budget);
      return createScene3dLayer(String(id), context, budget);
    },
    shader: Object.freeze({
      wgsl: (idOrOptions: unknown, code?: unknown, options?: unknown) => {
        tickBudget(budget);
        budget.shaderPasses += 1;
        if (budget.shaderPasses > MAX_SHADER_PASSES) {
          throw new Error(`Procedural render exceeded ${MAX_SHADER_PASSES} shader passes.`);
        }
        return createWgslShaderLayer(idOrOptions, code, options, context);
      }
    }),
    frame: (layers: unknown[]) => {
      tickBudget(budget);
      return { kind: 'frame', layers } satisfies ProceduralFrame;
    }
  };
  return Object.freeze(api);
}

function createDraw2dLayer(
  id: string,
  context: ProceduralRuntimeContext,
  budget: ProceduralBudget
): ProceduralLayer {
  const visuals: Visual[] = [];
  const stack: DrawState[] = [];
  let state: DrawState = {
    fill: '#ffffff',
    stroke: 'none',
    strokeWidth: 0,
    opacity: context.opacity,
    layer: context.layerOffset,
    blur: 0,
    dx: context.offsetX,
    dy: context.offsetY
  };

  const addVisual = (type: VisualType, attrs: Record<string, unknown>): Visual => {
    tickBudget(budget);
    budget.visuals += 1;
    if (budget.visuals > MAX_VISUALS) throw new Error(`Procedural render exceeded ${MAX_VISUALS} visuals.`);
    const visual = createVisual(`${context.id}-${id}-${visuals.length}`, `${context.id}-${id}-${visuals.length}-programmatic`, type, {
      ...attrs,
      x: finiteNumber(attrs.x, 0) + state.dx,
      y: finiteNumber(attrs.y, 0) + state.dy,
      fill: attrs.fill ?? state.fill,
      stroke: attrs.stroke ?? state.stroke,
      strokeWidth: attrs.strokeWidth ?? state.strokeWidth,
      opacity: finiteNumber(attrs.opacity, 1) * state.opacity,
      layer: finiteNumber(attrs.layer, 0) + state.layer,
      blur: finiteNumber(attrs.blur, state.blur)
    });
    visuals.push(visual);
    return visual;
  };

  const layer = {
    kind: 'draw2d' as const,
    id,
    visuals,
    fill(color: string, opacity?: number) {
      state = { ...state, fill: String(color), opacity: opacity == null ? state.opacity : context.opacity * clamp(Number(opacity), 0, 1) };
      return layer;
    },
    noFill() {
      state = { ...state, fill: 'transparent' };
      return layer;
    },
    stroke(color: string, width = state.strokeWidth || 1) {
      state = { ...state, stroke: String(color), strokeWidth: Math.max(0, Number(width) || 0) };
      return layer;
    },
    noStroke() {
      state = { ...state, stroke: 'none', strokeWidth: 0 };
      return layer;
    },
    strokeWeight(width: number) {
      state = { ...state, strokeWidth: Math.max(0, Number(width) || 0) };
      return layer;
    },
    opacity(value: number) {
      state = { ...state, opacity: context.opacity * clamp(Number(value), 0, 1) };
      return layer;
    },
    layer(value: number) {
      state = { ...state, layer: context.layerOffset + Number(value) };
      return layer;
    },
    blur(value: number) {
      state = { ...state, blur: Math.max(0, Number(value) || 0) };
      return layer;
    },
    push() {
      stack.push({ ...state });
      return layer;
    },
    pop() {
      state = stack.pop() ?? state;
      return layer;
    },
    translate(x: number, y: number) {
      state = { ...state, dx: state.dx + Number(x), dy: state.dy + Number(y) };
      return layer;
    },
    rect(x: number, y: number, width: number, height: number, radius = 0, attrs: Record<string, unknown> = {}) {
      return addVisual('rect', { x, y, width, height, radius, cornerRadius: radius, ...attrs });
    },
    circle(x: number, y: number, radius: number, attrs: Record<string, unknown> = {}) {
      const size = Math.max(0, Number(radius) * 2);
      return addVisual('circle', { x: Number(x) - size / 2, y: Number(y) - size / 2, width: size, height: size, radius, ...attrs });
    },
    ellipse(x: number, y: number, width: number, height: number, attrs: Record<string, unknown> = {}) {
      return addVisual('ellipse', { x: Number(x) - Number(width) / 2, y: Number(y) - Number(height) / 2, width, height, ...attrs });
    },
    line(x1: number, y1: number, x2: number, y2: number, attrs: Record<string, unknown> = {}) {
      return addVisual('line', { x: 0, y: 0, x1: Number(x1) + state.dx, y1: Number(y1) + state.dy, x2: Number(x2) + state.dx, y2: Number(y2) + state.dy, ...attrs });
    },
    text(text: string, x: number, y: number, width = 320, height = 80, attrs: Record<string, unknown> = {}) {
      return addVisual('text', {
        x,
        y,
        width,
        height,
        text: String(text),
        content: String(text),
        fontSize: attrs.fontSize ?? attrs.size ?? 32,
        size: attrs.size ?? attrs.fontSize ?? 32,
        fontWeight: attrs.fontWeight ?? attrs.weight ?? '700',
        weight: attrs.weight ?? attrs.fontWeight ?? '700',
        textAlign: attrs.textAlign ?? attrs.align ?? 'left',
        align: attrs.align ?? attrs.textAlign ?? 'left',
        ...attrs
      });
    }
  };
  return Object.freeze(layer) as unknown as ProceduralLayer;
}

function createMesh2dLayer(
  id: string,
  context: ProceduralRuntimeContext,
  budget: ProceduralBudget
): ProceduralMesh2dLayer {
  const triangles: ProceduralMeshTriangle[] = [];
  let state = {
    fill: '#ffffff',
    stroke: 'none',
    strokeWidth: 0,
    opacity: context.opacity,
    layer: context.layerOffset
  };

  const addTriangle = (
    a: unknown,
    b: unknown,
    c: unknown,
    attrs: Record<string, unknown> = {}
  ) => {
    tickBudget(budget);
    budget.vertices += 3;
    if (budget.vertices > MAX_MESH_VERTICES) {
      throw new Error(`Procedural render exceeded ${MAX_MESH_VERTICES} mesh vertices.`);
    }
    triangles.push({
      points: [
        proceduralPoint2d(a),
        proceduralPoint2d(b),
        proceduralPoint2d(c)
      ],
      fill: stringValue(attrs.fill, state.fill),
      stroke: stringValue(attrs.stroke, state.stroke),
      strokeWidth: finiteNumber(attrs.strokeWidth, state.strokeWidth),
      opacity: clamp(finiteNumber(attrs.opacity, 1) * state.opacity, 0, 1),
      layer: finiteNumber(attrs.layer, 0) + state.layer
    });
    return layer;
  };

  const layer = {
    kind: 'mesh2d' as const,
    id,
    triangles,
    fill(color: string, opacity?: number) {
      state = { ...state, fill: String(color), opacity: opacity == null ? state.opacity : context.opacity * clamp(Number(opacity), 0, 1) };
      return layer;
    },
    stroke(color: string, width = state.strokeWidth || 1) {
      state = { ...state, stroke: String(color), strokeWidth: Math.max(0, Number(width) || 0) };
      return layer;
    },
    noStroke() {
      state = { ...state, stroke: 'none', strokeWidth: 0 };
      return layer;
    },
    opacity(value: number) {
      state = { ...state, opacity: context.opacity * clamp(Number(value), 0, 1) };
      return layer;
    },
    layer(value: number) {
      state = { ...state, layer: context.layerOffset + Number(value) };
      return layer;
    },
    triangle(a: unknown, b: unknown, c: unknown, attrs: Record<string, unknown> = {}) {
      return addTriangle(a, b, c, attrs);
    },
    quad(a: unknown, b: unknown, c: unknown, d: unknown, attrs: Record<string, unknown> = {}) {
      addTriangle(a, b, c, attrs);
      return addTriangle(a, c, d, attrs);
    }
  };
  return Object.freeze(layer) as unknown as ProceduralMesh2dLayer;
}

function createScene3dLayer(
  id: string,
  context: ProceduralRuntimeContext,
  budget: ProceduralBudget
): ProceduralScene3dLayer {
  const objects: ProceduralScene3dObject[] = [];
  let state = {
    fill: '#ffffff',
    stroke: 'none',
    opacity: context.opacity,
    layer: context.layerOffset
  };
  const layer = {
    kind: 'scene3d' as const,
    id,
    objects,
    cameraConfig: {
      x: 0,
      y: 0,
      z: 520,
      lookAtX: 0,
      lookAtY: 0,
      lookAtZ: 0,
      fov: 42
    } as Record<string, ProgrammaticSpanLiteral>,
    fill(color: string, opacity?: number) {
      state = { ...state, fill: String(color), opacity: opacity == null ? state.opacity : context.opacity * clamp(Number(opacity), 0, 1) };
      return layer;
    },
    stroke(color: string) {
      state = { ...state, stroke: String(color) };
      return layer;
    },
    noStroke() {
      state = { ...state, stroke: 'none' };
      return layer;
    },
    opacity(value: number) {
      state = { ...state, opacity: context.opacity * clamp(Number(value), 0, 1) };
      return layer;
    },
    layer(value: number) {
      state = { ...state, layer: context.layerOffset + Number(value) };
      return layer;
    },
    camera(config: Record<string, unknown>) {
      layer.cameraConfig = sanitizeCamera3d(config);
      return layer;
    },
    box(config: Record<string, unknown>) {
      return addScene3dObject('box', config);
    },
    sphere(config: Record<string, unknown>) {
      return addScene3dObject('sphere', config);
    },
    plane(config: Record<string, unknown>) {
      return addScene3dObject('plane', config);
    }
  };

  const addScene3dObject = (kind: ProceduralScene3dObject['kind'], config: Record<string, unknown>) => {
    tickBudget(budget);
    budget.objects3d += 1;
    if (budget.objects3d > MAX_3D_OBJECTS) {
      throw new Error(`Procedural render exceeded ${MAX_3D_OBJECTS} 3D objects.`);
    }
    const point = proceduralPoint3d(config);
    objects.push({
      kind,
      x: point.x,
      y: point.y,
      z: point.z,
      width: finiteNumber(config.width, finiteNumber(config.size, 80)),
      height: finiteNumber(config.height, finiteNumber(config.size, 80)),
      depth: finiteNumber(config.depth, finiteNumber(config.size, 80)),
      radius: finiteNumber(config.radius, finiteNumber(config.size, 48)),
      fill: stringValue(config.fill, state.fill),
      stroke: stringValue(config.stroke, state.stroke),
      opacity: clamp(finiteNumber(config.opacity, 1) * state.opacity, 0, 1),
      layer: finiteNumber(config.layer, 0) + state.layer,
      rotationX: finiteNumber(config.rotationX, 0),
      rotationY: finiteNumber(config.rotationY, 0),
      rotationZ: finiteNumber(config.rotationZ, 0)
    });
    return layer;
  };

  return layer as unknown as ProceduralScene3dLayer;
}

function createWgslShaderLayer(
  idOrOptions: unknown,
  code: unknown,
  options: unknown,
  context: ProceduralRuntimeContext
): ProceduralShaderLayer {
  const config = idOrOptions && typeof idOrOptions === 'object' && !Array.isArray(idOrOptions)
    ? idOrOptions as Record<string, unknown>
    : {
        id: idOrOptions,
        code,
        ...(options && typeof options === 'object' && !Array.isArray(options) ? options as Record<string, unknown> : {})
      };
  return {
    kind: 'shader',
    id: stringValue(config.id, 'shader'),
    language: 'wgsl',
    code: stringValue(config.code, ''),
    uniforms: sanitizeUniforms(config.uniforms),
    target: stringValue(config.target, 'scene'),
    opacity: context.opacity * clamp(finiteNumber(config.opacity, 1), 0, 1),
    layer: context.layerOffset + finiteNumber(config.layer, 0)
  };
}

function proceduralOutputToVisuals(output: unknown, context: ProceduralRuntimeContext): Visual[] {
  const layers = output && typeof output === 'object' && (output as { kind?: unknown }).kind === 'frame'
    ? (output as { layers?: unknown }).layers
    : Array.isArray(output)
      ? output
      : [output];

  if (!Array.isArray(layers)) {
    context.diagnostics.push({ severity: 'warning', message: 'Procedural render must return api.frame([...]) or an array of layers.', path: context.id });
    return proceduralDiagnosticVisual(context, 'Invalid procedural output');
  }
  if (layers.length > MAX_LAYERS) {
    context.diagnostics.push({ severity: 'warning', message: `Procedural render exceeded ${MAX_LAYERS} layers.`, path: context.id });
    return proceduralDiagnosticVisual(context, 'Too many procedural layers');
  }

  const visuals: Visual[] = [];
  for (const layer of layers) {
    if (layer && typeof layer === 'object' && (layer as { kind?: unknown }).kind === 'draw2d' && Array.isArray((layer as { visuals?: unknown }).visuals)) {
      visuals.push(...((layer as { visuals: Visual[] }).visuals));
    } else if (isProceduralMesh2dLayer(layer)) {
      const visual = mesh2dLayerToVisual(layer, context);
      if (visual) visuals.push(visual);
    } else if (isProceduralScene3dLayer(layer)) {
      const visual = scene3dLayerToVisual(layer, context);
      if (visual) visuals.push(visual);
    } else if (isProceduralShaderLayer(layer)) {
      const shaderDiagnostics = validateWgslShader(layer.code);
      if (shaderDiagnostics.length) {
        for (const message of shaderDiagnostics) {
          context.diagnostics.push({ severity: 'warning', message: `WGSL shader "${layer.id}": ${message}`, path: context.id });
        }
        visuals.push(...proceduralDiagnosticVisual(context, `WGSL shader "${layer.id}" failed validation`));
      } else {
        visuals.push(shaderLayerToVisual(layer, context));
      }
    } else if (isVisual(layer)) {
      visuals.push(layer);
    } else {
      context.diagnostics.push({ severity: 'warning', message: 'Ignoring invalid procedural layer output.', path: context.id });
    }
  }
  return visuals.length ? visuals : proceduralDiagnosticVisual(context, 'Procedural output was empty');
}

function mesh2dLayerToVisual(layer: ProceduralMesh2dLayer, context: ProceduralRuntimeContext): Visual | null {
  if (!layer.triangles.length) {
    context.diagnostics.push({ severity: 'warning', message: `Mesh layer "${layer.id}" is empty.`, path: context.id });
    return null;
  }
  return createVisual(`${context.id}-${layer.id}-mesh2d`, `${context.id}-${layer.id}-mesh2d-programmatic`, 'group', {
    x: context.offsetX,
    y: context.offsetY,
    width: context.width,
    height: context.height,
    proceduralKind: 'mesh2d',
    triangles: layer.triangles,
    layer: minLayer(layer.triangles.map((triangle) => triangle.layer), context.layerOffset),
    opacity: context.opacity
  });
}

function scene3dLayerToVisual(layer: ProceduralScene3dLayer, context: ProceduralRuntimeContext): Visual | null {
  if (!layer.objects.length) {
    context.diagnostics.push({ severity: 'warning', message: `3D scene layer "${layer.id}" is empty.`, path: context.id });
    return null;
  }
  return createVisual(`${context.id}-${layer.id}-scene3d`, `${context.id}-${layer.id}-scene3d-programmatic`, 'group', {
    x: context.offsetX,
    y: context.offsetY,
    width: context.width,
    height: context.height,
    proceduralKind: 'scene3d',
    objects: layer.objects,
    camera: layer.cameraConfig,
    layer: minLayer(layer.objects.map((object) => object.layer), context.layerOffset),
    opacity: context.opacity
  });
}

function shaderLayerToVisual(layer: ProceduralShaderLayer, context: ProceduralRuntimeContext): Visual {
  return createVisual(`${context.id}-${layer.id}-shader`, `${context.id}-${layer.id}-shader-programmatic`, 'group', {
    x: context.offsetX,
    y: context.offsetY,
    width: context.width,
    height: context.height,
    proceduralKind: 'shader',
    shader: {
      language: layer.language,
      code: layer.code,
      uniforms: layer.uniforms,
      target: layer.target
    },
    layer: layer.layer,
    opacity: layer.opacity
  });
}

function isProceduralMesh2dLayer(value: unknown): value is ProceduralMesh2dLayer {
  return !!value &&
    typeof value === 'object' &&
    (value as { kind?: unknown }).kind === 'mesh2d' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    Array.isArray((value as { triangles?: unknown }).triangles);
}

function isProceduralScene3dLayer(value: unknown): value is ProceduralScene3dLayer {
  return !!value &&
    typeof value === 'object' &&
    (value as { kind?: unknown }).kind === 'scene3d' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    Array.isArray((value as { objects?: unknown }).objects);
}

function isProceduralShaderLayer(value: unknown): value is ProceduralShaderLayer {
  return !!value &&
    typeof value === 'object' &&
    (value as { kind?: unknown }).kind === 'shader' &&
    (value as { language?: unknown }).language === 'wgsl' &&
    typeof (value as { id?: unknown }).id === 'string' &&
    typeof (value as { code?: unknown }).code === 'string';
}

function validateWgslShader(code: string): string[] {
  const messages: string[] = [];
  if (!code.trim()) messages.push('shader source is empty.');
  if (code.length > MAX_SHADER_SOURCE_LENGTH) {
    messages.push(`shader source exceeds ${MAX_SHADER_SOURCE_LENGTH} characters.`);
  }
  if (!/@fragment\b/.test(code)) messages.push('shader must declare an @fragment entry point.');
  if (!/\bfn\s+[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(code)) messages.push('shader must define a function.');
  if (!/\bvec4(?:f|<\s*f32\s*>)\b/.test(code)) messages.push('fragment shader should return vec4f color output.');
  const bannedPatterns: Array<[RegExp, string]> = [
    [/\bwhile\b/, 'while loops are not allowed in procedural WGSL.'],
    [/\bloop\b/, 'unbounded loop blocks are not allowed in procedural WGSL.'],
    [/\btextureStore\b/, 'storage texture writes are not allowed.'],
    [/\bvar\s*<\s*storage\s*>/, 'storage buffers are not allowed.'],
    [/\bvar\s*<\s*workgroup\s*>/, 'workgroup memory is not allowed.'],
    [/\batomic[A-Z_]/, 'atomic operations are not allowed.'],
    [/\bdiscard\b/, 'discard is not allowed in procedural WGSL previews.']
  ];
  for (const [pattern, message] of bannedPatterns) {
    if (pattern.test(code)) messages.push(message);
  }
  if (!hasBalancedShaderDelimiters(code)) messages.push('shader delimiters are not balanced.');
  return [...new Set(messages)];
}

function proceduralDiagnosticVisual(context: ProceduralRuntimeContext, message: string): Visual[] {
  return [
    createVisual(`${context.id}-diagnostic`, `${context.id}-diagnostic-programmatic`, 'rect', {
      x: context.offsetX,
      y: context.offsetY,
      width: Math.max(1, context.width),
      height: Math.max(1, context.height),
      fill: '#fee2e2',
      stroke: '#ef4444',
      strokeWidth: 3,
      opacity: context.opacity,
      layer: context.layerOffset
    }),
    createVisual(`${context.id}-diagnostic-text`, `${context.id}-diagnostic-text-programmatic`, 'text', {
      x: context.offsetX + 24,
      y: context.offsetY + 24,
      width: Math.max(1, context.width - 48),
      height: 80,
      content: message,
      text: message,
      fill: '#991b1b',
      fontSize: 26,
      fontWeight: '800',
      opacity: context.opacity,
      layer: context.layerOffset + 0.1
    })
  ];
}

function tickBudget(budget: ProceduralBudget): void {
  budget.apiCalls += 1;
  if (budget.apiCalls > MAX_API_CALLS) throw new Error(`Procedural render exceeded ${MAX_API_CALLS} API calls.`);
}

function freezeRecord(record: Record<string, ProgrammaticSpanLiteral>): Record<string, ProgrammaticSpanLiteral> {
  return Object.freeze({ ...record });
}

function isVisual(value: unknown): value is Visual {
  return !!value &&
    typeof value === 'object' &&
    typeof (value as Visual).id === 'string' &&
    typeof (value as Visual).type === 'string' &&
    (value as Visual).attributes instanceof Map;
}

function staticForLoopBound(node: BabelNode): number | null {
  const init = staticForLoopInit(node.init);
  if (!init) return null;
  const test = staticForLoopTest(node.test, init.variable);
  if (!test) return null;
  const step = staticForLoopStep(node.update, init.variable);
  if (step === null) return null;

  const direction = test.operator === '<' || test.operator === '<=' ? 'ascending' : 'descending';
  if ((direction === 'ascending' && step <= 0) || (direction === 'descending' && step >= 0)) return null;

  const absoluteStep = Math.abs(step);
  if (direction === 'ascending') {
    if (test.operator === '<') {
      if (init.start >= test.bound) return 0;
      return Math.ceil((test.bound - init.start) / absoluteStep);
    }
    if (init.start > test.bound) return 0;
    return Math.floor((test.bound - init.start) / absoluteStep) + 1;
  }

  if (test.operator === '>') {
    if (init.start <= test.bound) return 0;
    return Math.ceil((init.start - test.bound) / absoluteStep);
  }
  if (init.start < test.bound) return 0;
  return Math.floor((init.start - test.bound) / absoluteStep) + 1;
}

function staticForLoopInit(node: BabelNode | null | undefined): { variable: string; start: number } | null {
  if (!node) return null;
  if (node.type === 'VariableDeclaration') {
    const declarations = Array.isArray(node.declarations) ? node.declarations : [];
    if (declarations.length !== 1) return null;
    const declaration = declarations[0];
    if (declaration?.id?.type !== 'Identifier') return null;
    const start = numericLiteralValue(declaration.init);
    return start === null ? null : { variable: declaration.id.name, start };
  }
  if (node.type === 'AssignmentExpression' && node.operator === '=' && node.left?.type === 'Identifier') {
    const start = numericLiteralValue(node.right);
    return start === null ? null : { variable: node.left.name, start };
  }
  return null;
}

function staticForLoopTest(
  node: BabelNode | null | undefined,
  variable: string
): { operator: '<' | '<=' | '>' | '>='; bound: number } | null {
  if (!node || node.type !== 'BinaryExpression') return null;
  if (!['<', '<=', '>', '>='].includes(node.operator)) return null;
  if (node.left?.type !== 'Identifier' || node.left.name !== variable) return null;
  const bound = numericLiteralValue(node.right);
  return bound === null ? null : { operator: node.operator, bound };
}

function staticForLoopStep(node: BabelNode | null | undefined, variable: string): number | null {
  if (!node) return null;
  if (node.type === 'UpdateExpression' && node.argument?.type === 'Identifier' && node.argument.name === variable) {
    return node.operator === '++' ? 1 : node.operator === '--' ? -1 : null;
  }
  if (node.type === 'AssignmentExpression' && node.left?.type === 'Identifier' && node.left.name === variable) {
    const amount = numericLiteralValue(node.right);
    if (amount !== null) {
      if (node.operator === '+=') return amount;
      if (node.operator === '-=') return -amount;
    }
    if (node.operator === '=' && node.right?.type === 'BinaryExpression') {
      const leftIsVariable = node.right.left?.type === 'Identifier' && node.right.left.name === variable;
      const rightIsVariable = node.right.right?.type === 'Identifier' && node.right.right.name === variable;
      const leftAmount = numericLiteralValue(node.right.left);
      const rightAmount = numericLiteralValue(node.right.right);
      if (node.right.operator === '+' && leftIsVariable && rightAmount !== null) return rightAmount;
      if (node.right.operator === '+' && rightIsVariable && leftAmount !== null) return leftAmount;
      if (node.right.operator === '-' && leftIsVariable && rightAmount !== null) return -rightAmount;
    }
  }
  return null;
}

function numericLiteralValue(node: BabelNode | null | undefined): number | null {
  if (!node) return null;
  if (node.type === 'NumericLiteral' && Number.isFinite(node.value)) return Number(node.value);
  if (node.type === 'UnaryExpression' && node.operator === '-') {
    const value = numericLiteralValue(node.argument);
    return value === null ? null : -value;
  }
  return null;
}

function memberExpressionPath(expression: BabelNode | null | undefined): string[] {
  if (!expression) return [];
  if (expression.type === 'Identifier') return expression.name ? [expression.name] : [];
  if (expression.type !== 'MemberExpression') return [];
  const objectPath = memberExpressionPath(expression.object);
  const propertyName = memberPropertyName(expression.property);
  return objectPath.length && propertyName ? [...objectPath, propertyName] : [];
}

function memberPropertyName(property: BabelNode | null | undefined): string | null {
  if (!property) return null;
  if (property.type === 'Identifier') return property.name ?? null;
  if (property.type === 'StringLiteral') return property.value ?? null;
  return null;
}

function proceduralPoint2d(value: unknown): ProceduralPoint2d {
  if (Array.isArray(value)) {
    return {
      x: finiteNumber(value[0], 0),
      y: finiteNumber(value[1], 0)
    };
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return {
      x: finiteNumber(record.x, 0),
      y: finiteNumber(record.y, 0)
    };
  }
  return { x: 0, y: 0 };
}

function proceduralPoint3d(value: unknown): ProceduralPoint3d {
  const point = proceduralPoint2d(value);
  if (Array.isArray(value)) {
    return { ...point, z: finiteNumber(value[2], 0) };
  }
  if (value && typeof value === 'object') {
    return { ...point, z: finiteNumber((value as Record<string, unknown>).z, 0) };
  }
  return { ...point, z: 0 };
}

function sanitizeCamera3d(config: Record<string, unknown>): Record<string, ProgrammaticSpanLiteral> {
  return {
    x: finiteNumber(config.x, 0),
    y: finiteNumber(config.y, 0),
    z: finiteNumber(config.z, 520),
    lookAtX: finiteNumber(config.lookAtX, 0),
    lookAtY: finiteNumber(config.lookAtY, 0),
    lookAtZ: finiteNumber(config.lookAtZ, 0),
    fov: clamp(finiteNumber(config.fov, 42), 8, 120)
  };
}

function sanitizeUniforms(value: unknown): Record<string, ProgrammaticSpanLiteral> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const out: Record<string, ProgrammaticSpanLiteral> = {};
  for (const [key, entry] of Object.entries(value).slice(0, MAX_SHADER_UNIFORMS)) {
    const literal = sanitizeUniformLiteral(entry, 0);
    if (literal !== undefined) out[key] = literal;
  }
  return out;
}

function sanitizeUniformLiteral(value: unknown, depth: number): ProgrammaticSpanLiteral | undefined {
  if (depth > 3) return undefined;
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.slice(0, 16)
      .map((entry) => sanitizeUniformLiteral(entry, depth + 1) ?? null);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, ProgrammaticSpanLiteral> = {};
    for (const [key, entry] of Object.entries(value).slice(0, 16)) {
      const literal = sanitizeUniformLiteral(entry, depth + 1);
      if (literal !== undefined) out[key] = literal;
    }
    return out;
  }
  return undefined;
}

function minLayer(values: number[], fallback: number): number {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length ? Math.min(...finite) : fallback;
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function hasBalancedShaderDelimiters(code: string): boolean {
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  for (const char of code) {
    if (char === '(' || char === '[' || char === '{') stack.push(char);
    if (char === ')' || char === ']' || char === '}') {
      if (stack.pop() !== pairs[char]) return false;
    }
  }
  return stack.length === 0;
}

function seeded01(seed: number, index: number): number {
  const value = Math.sin((seed + 1) * 127.1 + (index + 1) * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function valueNoise(seed: number, values: number[]): number {
  const sum = values.reduce((acc, value, index) => acc + Math.sin((Number(value) + 1) * (index + 13.37)), seed * 0.137);
  return seeded01(seed, sum * 1000);
}

function finiteNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function lerp(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  if (Math.abs(inMax - inMin) < 0.000001) return outMin;
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
