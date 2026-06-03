export const SHAPE_OBJECT_TYPES = [
  'rect',
  'circle',
  'ellipse',
  'triangle',
  'arc',
  'diamond',
  'star',
  'calloutBox',
  'line',
  'arrow',
  'turnArrow'
] as const;

export type ShapeObjectType = (typeof SHAPE_OBJECT_TYPES)[number];

export const DEFAULT_ARC_SWEEP_PERCENT = 75;
export const DEFAULT_ARC_THICKNESS_PERCENT = 35;
export const DEFAULT_ARROW_TAIL_WIDTH_PERCENT = 44;
export const DEFAULT_ARROW_SHAFT_WIDTH_PERCENT = 44;
export const DEFAULT_ARROW_HEAD_WIDTH_PERCENT = 100;
export const DEFAULT_ARROW_HEAD_LENGTH_PERCENT = 42;
export const DEFAULT_ARROW_WING_CONCAVITY_PERCENT = 0;
export const DEFAULT_LINE_CONTROL_1_X_PERCENT = 33;
export const DEFAULT_LINE_CONTROL_1_Y_PERCENT = 50;
export const DEFAULT_LINE_CONTROL_2_X_PERCENT = 67;
export const DEFAULT_LINE_CONTROL_2_Y_PERCENT = 50;

export const CALLOUT_POINTER_SIDES = ['none', 'top', 'right', 'bottom', 'left'] as const;
export type CalloutPointerSide = (typeof CALLOUT_POINTER_SIDES)[number];

export const DEFAULT_CALLOUT_POINTER_SIDE: CalloutPointerSide = 'none';
export const DEFAULT_CALLOUT_POINTER_OFFSET_PERCENT = 50;
export const DEFAULT_CALLOUT_POINTER_WIDTH_PX = 48;
export const DEFAULT_CALLOUT_POINTER_HEIGHT_PX = 26;

export interface Point {
  x: number;
  y: number;
}

export interface ShapeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LineShapeOptions {
  linePath?: unknown;
  control1XPercent?: number;
  control1YPercent?: number;
  control2XPercent?: number;
  control2YPercent?: number;
}

export interface LinePathNode {
  xPercent: number;
  yPercent: number;
  inXPercent: number;
  inYPercent: number;
  outXPercent: number;
  outYPercent: number;
}

export interface LinePath {
  nodes: LinePathNode[];
}

export function isShapeObjectType(value: string | null | undefined): value is ShapeObjectType {
  return typeof value === 'string' && (SHAPE_OBJECT_TYPES as readonly string[]).includes(value);
}

export function createDefaultLinePath(options: LineShapeOptions = {}): LinePath {
  return {
    nodes: [
      {
        xPercent: 0,
        yPercent: 50,
        inXPercent: 0,
        inYPercent: 50,
        outXPercent: normalizeLineControlPercent(
          options.control1XPercent,
          DEFAULT_LINE_CONTROL_1_X_PERCENT
        ),
        outYPercent: normalizeLineControlPercent(
          options.control1YPercent,
          DEFAULT_LINE_CONTROL_1_Y_PERCENT
        )
      },
      {
        xPercent: 100,
        yPercent: 50,
        inXPercent: normalizeLineControlPercent(
          options.control2XPercent,
          DEFAULT_LINE_CONTROL_2_X_PERCENT
        ),
        inYPercent: normalizeLineControlPercent(
          options.control2YPercent,
          DEFAULT_LINE_CONTROL_2_Y_PERCENT
        ),
        outXPercent: 100,
        outYPercent: 50
      }
    ]
  };
}

export function resolveLinePath(rawLinePath: unknown, fallbackOptions: LineShapeOptions = {}): LinePath {
  const parsedLinePath = parseRawLinePath(rawLinePath);
  const rawNodes = Array.isArray(parsedLinePath?.nodes) ? (parsedLinePath.nodes as unknown[]) : null;
  if (!rawNodes || rawNodes.length < 2) {
    return createDefaultLinePath(fallbackOptions);
  }

  const nodes = rawNodes.map((rawNode, index, allNodes) => {
    const fallbackAnchorX = allNodes.length <= 1 ? 0 : (index / (allNodes.length - 1)) * 100;
    const fallbackAnchorY = 50;
    const nodeRecord =
      typeof rawNode === 'object' && rawNode !== null ? (rawNode as Record<string, unknown>) : {};
    const xPercent = normalizeRawAnchorPercent(nodeRecord.xPercent, fallbackAnchorX);
    const yPercent = normalizeRawAnchorPercent(nodeRecord.yPercent, fallbackAnchorY);
    const fallbackInXPercent =
      index === 0
        ? xPercent
        : index === allNodes.length - 1 && allNodes.length === 2
          ? normalizeLineControlPercent(
              fallbackOptions.control2XPercent,
              DEFAULT_LINE_CONTROL_2_X_PERCENT
            )
          : xPercent;
    const fallbackInYPercent =
      index === 0
        ? yPercent
        : index === allNodes.length - 1 && allNodes.length === 2
          ? normalizeLineControlPercent(
              fallbackOptions.control2YPercent,
              DEFAULT_LINE_CONTROL_2_Y_PERCENT
            )
          : yPercent;
    const fallbackOutXPercent =
      index === 0 && allNodes.length === 2
        ? normalizeLineControlPercent(
            fallbackOptions.control1XPercent,
            DEFAULT_LINE_CONTROL_1_X_PERCENT
          )
        : xPercent;
    const fallbackOutYPercent =
      index === 0 && allNodes.length === 2
        ? normalizeLineControlPercent(
            fallbackOptions.control1YPercent,
            DEFAULT_LINE_CONTROL_1_Y_PERCENT
          )
        : yPercent;

    return {
      xPercent,
      yPercent,
      inXPercent: normalizeRawLineControlPercent(nodeRecord.inXPercent, fallbackInXPercent),
      inYPercent: normalizeRawLineControlPercent(nodeRecord.inYPercent, fallbackInYPercent),
      outXPercent: normalizeRawLineControlPercent(nodeRecord.outXPercent, fallbackOutXPercent),
      outYPercent: normalizeRawLineControlPercent(nodeRecord.outYPercent, fallbackOutYPercent)
    };
  });

  return { nodes };
}

function normalizePercent(value: number | undefined, fallback: number): number {
  return clampNumber(value ?? fallback, 0, 100);
}

function normalizeRawAnchorPercent(value: unknown, fallback: number): number {
  return normalizePercent(typeof value === 'number' ? value : undefined, fallback);
}

function normalizeLineControlPercent(value: number | undefined, fallback: number): number {
  const candidate = value ?? fallback;
  return Number.isFinite(candidate) ? candidate : fallback;
}

function normalizeRawLineControlPercent(value: unknown, fallback: number): number {
  return normalizeLineControlPercent(typeof value === 'number' ? value : undefined, fallback);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parseRawLinePath(rawLinePath: unknown): LinePath | null {
  if (typeof rawLinePath === 'string') {
    const trimmedValue = rawLinePath.trim();
    if (
      (trimmedValue.startsWith('{') && trimmedValue.endsWith('}')) ||
      (trimmedValue.startsWith('[') && trimmedValue.endsWith(']'))
    ) {
      try {
        return parseRawLinePath(JSON.parse(trimmedValue));
      } catch {
        return null;
      }
    }
    return null;
  }

  if (
    typeof rawLinePath === 'object' &&
    rawLinePath !== null &&
    'nodes' in rawLinePath &&
    Array.isArray((rawLinePath as { nodes?: unknown }).nodes)
  ) {
    return rawLinePath as LinePath;
  }

  return null;
}
