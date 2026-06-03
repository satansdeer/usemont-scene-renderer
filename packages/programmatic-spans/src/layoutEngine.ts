import type {
  ProgrammaticSpanLiteral,
  ProgrammaticSpanNodeKind
} from './types.js';

type TaffyModule = typeof import('taffy-layout');

type LayoutChildInput = {
  id: string;
  kind: ProgrammaticSpanNodeKind;
  props: Record<string, ProgrammaticSpanLiteral>;
};

export type ProgrammaticSpanComputedLayoutFrame = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type ProgrammaticSpanLayoutComputeResult = {
  engine: 'taffy' | 'fallback' | 'unavailable';
  frames: Map<string, ProgrammaticSpanComputedLayoutFrame>;
  error?: string;
};

let taffyModule: TaffyModule | null = null;
let taffyLoadPromise: Promise<void> | null = null;

export async function ensureProgrammaticSpanLayoutEngineReady(): Promise<void> {
  if (taffyModule) return;
  if (!taffyLoadPromise) {
    taffyLoadPromise = import('taffy-layout')
      .then(async (module) => {
        if (isNodeRuntime()) {
          await module.loadTaffy();
        } else {
          const wasmModule = await import('taffy-layout/wasm');
          await wasmModule.default();
        }
        taffyModule = module;
      })
      .catch((error) => {
        taffyLoadPromise = null;
        throw error;
      });
  }
  await taffyLoadPromise;
}

function isNodeRuntime(): boolean {
  return typeof window === 'undefined' && typeof process !== 'undefined' && !!process.versions?.node;
}

export function isProgrammaticSpanLayoutEngineReady(): boolean {
  return !!taffyModule;
}

