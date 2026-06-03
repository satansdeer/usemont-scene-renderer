import type { SceneConfig, Visual } from '@usemont/scene-model';
import {
  createProgrammaticSceneFramePlan,
  readVisualAttribute,
  type SceneRendererLiteral
} from './programmaticFramePlan.js';

export type SceneRendererCanvas = HTMLCanvasElement | OffscreenCanvas;

export type SceneRendererAssetUrlResolver = (assetIdOrUrl: string) => string | null | undefined;

export type ProgrammaticSceneFrameRenderOptions = {
  canvas: SceneRendererCanvas;
  visuals: Visual[];
  sceneWidth: number;
  sceneHeight: number;
  timestampMs: number;
  sceneConfig?: Partial<SceneConfig>;
  background?: string;
  clear?: boolean;
  devicePixelRatio?: number;
  resolveAssetUrl?: SceneRendererAssetUrlResolver;
  onAssetLoad?: () => void;
};

export type ProgrammaticSceneFrameRenderResult = {
  width: number;
  height: number;
  timestampMs: number;
  pendingAssetCount: number;
  unsupportedVisualTypes: string[];
};

type Point = { x: number; y: number };
type CachedImage = {
  image: HTMLImageElement;
  status: 'loading' | 'loaded' | 'error';
};

const imageCache = new Map<string, CachedImage>();

export function drawProgrammaticSceneFrame(
  options: ProgrammaticSceneFrameRenderOptions
): ProgrammaticSceneFrameRenderResult {
  const ratio = options.devicePixelRatio ?? browserDevicePixelRatio();
  const pixelWidth = Math.max(1, Math.round(options.sceneWidth * ratio));
  const pixelHeight = Math.max(1, Math.round(options.sceneHeight * ratio));
  options.canvas.width = pixelWidth;
  options.canvas.height = pixelHeight;
  if ('style' in options.canvas) {
    options.canvas.style.aspectRatio = `${options.sceneWidth} / ${options.sceneHeight}`;
  }

  const context = options.canvas.getContext('2d');
  const result: ProgrammaticSceneFrameRenderResult = {
    width: options.sceneWidth,
    height: options.sceneHeight,
    timestampMs: options.timestampMs,
    pendingAssetCount: 0,
    unsupportedVisualTypes: []
  };
  if (!context) return result;
  const plan = createProgrammaticSceneFramePlan({ visuals: options.visuals });
  result.unsupportedVisualTypes.push(...plan.unsupportedVisualTypes);

  context.save();
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  if (options.clear ?? true) {
    context.clearRect(0, 0, options.sceneWidth, options.sceneHeight);
  }
  context.fillStyle = options.background ?? options.sceneConfig?.backgroundColor ?? '#0f172a';
  context.fillRect(0, 0, options.sceneWidth, options.sceneHeight);

  for (const visual of plan.visuals) {
    drawVisual(context, visual, options, result);
  }
  context.restore();

  return result;
}

function browserDevicePixelRatio(): number {
  return typeof globalThis.devicePixelRatio === 'number' && Number.isFinite(globalThis.devicePixelRatio)
    ? globalThis.devicePixelRatio
    : 1;
}

function drawVisual(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  visual: Visual,
  options: ProgrammaticSceneFrameRenderOptions,
  result: ProgrammaticSceneFrameRenderResult
): void {
  context.save();
  const opacity = finiteNumber(readVisualAttribute(visual, 'opacity'), 1);
  context.globalAlpha *= Math.max(0, Math.min(1, opacity));
  applyEffects(context, visual);

  switch (visual.type) {
    case 'rect':
      drawRect(context, visual);
      break;
    case 'circle':
    case 'ellipse':
      drawEllipse(context, visual);
      break;
    case 'triangle':
    case 'diamond':
    case 'star':
      drawPolygon(context, visual);
      break;
    case 'arc':
      drawArc(context, visual);
      break;
    case 'calloutBox':
      drawCalloutBox(context, visual);
      break;
    case 'line':
    case 'arrow':
    case 'turnArrow':
      drawLine(context, visual);
      break;
    case 'text':
      drawText(context, visual);
      break;
    case 'image':
      if (literalString(readVisualAttribute(visual, 'kind'), '') === 'cursor') {
        drawCursor(context, visual);
      } else {
        drawImageVisual(context, visual, options, result);
      }
      break;
    case 'lottie':
      drawMediaPlaceholder(context, visual, 'Lottie');
      break;
    case 'model3d':
      drawMediaPlaceholder(context, visual, '3D');
      break;
    case 'group':
      drawGroup(context, visual);
      break;
    default:
      pushUnsupportedVisualType(result, String(visual.type));
      drawMediaPlaceholder(context, visual, String(visual.type));
      break;
  }

  if (visual.children?.length) {
    for (const child of visual.children) drawVisual(context, child, options, result);
  }
  context.restore();
}

