export * from './shapes.js';
import {
  resolveLinePath,
  type LinePath,
  type LinePathNode,
  type LineShapeOptions,
  type ShapeObjectType
} from './shapes.js';

export interface Visual {
  id: string;
  keyframeId: string;
  type: VisualType;
  attributes: Map<string, unknown>;
  children?: Visual[];
  interpolation?: VisualInterpolation;
}

export type VisualType = 'text' | ShapeObjectType | 'image' | 'lottie' | 'model3d' | 'group';

export interface VisualInterpolation {
  kind: 'transition';
  progress: number;
  transitionType?: string;
  transitionDirection?: 'in' | 'out';
  easing?: EasingFunction;
  from?: Visual;
  to?: Visual;
}

export interface SceneConfig {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundOpacity?: number;
  backgroundImageUrl?: string;
  isInSegment?: boolean;
  scaleFactor?: number;
  enableInteractions?: boolean;
  enableAnimations?: boolean;
}

export type EasingFunction = (t: number) => number;

export const Easing = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  cubicInOut: (t: number) => {
    return t < 0.5 ? 4 * t * t * t : 1 + (t - 1) * (2 * (t - 2)) * (2 * (t - 2));
  }
};

export type TextEffectType =
  | 'none'
  | 'shadow'
  | 'outline'
  | 'hollow'
  | 'glow'
  | 'neon'
  | 'echo'
  | 'background';

export interface TextEffectConfig {
  type: TextEffectType;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  shadowBlur?: number;
  strokeColor?: string;
  strokeWidth?: number;
  glowLayers?: number;
  echoCount?: number;
  echoSpacing?: number;
  echoOpacityFalloff?: number;
  backgroundColor?: string;
  backgroundPadding?: number;
  backgroundBorderRadius?: number;
}

export const NUMERIC_VISUAL_ATTRIBUTE_KEYS = [
  'x',
  'y',
  'width',
  'height',
  'layer',
  'radius',
  'cornerRadius',
  'strokeWidth',
  'opacity',
  'blur',
  'tiltShiftBlur',
  'tiltShiftCenter',
  'tiltShiftFocus',
  'tiltShiftFeather',
  'fontSize',
  'lineHeight',
  'cropTop',
  'cropRight',
  'cropBottom',
  'cropLeft',
  'cropRadius',
  'browserWindowHeaderScale',
  'browserWindowBaseChromeHeight',
  'browserWindowChromeHeight',
  'browserWindowContentX',
  'browserWindowContentY',
  'browserWindowContentWidth',
  'browserWindowContentHeight',
  'browserWindowCornerRadius',
  'shadowBlur',
  'shadowOffsetX',
  'shadowOffsetY',
  'shadowOpacity',
  'arcSweepPercent',
  'arcThicknessPercent',
  'arrowTailWidthPercent',
  'arrowShaftWidthPercent',
  'arrowHeadWidthPercent',
  'arrowHeadLengthPercent',
  'arrowWingConcavityPercent',
  'arrowTipRadius',
  'arrowTailXPercent',
  'arrowTailYPercent',
  'arrowShaftXPercent',
  'arrowShoulderXPercent',
  'arrowShoulderYPercent',
  'arrowWingXPercent',
  'arrowWingYPercent',
  'calloutPointerOffsetPercent',
  'calloutPointerWidthPx',
  'calloutPointerHeightPx',
  'lineControl1XPercent',
  'lineControl1YPercent',
  'lineControl2XPercent',
  'lineControl2YPercent',
  'personMaskWidth',
  'personMaskHeight',
  'personMaskVersion',
  'rotation',
  'rotationX',
  'rotationY',
  'rotationCenterX',
  'rotationCenterY',
  'scale',
  'scaleX',
  'scaleY',
  'skewX',
  'skewY',
  'translateZ',
  'perspective',
  'modelAnimationIndex',
  'modelAnimationSpeed',
  'modelCameraFov',
  'modelCameraDistance',
  'modelPitch',
  'modelYaw',
  'modelRoll',
  'modelScale'
] as const;