export function computeProgrammaticSpanStackLayout(options: {
  id: string;
  direction: 'column' | 'row';
  props: Record<string, ProgrammaticSpanLiteral>;
  children: LayoutChildInput[];
}): ProgrammaticSpanLayoutComputeResult {
  if (!taffyModule) return computeProgrammaticSpanStackFallbackLayout(options);

  const {
    AlignItems,
    AlignSelf,
    Display,
    FlexDirection,
    JustifyContent,
    Style,
    TaffyTree
  } = taffyModule;
  const tree = new TaffyTree();

  try {
    const childNodes = options.children.map((child) =>
      tree.newLeaf(new Style({
        width: dimensionProp(child.props, 'width', preferredWidth(child.kind, child.props)),
        height: dimensionProp(child.props, 'height', preferredHeight(child.kind, child.props)),
        minWidth: dimensionProp(child.props, 'minWidth', 'auto'),
        minHeight: dimensionProp(child.props, 'minHeight', 'auto'),
        maxWidth: dimensionProp(child.props, 'maxWidth', 'auto'),
        maxHeight: dimensionProp(child.props, 'maxHeight', 'auto'),
        flexGrow: numberProp(child.props, 'grow', numberProp(child.props, 'flexGrow', 0)),
        flexShrink: numberProp(
          child.props,
          'shrink',
          numberProp(child.props, 'flexShrink', defaultFlexShrink(child.kind))
        ),
        flexBasis: dimensionProp(child.props, 'basis', 'auto'),
        alignSelf: alignSelfValue(stringProp(child.props.alignSelf, ''), AlignSelf),
        margin: spacingRect(child.props, 'margin', true)
      }))
    );
    const root = tree.newWithChildren(new Style({
      display: Display.Flex,
      flexDirection: options.direction === 'column' ? FlexDirection.Column : FlexDirection.Row,
      alignItems: alignItemsValue(stringProp(options.props.align, 'start'), AlignItems),
      justifyContent: justifyContentValue(stringProp(options.props.justify, 'start'), JustifyContent),
      width: numberProp(options.props, 'width', 0),
      height: numberProp(options.props, 'height', 0),
      padding: spacingRect(options.props, 'padding', false),
      gap: {
        width: numberProp(options.props, 'columnGap', numberProp(options.props, 'gap', 0)),
        height: numberProp(options.props, 'rowGap', numberProp(options.props, 'gap', 0))
      }
    }), childNodes);

    tree.computeLayout(root, {
      width: numberProp(options.props, 'width', 0),
      height: numberProp(options.props, 'height', 0)
    });

    const x = numberProp(options.props, 'x', 0);
    const y = numberProp(options.props, 'y', 0);
    const frames = new Map<string, ProgrammaticSpanComputedLayoutFrame>();
    options.children.forEach((child, index) => {
      const [left, top, width, height] = tree.getLayout(childNodes[index]).get('x', 'y', 'width', 'height');
      frames.set(child.id, {
        id: child.id,
        x: x + left,
        y: y + top,
        width,
        height
      });
    });

    return { engine: 'taffy', frames };
  } catch (error) {
    return {
      engine: 'taffy',
      frames: new Map(),
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    tree.free();
  }
}

export function computeProgrammaticSpanBentoLayout(options: {
  id: string;
  props: Record<string, ProgrammaticSpanLiteral>;
  children: LayoutChildInput[];
}): ProgrammaticSpanLayoutComputeResult {
  if (!taffyModule) return computeProgrammaticSpanBentoFallbackLayout(options);

  const { Display, Style, TaffyTree } = taffyModule;
  const tree = new TaffyTree();

  try {
    const childNodes = options.children.map((child) => {
      const col = Math.max(1, Math.round(numberProp(child.props, 'col', numberProp(child.props, 'column', 1))));
      const row = Math.max(1, Math.round(numberProp(child.props, 'row', 1)));
      const colSpan = Math.max(1, Math.round(numberProp(child.props, 'colSpan', numberProp(child.props, 'columnSpan', 1))));
      const rowSpan = Math.max(1, Math.round(numberProp(child.props, 'rowSpan', 1)));
      return tree.newLeaf(new Style({
        gridColumn: { start: col, end: col + colSpan },
        gridRow: { start: row, end: row + rowSpan },
        margin: spacingRect(child.props, 'margin', true)
      }));
    });
    const columns = Math.max(1, Math.round(numberProp(options.props, 'columns', 12)));
    const rows = Math.max(1, Math.round(numberProp(options.props, 'rows', 6)));
    const root = tree.newWithChildren(new Style({
      display: Display.Grid,
      width: numberProp(options.props, 'width', 0),
      height: numberProp(options.props, 'height', 0),
      padding: spacingRect(options.props, 'padding', false),
      gap: {
        width: numberProp(options.props, 'columnGap', numberProp(options.props, 'gap', 0)),
        height: numberProp(options.props, 'rowGap', numberProp(options.props, 'gap', 0))
      },
      gridTemplateColumns: createFractionTracks(columns),
      gridTemplateRows: createFractionTracks(rows)
    }), childNodes);

    tree.computeLayout(root, {
      width: numberProp(options.props, 'width', 0),
      height: numberProp(options.props, 'height', 0)
    });

    const x = numberProp(options.props, 'x', 0);
    const y = numberProp(options.props, 'y', 0);
    const frames = new Map<string, ProgrammaticSpanComputedLayoutFrame>();
    options.children.forEach((child, index) => {
      const [left, top, width, height] = tree.getLayout(childNodes[index]).get('x', 'y', 'width', 'height');
      frames.set(child.id, {
        id: child.id,
        x: x + left,
        y: y + top,
        width,
        height
      });
    });

    return { engine: 'taffy', frames };
  } catch (error) {
    return {
      engine: 'taffy',
      frames: new Map(),
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    tree.free();
  }
}

function computeProgrammaticSpanStackFallbackLayout(options: {
  id: string;
  direction: 'column' | 'row';
  props: Record<string, ProgrammaticSpanLiteral>;
  children: LayoutChildInput[];
}): ProgrammaticSpanLayoutComputeResult {
  const frames = new Map<string, ProgrammaticSpanComputedLayoutFrame>();
  const x = numberProp(options.props, 'x', 0);
  const y = numberProp(options.props, 'y', 0);
  const width = numberProp(options.props, 'width', 0);
  const height = numberProp(options.props, 'height', 0);
  const padding = numericSpacingRect(options.props, 'padding');
  const gap = options.direction === 'column'
    ? numberProp(options.props, 'rowGap', numberProp(options.props, 'gap', 0))
    : numberProp(options.props, 'columnGap', numberProp(options.props, 'gap', 0));
  const innerX = x + padding.left;
  const innerY = y + padding.top;
  const innerWidth = Math.max(0, width - padding.left - padding.right);
  const innerHeight = Math.max(0, height - padding.top - padding.bottom);
  const align = stringProp(options.props.align, 'start');
  const justify = stringProp(options.props.justify, 'start');
  const childSizes = options.children.map((child) => {
    const childWidth = resolveFallbackDimension(child.props, 'width', preferredWidth(child.kind, child.props), innerWidth);
    const childHeight = resolveFallbackDimension(child.props, 'height', preferredHeight(child.kind, child.props), innerHeight);
    return {
      width: childWidth === 'auto' ? innerWidth : childWidth,
      height: childHeight === 'auto' ? innerHeight : childHeight
    };
  });
  const totalMain = childSizes.reduce(
    (sum, size) => sum + (options.direction === 'column' ? size.height : size.width),
    0
  ) + Math.max(0, childSizes.length - 1) * gap;
  const availableMain = options.direction === 'column' ? innerHeight : innerWidth;
  let cursor = options.direction === 'column' ? innerY : innerX;
  if (justify === 'center') {
    cursor += Math.max(0, (availableMain - totalMain) / 2);
  } else if (justify === 'end' || justify === 'flex-end') {
    cursor += Math.max(0, availableMain - totalMain);
  }

  options.children.forEach((child, index) => {
    const size = childSizes[index];
    const crossAvailable = options.direction === 'column' ? innerWidth : innerHeight;
    const crossSize = options.direction === 'column' ? size.width : size.height;
    let crossOffset = 0;
    if (align === 'center') {
      crossOffset = Math.max(0, (crossAvailable - crossSize) / 2);
    } else if (align === 'end' || align === 'flex-end') {
      crossOffset = Math.max(0, crossAvailable - crossSize);
    }
    const frame = options.direction === 'column'
      ? {
          id: child.id,
          x: innerX + crossOffset,
          y: cursor,
          width: size.width,
          height: size.height
        }
      : {
          id: child.id,
          x: cursor,
          y: innerY + crossOffset,
          width: size.width,
          height: size.height
        };
    frames.set(child.id, frame);
    cursor += (options.direction === 'column' ? size.height : size.width) + gap;
  });

  return { engine: 'fallback', frames };
}

function computeProgrammaticSpanBentoFallbackLayout(options: {
  id: string;
  props: Record<string, ProgrammaticSpanLiteral>;
  children: LayoutChildInput[];
}): ProgrammaticSpanLayoutComputeResult {
  const frames = new Map<string, ProgrammaticSpanComputedLayoutFrame>();
  const x = numberProp(options.props, 'x', 0);
  const y = numberProp(options.props, 'y', 0);
  const width = numberProp(options.props, 'width', 0);
  const height = numberProp(options.props, 'height', 0);
  const padding = numericSpacingRect(options.props, 'padding');
  const columns = Math.max(1, Math.round(numberProp(options.props, 'columns', 12)));
  const rows = Math.max(1, Math.round(numberProp(options.props, 'rows', 6)));
  const columnGap = numberProp(options.props, 'columnGap', numberProp(options.props, 'gap', 0));
  const rowGap = numberProp(options.props, 'rowGap', numberProp(options.props, 'gap', 0));
  const innerWidth = Math.max(0, width - padding.left - padding.right);
  const innerHeight = Math.max(0, height - padding.top - padding.bottom);
  const columnWidth = Math.max(0, (innerWidth - columnGap * (columns - 1)) / columns);
  const rowHeight = Math.max(0, (innerHeight - rowGap * (rows - 1)) / rows);

  for (const child of options.children) {
    const col = Math.max(1, Math.round(numberProp(child.props, 'col', numberProp(child.props, 'column', 1))));
    const row = Math.max(1, Math.round(numberProp(child.props, 'row', 1)));
    const colSpan = Math.max(1, Math.round(numberProp(child.props, 'colSpan', numberProp(child.props, 'columnSpan', 1))));
    const rowSpan = Math.max(1, Math.round(numberProp(child.props, 'rowSpan', 1)));
    const margin = numericSpacingRect(child.props, 'margin');
    const frameX = x + padding.left + (col - 1) * (columnWidth + columnGap) + margin.left;
    const frameY = y + padding.top + (row - 1) * (rowHeight + rowGap) + margin.top;
    frames.set(child.id, {
      id: child.id,
      x: frameX,
      y: frameY,
      width: Math.max(0, columnWidth * colSpan + columnGap * (colSpan - 1) - margin.left - margin.right),
      height: Math.max(0, rowHeight * rowSpan + rowGap * (rowSpan - 1) - margin.top - margin.bottom)
    });
  }

  return { engine: 'fallback', frames };
}

function numericSpacingRect(
  props: Record<string, ProgrammaticSpanLiteral>,
  base: string
): { left: number; right: number; top: number; bottom: number } {
  const rect = spacingRect(props, base, false);
  return {
    left: typeof rect.left === 'number' ? rect.left : 0,
    right: typeof rect.right === 'number' ? rect.right : 0,
    top: typeof rect.top === 'number' ? rect.top : 0,
    bottom: typeof rect.bottom === 'number' ? rect.bottom : 0
  };
}

function resolveFallbackDimension(
  props: Record<string, ProgrammaticSpanLiteral>,
  key: string,
  fallback: number | 'auto',
  parentSize: number
): number | 'auto' {
  const dimension = dimensionProp(props, key, fallback);
  if (typeof dimension === 'number') return dimension;
  if (typeof dimension === 'string') {
    if (dimension.endsWith('%')) {
      const percent = Number.parseFloat(dimension);
      return Number.isFinite(percent) ? (parentSize * percent) / 100 : fallback;
    }
    return dimension === 'auto' ? 'auto' : fallback;
  }
  return dimension;
}

function createFractionTracks(count: number): Array<{ min: number; max: '1fr' }> {
  return Array.from({ length: count }, () => ({ min: 0, max: '1fr' }));
}

function preferredWidth(
  kind: ProgrammaticSpanNodeKind,
  props: Record<string, ProgrammaticSpanLiteral>
): number | 'auto' {
  switch (kind) {
    case 'browser-window':
      return 860;
    case 'cta-button':
      return 214;
    case 'data-chart':
      return 900;
    case 'flowchart':
    case 'decision-tree':
      return 1280;
    case 'text':
      return 420;
    case 'image':
    case 'lottie':
    case 'model3d':
      return 240;
    case 'cursor':
    case 'cursor-click':
      return 56;
    case 'click-pulse': {
      const radius = numberProp(props, 'radius', numberProp(props, 'endRadius', 46));
      return radius * 2;
    }
    case 'circle': {
      const radius = numberProp(props, 'radius', 40);
      return radius * 2;
    }
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'arc':
      return 120;
    case 'calloutBox':
      return 220;
    case 'line':
    case 'arrow':
    case 'turnArrow':
      return 260;
    case 'motion-box':
      return 'auto';
    case 'rect':
    case 'ellipse':
      return 120;
    default:
      return 'auto';
  }
}

function defaultFlexShrink(kind: ProgrammaticSpanNodeKind): number {
  switch (kind) {
    case 'circle':
    case 'ellipse':
    case 'triangle':
    case 'arc':
    case 'diamond':
    case 'star':
    case 'calloutBox':
    case 'line':
    case 'arrow':
    case 'turnArrow':
    case 'image':
    case 'lottie':
    case 'model3d':
    case 'cursor':
    case 'click-pulse':
    case 'cursor-click':
      return 0;
    default:
      return 1;
  }
}

function preferredHeight(
  kind: ProgrammaticSpanNodeKind,
  props: Record<string, ProgrammaticSpanLiteral>
): number | 'auto' {
  switch (kind) {
    case 'browser-window':
      return 480;
    case 'cta-button':
      return 58;
    case 'data-chart':
      return 560;
    case 'flowchart':
    case 'decision-tree':
      return 640;
    case 'text':
      return numberProp(props.size, numberProp(props.fontSize, 48)) * 1.35;
    case 'image':
    case 'lottie':
    case 'model3d':
      return 160;
    case 'cursor':
    case 'cursor-click':
      return numberProp(props, 'width', 56);
    case 'click-pulse': {
      const radius = numberProp(props, 'radius', numberProp(props, 'endRadius', 46));
      return radius * 2;
    }
    case 'circle': {
      const radius = numberProp(props, 'radius', 40);
      return radius * 2;
    }
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'arc':
      return 120;
    case 'calloutBox':
      return 120;
    case 'line':
      return 90;
    case 'arrow':
    case 'turnArrow':
      return 96;
    case 'motion-box':
      return 'auto';
    case 'rect':
    case 'ellipse':
      return 80;
    default:
      return 'auto';
  }
}

function spacingRect(
  props: Record<string, ProgrammaticSpanLiteral>,
  base: string,
  allowAuto: boolean
): { left: number | 'auto'; right: number | 'auto'; top: number | 'auto'; bottom: number | 'auto' } {
  const fallback = numberProp(props, base, 0);
  const x = numberProp(props, `${base}X`, fallback);
  const y = numberProp(props, `${base}Y`, fallback);
  return {
    left: spacingValue(props[`${base}Left`], x, allowAuto),
    right: spacingValue(props[`${base}Right`], x, allowAuto),
    top: spacingValue(props[`${base}Top`], y, allowAuto),
    bottom: spacingValue(props[`${base}Bottom`], y, allowAuto)
  };
}

function spacingValue(
  value: ProgrammaticSpanLiteral | undefined,
  fallback: number,
  allowAuto: boolean
): number | 'auto' {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (allowAuto && value === 'auto') return 'auto';
  return fallback;
}

function dimensionProp(
  props: Record<string, ProgrammaticSpanLiteral>,
  key: string,
  fallback: number | 'auto'
): number | 'auto' | `${number}%` {
  const value = props[key];
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value === 'auto') return 'auto';
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?%$/.test(value)) {
    return value as `${number}%`;
  }
  return fallback;
}