function pushUnsupportedVisualType(result: ProgrammaticSceneFrameRenderResult, type: string): void {
  if (!result.unsupportedVisualTypes.includes(type)) result.unsupportedVisualTypes.push(type);
}

function drawGroup(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const proceduralKind = literalString(readVisualAttribute(visual, 'proceduralKind'), '');
  if (proceduralKind === 'mesh2d') {
    drawProceduralMesh2d(context, visual);
  } else if (proceduralKind === 'scene3d') {
    drawProceduralScene3d(context, visual);
  } else if (proceduralKind === 'shader') {
    drawProceduralShaderOverlay(context, visual);
  }
}

function applyEffects(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 0);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 0);
  const rotation = finiteNumber(readVisualAttribute(visual, 'rotation'), 0);
  const scaleX = finiteNumber(readVisualAttribute(visual, 'scaleX'), 1);
  const scaleY = finiteNumber(readVisualAttribute(visual, 'scaleY'), 1);
  if (Math.abs(rotation) > 0.0001 || Math.abs(scaleX - 1) > 0.0001 || Math.abs(scaleY - 1) > 0.0001) {
    context.translate(x + width / 2, y + height / 2);
    context.rotate(rotation * Math.PI / 180);
    context.scale(scaleX, scaleY);
    context.translate(-(x + width / 2), -(y + height / 2));
  }
  const blur = finiteNumber(readVisualAttribute(visual, 'blur'), 0);
  context.filter = blur > 0 ? `blur(${blur}px)` : 'none';
  const shadowColor = literalString(readVisualAttribute(visual, 'shadowColor'), '');
  const glowColor = literalString(readVisualAttribute(visual, 'glowColor'), '');
  if (shadowColor || glowColor) {
    context.shadowColor = glowColor || shadowColor;
    context.shadowBlur = finiteNumber(readVisualAttribute(visual, 'glowBlur'), finiteNumber(readVisualAttribute(visual, 'shadowBlur'), 0));
    context.shadowOffsetX = finiteNumber(readVisualAttribute(visual, 'shadowOffsetX'), 0);
    context.shadowOffsetY = finiteNumber(readVisualAttribute(visual, 'shadowOffsetY'), 0);
  }
}

function drawRect(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 0);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 0);
  const radius = Math.max(0, finiteNumber(readVisualAttribute(visual, 'radius'), 0));
  roundedRectPath(context, x, y, width, height, Math.min(radius, width / 2, height / 2));
  fillAndStroke(context, visual);
}

function drawEllipse(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), finiteNumber(readVisualAttribute(visual, 'radius'), 40) * 2);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), width);
  context.beginPath();
  context.ellipse(x + width / 2, y + height / 2, Math.max(1, width / 2), Math.max(1, height / 2), 0, 0, Math.PI * 2);
  fillAndStroke(context, visual);
}

function drawPolygon(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 100);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 100);
  const points = visual.type === 'triangle'
    ? [{ x: x + width / 2, y }, { x: x + width, y: y + height }, { x, y: y + height }]
    : visual.type === 'diamond'
      ? [{ x: x + width / 2, y }, { x: x + width, y: y + height / 2 }, { x: x + width / 2, y: y + height }, { x, y: y + height / 2 }]
      : starPoints(x + width / 2, y + height / 2, Math.min(width, height) / 2, Math.min(width, height) / 4, 5);
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  fillAndStroke(context, visual);
}