export const COLOR_VISUAL_ATTRIBUTE_KEYS = [
  'fill',
  'stroke',
  'backgroundColor',
  'shadowColor'
] as const;

export const COLOR_VISUAL_ATTRIBUTE_SET = new Set<string>(COLOR_VISUAL_ATTRIBUTE_KEYS);

export function createVisual(
  id: string,
  keyframeId: string,
  type: VisualType,
  attributes: Record<string, unknown>
): Visual {
  return {
    id,
    keyframeId,
    type,
    attributes: new Map(Object.entries(attributes))
  };
}

export function interpolateTextEffect(
  from: TextEffectConfig | undefined,
  to: TextEffectConfig | undefined,
  t: number
): TextEffectConfig | undefined {
  if (!from && !to) return undefined;
  if (!from) return to;
  if (!to) return from;

  if (from.type !== to.type) {
    return t < 0.5 ? from : to;
  }

  const lerp = (a: number | undefined, b: number | undefined, fallback: number): number => {
    const av = a ?? fallback;
    const bv = b ?? fallback;
    return av + (bv - av) * t;
  };
  const lerpColor = (a: string | undefined, b: string | undefined, fallback: string): string => {
    const av = a ?? fallback;
    const bv = b ?? fallback;
    return interpolateColorValue(av, bv, t) ?? (t < 0.5 ? av : bv);
  };

  return {
    type: from.type,
    shadowColor: lerpColor(from.shadowColor, to.shadowColor, 'rgba(0,0,0,0.5)'),
    shadowOffsetX: lerp(from.shadowOffsetX, to.shadowOffsetX, 0),
    shadowOffsetY: lerp(from.shadowOffsetY, to.shadowOffsetY, 0),
    shadowBlur: lerp(from.shadowBlur, to.shadowBlur, 0),
    strokeColor: lerpColor(from.strokeColor, to.strokeColor, '#000000'),
    strokeWidth: lerp(from.strokeWidth, to.strokeWidth, 2),
    glowLayers: Math.round(lerp(from.glowLayers, to.glowLayers, 3)),
    echoCount: Math.round(lerp(from.echoCount, to.echoCount, 3)),
    echoSpacing: lerp(from.echoSpacing, to.echoSpacing, 4),
    echoOpacityFalloff: lerp(from.echoOpacityFalloff, to.echoOpacityFalloff, 0.25),
    backgroundColor: lerpColor(from.backgroundColor, to.backgroundColor, '#3b82f6'),
    backgroundPadding: lerp(from.backgroundPadding, to.backgroundPadding, 8),
    backgroundBorderRadius: lerp(from.backgroundBorderRadius, to.backgroundBorderRadius, 4)
  };
}

