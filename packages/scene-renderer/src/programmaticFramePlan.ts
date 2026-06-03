import type { Visual } from '@usemont/scene-model';

export type SceneRendererLiteral =
  | string
  | number
  | boolean
  | null
  | SceneRendererLiteral[]
  | { [key: string]: SceneRendererLiteral };

export type SceneFramePlanOptions = {
  visuals: Visual[];
  supportedVisualTypes?: readonly string[];
};

export type SceneFramePlan = {
  visuals: Visual[];
  unsupportedVisualTypes: string[];
};

export const CANVAS_PROGRAMMATIC_FRAME_VISUAL_TYPES = [
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
  'turnArrow',
  'text',
  'image',
  'lottie',
  'model3d',
  'group'
] as const;

export function createProgrammaticSceneFramePlan(options: SceneFramePlanOptions): SceneFramePlan {
  const supported = new Set(options.supportedVisualTypes ?? CANVAS_PROGRAMMATIC_FRAME_VISUAL_TYPES);
  const unsupportedVisualTypes = new Set<string>();
  const collectUnsupported = (visual: Visual): void => {
    if (!supported.has(String(visual.type))) unsupportedVisualTypes.add(String(visual.type));
    for (const child of visual.children ?? []) collectUnsupported(child);
  };
  for (const visual of options.visuals) collectUnsupported(visual);

  return {
    visuals: [...options.visuals].sort(compareVisualLayer),
    unsupportedVisualTypes: [...unsupportedVisualTypes].sort()
  };
}

export function compareVisualLayer(left: Visual, right: Visual): number {
  return finiteNumber(readVisualAttribute(left, 'layer'), 0) - finiteNumber(readVisualAttribute(right, 'layer'), 0);
}

export function readVisualAttribute(
  visual: Visual,
  key: string
): SceneRendererLiteral | undefined {
  const attributeAliases: Record<string, string[]> = {
    text: ['content'],
    size: ['fontSize'],
    color: ['fill'],
    weight: ['fontWeight'],
    align: ['textAlign'],
    radius: ['cornerRadius']
  };
  const attributes = visual.attributes as unknown;
  const read = (candidateKey: string): SceneRendererLiteral | undefined => {
    if (attributes instanceof Map) {
      return normalizeLiteral(attributes.get(candidateKey));
    }
    if (typeof attributes === 'object' && attributes !== null) {
      return normalizeLiteral((attributes as Record<string, unknown>)[candidateKey]);
    }
    return undefined;
  };
  const direct = read(key);
  if (direct !== undefined) return direct;
  for (const alias of attributeAliases[key] ?? []) {
    const aliased = read(alias);
    if (aliased !== undefined) return aliased;
  }
  if (key === 'text') {
    const proseMirrorText = extractProseMirrorText(read('proseMirrorDocument'));
    if (proseMirrorText) return proseMirrorText;
  }
  return undefined;
}

function normalizeLiteral(value: unknown): SceneRendererLiteral | undefined {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeLiteral(item) ?? null);
  }
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        normalizeLiteral(item) ?? null
      ])
    );
  }
  return undefined;
}

function extractProseMirrorText(value: SceneRendererLiteral | undefined): string {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return '';
  const content = (value as { content?: unknown }).content;
  if (!Array.isArray(content)) return '';
  return content.map((node) => extractProseMirrorNodeText(node)).filter(Boolean).join('\n');
}

function extractProseMirrorNodeText(node: unknown): string {
  if (typeof node !== 'object' || node === null) return '';
  const record = node as { text?: unknown; content?: unknown };
  if (typeof record.text === 'string') return record.text;
  if (!Array.isArray(record.content)) return '';
  return record.content.map((child) => extractProseMirrorNodeText(child)).join('');
}

function finiteNumber(value: SceneRendererLiteral | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