function drawArc(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 100);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 100);
  const sweepPercent = Math.max(0, Math.min(100, finiteNumber(readVisualAttribute(visual, 'arcSweepPercent'), 75)));
  const thicknessPercent = Math.max(1, Math.min(100, finiteNumber(readVisualAttribute(visual, 'arcThicknessPercent'), 35)));
  const cx = x + width / 2;
  const cy = y + height / 2;
  const outerRadius = Math.max(1, Math.min(width, height) / 2);
  const innerRadius = Math.max(1, outerRadius * (1 - thicknessPercent / 100));
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + Math.PI * 2 * (sweepPercent / 100);
  context.beginPath();
  context.arc(cx, cy, outerRadius, startAngle, endAngle);
  context.arc(cx, cy, innerRadius, endAngle, startAngle, true);
  context.closePath();
  fillAndStroke(context, visual);
}

function drawCalloutBox(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 220);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 120);
  const radius = Math.max(0, finiteNumber(readVisualAttribute(visual, 'radius'), 18));
  const pointerSide = literalString(readVisualAttribute(visual, 'calloutPointerSide'), 'none');
  const pointerOffsetPercent = Math.max(0, Math.min(100, finiteNumber(readVisualAttribute(visual, 'calloutPointerOffsetPercent'), 50)));
  const pointerWidth = Math.max(0, finiteNumber(readVisualAttribute(visual, 'calloutPointerWidthPx'), 48));
  const pointerHeight = Math.max(0, finiteNumber(readVisualAttribute(visual, 'calloutPointerHeightPx'), 26));
  const insetTop = pointerSide === 'top' ? pointerHeight : 0;
  const insetRight = pointerSide === 'right' ? pointerHeight : 0;
  const insetBottom = pointerSide === 'bottom' ? pointerHeight : 0;
  const insetLeft = pointerSide === 'left' ? pointerHeight : 0;
  const bx = x + insetLeft;
  const by = y + insetTop;
  const bw = Math.max(1, width - insetLeft - insetRight);
  const bh = Math.max(1, height - insetTop - insetBottom);
  const clampedRadius = Math.min(radius, bw / 2, bh / 2);
  const pointerCenterX = bx + bw * (pointerOffsetPercent / 100);
  const pointerCenterY = by + bh * (pointerOffsetPercent / 100);

  context.beginPath();
  context.moveTo(bx + clampedRadius, by);
  if (pointerSide === 'top') {
    context.lineTo(Math.max(bx + clampedRadius, pointerCenterX - pointerWidth / 2), by);
    context.lineTo(pointerCenterX, y);
    context.lineTo(Math.min(bx + bw - clampedRadius, pointerCenterX + pointerWidth / 2), by);
  }
  context.lineTo(bx + bw - clampedRadius, by);
  context.quadraticCurveTo(bx + bw, by, bx + bw, by + clampedRadius);
  if (pointerSide === 'right') {
    context.lineTo(bx + bw, Math.max(by + clampedRadius, pointerCenterY - pointerWidth / 2));
    context.lineTo(x + width, pointerCenterY);
    context.lineTo(bx + bw, Math.min(by + bh - clampedRadius, pointerCenterY + pointerWidth / 2));
  }
  context.lineTo(bx + bw, by + bh - clampedRadius);
  context.quadraticCurveTo(bx + bw, by + bh, bx + bw - clampedRadius, by + bh);
  if (pointerSide === 'bottom') {
    context.lineTo(Math.min(bx + bw - clampedRadius, pointerCenterX + pointerWidth / 2), by + bh);
    context.lineTo(pointerCenterX, y + height);
    context.lineTo(Math.max(bx + clampedRadius, pointerCenterX - pointerWidth / 2), by + bh);
  }
  context.lineTo(bx + clampedRadius, by + bh);
  context.quadraticCurveTo(bx, by + bh, bx, by + bh - clampedRadius);
  if (pointerSide === 'left') {
    context.lineTo(bx, Math.min(by + bh - clampedRadius, pointerCenterY + pointerWidth / 2));
    context.lineTo(x, pointerCenterY);
    context.lineTo(bx, Math.max(by + clampedRadius, pointerCenterY - pointerWidth / 2));
  }
  context.lineTo(bx, by + clampedRadius);
  context.quadraticCurveTo(bx, by, bx + clampedRadius, by);
  context.closePath();
  fillAndStroke(context, visual);
}