export function interpolateAttributeMaps(
  fromAttrs: Map<string, unknown> | null,
  toAttrs: Map<string, unknown> | null,
  t: number
): Map<string, unknown> {
  const result = new Map<string, unknown>();
  const numeric = new Set<string>(NUMERIC_VISUAL_ATTRIBUTE_KEYS);
  const nonNumeric = new Set([
    'fill',
    'stroke',
    'strokeStyle',
    'content',
    'src',
    'fontFamily',
    'textAlign',
    'fontWeight',
    'fontStyle',
    'textDecoration',
    'backgroundColor'
  ]);
  const keys = new Set<string>([
    ...(fromAttrs ? Array.from(fromAttrs.keys()) : []),
    ...(toAttrs ? Array.from(toAttrs.keys()) : [])
  ]);
  keys.forEach((key) => {
    const fromValue = fromAttrs ? fromAttrs.get(key) : undefined;
    const toValue = toAttrs ? toAttrs.get(key) : undefined;
    if (numeric.has(key)) {
      if (typeof fromValue === 'number' && typeof toValue === 'number') {
        result.set(key, fromValue + (toValue - fromValue) * t);
      } else if (typeof toValue === 'number') {
        result.set(key, toValue);
      } else if (typeof fromValue === 'number') {
        result.set(key, fromValue);
      }
    } else if (key === 'linePath') {
      const interpolatedLinePath = lerpLinePathAttr(fromAttrs, toAttrs, new Map(), t);
      if (interpolatedLinePath !== undefined) {
        result.set(key, interpolatedLinePath);
      }
    } else if (nonNumeric.has(key) || COLOR_VISUAL_ATTRIBUTE_SET.has(key)) {
      if (
        COLOR_VISUAL_ATTRIBUTE_SET.has(key) &&
        typeof fromValue === 'string' &&
        typeof toValue === 'string'
      ) {
        const interpolatedColor = interpolateColorValue(fromValue, toValue, t);
        result.set(key, interpolatedColor ?? (t >= 0.5 && toValue !== undefined ? toValue : fromValue));
      } else if (t >= 0.5 && toValue !== undefined) {
        result.set(key, toValue);
      } else if (fromValue !== undefined) {
        result.set(key, fromValue);
      }
    } else if (key === 'textEffect') {
      result.set(
        key,
        interpolateTextEffect(
          fromValue as TextEffectConfig | undefined,
          toValue as TextEffectConfig | undefined,
          t
        )
      );
    } else if (t >= 0.5 && toValue !== undefined) {
      result.set(key, toValue);
    } else if (fromValue !== undefined) {
      result.set(key, fromValue);
    }
  });
  if (!fromAttrs && toAttrs) {
    const opacity = toAttrs.get('opacity');
    const baseOpacity = typeof opacity === 'number' ? opacity : 1;
    result.set('opacity', baseOpacity * t);
  }
  if (fromAttrs && !toAttrs) {
    const opacity = fromAttrs.get('opacity');
    const baseOpacity = typeof opacity === 'number' ? opacity : 1;
    result.set('opacity', baseOpacity * (1 - t));
  }
  return result;
}

export function lerpLinePathAttr(
  fromAttrs: Map<string, unknown> | null,
  toAttrs: Map<string, unknown> | null,
  baseAttrs: Map<string, unknown>,
  t: number
): LinePath | undefined {
  const fromPath = fromAttrs
    ? resolveLinePath(fromAttrs.get('linePath'), getLineShapeOptionsFromAttrs(fromAttrs))
    : null;
  const toPath = toAttrs
    ? resolveLinePath(toAttrs.get('linePath'), getLineShapeOptionsFromAttrs(toAttrs))
    : null;

  if (fromPath && toPath) {
    if (fromPath.nodes.length !== toPath.nodes.length) {
      return cloneLinePath(t >= 0.5 ? toPath : fromPath);
    }

    return {
      nodes: fromPath.nodes.map((fromNode, index) => lerpLinePathNode(fromNode, toPath.nodes[index], t))
    };
  }

  if (toPath) return cloneLinePath(toPath);
  if (fromPath) return cloneLinePath(fromPath);

  if (!hasLineShapeFallbackAttrs(baseAttrs)) {
    return undefined;
  }

  return resolveLinePath(baseAttrs.get('linePath'), getLineShapeOptionsFromAttrs(baseAttrs));
}