function alignItemsValue(value: string, AlignItems: TaffyModule['AlignItems']) {
  switch (value) {
    case 'center':
      return AlignItems.Center;
    case 'end':
    case 'flex-end':
      return AlignItems.End;
    case 'stretch':
      return AlignItems.Stretch;
    case 'start':
    case 'flex-start':
    default:
      return AlignItems.Start;
  }
}

function alignSelfValue(value: string, AlignSelf: TaffyModule['AlignSelf']) {
  switch (value) {
    case 'center':
      return AlignSelf.Center;
    case 'end':
    case 'flex-end':
      return AlignSelf.End;
    case 'stretch':
      return AlignSelf.Stretch;
    case 'start':
    case 'flex-start':
      return AlignSelf.Start;
    default:
      return AlignSelf.Auto;
  }
}

function justifyContentValue(value: string, JustifyContent: TaffyModule['JustifyContent']) {
  switch (value) {
    case 'center':
      return JustifyContent.Center;
    case 'end':
    case 'flex-end':
      return JustifyContent.End;
    case 'space-between':
    case 'spaceBetween':
      return JustifyContent.SpaceBetween;
    case 'space-around':
    case 'spaceAround':
      return JustifyContent.SpaceAround;
    case 'space-evenly':
    case 'spaceEvenly':
      return JustifyContent.SpaceEvenly;
    case 'stretch':
      return JustifyContent.Stretch;
    case 'start':
    case 'flex-start':
    default:
      return JustifyContent.Start;
  }
}

function numberProp(
  valueOrProps: ProgrammaticSpanLiteral | Record<string, ProgrammaticSpanLiteral> | undefined,
  keyOrFallback: string | number,
  maybeFallback?: number
): number {
  const value =
    typeof keyOrFallback === 'string'
      ? (valueOrProps as Record<string, ProgrammaticSpanLiteral> | undefined)?.[keyOrFallback]
      : valueOrProps;
  const fallback = typeof keyOrFallback === 'number' ? keyOrFallback : (maybeFallback ?? 0);
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function stringProp(value: ProgrammaticSpanLiteral | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}