function drawLine(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x1 = finiteNumber(readVisualAttribute(visual, 'x1'), finiteNumber(readVisualAttribute(visual, 'x'), 0));
  const y1 = finiteNumber(readVisualAttribute(visual, 'y1'), finiteNumber(readVisualAttribute(visual, 'y'), 0));
  const x2 = finiteNumber(readVisualAttribute(visual, 'x2'), x1 + finiteNumber(readVisualAttribute(visual, 'width'), 120));
  const y2 = finiteNumber(readVisualAttribute(visual, 'y2'), y1 + finiteNumber(readVisualAttribute(visual, 'height'), 0));
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.strokeStyle = literalString(readVisualAttribute(visual, 'stroke'), literalString(readVisualAttribute(visual, 'fill'), '#0f172a'));
  context.lineWidth = finiteNumber(readVisualAttribute(visual, 'strokeWidth'), 4);
  context.lineCap = 'round';
  context.stroke();
  if (visual.type === 'arrow') {
    drawArrowHead(context, { x: x1, y: y1 }, { x: x2, y: y2 });
  }
}

function drawText(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = Math.max(1, finiteNumber(readVisualAttribute(visual, 'width'), 200));
  const height = Math.max(1, finiteNumber(readVisualAttribute(visual, 'height'), 80));
  const size = Math.max(1, finiteNumber(readVisualAttribute(visual, 'size'), 32));
  const weight = literalString(readVisualAttribute(visual, 'weight'), '700');
  const family = literalString(readVisualAttribute(visual, 'fontFamily'), 'Inter, ui-sans-serif, system-ui, sans-serif');
  const text = literalString(readVisualAttribute(visual, 'text'), '');
  context.fillStyle = literalString(readVisualAttribute(visual, 'color'), '#0f172a');
  context.font = `${weight} ${size}px ${family}`;
  context.textAlign = textAlign(readVisualAttribute(visual, 'align'));
  context.textBaseline = 'top';
  const lines = wrapText(context, text, width);
  const lineHeight = size * 1.08;
  const totalHeight = lines.length * lineHeight;
  const startY = verticalStart(y, height, totalHeight, readVisualAttribute(visual, 'verticalAlign'));
  const anchorX = context.textAlign === 'center' ? x + width / 2 : context.textAlign === 'right' ? x + width : x;
  lines.forEach((line, index) => context.fillText(line, anchorX, startY + index * lineHeight));
}

function drawCursor(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 56);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), width * 1.32);
  const strokeWidth = finiteNumber(readVisualAttribute(visual, 'strokeWidth'), 5);
  const points = [
    { x, y },
    { x: x + width * 0.86, y: y + height * 0.56 },
    { x: x + width * 0.52, y: y + height * 0.62 },
    { x: x + width * 0.72, y: y + height },
    { x: x + width * 0.48, y: y + height * 1.08 },
    { x: x + width * 0.29, y: y + height * 0.68 },
    { x, y: y + height * 0.93 }
  ];
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fillStyle = literalString(readVisualAttribute(visual, 'fill'), '#ffffff');
  context.strokeStyle = literalString(readVisualAttribute(visual, 'stroke'), '#0f172a');
  context.lineJoin = 'round';
  context.lineWidth = strokeWidth;
  context.fill();
  context.stroke();
}