export const ATTRIBUTE_DEFAULTS: Record<string, unknown> = {
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  layer: 0,
  radius: 50,
  cornerRadius: 0,
  opacity: 1,
  blur: 0,
  tiltShiftBlur: 0,
  tiltShiftCenter: 50,
  tiltShiftFocus: 35,
  tiltShiftFeather: 25,
  rotation: 0,
  rotationCenterX: 0.5,
  rotationCenterY: 0.5,
  fontSize: 16,
  lineHeight: 1.2,
  strokeWidth: 1,
  strokeStyle: 'solid',
  arrowTailWidthPercent: 44,
  arrowShaftWidthPercent: 44,
  arrowHeadWidthPercent: 100,
  arrowHeadLengthPercent: 42,
  arrowWingConcavityPercent: 0,
  arrowTipRadius: 0,
  lineControl1XPercent: 33,
  lineControl1YPercent: 50,
  lineControl2XPercent: 67,
  lineControl2YPercent: 50,
  cropTop: 0,
  cropRight: 0,
  cropBottom: 0,
  cropLeft: 0,
  cropRadius: 0,
  shadowBlur: 0,
  shadowOffsetX: 0,
  shadowOffsetY: 0,
  shadowOpacity: 0,
  arcSweepPercent: 75,
  arcThicknessPercent: 35,
  fill: '#cccccc',
  stroke: '#000000',
  shadowColor: '#000000',
  backgroundColor: 'transparent',
  scaleX: 1,
  scaleY: 1,
  skewX: 0,
  skewY: 0,
  scale: 1
};

export function coerceNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export function getAttrDefault(attr: string, fallback: unknown = 0): unknown {
  return Object.prototype.hasOwnProperty.call(ATTRIBUTE_DEFAULTS, attr)
    ? ATTRIBUTE_DEFAULTS[attr]
    : fallback;
}

export function visualToStyle(visual: Visual): Record<string, unknown> {
  const style: Record<string, unknown> = {};
  const attrs = visual.attributes;

  if (attrs.has('x')) style.left = `${attrs.get('x')}px`;
  if (attrs.has('y')) style.top = `${attrs.get('y')}px`;
  if (attrs.has('width')) style.width = `${attrs.get('width')}px`;
  if (attrs.has('height')) style.height = `${attrs.get('height')}px`;
  if (attrs.has('fill')) style.backgroundColor = attrs.get('fill');
  if (attrs.has('stroke')) style.borderColor = attrs.get('stroke');
  if (attrs.has('strokeWidth')) style.borderWidth = `${attrs.get('strokeWidth')}px`;

  const transforms = [];
  if (attrs.has('rotation')) transforms.push(`rotate(${attrs.get('rotation')}deg)`);
  if (attrs.has('scale')) transforms.push(`scale(${attrs.get('scale')})`);
  if (transforms.length > 0) style.transform = transforms.join(' ');
  if (attrs.has('opacity')) style.opacity = attrs.get('opacity');

  return style;
}

export function mergeVisualAttributes(
  base: Map<string, unknown>,
  overrides: Map<string, unknown>
): Map<string, unknown> {
  const merged = new Map(base);
  overrides.forEach((value, key) => {
    merged.set(key, value);
  });
  return merged;
}

export function isVisual(obj: unknown): obj is Visual {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof (obj as Visual).id === 'string' &&
    typeof (obj as Visual).type === 'string' &&
    (obj as Visual).attributes instanceof Map
  );
}

type ParsedInterpolableColor = {
  r: number;
  g: number;
  b: number;
  a: number;
  invisibleKeyword?: boolean;
};

function getLineShapeOptionsFromAttrs(attrs: Map<string, unknown> | null | undefined): LineShapeOptions {
  return {
    control1XPercent: coerceNumber(attrs?.get('lineControl1XPercent')),
    control1YPercent: coerceNumber(attrs?.get('lineControl1YPercent')),
    control2XPercent: coerceNumber(attrs?.get('lineControl2XPercent')),
    control2YPercent: coerceNumber(attrs?.get('lineControl2YPercent'))
  };
}

function cloneLinePath(linePath: LinePath): LinePath {
  return {
    nodes: linePath.nodes.map((node) => ({ ...node }))
  };
}

function lerpLinePathNode(fromNode: LinePathNode, toNode: LinePathNode, t: number): LinePathNode {
  const lerp = (from: number, to: number) => from + (to - from) * t;
  return {
    xPercent: lerp(fromNode.xPercent, toNode.xPercent),
    yPercent: lerp(fromNode.yPercent, toNode.yPercent),
    inXPercent: lerp(fromNode.inXPercent, toNode.inXPercent),
    inYPercent: lerp(fromNode.inYPercent, toNode.inYPercent),
    outXPercent: lerp(fromNode.outXPercent, toNode.outXPercent),
    outYPercent: lerp(fromNode.outYPercent, toNode.outYPercent)
  };
}

function hasLineShapeFallbackAttrs(attrs: Map<string, unknown> | null | undefined): boolean {
  return !!attrs && [
    'linePath',
    'lineControl1XPercent',
    'lineControl1YPercent',
    'lineControl2XPercent',
    'lineControl2YPercent'
  ].some((key) => attrs.has(key));
}

function parseInterpolableColor(input: string): ParsedInterpolableColor | null {
  const trimmed = input.trim();
  const normalized = trimmed.toLowerCase();
  if (normalized === 'transparent' || normalized === 'none') {
    return { r: 0, g: 0, b: 0, a: 0, invisibleKeyword: true };
  }

  const hex = trimmed.replace(/^#/, '');
  if (/^[0-9a-fA-F]{3,4}$/.test(hex)) {
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    const a = hex.length === 4 ? parseInt(hex[3] + hex[3], 16) / 255 : 1;
    return { r, g, b, a };
  }

  if (/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(hex)) {
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return { r, g, b, a };
  }

  const rgbMatch = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(trimmed);
  if (rgbMatch) {
    return {
      r: Math.min(255, parseInt(rgbMatch[1], 10)),
      g: Math.min(255, parseInt(rgbMatch[2], 10)),
      b: Math.min(255, parseInt(rgbMatch[3], 10)),
      a: 1
    };
  }

  const rgbaMatch =
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d*\.?\d+)\s*\)$/i.exec(
      trimmed
    );
  if (rgbaMatch) {
    return {
      r: Math.min(255, parseInt(rgbaMatch[1], 10)),
      g: Math.min(255, parseInt(rgbaMatch[2], 10)),
      b: Math.min(255, parseInt(rgbaMatch[3], 10)),
      a: Math.max(0, Math.min(1, parseFloat(rgbaMatch[4])))
    };
  }

  return null;
}

function resolveInterpolableColorPair(
  fromValue: string,
  toValue: string
): { from: ParsedInterpolableColor; to: ParsedInterpolableColor } | null {
  const from = parseInterpolableColor(fromValue);
  const to = parseInterpolableColor(toValue);
  if (!from || !to) {
    return null;
  }

  if (from.invisibleKeyword && !to.invisibleKeyword) {
    return { from: { ...to, a: 0 }, to };
  }

  if (to.invisibleKeyword && !from.invisibleKeyword) {
    return { from, to: { ...from, a: 0 } };
  }

  return { from, to };
}

function formatInterpolableColor({ r, g, b, a }: ParsedInterpolableColor): string {
  const clampChannel = (value: number) => Math.max(0, Math.min(255, Math.round(value)));
  if (a >= 1) {
    const toHex = (value: number) => clampChannel(value).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  }

  return `rgba(${clampChannel(r)}, ${clampChannel(g)}, ${clampChannel(b)}, ${
    Math.round(a * 1000) / 1000
  })`;
}

function interpolateColorValue(fromValue: string, toValue: string, t: number): string | null {
  const resolved = resolveInterpolableColorPair(fromValue, toValue);
  if (!resolved) {
    return null;
  }

  const mix = (from: number, to: number) => from + (to - from) * t;
  return formatInterpolableColor({
    r: mix(resolved.from.r, resolved.to.r),
    g: mix(resolved.from.g, resolved.to.g),
    b: mix(resolved.from.b, resolved.to.b),
    a: mix(resolved.from.a, resolved.to.a)
  });
}