function drawProceduralMesh2d(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const offsetX = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const offsetY = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const triangles = literalArray(readVisualAttribute(visual, 'triangles'));
  for (const rawTriangle of triangles) {
    const triangle = literalRecord(rawTriangle);
    const points = literalArray(triangle.points).map((point) => point2d(point));
    if (points.length < 3) continue;
    context.save();
    context.globalAlpha *= Math.max(0, Math.min(1, finiteNumber(triangle.opacity, 1)));
    context.beginPath();
    context.moveTo(offsetX + points[0].x, offsetY + points[0].y);
    context.lineTo(offsetX + points[1].x, offsetY + points[1].y);
    context.lineTo(offsetX + points[2].x, offsetY + points[2].y);
    context.closePath();
    const fill = literalString(triangle.fill, 'transparent');
    if (fill !== 'none' && fill !== 'transparent') {
      context.fillStyle = fill;
      context.fill();
    }
    const stroke = literalString(triangle.stroke, '');
    const strokeWidth = finiteNumber(triangle.strokeWidth, 0);
    if (stroke && stroke !== 'none' && strokeWidth > 0) {
      context.strokeStyle = stroke;
      context.lineWidth = strokeWidth;
      context.stroke();
    }
    context.restore();
  }
}

function drawProceduralScene3d(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 640);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 360);
  const objects = literalArray(readVisualAttribute(visual, 'objects'))
    .map((object) => literalRecord(object))
    .sort((left, right) => finiteNumber(left.z, 0) - finiteNumber(right.z, 0));
  const origin = { x: x + width / 2, y: y + height / 2 };

  for (const object of objects) {
    const projected = projectIso(
      origin,
      finiteNumber(object.x, 0),
      finiteNumber(object.y, 0),
      finiteNumber(object.z, 0)
    );
    const fill = literalString(object.fill, '#94a3b8');
    const stroke = literalString(object.stroke, 'rgba(15, 23, 42, 0.28)');
    context.save();
    context.globalAlpha *= Math.max(0, Math.min(1, finiteNumber(object.opacity, 1)));
    if (literalString(object.kind, 'box') === 'sphere') {
      context.beginPath();
      context.ellipse(
        projected.x,
        projected.y,
        Math.max(4, finiteNumber(object.radius, 42) * 0.9),
        Math.max(4, finiteNumber(object.radius, 42) * 0.56),
        0,
        0,
        Math.PI * 2
      );
      context.fillStyle = fill;
      context.fill();
      context.strokeStyle = stroke;
      context.lineWidth = 1.5;
      context.stroke();
    } else {
      drawIsoBox(
        context,
        projected.x,
        projected.y,
        finiteNumber(object.width, 80),
        finiteNumber(object.height, 80),
        finiteNumber(object.depth, 80),
        fill,
        stroke
      );
    }
    context.restore();
  }
}

function drawProceduralShaderOverlay(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 640);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 360);
  context.save();
  context.globalCompositeOperation = 'screen';
  context.globalAlpha *= 0.22;
  for (let row = 0; row < height; row += 12) {
    context.fillStyle = row % 24 === 0 ? '#67e8f9' : '#f0abfc';
    context.fillRect(x, y + row, width, 2);
  }
  context.globalAlpha *= 0.6;
  context.fillStyle = '#f43f5e';
  context.fillRect(x + 10, y, 2, height);
  context.fillStyle = '#22d3ee';
  context.fillRect(x + width - 12, y, 2, height);
  context.restore();
}

function drawImageVisual(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  visual: Visual,
  options: ProgrammaticSceneFrameRenderOptions,
  result: ProgrammaticSceneFrameRenderResult
): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 200);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 140);
  const rawSrc = literalString(readVisualAttribute(visual, 'src'), '');
  const url = options.resolveAssetUrl?.(rawSrc) ?? rawSrc;
  if (!url) {
    drawMediaPlaceholder(context, visual, 'Image');
    return;
  }
  const cached = cachedImage(url, options.onAssetLoad);
  if (cached.status !== 'loaded') {
    if (cached.status === 'loading') result.pendingAssetCount += 1;
    drawMediaPlaceholder(context, visual, cached.status === 'error' ? 'Missing image' : 'Loading');
    return;
  }
  const fit = literalString(readVisualAttribute(visual, 'fit'), 'contain');
  const sourceWidth = cached.image.naturalWidth || cached.image.width || width;
  const sourceHeight = cached.image.naturalHeight || cached.image.height || height;
  const box = imageFitBox(x, y, width, height, sourceWidth, sourceHeight, fit);
  context.drawImage(cached.image, box.x, box.y, box.width, box.height);
}

function cachedImage(url: string, onAssetLoad: (() => void) | undefined): CachedImage {
  const existing = imageCache.get(url);
  if (existing) return existing;
  if (typeof Image === 'undefined') {
    return { image: undefined as unknown as HTMLImageElement, status: 'error' };
  }
  const image = new Image();
  const cached: CachedImage = { image, status: 'loading' };
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    cached.status = 'loaded';
    onAssetLoad?.();
  };
  image.onerror = () => {
    cached.status = 'error';
    onAssetLoad?.();
  };
  image.src = url;
  imageCache.set(url, cached);
  return cached;
}

function imageFitBox(
  x: number,
  y: number,
  width: number,
  height: number,
  sourceWidth: number,
  sourceHeight: number,
  fit: string
): { x: number; y: number; width: number; height: number } {
  if (fit === 'stretch' || sourceWidth <= 0 || sourceHeight <= 0) return { x, y, width, height };
  const scale = fit === 'cover'
    ? Math.max(width / sourceWidth, height / sourceHeight)
    : Math.min(width / sourceWidth, height / sourceHeight);
  const nextWidth = sourceWidth * scale;
  const nextHeight = sourceHeight * scale;
  return {
    x: x + (width - nextWidth) / 2,
    y: y + (height - nextHeight) / 2,
    width: nextWidth,
    height: nextHeight
  };
}

function drawMediaPlaceholder(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  visual: Visual,
  label: string
): void {
  const x = finiteNumber(readVisualAttribute(visual, 'x'), 0);
  const y = finiteNumber(readVisualAttribute(visual, 'y'), 0);
  const width = finiteNumber(readVisualAttribute(visual, 'width'), 200);
  const height = finiteNumber(readVisualAttribute(visual, 'height'), 140);
  roundedRectPath(context, x, y, width, height, 16);
  context.fillStyle = '#e0f2fe';
  context.fill();
  context.strokeStyle = '#38bdf8';
  context.lineWidth = 2;
  context.stroke();
  context.fillStyle = '#075985';
  context.font = '700 22px Inter, ui-sans-serif, system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(label, x + width / 2, y + height / 2);
}

function fillAndStroke(context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, visual: Visual): void {
  const fill = literalString(readVisualAttribute(visual, 'fill'), 'transparent');
  if (fill !== 'transparent' && fill !== 'none') {
    context.fillStyle = fill;
    context.fill();
  }
  const stroke = literalString(readVisualAttribute(visual, 'stroke'), '');
  const strokeWidth = finiteNumber(readVisualAttribute(visual, 'strokeWidth'), 0);
  if (stroke && stroke !== 'none' && strokeWidth > 0) {
    context.strokeStyle = stroke;
    context.lineWidth = strokeWidth;
    context.stroke();
  }
}

function roundedRectPath(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function wrapText(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const explicit = text.split('\n');
  const lines: string[] = [];
  for (const segment of explicit) {
    const words = segment.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let current = words[0];
    for (const word of words.slice(1)) {
      const next = `${current} ${word}`;
      if (context.measureText(next).width <= maxWidth) current = next;
      else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

function textAlign(value: SceneRendererLiteral | undefined): CanvasTextAlign {
  switch (literalString(value, 'left')) {
    case 'center':
      return 'center';
    case 'right':
    case 'end':
      return 'right';
    default:
      return 'left';
  }
}

function verticalStart(
  y: number,
  height: number,
  totalHeight: number,
  value: SceneRendererLiteral | undefined
): number {
  switch (literalString(value, 'top')) {
    case 'middle':
    case 'center':
      return y + (height - totalHeight) / 2;
    case 'bottom':
      return y + height - totalHeight;
    default:
      return y;
  }
}

function starPoints(cx: number, cy: number, outer: number, inner: number, points: number): Point[] {
  const result: Point[] = [];
  for (let index = 0; index < points * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / points;
    result.push({ x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius });
  }
  return result;
}

function drawArrowHead(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  from: Point,
  to: Point
): void {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const size = 16;
  context.beginPath();
  context.moveTo(to.x, to.y);
  context.lineTo(to.x - Math.cos(angle - Math.PI / 6) * size, to.y - Math.sin(angle - Math.PI / 6) * size);
  context.lineTo(to.x - Math.cos(angle + Math.PI / 6) * size, to.y - Math.sin(angle + Math.PI / 6) * size);
  context.closePath();
  context.fillStyle = context.strokeStyle;
  context.fill();
}

function projectIso(origin: Point, x: number, y: number, z: number): Point {
  return {
    x: origin.x + x - z * 0.52,
    y: origin.y + y * 0.72 + z * 0.32
  };
}

function drawIsoBox(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  depth: number,
  fill: string,
  stroke: string
): void {
  const halfWidth = Math.max(4, width / 2);
  const halfHeight = Math.max(4, height / 2);
  const depthX = Math.max(4, depth * 0.38);
  const depthY = Math.max(4, depth * 0.24);
  const front = [
    { x: x - halfWidth, y: y - halfHeight },
    { x: x + halfWidth, y: y - halfHeight },
    { x: x + halfWidth, y: y + halfHeight },
    { x: x - halfWidth, y: y + halfHeight }
  ];
  const top = [
    { x: x - halfWidth, y: y - halfHeight },
    { x: x - halfWidth + depthX, y: y - halfHeight - depthY },
    { x: x + halfWidth + depthX, y: y - halfHeight - depthY },
    { x: x + halfWidth, y: y - halfHeight }
  ];
  const side = [
    { x: x + halfWidth, y: y - halfHeight },
    { x: x + halfWidth + depthX, y: y - halfHeight - depthY },
    { x: x + halfWidth + depthX, y: y + halfHeight - depthY },
    { x: x + halfWidth, y: y + height / 2 }
  ];
  fillPolygon(context, top, tintColor(fill, 0.18), stroke);
  fillPolygon(context, side, tintColor(fill, -0.18), stroke);
  fillPolygon(context, front, fill, stroke);
}

function fillPolygon(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  points: Point[],
  fill: string,
  stroke: string
): void {
  context.beginPath();
  points.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fillStyle = fill;
  context.fill();
  if (stroke && stroke !== 'none') {
    context.strokeStyle = stroke;
    context.lineWidth = 1.5;
    context.stroke();
  }
}

function tintColor(color: string, amount: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(color);
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const channel = (shift: number) => Math.max(0, Math.min(255, ((value >> shift) & 0xff) + amount * 255));
  const red = Math.round(channel(16)).toString(16).padStart(2, '0');
  const green = Math.round(channel(8)).toString(16).padStart(2, '0');
  const blue = Math.round(channel(0)).toString(16).padStart(2, '0');
  return `#${red}${green}${blue}`;
}

function literalRecord(value: SceneRendererLiteral | undefined): Record<string, SceneRendererLiteral> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function literalArray(value: SceneRendererLiteral | undefined): SceneRendererLiteral[] {
  return Array.isArray(value) ? value : [];
}

function point2d(value: SceneRendererLiteral): Point {
  if (Array.isArray(value)) {
    return {
      x: finiteNumber(value[0], 0),
      y: finiteNumber(value[1], 0)
    };
  }
  const record = literalRecord(value);
  return {
    x: finiteNumber(record.x, 0),
    y: finiteNumber(record.y, 0)
  };
}

function literalString(value: SceneRendererLiteral | undefined, fallback: string): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
}

function finiteNumber(value: SceneRendererLiteral | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}
