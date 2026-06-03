import {
  DEFAULT_ARC_SWEEP_PERCENT,
  DEFAULT_ARC_THICKNESS_PERCENT,
  DEFAULT_ARROW_HEAD_LENGTH_PERCENT,
  DEFAULT_ARROW_HEAD_WIDTH_PERCENT,
  DEFAULT_ARROW_SHAFT_WIDTH_PERCENT,
  DEFAULT_ARROW_TAIL_WIDTH_PERCENT,
  DEFAULT_ARROW_WING_CONCAVITY_PERCENT,
  DEFAULT_CALLOUT_POINTER_HEIGHT_PX,
  DEFAULT_CALLOUT_POINTER_OFFSET_PERCENT,
  DEFAULT_CALLOUT_POINTER_SIDE,
  DEFAULT_CALLOUT_POINTER_WIDTH_PX,
  DEFAULT_LINE_CONTROL_1_X_PERCENT,
  DEFAULT_LINE_CONTROL_1_Y_PERCENT,
  DEFAULT_LINE_CONTROL_2_X_PERCENT,
  DEFAULT_LINE_CONTROL_2_Y_PERCENT,
  createVisual,
  resolveLinePath,
  type LinePath,
  type LinePathNode,
  type LineShapeOptions,
  type ShapeObjectType,
  type Visual
} from '@usemont/scene-model';

import {
  computeProgrammaticSpanBentoLayout,
  computeProgrammaticSpanStackLayout,
  type ProgrammaticSpanComputedLayoutFrame,
  type ProgrammaticSpanLayoutComputeResult
} from './layoutEngine.js';
import { programmaticSpanDefaultCursorAssetUrl } from './defaultAssets.js';
import { evaluateProceduralRenderProgram, type ProceduralRenderProgram } from './procedural.js';
import type {
  ProgrammaticSpanDiagnostic,
  ProgrammaticSpanEasing,
  ProgrammaticSpanEffect,
  ProgrammaticSpanExpression,
  ProgrammaticSpanFrame,
  ProgrammaticSpanLiteral,
  ProgrammaticSpanNode,
  ProgrammaticSpanSpec,
  ProgrammaticSpanSettings,
  ProgrammaticSpanToken,
  ProgrammaticSpanTokens,
  ProgrammaticSpanVariables
} from './types.js';

type EvaluationContext = {
  timeMs: number;
  durationMs: number;
  sceneWidth: number;
  sceneHeight: number;
  variables: ProgrammaticSpanVariables;
  settings: ProgrammaticSpanSettings;
  tokens: ProgrammaticSpanTokens;
  tokenDefinitions: Map<string, ProgrammaticSpanToken>;
  resolvingTokens: Set<string>;
  diagnostics: ProgrammaticSpanDiagnostic[];
};

type RenderScope = {
  offsetX: number;
  offsetY: number;
  opacity: number;
  layerOffset: number;
  boundsWidth: number;
  boundsHeight: number;
};

type LayoutFrameOverride = ProgrammaticSpanComputedLayoutFrame;

type TextMeasureStyle = {
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: string;
};

type TextLayoutMetrics = TextMeasureStyle & {
  width: number;
};

let programmaticSpanTextMeasureContext: CanvasRenderingContext2D | null | undefined;

export function evaluateProgrammaticSpanFrame(
  spec: ProgrammaticSpanSpec,
  timeMs: number,
  variables: ProgrammaticSpanVariables = {},
  settings: ProgrammaticSpanSettings = {}
): ProgrammaticSpanFrame {
  const diagnostics: ProgrammaticSpanDiagnostic[] = [];
  const defaults = Object.fromEntries(spec.variables.map((variable) => [variable.id, variable.default]));
  const settingDefaults = Object.fromEntries(spec.settings.map((setting) => [setting.id, setting.default]));
  const tokenDefinitions = new Map(spec.tokens.map((token) => [token.id, token]));
  const context: EvaluationContext = {
    timeMs: clamp(timeMs, 0, spec.durationMs),
    durationMs: spec.durationMs,
    sceneWidth: spec.width,
    sceneHeight: spec.height,
    variables: { ...defaults, ...variables },
    settings: { ...settingDefaults, ...settings },
    tokens: {},
    tokenDefinitions,
    resolvingTokens: new Set(),
    diagnostics
  };
  for (const token of spec.tokens) {
    resolveTokenValue(token.id, context, []);
  }

  const visuals = evaluateNode(spec.root, context, {
    offsetX: 0,
    offsetY: 0,
    opacity: 1,
    layerOffset: 0,
    boundsWidth: spec.width,
    boundsHeight: spec.height
  });
  const effects = evaluateEffects(spec.root, context, {
    offsetX: 0,
    offsetY: 0,
    opacity: 1,
    layerOffset: 0,
    boundsWidth: spec.width,
    boundsHeight: spec.height
  });

  return { visuals, effects, diagnostics };
}

function evaluateNode(
  node: ProgrammaticSpanNode,
  context: EvaluationContext,
  scope: RenderScope,
  layoutFrame: LayoutFrameOverride | null = null
): Visual[] {
  if (!isNodeActive(node, context.timeMs)) return [];

  const props = applyLayoutFrame(
    applyAnimations(resolveProps(node.props, context), node, context),
    layoutFrame
  );
  const x = lengthProp(props, 'x', 0, 'x', scope);
  const y = lengthProp(props, 'y', 0, 'y', scope);
  const width = lengthProp(props, 'width', scope.boundsWidth, 'x', scope);
  const height = lengthProp(props, 'height', scope.boundsHeight, 'y', scope);
  const boxProps: Record<string, ProgrammaticSpanLiteral> = {
    ...props,
    x,
    y,
    ...(props.width != null ? { width } : {}),
    ...(props.height != null ? { height } : {})
  };
  const nextScope = {
    offsetX: scope.offsetX + x,
    offsetY: scope.offsetY + y,
    opacity: scope.opacity * numberProp(boxProps.opacity, 1),
    layerOffset: scope.layerOffset + numberProp(boxProps.layer, 0),
    boundsWidth: width,
    boundsHeight: height
  };

  if (node.kind === 'scene') {
    return node.children.flatMap((child) => evaluateNode(child, context, scope));
  }

  if (node.kind === 'group') {
    return node.children.flatMap((child) => evaluateNode(child, context, nextScope));
  }

  if (node.kind === 'v-stack' || node.kind === 'h-stack') {
    return evaluateStackNode(node, boxProps, context, scope, nextScope);
  }

  if (node.kind === 'bento') {
    return evaluateBentoNode(node, boxProps, context, scope, nextScope);
  }

  if (node.kind === 'cell') {
    return evaluateCellNode(node, boxProps, context, scope);
  }

  if (node.kind === 'motion-box') {
    return evaluateMotionBoxNode(node, boxProps, context, nextScope);
  }

  if (node.kind === 'text' && shouldRenderSplitRevealText(boxProps)) {
    return textNodeToSplitRevealVisuals(node, boxProps, scope);
  }

  if (node.kind === 'procedural-visual') {
    return proceduralNodeToVisuals(node, boxProps, context, scope);
  }

  const presetVisuals = presetNodeToVisuals(node, boxProps, context, scope);
  if (presetVisuals) return presetVisuals;

  const visual = nodeToVisual(node, boxProps, context, scope);
  if (!visual) return [];
  return [visual, ...node.children.flatMap((child) => evaluateNode(child, context, scope))];
}

function evaluateEffects(
  node: ProgrammaticSpanNode,
  context: EvaluationContext,
  scope: RenderScope
): ProgrammaticSpanEffect[] {
  if (!isNodeActive(node, context.timeMs)) return [];

  const props = applyAnimations(resolveProps(node.props, context), node, context);
  const x = lengthProp(props, 'x', 0, 'x', scope);
  const y = lengthProp(props, 'y', 0, 'y', scope);
  const width = lengthProp(props, 'width', scope.boundsWidth, 'x', scope);
  const height = lengthProp(props, 'height', scope.boundsHeight, 'y', scope);
  const nextScope = {
    offsetX: scope.offsetX + x,
    offsetY: scope.offsetY + y,
    opacity: scope.opacity * numberProp(props.opacity, 1),
    layerOffset: scope.layerOffset + numberProp(props.layer, 0),
    boundsWidth: width,
    boundsHeight: height
  };

  if (node.kind === 'scene') {
    return node.children.flatMap((child) => evaluateEffects(child, context, scope));
  }

  if (
    node.kind === 'group' ||
    node.kind === 'v-stack' ||
    node.kind === 'h-stack' ||
    node.kind === 'bento' ||
    node.kind === 'cell' ||
    node.kind === 'motion-box'
  ) {
    return node.children.flatMap((child) => evaluateEffects(child, context, nextScope));
  }

  if (node.kind !== 'effect') {
    return node.children.flatMap((child) => evaluateEffects(child, context, scope));
  }

  const type = stringProp(props.type, 'camera');
  if (type !== 'camera') {
    context.diagnostics.push({
      severity: 'warning',
      message: `Unsupported effect type "${type}".`,
      path: node.id
    });
    return [];
  }

  return [
    {
      id: node.id,
      kind: 'camera',
      centerX: scope.offsetX + numberProp(props, 'centerX', context.sceneWidth / 2),
      centerY: scope.offsetY + numberProp(props, 'centerY', context.sceneHeight / 2),
      zoom: Math.max(0.05, numberProp(props, 'zoom', 1)),
      rotationDeg: numberProp(props.rotation, numberProp(props, 'rotationDeg', 0)),
      blurPx: Math.max(0, numberProp(props.blur, numberProp(props, 'blurPx', 0))),
      opacity: clamp(nextScope.opacity, 0, 1)
    }
  ];
}

function isNodeActive(node: ProgrammaticSpanNode, timeMs: number): boolean {
  if (node.kind === 'scene') return true;
  const startMs = Math.max(0, node.startMs || 0);
  if (timeMs < startMs) return false;
  if (node.durationMs == null) return true;
  return timeMs < startMs + Math.max(0, node.durationMs);
}

function resolveProps(
  props: Record<string, ProgrammaticSpanExpression>,
  context: EvaluationContext
): Record<string, ProgrammaticSpanLiteral> {
  const out: Record<string, ProgrammaticSpanLiteral> = {};
  for (const [key, value] of Object.entries(props)) {
    out[key] = resolveExpression(value, context);
  }
  return out;
}

function resolveExpression(
  expression: ProgrammaticSpanExpression,
  context: EvaluationContext
): ProgrammaticSpanLiteral {
  if (
    expression &&
    typeof expression === 'object' &&
    !Array.isArray(expression) &&
    'kind' in expression &&
    expression.kind === 'variable-ref'
  ) {
    const variableRef = expression as { kind: 'variable-ref'; name: string };
    return context.variables[variableRef.name] ?? null;
  }
  if (
    expression &&
    typeof expression === 'object' &&
    !Array.isArray(expression) &&
    'kind' in expression &&
    expression.kind === 'setting-ref'
  ) {
    const settingRef = expression as { kind: 'setting-ref'; name: string; path: string[] };
    return resolveLiteralPath(context.settings[settingRef.name], settingRef.path);
  }
  if (
    expression &&
    typeof expression === 'object' &&
    !Array.isArray(expression) &&
    'kind' in expression &&
    expression.kind === 'token-ref'
  ) {
    const tokenRef = expression as { kind: 'token-ref'; name: string; path: string[] };
    return resolveTokenValue(tokenRef.name, context, tokenRef.path);
  }
  if (
    expression &&
    typeof expression === 'object' &&
    !Array.isArray(expression) &&
    'kind' in expression &&
    expression.kind === 'call'
  ) {
    const call = expression as { kind: 'call'; callee: string; args: ProgrammaticSpanExpression[] };
    return resolveExpressionCall(call, context);
  }
  return expression;
}

function resolveTokenValue(
  tokenId: string,
  context: EvaluationContext,
  path: string[]
): ProgrammaticSpanLiteral {
  if (Object.prototype.hasOwnProperty.call(context.tokens, tokenId)) {
    return resolveLiteralPath(context.tokens[tokenId], path);
  }
  const token = context.tokenDefinitions.get(tokenId);
  if (!token) return null;
  if (context.resolvingTokens.has(tokenId)) {
    context.diagnostics.push({
      severity: 'warning',
      message: `Token "${tokenId}" has a circular dependency.`,
      path: `tokens.${tokenId}`
    });
    return null;
  }

  context.resolvingTokens.add(tokenId);
  const value = resolveExpression(token.value, context);
  context.resolvingTokens.delete(tokenId);
  context.tokens[tokenId] = value;
  return resolveLiteralPath(value, path);
}

function resolveLiteralPath(
  value: ProgrammaticSpanLiteral | undefined,
  path: string[]
): ProgrammaticSpanLiteral {
  let current: ProgrammaticSpanLiteral | undefined = value;
  for (const part of path) {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return null;
    current = current[part];
  }
  return current ?? null;
}

function resolveExpressionCall(
  call: { callee: string; args: ProgrammaticSpanExpression[] },
  context: EvaluationContext
): ProgrammaticSpanLiteral {
  const args = call.args.map((arg) => resolveExpression(arg, context));
  switch (call.callee) {
    case 'color.mix':
      return colorMix(
        stringLiteralValue(args[0], '#000000'),
        stringLiteralValue(args[1], '#ffffff'),
        numericLiteral(args[2], 0.5)
      );
    case 'color.lighten':
      return colorMix(stringLiteralValue(args[0], '#000000'), '#ffffff', numericLiteral(args[1], 0.2));
    case 'color.darken':
      return colorMix(stringLiteralValue(args[0], '#000000'), '#000000', numericLiteral(args[1], 0.2));
    case 'color.readableText':
      return readableTextColor(
        stringLiteralValue(args[0], '#000000'),
        stringLiteralValue(args[1], '#0f172a'),
        stringLiteralValue(args[2], '#ffffff')
      );
    default:
      return null;
  }
}

function applyAnimations(
  baseProps: Record<string, ProgrammaticSpanLiteral>,
  node: ProgrammaticSpanNode,
  context: EvaluationContext
): Record<string, ProgrammaticSpanLiteral> {
  const props = { ...baseProps };
  const touchedProps = new Set<string>();
  for (const animation of node.animations) {
    const relativeTime = context.timeMs - Math.max(0, node.startMs || 0) - animation.startMs;
    const from = animation.from == null
      ? props[animation.prop] ?? animation.to
      : resolveExpression(animation.from, context);
    const to = resolveExpression(animation.to, context);
    if (relativeTime <= 0) {
      if (!touchedProps.has(animation.prop)) {
        props[animation.prop] = from;
        touchedProps.add(animation.prop);
      }
      continue;
    }
    if (relativeTime >= animation.durationMs) {
      props[animation.prop] = to;
      touchedProps.add(animation.prop);
      continue;
    }
    props[animation.prop] = interpolateValue(
      from,
      to,
      easeProgress(relativeTime / animation.durationMs, animation.ease)
    );
    touchedProps.add(animation.prop);
  }
  return props;
}

function presetNodeToVisuals(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] | null {
  switch (node.kind) {
    case 'browser-window':
      return browserWindowToVisuals(node, props, context, scope);
    case 'traffic-lights':
      return trafficLightsToVisuals(node.id, props, scope);
    case 'cta-button':
      return ctaButtonToVisuals(node, props, context, scope);
    case 'cursor':
      return cursorToVisuals(node.id, props, scope);
    case 'click-pulse':
      return clickPulseToVisuals(node, props, context, scope);
    case 'cursor-click':
      return cursorClickToVisuals(node.id, props, context, scope);
    case 'data-chart':
      return dataChartToVisuals(node.id, props, context, scope);
    case 'flowchart':
    case 'decision-tree':
      return decisionTreeToVisuals(node.id, props, context, scope);
    default:
      return null;
  }
}

function proceduralNodeToVisuals(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const render = props.render;
  if (!isProceduralRenderProgram(render)) {
    context.diagnostics.push({
      severity: 'warning',
      message: '<Procedural.Visual> needs a checked `render={(api) => ...}` function.',
      path: node.id
    });
    return [];
  }
  const width = lengthProp(props, 'width', scope.boundsWidth, 'x', scope);
  const height = lengthProp(props, 'height', scope.boundsHeight, 'y', scope);
  return evaluateProceduralRenderProgram(render, {
    id: node.id,
    timeMs: context.timeMs,
    durationMs: context.durationMs,
    sceneWidth: context.sceneWidth,
    sceneHeight: context.sceneHeight,
    width,
    height,
    offsetX: scope.offsetX + lengthProp(props, 'x', 0, 'x', scope),
    offsetY: scope.offsetY + lengthProp(props, 'y', 0, 'y', scope),
    opacity: scope.opacity * numberProp(props.opacity, 1),
    layerOffset: scope.layerOffset + numberProp(props.layer, 0),
    variables: context.variables,
    settings: context.settings,
    tokens: context.tokens,
    diagnostics: context.diagnostics,
    seed: numberProp(props, 'seed', 1)
  });
}

function isProceduralRenderProgram(value: ProgrammaticSpanLiteral | undefined): value is ProceduralRenderProgram {
  return !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    (value as { kind?: unknown }).kind === 'procedural-render' &&
    typeof (value as { source?: unknown }).source === 'string' &&
    typeof (value as { param?: unknown }).param === 'string';
}

function evaluateStackNode(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope,
  nextScope: RenderScope
): Visual[] {
  const children = activeVisualChildren(node, context);
  const result = computeProgrammaticSpanStackLayout({
    id: node.id,
    direction: node.kind === 'v-stack' ? 'column' : 'row',
    props,
    children: children.map((child) => ({
      id: child.id,
      kind: child.kind,
      props: applyAnimations(resolveProps(child.props, context), child, context)
    }))
  });

  if (!isUsableLayoutResult(result, context, node.id)) {
    return node.children.flatMap((child) => evaluateNode(child, context, nextScope));
  }

  const layoutScope = {
    offsetX: scope.offsetX,
    offsetY: scope.offsetY,
    opacity: nextScope.opacity,
    layerOffset: nextScope.layerOffset,
    boundsWidth: nextScope.boundsWidth,
    boundsHeight: nextScope.boundsHeight
  };
  return children.flatMap((child) =>
    evaluateNode(child, context, layoutScope, result.frames.get(child.id) ?? null)
  );
}

function evaluateBentoNode(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope,
  nextScope: RenderScope
): Visual[] {
  const children = activeVisualChildren(node, context);
  const result = computeProgrammaticSpanBentoLayout({
    id: node.id,
    props,
    children: children.map((child) => ({
      id: child.id,
      kind: child.kind,
      props: applyAnimations(resolveProps(child.props, context), child, context)
    }))
  });

  if (!isUsableLayoutResult(result, context, node.id)) {
    return node.children.flatMap((child) => evaluateNode(child, context, nextScope));
  }

  const layoutScope = {
    offsetX: scope.offsetX,
    offsetY: scope.offsetY,
    opacity: nextScope.opacity,
    layerOffset: nextScope.layerOffset,
    boundsWidth: nextScope.boundsWidth,
    boundsHeight: nextScope.boundsHeight
  };
  return children.flatMap((child) =>
    evaluateNode(child, context, layoutScope, result.frames.get(child.id) ?? null)
  );
}

function evaluateCellNode(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const x = lengthProp(props, 'x', 0, 'x', scope);
  const y = lengthProp(props, 'y', 0, 'y', scope);
  const width = lengthProp(props, 'width', scope.boundsWidth, 'x', scope);
  const height = lengthProp(props, 'height', scope.boundsHeight, 'y', scope);
  const padding = boxSpacing(props, 'padding', scope);
  const childScope = {
    offsetX: scope.offsetX + x + padding.left,
    offsetY: scope.offsetY + y + padding.top,
    opacity: scope.opacity * numberProp(props.opacity, 1),
    layerOffset: scope.layerOffset + numberProp(props.layer, 0),
    boundsWidth: Math.max(1, width - padding.left - padding.right),
    boundsHeight: Math.max(1, height - padding.top - padding.bottom)
  };
  const contentWidth = childScope.boundsWidth;
  const contentHeight = childScope.boundsHeight;
  const mode = stringProp(props.mode, 'position');

  if (mode === 'fit' && node.children.length === 1) {
    const childVisuals = evaluateNode(node.children[0], context, childScope, {
      id: node.children[0].id,
      x: 0,
      y: 0,
      width: contentWidth,
      height: contentHeight
    });
    appendCellDiagnostics(childVisuals, childScope, context, node.id);
    return childVisuals;
  }

  const childVisuals = node.children.flatMap((child) =>
    evaluateNode(child, context, childScope, cellChildPlacementFrame(child, props, context, childScope))
  );
  appendCellDiagnostics(childVisuals, childScope, context, node.id);
  return childVisuals;
}

function cellChildPlacementFrame(
  child: ProgrammaticSpanNode,
  cellProps: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): LayoutFrameOverride | null {
  const align = stringProp(cellProps.align, 'start');
  const justify = stringProp(cellProps.justify, 'start');
  const shouldPlaceX = align !== 'start' && align !== 'flex-start' && !hasHorizontalPosition(child);
  const shouldPlaceY = justify !== 'start' && justify !== 'flex-start' && !hasVerticalPosition(child);
  if (!shouldPlaceX && !shouldPlaceY) return null;

  const props = applyAnimations(resolveProps(child.props, context), child, context);
  const width = measuredNodeWidth(child, props, scope);
  const height = measuredNodeHeight(child, props, scope);
  const x = shouldPlaceX
    ? alignedOffset(align, scope.boundsWidth, width)
    : lengthProp(props, 'x', 0, 'x', scope);
  const y = shouldPlaceY
    ? alignedOffset(justify, scope.boundsHeight, height)
    : lengthProp(props, 'y', 0, 'y', scope);

  return { id: child.id, x, y, width, height };
}

function hasHorizontalPosition(node: ProgrammaticSpanNode): boolean {
  return hasOwnProp(node.props, 'x') ||
    hasOwnProp(node.props, 'centerX') ||
    node.animations.some((animation) => animation.prop === 'x' || animation.prop === 'centerX');
}

function hasVerticalPosition(node: ProgrammaticSpanNode): boolean {
  return hasOwnProp(node.props, 'y') ||
    hasOwnProp(node.props, 'centerY') ||
    node.animations.some((animation) => animation.prop === 'y' || animation.prop === 'centerY');
}

function hasOwnProp(
  props: Record<string, ProgrammaticSpanExpression>,
  key: string
): boolean {
  return Object.prototype.hasOwnProperty.call(props, key);
}

function alignedOffset(align: string, available: number, size: number): number {
  switch (align) {
    case 'center':
      return (available - size) / 2;
    case 'end':
    case 'flex-end':
      return available - size;
    default:
      return 0;
  }
}

function activeVisualChildren(
  node: ProgrammaticSpanNode,
  context: EvaluationContext
): ProgrammaticSpanNode[] {
  return node.children.filter((child) => child.kind !== 'effect' && isNodeActive(child, context.timeMs));
}

function isUsableLayoutResult(
  result: ProgrammaticSpanLayoutComputeResult,
  context: EvaluationContext,
  nodeId: string
): boolean {
  if (result.engine === 'unavailable') return false;
  if (!result.error) return true;
  context.diagnostics.push({
    severity: 'warning',
    message: `Layout engine failed for "${nodeId}": ${result.error}`,
    path: nodeId
  });
  return false;
}

function applyLayoutFrame(
  props: Record<string, ProgrammaticSpanLiteral>,
  frame: LayoutFrameOverride | null
): Record<string, ProgrammaticSpanLiteral> {
  if (!frame) return props;
  return {
    ...props,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height
  };
}

function evaluateMotionBoxNode(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  childScope: RenderScope
): Visual[] {
  const scale = numberProp(props, 'scale', 1);
  const transform = {
    pivotX: childScope.offsetX + resolveLength(props.pivotX, childScope.boundsWidth / 2, 'x', childScope),
    pivotY: childScope.offsetY + resolveLength(props.pivotY, childScope.boundsHeight / 2, 'y', childScope),
    scaleX: numberProp(props, 'scaleX', scale),
    scaleY: numberProp(props, 'scaleY', scale),
    rotationDeg: numberProp(props.rotation, 0)
  };
  const visuals = node.children.flatMap((child) => evaluateNode(child, context, childScope));
  if (isIdentityMotionTransform(transform)) return visuals;
  return transformVisuals(visuals, transform);
}

type MotionTransform = {
  pivotX: number;
  pivotY: number;
  scaleX: number;
  scaleY: number;
  rotationDeg: number;
};

function isIdentityMotionTransform(transform: MotionTransform): boolean {
  return Math.abs(transform.scaleX - 1) < 0.0001 &&
    Math.abs(transform.scaleY - 1) < 0.0001 &&
    Math.abs(transform.rotationDeg) < 0.0001;
}

function transformVisuals(visuals: Visual[], transform: MotionTransform): Visual[] {
  return visuals.map((visual) => transformVisual(visual, transform));
}

function transformVisual(visual: Visual, transform: MotionTransform): Visual {
  const x = finiteVisualAttribute(visual, 'x', Number.NaN);
  const y = finiteVisualAttribute(visual, 'y', Number.NaN);
  const width = finiteVisualAttribute(visual, 'width', Number.NaN);
  const height = finiteVisualAttribute(visual, 'height', Number.NaN);
  const children = visual.children?.map((child) => transformVisual(child, transform));
  if (![x, y, width, height].every(Number.isFinite)) {
    return children ? { ...visual, children } : visual;
  }

  const center = transformPoint({
    x: x + width / 2,
    y: y + height / 2
  }, transform);
  const attributes = new Map<string, unknown>(visual.attributes);
  attributes.set('x', center.x - width / 2);
  attributes.set('y', center.y - height / 2);
  attributes.set('scaleX', finiteMapNumber(attributes, 'scaleX', 1) * transform.scaleX);
  attributes.set('scaleY', finiteMapNumber(attributes, 'scaleY', 1) * transform.scaleY);
  if (Math.abs(transform.rotationDeg) > 0.0001) {
    attributes.set('rotation', finiteMapNumber(attributes, 'rotation', 0) + transform.rotationDeg);
  }

  return {
    ...visual,
    attributes,
    ...(children ? { children } : {})
  };
}

function transformPoint(point: { x: number; y: number }, transform: MotionTransform): { x: number; y: number } {
  const scaledX = transform.pivotX + (point.x - transform.pivotX) * transform.scaleX;
  const scaledY = transform.pivotY + (point.y - transform.pivotY) * transform.scaleY;
  if (Math.abs(transform.rotationDeg) < 0.0001) return { x: scaledX, y: scaledY };

  const radians = transform.rotationDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = scaledX - transform.pivotX;
  const dy = scaledY - transform.pivotY;
  return {
    x: transform.pivotX + dx * cos - dy * sin,
    y: transform.pivotY + dx * sin + dy * cos
  };
}

function browserWindowToVisuals(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const x = scope.offsetX + lengthProp(props, 'x', 0, 'x', scope);
  const y = scope.offsetY + lengthProp(props, 'y', 0, 'y', scope);
  const width = lengthProp(props, 'width', 860, 'x', scope);
  const height = lengthProp(props, 'height', 480, 'y', scope);
  const headerHeight = lengthProp(props, 'headerHeight', 66, 'y', scope);
  const radius = lengthProp(props, 'radius', 28, 'min', scope);
  const layer = scope.layerOffset + numberProp(props.layer, 0);
  const opacity = scope.opacity * numberProp(props.opacity, 1);
  const headerFill = stringProp(props.headerFill, '#e2e8f0');
  const dividerFill = stringProp(props.dividerFill, '#cbd5e1');

  const chrome = [
    createVisual(`${node.id}-body`, `${node.id}-body-programmatic`, 'rect', {
      x,
      y,
      width,
      height,
      layer,
      opacity,
      cornerRadius: radius,
      fill: stringProp(props.fill, '#f8fafc'),
      stroke: stringProp(props.stroke, '#dbeafe'),
      strokeWidth: numberProp(props.strokeWidth, 2)
    }),
    createVisual(`${node.id}-header-cap`, `${node.id}-header-cap-programmatic`, 'rect', {
      x,
      y,
      width,
      height: headerHeight,
      layer: layer + 1,
      opacity,
      cornerRadius: radius,
      fill: headerFill,
      stroke: 'none',
      strokeWidth: 0
    }),
    createVisual(`${node.id}-header-square`, `${node.id}-header-square-programmatic`, 'rect', {
      x,
      y: y + Math.max(0, headerHeight - radius),
      width,
      height: Math.min(radius, headerHeight),
      layer: layer + 2,
      opacity,
      cornerRadius: 0,
      fill: headerFill,
      stroke: 'none',
      strokeWidth: 0
    }),
    createVisual(`${node.id}-header-divider`, `${node.id}-header-divider-programmatic`, 'rect', {
      x,
      y: y + headerHeight - 1,
      width,
      height: 1,
      layer: layer + 3,
      opacity: opacity * numberProp(props.dividerOpacity, 0.82),
      cornerRadius: 0,
      fill: dividerFill,
      stroke: 'none',
      strokeWidth: 0
    })
  ];

  if (boolProp(props.trafficLights, true)) {
    chrome.push(
      ...createTrafficLightsVisuals({
        id: `${node.id}-traffic`,
        centerX: x + numberProp(props.trafficLightsX, 40),
        centerY: y + headerHeight / 2,
        radius: numberProp(props.trafficLightsRadius, 9),
        gap: numberProp(props.trafficLightsGap, 30),
        layer: layer + 4,
        opacity
      })
    );
  }

  const childScope = {
    offsetX: x,
    offsetY: y,
    opacity,
    layerOffset: layer + 5,
    boundsWidth: width,
    boundsHeight: height
  };
  return [...chrome, ...node.children.flatMap((child) => evaluateNode(child, context, childScope))];
}

function trafficLightsToVisuals(
  id: string,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope
): Visual[] {
  return createTrafficLightsVisuals({
    id,
    centerX: scope.offsetX + lengthProp(props, 'x', 40, 'x', scope),
    centerY: scope.offsetY + lengthProp(props, 'y', 33, 'y', scope),
    radius: lengthProp(props, 'radius', 9, 'min', scope),
    gap: lengthProp(props, 'gap', 30, 'x', scope),
    layer: scope.layerOffset + numberProp(props.layer, 0),
    opacity: scope.opacity * numberProp(props.opacity, 1),
    red: stringProp(props.red, '#ef4444'),
    yellow: stringProp(props.yellow, '#f59e0b'),
    green: stringProp(props.green, '#22c55e')
  });
}

function createTrafficLightsVisuals(options: {
  id: string;
  centerX: number;
  centerY: number;
  radius: number;
  gap: number;
  layer: number;
  opacity: number;
  red?: string;
  yellow?: string;
  green?: string;
}): Visual[] {
  const colors = [
    ['red', options.red ?? '#ef4444'],
    ['yellow', options.yellow ?? '#f59e0b'],
    ['green', options.green ?? '#22c55e']
  ] as const;
  return colors.map(([name, fill], index) =>
    createVisual(`${options.id}-${name}`, `${options.id}-${name}-programmatic`, 'circle', {
      x: options.centerX + index * options.gap - options.radius,
      y: options.centerY - options.radius,
      width: options.radius * 2,
      height: options.radius * 2,
      layer: options.layer,
      opacity: options.opacity,
      fill,
      stroke: 'none',
      strokeWidth: 0
    })
  );
}

function ctaButtonToVisuals(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const id = node.id;
  const width = lengthProp(props, 'width', 214, 'x', scope);
  const height = lengthProp(props, 'height', 58, 'y', scope);
  const x = anchoredX(props, scope, width, 0);
  const interaction = ctaInteractionState(node, props, context);
  const y = anchoredY(props, scope, height, 0) + interaction.offsetY;
  const defaultPaddingX = Math.min(30, Math.max(18, width * 0.09));
  const paddingX = lengthProp(props, 'paddingX', defaultPaddingX, 'x', scope);
  const maxSize = numberProp(props.size, numberProp(props.fontSize, 24));
  const label = stringProp(props.label, stringProp(props.text, 'Action'));
  const fontSize = fitSingleLineFontSize(label, Math.max(1, width - paddingX * 2), maxSize);
  const labelHeight = Math.ceil(fontSize * 1.12);
  const labelYOffset = lengthProp(props, 'labelYOffset', -Math.max(1, fontSize * 0.06), 'y', scope);
  const layer = scope.layerOffset + numberProp(props.layer, 0);
  const opacity = scope.opacity * numberProp(props.opacity, 1);

  const visuals: Visual[] = [];
  if (interaction.glowOpacity > 0.001 && boolProp(props.hoverGlow, true)) {
    visuals.push(
      createVisual(`${id}-hover-glow`, `${id}-hover-glow-programmatic`, 'rect', {
        x,
        y,
        width,
        height,
        layer: layer - 1,
        opacity: scope.opacity * interaction.glowOpacity,
        cornerRadius: numberProp(props.radius, 18),
        fill: stringProp(props.hoverGlowFill, '#5eead4'),
        stroke: 'none',
        strokeWidth: 0
      })
    );
  }

  visuals.push(
    createVisual(id, `${id}-programmatic`, 'rect', {
      x,
      y,
      width,
      height,
      layer,
      opacity,
      cornerRadius: numberProp(props.radius, 18),
      fill: stringProp(props.fill, '#14b8a6'),
      stroke: stringProp(props.stroke, 'none'),
      strokeWidth: numberProp(props.strokeWidth, 0)
    }),
    createVisual(`${id}-label`, `${id}-label-programmatic`, 'text', {
      x: x + paddingX,
      y: y + (height - labelHeight) / 2 + labelYOffset,
      width: Math.max(1, width - paddingX * 2),
      height: labelHeight,
      layer: layer + 1,
      opacity,
      fill: stringProp(props.color, '#ecfeff'),
      fontFamily: stringProp(props.fontFamily, 'Inter, Arial, sans-serif'),
      fontSize,
      fontWeight: String(props.weight ?? props.fontWeight ?? '700'),
      textAlign: 'center',
      lineHeight: 1,
      proseMirrorDocument: proseMirrorDocumentFromText(label, 'center')
    })
  );

  return visuals;
}

function ctaInteractionState(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext
): { offsetY: number; glowOpacity: number } {
  const hoverStart = timeProp(props.hoverStart, Number.NaN);
  if (!Number.isFinite(hoverStart)) return { offsetY: 0, glowOpacity: 0 };

  const relativeTime = context.timeMs - Math.max(0, node.startMs || 0);
  const clickStart = timeProp(props.clickStart, Number.NaN);
  const hoverDuration = Math.max(1, timeProp(props.hoverDuration, 160));
  const pressDuration = Math.max(1, timeProp(props.pressDuration, 90));
  const releaseDuration = Math.max(1, timeProp(props.releaseDuration, 180));
  const glowOutDuration = Math.max(1, timeProp(props.glowOutDuration, 260));
  const lift = numberProp(props, 'hoverLift', -4);
  const press = numberProp(props, 'pressOffset', 5);
  const maxGlow = numberProp(props, 'hoverGlowOpacity', 0.24);
  const clickGlow = numberProp(props, 'clickGlowOpacity', 0.1);

  if (relativeTime < hoverStart) return { offsetY: 0, glowOpacity: 0 };
  if (relativeTime < hoverStart + hoverDuration) {
    const t = easeProgress((relativeTime - hoverStart) / hoverDuration, 'outCubic');
    return {
      offsetY: interpolateNumber(0, lift, t),
      glowOpacity: interpolateNumber(0, maxGlow, easeProgress((relativeTime - hoverStart) / hoverDuration, 'outQuad'))
    };
  }

  if (!Number.isFinite(clickStart) || relativeTime < clickStart) {
    return { offsetY: lift, glowOpacity: maxGlow };
  }

  if (relativeTime < clickStart + pressDuration) {
    const t = easeProgress((relativeTime - clickStart) / pressDuration, 'outQuad');
    return {
      offsetY: interpolateNumber(lift, press, t),
      glowOpacity: interpolateNumber(maxGlow, clickGlow, t)
    };
  }

  if (relativeTime < clickStart + pressDuration + Math.max(releaseDuration, glowOutDuration)) {
    const releaseT = clamp((relativeTime - clickStart - pressDuration) / releaseDuration, 0, 1);
    const glowT = clamp((relativeTime - clickStart - pressDuration) / glowOutDuration, 0, 1);
    return {
      offsetY: interpolateNumber(press, 0, easeProgress(releaseT, 'outCubic')),
      glowOpacity: interpolateNumber(clickGlow, 0, easeProgress(glowT, 'outQuad'))
    };
  }

  return { offsetY: 0, glowOpacity: 0 };
}

function cursorToVisuals(
  id: string,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope
): Visual[] {
  const width = lengthProp(props, 'width', 56, 'x', scope);
  const height = lengthProp(props, 'height', width, 'y', scope);
  const localScope = { ...scope, boundsWidth: width, boundsHeight: height };
  const hotspotX = resolveLength(props.hotspotX, width * 0.1, 'x', localScope);
  const hotspotY = resolveLength(props.hotspotY, height * 0.06, 'y', localScope);
  const x = props.centerX != null
    ? anchoredX(props, scope, width, 0)
    : scope.offsetX + lengthProp(props, 'x', 0, 'x', scope) - hotspotX;
  const y = props.centerY != null
    ? anchoredY(props, scope, height, 0)
    : scope.offsetY + lengthProp(props, 'y', 0, 'y', scope) - hotspotY;
  const scale = numberProp(props, 'scale', 1);
  const src = stringProp(props.src, cursorAssetUrl(stringProp(props.asset, 'mac-cursor')));

  return [
    createVisual(id, `${id}-programmatic`, 'image', {
      x,
      y,
      width,
      height,
      layer: scope.layerOffset + numberProp(props.layer, 0),
      opacity: scope.opacity * numberProp(props.opacity, 1),
      rotation: numberProp(props.rotation, 0),
      scaleX: numberProp(props, 'scaleX', scale),
      scaleY: numberProp(props, 'scaleY', scale),
      kind: 'cursor',
      src,
      preserveAspectRatio: stringProp(props.preserveAspectRatio, 'xMidYMid meet')
    })
  ];
}

function cursorAssetUrl(asset: string): string {
  return programmaticSpanDefaultCursorAssetUrl(asset);
}

function clickPulseToVisuals(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const duration = Math.max(1, node.durationMs ?? timeProp(props.durationMs, 780));
  const elapsed = context.timeMs - Math.max(0, node.startMs || 0);
  return [createClickPulseVisual(node.id, props, scope, elapsed, duration)];
}

function cursorClickToVisuals(
  id: string,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const moveStart = timeProp(props.moveStart, 0);
  const moveDuration = Math.max(1, timeProp(props.moveDuration, 900));
  const clickStart = timeProp(props.clickStart, moveStart + moveDuration + 40);
  const pressDuration = Math.max(1, timeProp(props.pressDuration, 90));
  const releaseDuration = Math.max(1, timeProp(props.releaseDuration, 180));
  const pulseStart = timeProp(props.pulseStart, clickStart - 30);
  const pulseDuration = Math.max(1, timeProp(props.pulseDuration, 780));
  const fromX = lengthProp(props, 'fromX', lengthProp(props, 'x', 0, 'x', scope), 'x', scope);
  const fromY = lengthProp(props, 'fromY', lengthProp(props, 'y', 0, 'y', scope), 'y', scope);
  const toX = lengthProp(props, 'toX', fromX, 'x', scope);
  const toY = lengthProp(props, 'toY', fromY, 'y', scope);
  const moveProgress = context.timeMs <= moveStart
    ? 0
    : context.timeMs >= moveStart + moveDuration
      ? 1
      : easeProgress((context.timeMs - moveStart) / moveDuration, 'inOutCubic');
  const dip = lengthProp(props, 'dip', 10, 'y', scope);
  let cursorX = interpolateNumber(fromX, toX, moveProgress);
  let cursorY = interpolateNumber(fromY, toY, moveProgress);

  if (context.timeMs >= clickStart && context.timeMs < clickStart + pressDuration) {
    cursorY += interpolateNumber(0, dip, easeProgress((context.timeMs - clickStart) / pressDuration, 'outQuad'));
  } else if (context.timeMs >= clickStart + pressDuration && context.timeMs < clickStart + pressDuration + releaseDuration) {
    cursorY += interpolateNumber(
      dip,
      0,
      easeProgress((context.timeMs - clickStart - pressDuration) / releaseDuration, 'outCubic')
    );
  }

  const cursorProps: Record<string, ProgrammaticSpanLiteral> = {
    ...props,
    x: cursorX,
    y: cursorY,
    width: props.cursorWidth ?? props.width ?? 56,
    height: props.cursorHeight ?? props.height ?? props.cursorWidth ?? props.width ?? 56,
    layer: props.cursorLayer ?? props.layer ?? 10,
    opacity: props.cursorOpacity ?? props.opacity ?? 1
  };
  const visuals: Visual[] = [];
  if (context.timeMs >= pulseStart && context.timeMs <= pulseStart + pulseDuration) {
    visuals.push(
      createClickPulseVisual(
        `${id}-pulse`,
        {
          ...props,
          centerX: toX,
          centerY: toY,
          color: props.pulseColor ?? props.color,
          layer: props.pulseLayer ?? numberProp(props, 'layer', 10) - 1,
          opacity: props.pulseOpacity ?? props.maxOpacity ?? 0.42
        },
        scope,
        context.timeMs - pulseStart,
        pulseDuration
      )
    );
  }
  visuals.push(...cursorToVisuals(id, cursorProps, scope));
  return visuals;
}

function createClickPulseVisual(
  id: string,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope,
  elapsed: number,
  duration: number
): Visual {
  const progress = clamp(elapsed / Math.max(1, duration), 0, 1);
  const appearPortion = clamp(numberProp(props, 'appearPortion', 0.18), 0.01, 0.95);
  const growPortion = clamp(numberProp(props, 'growPortion', 0.72), 0.05, 1);
  const maxOpacity = numberProp(props, 'maxOpacity', numberProp(props.opacity, 0.42));
  const fadeProgress = progress <= appearPortion
    ? 0
    : easeProgress((progress - appearPortion) / Math.max(0.01, 1 - appearPortion), 'outQuad');
  const opacity = progress <= appearPortion
    ? interpolateNumber(0, maxOpacity, easeProgress(progress / appearPortion, 'outQuad'))
    : interpolateNumber(maxOpacity, 0, fadeProgress);
  const startRadius = lengthProp(props, 'startRadius', 10, 'min', scope);
  const endRadius = lengthProp(props, 'radius', lengthProp(props, 'endRadius', 46, 'min', scope), 'min', scope);
  const radius = interpolateNumber(
    startRadius,
    endRadius,
    easeProgress(Math.min(1, progress / growPortion), 'outCubic')
  );
  const centerX = scope.offsetX + lengthProp(props, 'centerX', lengthProp(props, 'x', 0, 'x', scope), 'x', scope);
  const centerY = scope.offsetY + lengthProp(props, 'centerY', lengthProp(props, 'y', 0, 'y', scope), 'y', scope);

  return createVisual(id, `${id}-programmatic`, 'rect', {
    x: centerX - radius,
    y: centerY - radius,
    width: radius * 2,
    height: radius * 2,
    layer: scope.layerOffset + numberProp(props.layer, 0),
    opacity: scope.opacity * Math.max(0, opacity),
    radius,
    cornerRadius: radius,
    fill: stringProp(props.fill, 'transparent'),
    stroke: stringProp(props.stroke, stringProp(props.color, '#14b8a6')),
    strokeWidth: interpolateNumber(
      numberProp(props, 'startStrokeWidth', 5),
      numberProp(props, 'endStrokeWidth', 1),
      easeProgress(progress, 'outQuad')
    )
  });
}

function dataChartToVisuals(
  id: string,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const responsive = props.width != null || props.height != null;
  const x = scope.offsetX + lengthProp(props, 'x', 96, 'x', scope);
  const y = scope.offsetY + lengthProp(props, 'y', 74, 'y', scope);
  const values = numberArrayProp(props.values, [180, 260, 330, 220, 370]);
  const layer = scope.layerOffset + numberProp(props.layer, 0);
  const opacity = scope.opacity * numberProp(props.opacity, 1);
  const chartWidth = lengthProp(
    props,
    'width',
    lengthProp(props, 'axisWidth', 980, 'x', scope) + 120,
    'x',
    scope
  );
  const chartHeight = lengthProp(
    props,
    'height',
    Math.max(lengthProp(props, 'baselineOffset', 516, 'y', scope) + 72, 360),
    'y',
    scope
  );
  const chartScope = { ...scope, boundsWidth: chartWidth, boundsHeight: chartHeight };
  const titleSize = fitBoxFontSize(
    stringProp(props.title, 'Activation by cohort'),
    Math.max(1, lengthProp(props, 'titleWidth', responsive ? chartWidth : 680, 'x', chartScope)),
    responsive ? Math.max(1, chartHeight * 0.18) : 70,
    numberProp(props.titleSize, 54),
    1.1
  );
  const titleHeight = lengthProp(props, 'titleHeight', responsive ? Math.ceil(titleSize * 1.25) : 70, 'y', chartScope);
  const defaultPlotLeft = responsive ? Math.max(26, chartWidth * 0.09) : 22;
  const plotLeft = lengthProp(props, 'plotLeft', defaultPlotLeft, 'x', chartScope);
  const plotRight = lengthProp(props, 'plotRight', responsive ? plotLeft : 98, 'x', chartScope);
  const axisX = x + plotLeft;
  const axisY = y + lengthProp(props, 'plotTop', responsive ? titleHeight + Math.max(32, chartHeight * 0.08) : 116, 'y', chartScope);
  const baseline = y + lengthProp(props, 'baselineOffset', responsive ? chartHeight - 34 : 516, 'y', chartScope);
  const axisWidth = lengthProp(props, 'axisWidth', Math.max(1, chartWidth - plotLeft - plotRight), 'x', chartScope);
  const plotHeight = Math.max(1, baseline - axisY);
  const defaultBarInset = responsive ? Math.max(16, axisWidth * 0.08) : 64;
  const barInsetX = lengthProp(props, 'barInsetX', defaultBarInset, 'x', chartScope);
  const barInsetLeft = lengthProp(props, 'barInsetLeft', barInsetX, 'x', chartScope);
  const barInsetRight = lengthProp(props, 'barInsetRight', barInsetX, 'x', chartScope);
  const barTrackWidth = Math.max(1, axisWidth - barInsetLeft - barInsetRight);
  const gap = lengthProp(props, 'gap', responsive ? Math.max(12, barTrackWidth * 0.08) : 48, 'x', chartScope);
  const computedBarWidth = Math.max(4, (barTrackWidth - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length));
  const requestedBarWidth = lengthProp(props, 'barWidth', responsive ? computedBarWidth : 90, 'x', chartScope);
  const maxResponsiveBarWidth = Math.max(4, (barTrackWidth - gap * Math.max(0, values.length - 1)) / Math.max(1, values.length));
  const barWidth = responsive ? Math.min(requestedBarWidth, maxResponsiveBarWidth) : requestedBarWidth;
  const barGroupWidth = values.length * barWidth + Math.max(0, values.length - 1) * gap;
  const barStart = responsive
    ? axisX + barInsetLeft + Math.max(0, (barTrackWidth - barGroupWidth) / 2)
    : x + 86;
  const maxValue = Math.max(1, ...values.map((value) => Math.max(0, value)));
  const shouldScaleValues = boolProp(props.scaleValues, responsive);
  const showCallout = boolProp(props.showCallout, true);
  const colors = ['#0f766e', '#0d9488', '#14b8a6', '#2dd4bf', '#67e8f9'];
  const visuals: Visual[] = [
    createTextVisual(`${id}-title`, {
      x,
      y,
      width: lengthProp(props, 'titleWidth', responsive ? chartWidth : 680, 'x', chartScope),
      height: titleHeight,
      layer: layer + 5,
      opacity: opacity * timedNumber(context, 0, 340, 0, 1, 'outQuad'),
      text: stringProp(props.title, 'Activation by cohort'),
      size: titleSize,
      color: stringProp(props.titleColor, '#0f172a')
    }),
    createVisual(`${id}-axis-x`, `${id}-axis-x-programmatic`, 'rect', {
      x: axisX,
      y: baseline,
      width: axisWidth,
      height: 3,
      layer: layer + 2,
      opacity,
      cornerRadius: 0,
      fill: stringProp(props.axisColor, '#cbd5e1'),
      stroke: 'none',
      strokeWidth: 0
    }),
    createVisual(`${id}-axis-y`, `${id}-axis-y-programmatic`, 'rect', {
      x: axisX,
      y: axisY,
      width: 3,
      height: baseline - axisY + 2,
      layer: layer + 2,
      opacity,
      cornerRadius: 0,
      fill: stringProp(props.axisColor, '#cbd5e1'),
      stroke: 'none',
      strokeWidth: 0
    })
  ];

  values.forEach((value, index) => {
    const progress = timedProgress(context, 520 + index * 240, 720, 'outCubic');
    const targetHeight = shouldScaleValues ? (Math.max(0, value) / maxValue) * plotHeight : Math.max(0, value);
    const height = Math.min(plotHeight, Math.max(0, targetHeight * progress));
    visuals.push(
      createVisual(`${id}-bar-${index}`, `${id}-bar-${index}-programmatic`, 'rect', {
        x: barStart + index * (barWidth + gap),
        y: baseline - height,
        width: barWidth,
        height,
        layer: layer + 4,
        opacity,
        cornerRadius: 14,
        fill: colors[index % colors.length],
        stroke: 'none',
        strokeWidth: 0
      })
    );
  });

  if (showCallout) {
    visuals.push(
      createTextVisual(`${id}-callout`, {
        x: responsive
          ? x + Math.min(Math.max(0, chartWidth - 190), plotLeft + axisWidth * 0.54) + timedNumber(context, 2300, 420, -24, 0, 'outCubic')
          : x + 674 + timedNumber(context, 2300, 420, -40, 0, 'outCubic'),
        y: responsive ? y + titleHeight + 8 : y + 96,
        width: responsive ? Math.min(190, Math.max(120, chartWidth * 0.38)) : 340,
        height: responsive ? 34 : 44,
        layer: layer + 6,
        opacity: opacity * timedNumber(context, 2300, 360, 0, 1, 'outQuad'),
        text: stringProp(props.callout, '+37% after guided demos'),
        size: responsive ? Math.min(24, Math.max(14, chartWidth * 0.055)) : 30,
        color: stringProp(props.calloutColor, '#155e75')
      }),
      createVisual(`${id}-callout-line`, `${id}-callout-line-programmatic`, 'rect', {
        x: responsive ? x + plotLeft + axisWidth * 0.64 : x + 726,
        y: responsive ? y + titleHeight + 50 : y + 158,
        width: timedNumber(context, 2540, 460, 0, responsive ? Math.min(92, axisWidth * 0.24) : 120, 'outCubic'),
        height: 4,
        layer: layer + 5,
        opacity: opacity * timedNumber(context, 2540, 300, 0, 1, 'outQuad'),
        cornerRadius: 0,
        fill: stringProp(props.calloutColor, '#155e75'),
        stroke: 'none',
        strokeWidth: 0
      })
    );
  }

  return visuals;
}

function decisionTreeToVisuals(
  id: string,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual[] {
  const x = scope.offsetX + numberProp(props.x, 0);
  const y = scope.offsetY + numberProp(props.y, 0);
  const layer = scope.layerOffset + numberProp(props.layer, 0);
  const opacity = scope.opacity * numberProp(props.opacity, 1);
  type CardSpec = {
    name: string;
    left: number;
    top: number;
    width: number;
    height: number;
    fill: string;
    start: number;
  };
  const rootCard: CardSpec = { name: 'root-card', left: 430, top: 96, width: 420, height: 112, fill: '#fef3c7', start: 100 };
  const leftCard: CardSpec = { name: 'left-card', left: 172, top: 304, width: 340, height: 130, fill: '#dcfce7', start: 1260 };
  const rightCard: CardSpec = { name: 'right-card', left: 768, top: 304, width: 340, height: 130, fill: '#fee2e2', start: 1480 };
  const finalCard: CardSpec = { name: 'final-card', left: 404, top: 516, width: 472, height: 96, fill: '#dbeafe', start: 2350 };
  const cardTop = (card: CardSpec) => card.top + (1 - timedProgress(context, card.start, 420, 'outCubic')) * 30;
  const cardOpacity = (card: CardSpec) => opacity * timedNumber(context, card.start, 320, 0, 1, 'outQuad');
  const card = (card: CardSpec) => {
    const top = cardTop(card);
    return createVisual(`${id}-${card.name}`, `${id}-${card.name}-programmatic`, 'rect', {
      x: x + card.left,
      y: y + top,
      width: card.width,
      height: card.height,
      layer: layer + 4,
      opacity: cardOpacity(card),
      cornerRadius: 24,
      fill: card.fill,
      stroke: 'none',
      strokeWidth: 0
    });
  };
  const cardText = (
    card: CardSpec,
    textId: string,
    text: string,
    size: number,
    color: string,
    paddingX = 42,
    paddingY = 22
  ) => {
    const textWidth = Math.max(1, card.width - paddingX * 2);
    const availableHeight = Math.max(1, card.height - paddingY * 2);
    const fontSize = fitBoxFontSize(text, textWidth, availableHeight, size, 1.1);
    const lineCount = estimatedBoxLineCount(text, textWidth, fontSize);
    const textHeight = Math.min(availableHeight, Math.ceil(lineCount * fontSize * 1.1));
    return createTextVisual(`${id}-${textId}`, {
      x: x + card.left + paddingX,
      y: y + cardTop(card) + (card.height - textHeight) / 2,
      width: textWidth,
      height: textHeight,
      layer: layer + 5,
      opacity: cardOpacity(card),
      text,
      size: fontSize,
      color,
      align: 'center'
    });
  };

  return [
    card(rootCard),
    cardText(rootCard, 'root-text', stringProp(props.root, 'Is the demo reusable?'), 30, '#78350f', 40, 18),
    createVisual(`${id}-branch-left`, `${id}-branch-left-programmatic`, 'rect', {
      x: x + 330,
      y: y + 250,
      width: timedNumber(context, 740, 520, 0, 260, 'outCubic'),
      height: 5,
      layer: layer + 2,
      opacity: opacity * timedNumber(context, 740, 220, 0, 1, 'outQuad'),
      cornerRadius: 0,
      fill: '#f59e0b',
      stroke: 'none',
      strokeWidth: 0
    }),
    createVisual(`${id}-branch-right`, `${id}-branch-right-programmatic`, 'rect', {
      x: x + 690,
      y: y + 250,
      width: timedNumber(context, 920, 520, 0, 260, 'outCubic'),
      height: 5,
      layer: layer + 2,
      opacity: opacity * timedNumber(context, 920, 220, 0, 1, 'outQuad'),
      cornerRadius: 0,
      fill: '#f59e0b',
      stroke: 'none',
      strokeWidth: 0
    }),
    card(leftCard),
    cardText(leftCard, 'left-text', stringProp(props.left, 'Yes: turn it into a preset'), 28, '#14532d'),
    card(rightCard),
    cardText(rightCard, 'right-text', stringProp(props.right, 'No: keep it as source'), 28, '#7f1d1d'),
    card(finalCard),
    cardText(finalCard, 'final-text', stringProp(props.final, 'Compiler returns IR, diagnostics, and MCP-ready payload'), 25, '#1e3a8a', 48, 18)
  ];
}

function createTextVisual(id: string, params: {
  x: number;
  y: number;
  width: number;
  height: number;
  layer: number;
  opacity: number;
  text: string;
  size: number;
  color: string;
  weight?: string;
  align?: string;
}): Visual {
  const align = params.align ?? 'left';
  const fontSize = fitBoxFontSize(params.text, params.width, params.height, params.size, 1.1);
  return createVisual(id, `${id}-programmatic`, 'text', {
    x: params.x,
    y: params.y,
    width: params.width,
    height: params.height,
    layer: params.layer,
    opacity: params.opacity,
    fill: params.color,
    fontFamily: 'Inter, Arial, sans-serif',
    fontSize,
    fontWeight: params.weight ?? '700',
    textAlign: align,
    lineHeight: 1.1,
    proseMirrorDocument: proseMirrorDocumentFromText(params.text, align)
  });
}

function measuredNodeWidth(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope
): number {
  switch (node.kind) {
    case 'text':
      return lengthProp(props, 'width', 420, 'x', scope);
    case 'image':
    case 'lottie':
    case 'model3d':
      return lengthProp(props, 'width', 240, 'x', scope);
    case 'cursor':
    case 'cursor-click':
      return lengthProp(props, 'width', 56, 'x', scope);
    case 'click-pulse':
      return lengthProp(props, 'width', lengthProp(props, 'radius', lengthProp(props, 'endRadius', 46, 'min', scope), 'min', scope) * 2, 'x', scope);
    case 'circle': {
      const radius = resolveLength(props.radius, 0, 'min', scope);
      return lengthProp(props, 'width', radius * 2 || 80, 'x', scope);
    }
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'arc':
      return lengthProp(props, 'width', 120, 'x', scope);
    case 'calloutBox':
      return lengthProp(props, 'width', 220, 'x', scope);
    case 'line':
    case 'arrow':
    case 'turnArrow':
      return lengthProp(props, 'width', 260, 'x', scope);
    case 'rect':
    case 'ellipse':
      return lengthProp(props, 'width', 120, 'x', scope);
    case 'browser-window':
      return lengthProp(props, 'width', 860, 'x', scope);
    case 'traffic-lights': {
      const radius = lengthProp(props, 'radius', 9, 'min', scope);
      const gap = lengthProp(props, 'gap', 30, 'x', scope);
      return radius * 2 + gap * 2;
    }
    case 'cta-button':
      return lengthProp(props, 'width', 214, 'x', scope);
    case 'data-chart':
      return lengthProp(
        props,
        'width',
        lengthProp(props, 'axisWidth', 980, 'x', scope) + 120,
        'x',
        scope
      );
    case 'flowchart':
    case 'decision-tree':
      return lengthProp(props, 'width', 1280, 'x', scope);
    case 'v-stack':
    case 'h-stack':
    case 'bento':
    case 'cell':
    case 'motion-box':
    case 'group':
      return lengthProp(props, 'width', scope.boundsWidth, 'x', scope);
    default:
      return scope.boundsWidth;
  }
}

function measuredNodeHeight(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope
): number {
  switch (node.kind) {
    case 'text': {
      const requestedSize = numberProp(props.size, numberProp(props.fontSize, 48));
      return lengthProp(props, 'height', requestedSize * 1.35, 'y', scope);
    }
    case 'image':
    case 'lottie':
    case 'model3d':
      return lengthProp(props, 'height', 160, 'y', scope);
    case 'cursor':
    case 'cursor-click':
      return lengthProp(props, 'height', measuredNodeWidth(node, props, scope), 'y', scope);
    case 'click-pulse':
      return lengthProp(props, 'height', measuredNodeWidth(node, props, scope), 'y', scope);
    case 'circle': {
      const radius = resolveLength(props.radius, 0, 'min', scope);
      return lengthProp(props, 'height', radius * 2 || 80, 'y', scope);
    }
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'arc':
      return lengthProp(props, 'height', 120, 'y', scope);
    case 'calloutBox':
      return lengthProp(props, 'height', 120, 'y', scope);
    case 'line':
      return lengthProp(props, 'height', 90, 'y', scope);
    case 'arrow':
    case 'turnArrow':
      return lengthProp(props, 'height', 96, 'y', scope);
    case 'rect':
    case 'ellipse':
      return lengthProp(props, 'height', 80, 'y', scope);
    case 'browser-window':
      return lengthProp(props, 'height', 480, 'y', scope);
    case 'traffic-lights': {
      const radius = lengthProp(props, 'radius', 9, 'min', scope);
      return radius * 2;
    }
    case 'cta-button':
      return lengthProp(props, 'height', 58, 'y', scope);
    case 'data-chart':
      return lengthProp(
        props,
        'height',
        Math.max(lengthProp(props, 'baselineOffset', 516, 'y', scope) + 72, 360),
        'y',
        scope
      );
    case 'flowchart':
    case 'decision-tree':
      return lengthProp(props, 'height', 640, 'y', scope);
    case 'v-stack':
    case 'h-stack':
    case 'bento':
    case 'cell':
    case 'motion-box':
    case 'group':
      return lengthProp(props, 'height', scope.boundsHeight, 'y', scope);
    default:
      return scope.boundsHeight;
  }
}

function anchoredX(
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope,
  width: number,
  fallback: number
): number {
  if (props.centerX != null) {
    return scope.offsetX + lengthProp(props, 'centerX', 0, 'x', scope) - width / 2;
  }
  return scope.offsetX + lengthProp(props, 'x', fallback, 'x', scope);
}

function anchoredY(
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope,
  height: number,
  fallback: number
): number {
  if (props.centerY != null) {
    return scope.offsetY + lengthProp(props, 'centerY', 0, 'y', scope) - height / 2;
  }
  return scope.offsetY + lengthProp(props, 'y', fallback, 'y', scope);
}

function shouldRenderSplitRevealText(props: Record<string, ProgrammaticSpanLiteral>): boolean {
  const mode = stringProp(props.textRevealMode, '');
  if (mode !== 'reveal') return false;
  const style = stringProp(props.textRevealStyle, 'typewriter');
  return style === 'fade' || style === 'fly' || style === 'drop' || style === 'scale';
}

function textNodeToSplitRevealVisuals(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope
): Visual[] {
  const scale = numberProp(props, 'scale', 1);
  const baseText = stringProp(props.text, '');
  const width = lengthProp(props, 'width', 420, 'x', scope);
  const requestedSize = numberProp(props.size, numberProp(props.fontSize, 48));
  const lineHeight = numberProp(props.lineHeight, 1.1);
  const height = lengthProp(props, 'height', requestedSize * 1.35, 'y', scope);
  const fontFamily = stringProp(props.fontFamily, 'Inter, Arial, sans-serif');
  const fontWeight = String(props.weight ?? props.fontWeight ?? '700');
  const fontStyle = stringProp(props.fontStyle, 'normal');
  const measureText = textMeasureContentFromProps(props, baseText);
  const fontSize = stringProp(props.fit, 'box') === 'none'
    ? requestedSize
    : fitBoxFontSize(measureText, width, height, requestedSize, lineHeight);
  const x = anchoredX(props, scope, width, 0);
  const y = anchoredY(props, scope, height, 0);
  const stableText = stringProp(props.textRevealStableWrap, 'final') === 'none'
    ? baseText
    : stableWrappedText(baseText, { width, fontSize, fontFamily, fontWeight, fontStyle });
  const units = layoutRevealTextUnits(
    stableText,
    stringProp(props.textRevealUnit, 'characters'),
    width,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    lineHeight,
    stringProp(props.align, stringProp(props.textAlign, 'left'))
  );
  const progress = clamp(numberProp(props, 'textRevealProgress', 1), 0, 1);
  const style = stringProp(props.textRevealStyle, 'fade');
  const direction = stringProp(props.textRevealDirection, 'bottom');
  const distance = numberProp(props, 'textRevealDistance', 24);
  const scaleFrom = numberProp(props, 'textRevealScaleFrom', 1);
  const opacityFrom = numberProp(props, 'textRevealOpacityFrom', 0);
  const durationMs = numberProp(props, 'textRevealDurationMs', 900);
  const staggerMs = numberProp(props, 'textRevealStaggerMs', 0);
  const baseOpacity = scope.opacity * numberProp(props.opacity, 1);
  const baseLayer = scope.layerOffset + numberProp(props.layer, 0);
  const fill = stringProp(props.color, stringProp(props.fill, '#111827'));

  return units.flatMap((unit, index) => {
    const unitProgress = revealUnitProgress(progress, index, units.length, staggerMs, durationMs);
    if (unitProgress <= 0.0001) return [];
    const eased = easeProgress(unitProgress, 'outCubic');
    const offset = revealMotionOffset(style, direction, distance, eased);
    const unitScale = style === 'scale' || style === 'fly'
      ? interpolateNumber(scaleFrom, 1, eased)
      : 1;
    return createVisual(`${node.id}-reveal-${index}`, `${node.id}-reveal-${index}-programmatic`, 'text', {
      x: x + unit.x + offset.x,
      y: y + unit.y + offset.y,
      width: Math.max(1, unit.width + fontSize * 0.08),
      height: Math.max(1, fontSize * lineHeight),
      layer: baseLayer,
      opacity: baseOpacity * interpolateNumber(opacityFrom, 1, eased),
	      rotation: numberProp(props.rotation, 0),
	      scaleX: numberProp(props, 'scaleX', scale) * unitScale,
	      scaleY: numberProp(props, 'scaleY', scale) * unitScale,
	      ...renderEffectAttributes(props),
	      fill,
	      fontFamily,
      fontSize,
      fontWeight,
      textAlign: 'left',
      lineHeight,
      proseMirrorDocument: proseMirrorDocumentFromText(unit.text, 'left'),
      ...(props.textEffect && typeof props.textEffect === 'object' && !Array.isArray(props.textEffect)
        ? { textEffect: props.textEffect }
        : {})
    });
  });
}

function nodeToVisual(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Visual | null {
  if (node.kind === 'text') {
    const scale = numberProp(props, 'scale', 1);
    const preliminaryText = textContentFromProps(props);
    const measureText = textMeasureContentFromProps(props, preliminaryText);
    const width = lengthProp(props, 'width', 420, 'x', scope);
    const requestedSize = numberProp(props.size, numberProp(props.fontSize, 48));
    const lineHeight = numberProp(props.lineHeight, 1.1);
    const height = lengthProp(props, 'height', requestedSize * 1.35, 'y', scope);
    const fontFamily = stringProp(props.fontFamily, 'Inter, Arial, sans-serif');
    const fontWeight = String(props.weight ?? props.fontWeight ?? '700');
    const fontStyle = stringProp(props.fontStyle, 'normal');
    const fontSize = stringProp(props.fit, 'box') === 'none'
      ? requestedSize
      : fitBoxFontSize(measureText, width, height, requestedSize, lineHeight);
    const text = textContentFromProps(props, { width, fontSize, fontFamily, fontWeight, fontStyle });
    return createVisual(node.id, `${node.id}-programmatic`, 'text', {
      x: anchoredX(props, scope, width, 0),
      y: anchoredY(props, scope, height, 0),
      width,
      height,
      layer: scope.layerOffset + numberProp(props.layer, 0),
      opacity: scope.opacity * numberProp(props.opacity, 1),
	      rotation: numberProp(props.rotation, 0),
	      scaleX: numberProp(props, 'scaleX', scale),
	      scaleY: numberProp(props, 'scaleY', scale),
	      ...renderEffectAttributes(props),
	      fill: stringProp(props.color, stringProp(props.fill, '#111827')),
      fontFamily,
      fontSize,
      fontWeight,
      fontStyle,
      textAlign: stringProp(props.align, stringProp(props.textAlign, 'left')),
      lineHeight: numberProp(props.lineHeight, 1.1),
      proseMirrorDocument: proseMirrorDocumentFromText(text, stringProp(props.align, stringProp(props.textAlign, 'left'))),
      ...(props.textEffect && typeof props.textEffect === 'object' && !Array.isArray(props.textEffect)
        ? { textEffect: props.textEffect }
        : {})
    });
  }

  if (node.kind === 'image') {
    return createVisual(node.id, `${node.id}-programmatic`, 'image', {
      ...mediaVisualAttributes(node, props, context, scope),
      src: stringProp(props.src, ''),
      contentType: stringProp(props.contentType, ''),
      preserveAspectRatio: mediaPreserveAspectRatio(props, 'none'),
      cropTop: resolveLength(props.cropTop, 0, 'y', scope),
      cropRight: resolveLength(props.cropRight, 0, 'x', scope),
      cropBottom: resolveLength(props.cropBottom, 0, 'y', scope),
      cropLeft: resolveLength(props.cropLeft, 0, 'x', scope),
      cropRadius: resolveLength(props.cropRadius, 0, 'min', scope),
      originalName: stringProp(props.originalName, '')
    });
  }

  if (node.kind === 'lottie') {
    return createVisual(node.id, `${node.id}-programmatic`, 'lottie', {
      ...mediaVisualAttributes(node, props, context, scope),
      src: stringProp(props.src, ''),
      contentType: stringProp(props.contentType, ''),
      originalName: stringProp(props.originalName, ''),
      preserveAspectRatio: mediaPreserveAspectRatio(props, 'xMidYMid meet')
    });
  }

  if (node.kind === 'model3d') {
    return createVisual(node.id, `${node.id}-programmatic`, 'model3d', {
      ...mediaVisualAttributes(node, props, context, scope),
      src: stringProp(props.src, ''),
      contentType: stringProp(props.contentType, ''),
      originalName: stringProp(props.originalName, ''),
      modelSourceId: stringProp(props.modelSourceId, stringProp(props.src, '')),
      modelAnimationIndex: numberProp(props, 'modelAnimationIndex', numberProp(props, 'animationIndex', 0)),
      modelAnimationSpeed: numberProp(props, 'modelAnimationSpeed', numberProp(props, 'animationSpeed', 1)),
      modelCameraFov: numberProp(props, 'modelCameraFov', numberProp(props, 'cameraFov', 35)),
      modelCameraDistance: numberProp(props, 'modelCameraDistance', numberProp(props, 'cameraDistance', 2.7)),
      modelPitch: numberProp(props, 'modelPitch', numberProp(props, 'pitch', 0)),
      modelYaw: numberProp(props, 'modelYaw', numberProp(props, 'yaw', 0)),
      modelRoll: numberProp(props, 'modelRoll', numberProp(props, 'roll', 0)),
      modelScale: numberProp(props, 'modelScale', numberProp(props, 'assetScale', 1))
    });
  }

  if (!isProgrammaticSpanShapeKind(node.kind)) return null;
  return createVisual(
    node.id,
    `${node.id}-programmatic`,
    node.kind,
    shapeVisualAttributes(node.kind, props, scope)
  );
}

function isProgrammaticSpanShapeKind(kind: ProgrammaticSpanNode['kind']): kind is ShapeObjectType {
  switch (kind) {
    case 'rect':
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
      return true;
    default:
      return false;
  }
}

function shapeVisualAttributes(
  kind: ShapeObjectType,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope
): Record<string, ProgrammaticSpanLiteral> {
  const scale = numberProp(props, 'scale', 1);
  const radius = resolveLength(props.radius, 0, 'min', scope);
  const width = measuredShapeWidth(kind, props, scope, radius);
  const height = measuredShapeHeight(kind, props, scope, radius);
  const circleCenterOffset = kind === 'circle' && radius > 0 && props.width == null && props.centerX == null ? radius : 0;
  const circleMiddleOffset = kind === 'circle' && radius > 0 && props.height == null && props.centerY == null ? radius : 0;
  const cornerRadius = resolveLength(props.cornerRadius, radius, 'min', scope);
  const attrs: Record<string, ProgrammaticSpanLiteral> = {
    x: anchoredX(props, scope, width, 0) - circleCenterOffset,
    y: anchoredY(props, scope, height, 0) - circleMiddleOffset,
    width,
    height,
    layer: scope.layerOffset + numberProp(props.layer, 0),
    opacity: scope.opacity * numberProp(props.opacity, 1),
	    rotation: numberProp(props.rotation, 0),
	    scaleX: numberProp(props, 'scaleX', scale),
	    scaleY: numberProp(props, 'scaleY', scale),
	    ...renderEffectAttributes(props),
	    radius,
	    cornerRadius,
    fill: kind === 'line' ? 'none' : stringProp(props.fill, '#e5e7eb'),
    stroke: kind === 'line'
      ? stringProp(props.stroke, stringProp(props.fill, '#e5e7eb'))
      : stringProp(props.stroke, 'none'),
    strokeWidth: kind === 'line' ? numberProp(props.strokeWidth, 6) : numberProp(props.strokeWidth, 0),
    strokeStyle: stringProp(props.strokeStyle, 'solid')
  };

  if (kind === 'calloutBox') {
    Object.assign(attrs, calloutShapeAttributes(props, scope));
  } else if (kind === 'arrow' || kind === 'turnArrow') {
    Object.assign(attrs, arrowShapeAttributes(props, scope, cornerRadius));
  } else if (kind === 'line') {
    Object.assign(attrs, lineShapeAttributes(props));
  } else if (kind === 'arc') {
    Object.assign(attrs, arcShapeAttributes(props));
  }

  return attrs;
}

function measuredShapeWidth(
  kind: ShapeObjectType,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope,
  radius: number
): number {
  switch (kind) {
    case 'circle':
      return lengthProp(props, 'width', radius * 2 || 80, 'x', scope);
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'arc':
      return lengthProp(props, 'width', 120, 'x', scope);
    case 'calloutBox':
      return lengthProp(props, 'width', 220, 'x', scope);
    case 'line':
    case 'arrow':
    case 'turnArrow':
      return lengthProp(props, 'width', 260, 'x', scope);
    case 'rect':
    case 'ellipse':
    default:
      return lengthProp(props, 'width', 120, 'x', scope);
  }
}

function measuredShapeHeight(
  kind: ShapeObjectType,
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope,
  radius: number
): number {
  switch (kind) {
    case 'circle':
      return lengthProp(props, 'height', radius * 2 || 80, 'y', scope);
    case 'triangle':
    case 'diamond':
    case 'star':
    case 'arc':
      return lengthProp(props, 'height', 120, 'y', scope);
    case 'calloutBox':
      return lengthProp(props, 'height', 120, 'y', scope);
    case 'line':
      return lengthProp(props, 'height', 90, 'y', scope);
    case 'arrow':
    case 'turnArrow':
      return lengthProp(props, 'height', 96, 'y', scope);
    case 'rect':
    case 'ellipse':
    default:
      return lengthProp(props, 'height', 80, 'y', scope);
  }
}

function calloutShapeAttributes(
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope
): Record<string, ProgrammaticSpanLiteral> {
  return {
    calloutPointerSide: stringProp(
      props.calloutPointerSide ?? props.pointerSide,
      DEFAULT_CALLOUT_POINTER_SIDE
    ),
    calloutPointerOffsetPercent: percentNumberProp(
      props,
      ['calloutPointerOffsetPercent', 'pointerOffsetPercent', 'pointerOffset'],
      DEFAULT_CALLOUT_POINTER_OFFSET_PERCENT
    ),
    calloutPointerWidthPx: resolveLengthAlias(
      props,
      ['calloutPointerWidthPx', 'pointerWidthPx', 'pointerWidth'],
      DEFAULT_CALLOUT_POINTER_WIDTH_PX,
      'x',
      scope
    ),
    calloutPointerHeightPx: resolveLengthAlias(
      props,
      ['calloutPointerHeightPx', 'pointerHeightPx', 'pointerHeight'],
      DEFAULT_CALLOUT_POINTER_HEIGHT_PX,
      'y',
      scope
    )
  };
}

function arrowShapeAttributes(
  props: Record<string, ProgrammaticSpanLiteral>,
  scope: RenderScope,
  cornerRadius: number
): Record<string, ProgrammaticSpanLiteral> {
  return {
    arrowTipRadius: resolveLengthAlias(props, ['arrowTipRadius', 'tipRadius'], cornerRadius, 'min', scope),
    arrowTailWidthPercent: percentNumberProp(
      props,
      ['arrowTailWidthPercent', 'tailWidthPercent', 'tailWidth'],
      DEFAULT_ARROW_TAIL_WIDTH_PERCENT
    ),
    arrowShaftWidthPercent: percentNumberProp(
      props,
      ['arrowShaftWidthPercent', 'shaftWidthPercent', 'shaftWidth'],
      DEFAULT_ARROW_SHAFT_WIDTH_PERCENT
    ),
    arrowHeadWidthPercent: percentNumberProp(
      props,
      ['arrowHeadWidthPercent', 'headWidthPercent', 'headWidth'],
      DEFAULT_ARROW_HEAD_WIDTH_PERCENT
    ),
    arrowHeadLengthPercent: percentNumberProp(
      props,
      ['arrowHeadLengthPercent', 'headLengthPercent', 'headLength'],
      DEFAULT_ARROW_HEAD_LENGTH_PERCENT
    ),
    arrowWingConcavityPercent: percentNumberProp(
      props,
      ['arrowWingConcavityPercent', 'wingConcavityPercent', 'wingConcavity'],
      DEFAULT_ARROW_WING_CONCAVITY_PERCENT
    ),
    ...optionalPercentAttributes(props, {
      arrowTailXPercent: ['tailXPercent', 'tailX'],
      arrowTailYPercent: ['tailYPercent', 'tailY'],
      arrowShaftXPercent: ['shaftXPercent', 'shaftX'],
      arrowShoulderXPercent: ['shoulderXPercent', 'shoulderX'],
      arrowShoulderYPercent: ['shoulderYPercent', 'shoulderY'],
      arrowWingXPercent: ['wingXPercent', 'wingX'],
      arrowWingYPercent: ['wingYPercent', 'wingY']
    })
  };
}

function lineShapeAttributes(
  props: Record<string, ProgrammaticSpanLiteral>
): Record<string, ProgrammaticSpanLiteral> {
  const attrs: Record<string, ProgrammaticSpanLiteral> = {
    lineControl1XPercent: percentNumberProp(
      props,
      ['lineControl1XPercent', 'control1XPercent', 'control1X'],
      DEFAULT_LINE_CONTROL_1_X_PERCENT
    ),
    lineControl1YPercent: percentNumberProp(
      props,
      ['lineControl1YPercent', 'control1YPercent', 'control1Y'],
      DEFAULT_LINE_CONTROL_1_Y_PERCENT
    ),
    lineControl2XPercent: percentNumberProp(
      props,
      ['lineControl2XPercent', 'control2XPercent', 'control2X'],
      DEFAULT_LINE_CONTROL_2_X_PERCENT
    ),
    lineControl2YPercent: percentNumberProp(
      props,
      ['lineControl2YPercent', 'control2YPercent', 'control2Y'],
      DEFAULT_LINE_CONTROL_2_Y_PERCENT
    )
  };
  if (isLiteralRecord(props.linePath) || typeof props.linePath === 'string') {
    attrs.linePath = props.linePath;
  }
  return attrs;
}

function arcShapeAttributes(
  props: Record<string, ProgrammaticSpanLiteral>
): Record<string, ProgrammaticSpanLiteral> {
  return {
    arcSweepPercent: percentNumberProp(
      props,
      ['arcSweepPercent', 'sweepPercent', 'sweep'],
      DEFAULT_ARC_SWEEP_PERCENT
    ),
    arcThicknessPercent: percentNumberProp(
      props,
      ['arcThicknessPercent', 'thicknessPercent', 'thickness'],
      DEFAULT_ARC_THICKNESS_PERCENT
    )
  };
}

function optionalPercentAttributes(
  props: Record<string, ProgrammaticSpanLiteral>,
  aliasMap: Record<string, string[]>
): Record<string, ProgrammaticSpanLiteral> {
  const attrs: Record<string, ProgrammaticSpanLiteral> = {};
  for (const [canonical, aliases] of Object.entries(aliasMap)) {
    const value = firstDefinedProp(props, [canonical, ...aliases]);
    if (value !== undefined) {
      attrs[canonical] = percentLiteral(value, 0);
    }
  }
  return attrs;
}

function percentNumberProp(
  props: Record<string, ProgrammaticSpanLiteral>,
  keys: string[],
  fallback: number
): number {
  return percentLiteral(firstDefinedProp(props, keys), fallback);
}

function percentLiteral(value: ProgrammaticSpanLiteral | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const percent = /^(-?\d+(?:\.\d+)?)%$/.exec(trimmed);
    if (percent) return Number(percent[1]);
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

function resolveLengthAlias(
  props: Record<string, ProgrammaticSpanLiteral>,
  keys: string[],
  fallback: number,
  axis: LengthAxis,
  scope: RenderScope
): number {
  return resolveLength(firstDefinedProp(props, keys), fallback, axis, scope);
}

function firstDefinedProp(
  props: Record<string, ProgrammaticSpanLiteral>,
  keys: string[]
): ProgrammaticSpanLiteral | undefined {
  for (const key of keys) {
    if (props[key] !== undefined) return props[key];
  }
  return undefined;
}

function isLiteralRecord(value: ProgrammaticSpanLiteral | undefined): value is Record<string, ProgrammaticSpanLiteral> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function renderEffectAttributes(
  props: Record<string, ProgrammaticSpanLiteral>
): Record<string, ProgrammaticSpanLiteral> {
  const attrs: Record<string, ProgrammaticSpanLiteral> = {};
  const blur = firstDefinedProp(props, ['blur', 'blurPx']);
  if (blur !== undefined) attrs.blur = numericLiteral(blur, 0);

  const tiltShift = props.tiltShift;
  const tiltShiftRecord = isLiteralRecord(tiltShift) ? tiltShift : null;
  const tiltShiftBlur = firstDefinedProp(props, ['tiltShiftBlur'])
    ?? (typeof tiltShift === 'number' ? tiltShift : undefined)
    ?? firstDefinedRecordProp(tiltShiftRecord, ['blur', 'amount', 'tiltShiftBlur']);
  if (tiltShiftBlur !== undefined) {
    attrs.tiltShiftBlur = numericLiteral(tiltShiftBlur, 0);
    attrs.tiltShiftCenter = numericLiteral(
      firstDefinedProp(props, ['tiltShiftCenter']) ?? firstDefinedRecordProp(tiltShiftRecord, ['center']),
      50
    );
    attrs.tiltShiftFocus = numericLiteral(
      firstDefinedProp(props, ['tiltShiftFocus']) ?? firstDefinedRecordProp(tiltShiftRecord, ['focus']),
      35
    );
    attrs.tiltShiftFeather = numericLiteral(
      firstDefinedProp(props, ['tiltShiftFeather']) ?? firstDefinedRecordProp(tiltShiftRecord, ['feather']),
      25
    );
  }

  const shadowRecord = isLiteralRecord(props.shadow) ? props.shadow : null;
  const glowRecord = isLiteralRecord(props.glow) ? props.glow : null;
  let shadowBlur = firstDefinedProp(props, ['shadowBlur'])
    ?? firstDefinedRecordProp(shadowRecord, ['blur', 'shadowBlur']);
  let shadowOffsetX = firstDefinedProp(props, ['shadowOffsetX'])
    ?? firstDefinedRecordProp(shadowRecord, ['x', 'offsetX', 'shadowOffsetX']);
  let shadowOffsetY = firstDefinedProp(props, ['shadowOffsetY'])
    ?? firstDefinedRecordProp(shadowRecord, ['y', 'offsetY', 'shadowOffsetY']);
  let shadowColor = firstDefinedProp(props, ['shadowColor'])
    ?? firstDefinedRecordProp(shadowRecord, ['color', 'shadowColor']);
  let shadowOpacity = firstDefinedProp(props, ['shadowOpacity'])
    ?? firstDefinedRecordProp(shadowRecord, ['opacity', 'shadowOpacity']);

  const glowSource = props.glow !== undefined ||
    props.glowBlur !== undefined ||
    props.glowColor !== undefined ||
    props.glowOpacity !== undefined;
  if (
    glowSource &&
    shadowBlur === undefined &&
    shadowOffsetX === undefined &&
    shadowOffsetY === undefined &&
    shadowColor === undefined &&
    shadowOpacity === undefined
  ) {
    shadowBlur = firstDefinedProp(props, ['glowBlur'])
      ?? (typeof props.glow === 'number' ? props.glow : undefined)
      ?? firstDefinedRecordProp(glowRecord, ['blur', 'glowBlur'])
      ?? 26;
    shadowOffsetX = firstDefinedRecordProp(glowRecord, ['x', 'offsetX']) ?? 0;
    shadowOffsetY = firstDefinedRecordProp(glowRecord, ['y', 'offsetY']) ?? 0;
    shadowColor = firstDefinedProp(props, ['glowColor'])
      ?? firstDefinedRecordProp(glowRecord, ['color', 'glowColor'])
      ?? '#67e8f9';
    shadowOpacity = firstDefinedProp(props, ['glowOpacity'])
      ?? firstDefinedRecordProp(glowRecord, ['opacity', 'glowOpacity'])
      ?? 62;
  }

  if (shadowBlur !== undefined) attrs.shadowBlur = numericLiteral(shadowBlur, 0);
  if (shadowOffsetX !== undefined) attrs.shadowOffsetX = numericLiteral(shadowOffsetX, 0);
  if (shadowOffsetY !== undefined) attrs.shadowOffsetY = numericLiteral(shadowOffsetY, 0);
  if (shadowColor !== undefined) attrs.shadowColor = stringLiteralValue(shadowColor, '#000000');
  if (shadowOpacity !== undefined) attrs.shadowOpacity = numericLiteral(shadowOpacity, 0);

  return attrs;
}

function firstDefinedRecordProp(
  record: Record<string, ProgrammaticSpanLiteral> | null,
  keys: string[]
): ProgrammaticSpanLiteral | undefined {
  if (!record) return undefined;
  for (const key of keys) {
    if (record[key] !== undefined) return record[key];
  }
  return undefined;
}

function numericLiteral(value: ProgrammaticSpanLiteral | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const numeric = Number(value.trim());
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

function stringLiteralValue(value: ProgrammaticSpanLiteral | undefined, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function mediaVisualAttributes(
  node: ProgrammaticSpanNode,
  props: Record<string, ProgrammaticSpanLiteral>,
  context: EvaluationContext,
  scope: RenderScope
): Record<string, ProgrammaticSpanLiteral> {
  const width = measuredNodeWidth(node, props, scope);
  const height = measuredNodeHeight(node, props, scope);
  const scale = numberProp(props, 'scale', 1);
  const sync = stringProp(props.sync, 'local');
  const mediaOffsetMs = numberProp(props, 'mediaOffsetMs', numberProp(props, 'offsetMs', 0));
  const mediaSpeed = numberProp(props, 'mediaSpeed', numberProp(props, 'speed', 1));
  const computedMediaTimeMs = Math.max(0, (context.timeMs - Math.max(0, node.startMs || 0) - mediaOffsetMs) * mediaSpeed);
  return {
    x: anchoredX(props, scope, width, 0),
    y: anchoredY(props, scope, height, 0),
    width,
    height,
    layer: scope.layerOffset + numberProp(props.layer, 0),
    opacity: scope.opacity * numberProp(props.opacity, 1),
    rotation: numberProp(props.rotation, 0),
    rotationX: numberProp(props, 'rotationX', 0),
    rotationY: numberProp(props, 'rotationY', 0),
    translateZ: numberProp(props, 'translateZ', 0),
    perspective: numberProp(props, 'perspective', 1200),
	    rotationCenterX: numberProp(props, 'rotationCenterX', 0.5),
	    rotationCenterY: numberProp(props, 'rotationCenterY', 0.5),
	    scaleX: numberProp(props, 'scaleX', scale),
	    scaleY: numberProp(props, 'scaleY', scale),
	    ...renderEffectAttributes(props),
	    ...(sync === 'global'
      ? {}
      : { mediaTimeMs: numberProp(props, 'mediaTimeMs', computedMediaTimeMs) })
  };
}

function mediaPreserveAspectRatio(
  props: Record<string, ProgrammaticSpanLiteral>,
  fallback: string
): string {
  const explicit = stringProp(props.preserveAspectRatio, '');
  if (explicit) return explicit;
  const fit = stringProp(props.fit, stringProp(props.objectFit, ''));
  if (fit === 'cover' || fit === 'slice') return 'xMidYMid slice';
  if (fit === 'contain' || fit === 'meet') return 'xMidYMid meet';
  if (fit === 'stretch' || fit === 'fill' || fit === 'none') return 'none';
  return fallback;
}

function proseMirrorDocumentFromText(text: string, textAlign: string): Record<string, unknown> {
  const lines = text.split('\n');
  return {
    type: 'doc',
    content: lines.map((line) => ({
      type: 'paragraph',
      attrs: { textAlign },
      content: line ? [{ type: 'text', text: line }] : []
    }))
  };
}

function textContentFromProps(
  props: Record<string, ProgrammaticSpanLiteral>,
  layout?: TextLayoutMetrics
): string {
  const baseText = stringProp(props.text, '');
  const textNumberMode = stringProp(props.textNumberMode, '');
  if (textNumberMode === 'count' || textNumberMode === 'count-up') {
    const value = numberProp(props, 'textNumberValue', Number.NaN);
    if (Number.isFinite(value)) {
      return formatCountText(value, props);
    }
  }

  const revealMode = stringProp(props.textRevealMode, '');
  if (revealMode === 'typewriter' || revealMode === 'reveal') {
    return formatRevealText(baseText, props, layout);
  }

  return baseText;
}

function textMeasureContentFromProps(
  props: Record<string, ProgrammaticSpanLiteral>,
  displayText: string
): string {
  const revealMode = stringProp(props.textRevealMode, '');
  if (revealMode === 'typewriter' || revealMode === 'reveal') {
    return stringProp(props.text, '');
  }
  return displayText;
}

function formatRevealText(
  text: string,
  props: Record<string, ProgrammaticSpanLiteral>,
  layout?: TextLayoutMetrics
): string {
  const progress = clamp(numberProp(props, 'textRevealProgress', 1), 0, 1);
  const unit = stringProp(props.textRevealUnit, 'characters');
  const style = stringProp(props.textRevealStyle, 'typewriter');
  const stableText = stringProp(props.textRevealStableWrap, 'final') === 'none'
    ? text
    : stableWrappedText(text, layout);
  const visibleText = style === 'wipe'
    ? revealWipe(stableText, progress, unit, stringProp(props.textRevealDirection, 'left'))
    : revealFromStart(stableText, progress, unit);
  if (!boolProp(props.textRevealCursor, false) || progress >= 1) return visibleText;
  return `${visibleText}${stringProp(props.textRevealCursorChar, '|')}`;
}

function revealFromStart(text: string, progress: number, unit: string): string {
  if (unit === 'word' || unit === 'words') return revealWords(text, progress);
  if (unit === 'line' || unit === 'lines') return revealLines(text, progress, 'top');
  return revealCharacters(text, progress);
}

function revealWipe(text: string, progress: number, unit: string, direction: string): string {
  if (direction === 'right') {
    if (unit === 'word' || unit === 'words') return revealWordsFromEnd(text, progress);
    return revealCharactersFromEnd(text, progress);
  }
  if (direction === 'bottom') return revealLines(text, progress, 'bottom');
  if (direction === 'top') return revealLines(text, progress, 'top');
  return revealFromStart(text, progress, unit);
}

function stableWrappedText(text: string, layout?: TextLayoutMetrics): string {
  if (!layout || layout.width <= 0 || layout.fontSize <= 0 || text.includes('\n')) return text;
  return text.split('\n').flatMap((line) => wrapLineToWidth(line, layout)).join('\n');
}

function wrapLineToWidth(line: string, layout: TextLayoutMetrics): string[] {
  const tokens = line.match(/\S+\s*/g) ?? [];
  if (tokens.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  for (const token of tokens) {
    const candidate = current + token;
    if (current && estimateWrappingTextWidth(candidate.trimEnd(), layout) > layout.width) {
      lines.push(current.trimEnd());
      current = token.trimStart();
      continue;
    }
    current = candidate;
  }
  if (current) lines.push(current.trimEnd());
  return lines.length > 0 ? lines : [line];
}

function estimateWrappingTextWidth(text: string, style: TextMeasureStyle | number): number {
  const measureStyle = typeof style === 'number'
    ? defaultTextMeasureStyle(style)
    : style;
  return measureTextWidth(text, measureStyle);
}

function defaultTextMeasureStyle(fontSize: number): TextMeasureStyle {
  return {
    fontSize,
    fontFamily: 'Inter, Arial, sans-serif',
    fontWeight: '700',
    fontStyle: 'normal'
  };
}

function measureTextWidth(text: string, style: TextMeasureStyle): number {
  if (!text) return 0;
  const context = getProgrammaticSpanTextMeasureContext();
  if (context) {
    context.font = `${style.fontStyle || 'normal'} ${String(style.fontWeight || '700')} ${Math.max(1, style.fontSize)}px ${style.fontFamily || 'Inter, Arial, sans-serif'}`;
    const measured = context.measureText(text).width;
    if (Number.isFinite(measured) && measured >= 0) return measured;
  }
  return estimateSingleLineTextWidth(text, style.fontSize);
}

function getProgrammaticSpanTextMeasureContext(): CanvasRenderingContext2D | null {
  if (programmaticSpanTextMeasureContext !== undefined) return programmaticSpanTextMeasureContext;
  if (
    typeof document === 'undefined' ||
    (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('jsdom'))
  ) {
    programmaticSpanTextMeasureContext = null;
    return programmaticSpanTextMeasureContext;
  }
  try {
    programmaticSpanTextMeasureContext = document.createElement('canvas').getContext('2d');
  } catch {
    programmaticSpanTextMeasureContext = null;
  }
  return programmaticSpanTextMeasureContext;
}

type RevealTextUnit = {
  text: string;
  x: number;
  y: number;
  width: number;
};

function layoutRevealTextUnits(
  text: string,
  unit: string,
  width: number,
  fontSize: number,
  fontFamily: string,
  fontWeight: string | number,
  fontStyle: string,
  lineHeight: number,
  align: string
): RevealTextUnit[] {
  const measureStyle = { fontSize, fontFamily, fontWeight, fontStyle };
  const lineHeightPx = fontSize * lineHeight;
  return text.split('\n').flatMap((line, lineIndex) => {
    const y = lineIndex * lineHeightPx;
    if (unit === 'line' || unit === 'lines') {
      const lineWidth = estimateWrappingTextWidth(line, measureStyle);
      const lineX = alignedLineOffset(align, width, lineWidth);
      return line ? [{ text: line, x: lineX, y: lineIndex * lineHeightPx, width: lineWidth }] : [];
    }
    const lineUnits = unit === 'word' || unit === 'words'
      ? layoutWordRevealUnits(line, y, measureStyle)
      : layoutCharacterRevealUnits(line, y, measureStyle);
    const lineWidth = lineUnits.reduce((right, lineUnit) => Math.max(right, lineUnit.x + lineUnit.width), 0);
    const lineX = alignedLineOffset(align, width, lineWidth);
    return lineUnits.map((lineUnit) => ({ ...lineUnit, x: lineUnit.x + lineX }));
  });
}

function layoutWordRevealUnits(line: string, y: number, style: TextMeasureStyle): RevealTextUnit[] {
  const units: RevealTextUnit[] = [];
  for (const match of line.matchAll(/\S+/g)) {
    const text = match[0];
    const start = match.index ?? 0;
    const end = start + text.length;
    const x = measureTextWidth(line.slice(0, start), style);
    const width = Math.max(
      measureTextWidth(text, style),
      measureTextWidth(line.slice(0, end), style) - x
    );
    units.push({ text, x, y, width });
  }
  return units;
}

function layoutCharacterRevealUnits(line: string, y: number, style: TextMeasureStyle): RevealTextUnit[] {
  const units: RevealTextUnit[] = [];
  let offset = 0;
  for (const character of Array.from(line)) {
    const start = offset;
    const end = start + character.length;
    if (character !== ' ') {
      const x = measureTextWidth(line.slice(0, start), style);
      const width = Math.max(
        measureTextWidth(character, style),
        measureTextWidth(line.slice(0, end), style) - x
      );
      units.push({ text: character, x, y, width });
    }
    offset = end;
  }
  return units;
}

function alignedLineOffset(align: string, containerWidth: number, lineWidth: number): number {
  if (align === 'center') return Math.max(0, (containerWidth - lineWidth) / 2);
  if (align === 'right' || align === 'end' || align === 'flex-end') return Math.max(0, containerWidth - lineWidth);
  return 0;
}

function revealMotionOffset(
  style: string,
  direction: string,
  distance: number,
  progress: number
): { x: number; y: number } {
  if (style !== 'fly' && style !== 'drop') return { x: 0, y: 0 };
  const remaining = distance * (1 - progress);
  if (direction === 'right') return { x: remaining, y: 0 };
  if (direction === 'top') return { x: 0, y: -remaining };
  if (direction === 'bottom') return { x: 0, y: remaining };
  return { x: -remaining, y: 0 };
}

function revealUnitProgress(
  progress: number,
  index: number,
  count: number,
  staggerMs: number,
  durationMs: number
): number {
  if (count <= 1 || staggerMs <= 0 || durationMs <= 0) return progress;
  const staggerRatio = staggerMs / durationMs;
  const span = 1 + staggerRatio * Math.max(0, count - 1);
  return clamp(progress * span - index * staggerRatio, 0, 1);
}

function revealCharacters(text: string, progress: number): string {
  const characters = Array.from(text);
  const visibleCount = Math.floor(characters.length * progress);
  return characters.slice(0, visibleCount).join('');
}

function revealCharactersFromEnd(text: string, progress: number): string {
  const characters = Array.from(text);
  const visibleCount = Math.floor(characters.length * progress);
  return characters.slice(Math.max(0, characters.length - visibleCount)).join('');
}

function revealWords(text: string, progress: number): string {
  const words = text.match(/\S+\s*/g) ?? [];
  const visibleCount = Math.floor(words.length * progress);
  return words.slice(0, visibleCount).join('');
}

function revealWordsFromEnd(text: string, progress: number): string {
  const words = text.match(/\S+\s*/g) ?? [];
  const visibleCount = Math.floor(words.length * progress);
  return words.slice(Math.max(0, words.length - visibleCount)).join('');
}

function revealLines(text: string, progress: number, direction: 'top' | 'bottom'): string {
  const lines = text.split('\n');
  const visibleCount = Math.floor(lines.length * progress);
  const visibleLines = direction === 'bottom'
    ? lines.slice(Math.max(0, lines.length - visibleCount))
    : lines.slice(0, visibleCount);
  return visibleLines.join('\n');
}

function formatCountText(
  rawValue: number,
  props: Record<string, ProgrammaticSpanLiteral>
): string {
  const step = numberStepProp(props.textNumberStep, numberProp(props, 'textNumberDecimals', 0));
  const steppedValue = step > 0 ? Math.round(rawValue / step) * step : rawValue;
  const decimals = Math.max(0, Math.round(numberProp(props, 'textNumberDecimals', decimalsForStep(step))));
  const prefix = stringProp(props.textNumberPrefix, '');
  const suffix = stringProp(props.textNumberSuffix, '');
  const trimTrailingZeros = boolProp(props.textNumberTrimTrailingZeros, false);
  const formatted = trimTrailingZeros
    ? steppedValue.toFixed(decimals).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
    : steppedValue.toFixed(decimals);
  return `${prefix}${formatted}${suffix}`;
}

function numberStepProp(value: ProgrammaticSpanLiteral | undefined, fallbackDecimals: number): number {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
  if (typeof value === 'string') {
    if (value === 'integer') return 1;
    if (value === 'decimal') return 0.1;
    if (value === 'hundredth') return 0.01;
    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) return numeric;
  }
  return 1 / Math.pow(10, Math.max(0, Math.round(fallbackDecimals)));
}

function decimalsForStep(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const normalized = step.toString().toLowerCase();
  if (!normalized.includes('.') && !normalized.includes('e-')) return 0;
  if (normalized.includes('e-')) {
    const exponent = Number(normalized.split('e-')[1]);
    return Number.isFinite(exponent) ? Math.max(0, exponent) : 0;
  }
  return Math.max(0, normalized.split('.')[1]?.length ?? 0);
}

function interpolateValue(
  from: ProgrammaticSpanLiteral,
  to: ProgrammaticSpanLiteral,
  t: number
): ProgrammaticSpanLiteral {
  if (typeof from === 'number' && typeof to === 'number') {
    return from + (to - from) * t;
  }
  if (typeof from === 'string' && typeof to === 'string') {
    return interpolateHexColor(from, to, t) ?? (t < 0.5 ? from : to);
  }
  return t < 0.5 ? from : to;
}

function interpolateNumber(from: number, to: number, t: number): number {
  return from + (to - from) * clamp(t, 0, 1);
}

function easeProgress(t: number, ease: ProgrammaticSpanEasing): number {
  const x = clamp(t, 0, 1);
  switch (ease) {
    case 'linear':
      return x;
    case 'inQuad':
      return x * x;
    case 'outQuad':
      return x * (2 - x);
    case 'inOutQuad':
      return x < 0.5 ? 2 * x * x : -1 + (4 - 2 * x) * x;
    case 'outCubic':
      return 1 - Math.pow(1 - x, 3);
    case 'inOutCubic':
      return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }
}

function interpolateHexColor(from: string, to: string, t: number): string | null {
  const a = parseHexColor(from);
  const b = parseHexColor(to);
  if (!a || !b) return null;
  const mix = (left: number, right: number) => Math.round(left + (right - left) * t);
  return `#${toHex(mix(a.r, b.r))}${toHex(mix(a.g, b.g))}${toHex(mix(a.b, b.b))}`;
}

function colorMix(from: string, to: string, amount: number): string {
  return interpolateHexColor(from, to, clamp(amount, 0, 1)) ?? from;
}

function readableTextColor(background: string, dark: string, light: string): string {
  const color = parseHexColor(background);
  if (!color) return light;
  const luminance = (0.2126 * color.r + 0.7152 * color.g + 0.0722 * color.b) / 255;
  return luminance > 0.56 ? dark : light;
}

function parseHexColor(value: string): { r: number; g: number; b: number } | null {
  const hex = value.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function toHex(value: number): string {
  return clamp(value, 0, 255).toString(16).padStart(2, '0');
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

function stringProp(
  valueOrProps: ProgrammaticSpanLiteral | Record<string, ProgrammaticSpanLiteral> | undefined,
  keyOrFallback: string,
  maybeFallback?: string
): string {
  const readingRecord = maybeFallback !== undefined;
  const value = readingRecord
    ? (valueOrProps as Record<string, ProgrammaticSpanLiteral> | undefined)?.[keyOrFallback]
    : valueOrProps;
  const fallback = readingRecord ? maybeFallback : keyOrFallback;
  return typeof value === 'string' ? value : fallback;
}

function boolProp(value: ProgrammaticSpanLiteral | undefined, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function timeProp(value: ProgrammaticSpanLiteral | undefined, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const ms = /^(-?\d+(?:\.\d+)?)ms$/.exec(trimmed);
    if (ms) return Number(ms[1]);
    const seconds = /^(-?\d+(?:\.\d+)?)s$/.exec(trimmed);
    if (seconds) return Number(seconds[1]) * 1000;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

type LengthAxis = 'x' | 'y' | 'min' | 'max';

function lengthProp(
  props: Record<string, ProgrammaticSpanLiteral>,
  key: string,
  fallback: number,
  axis: LengthAxis,
  scope: RenderScope
): number {
  return resolveLength(props[key], fallback, axis, scope);
}

function resolveLength(
  value: ProgrammaticSpanLiteral | undefined,
  fallback: number,
  axis: LengthAxis,
  scope: RenderScope
): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const percentMatch = /^(-?\d+(?:\.\d+)?)%$/.exec(trimmed);
    if (percentMatch) {
      return (Number(percentMatch[1]) / 100) * scopeBase(scope, axis);
    }
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
}

function scopeBase(scope: RenderScope, axis: LengthAxis): number {
  switch (axis) {
    case 'x':
      return scope.boundsWidth;
    case 'y':
      return scope.boundsHeight;
    case 'min':
      return Math.min(scope.boundsWidth, scope.boundsHeight);
    case 'max':
      return Math.max(scope.boundsWidth, scope.boundsHeight);
  }
}

function boxSpacing(
  props: Record<string, ProgrammaticSpanLiteral>,
  base: string,
  scope: RenderScope
): { left: number; right: number; top: number; bottom: number } {
  const fallback = resolveLength(props[base], 0, 'min', scope);
  const x = resolveLength(props[`${base}X`], fallback, 'x', scope);
  const y = resolveLength(props[`${base}Y`], fallback, 'y', scope);
  return {
    left: resolveLength(props[`${base}Left`], x, 'x', scope),
    right: resolveLength(props[`${base}Right`], x, 'x', scope),
    top: resolveLength(props[`${base}Top`], y, 'y', scope),
    bottom: resolveLength(props[`${base}Bottom`], y, 'y', scope)
  };
}

function numberArrayProp(value: ProgrammaticSpanLiteral | undefined, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  const numbers = value.filter((entry): entry is number => typeof entry === 'number' && Number.isFinite(entry));
  return numbers.length > 0 ? numbers : fallback;
}

function fitSingleLineFontSize(label: string, availableWidth: number, maxSize: number): number {
  const estimatedWidthAtMax = estimateSingleLineTextWidth(label, maxSize);
  if (estimatedWidthAtMax <= availableWidth) return maxSize;
  return Math.max(10, Math.floor(maxSize * availableWidth / Math.max(1, estimatedWidthAtMax)));
}

function estimateSingleLineTextWidth(label: string, size: number): number {
  let emWidth = 0;
  for (const char of label) {
    if (char === ' ') {
      emWidth += 0.32;
    } else if ('.,:;!|'.includes(char)) {
      emWidth += 0.25;
    } else if ('ilIjtfr'.includes(char)) {
      emWidth += 0.34;
    } else if ('mwMW'.includes(char)) {
      emWidth += 0.78;
    } else if (/[A-Z]/.test(char)) {
      emWidth += 0.62;
    } else {
      emWidth += 0.52;
    }
  }
  return emWidth * size;
}

function fitBoxFontSize(
  text: string,
  availableWidth: number,
  availableHeight: number,
  maxSize: number,
  lineHeight: number
): number {
  const normalized = text.trim();
  if (!normalized || availableWidth <= 0 || availableHeight <= 0) return maxSize;
  const hardLines = Math.max(1, normalized.split('\n').length);
  for (let size = Math.max(10, Math.floor(maxSize)); size >= 10; size -= 1) {
    const estimatedLineWidth = Math.max(1, normalized.length * size * 0.58);
    const softLines = Math.max(hardLines, Math.ceil(estimatedLineWidth / availableWidth));
    if (softLines * size * lineHeight <= availableHeight + 0.5) {
      return size;
    }
  }
  return 10;
}

function estimatedBoxLineCount(text: string, availableWidth: number, size: number): number {
  const normalized = text.trim();
  if (!normalized || availableWidth <= 0 || size <= 0) return 1;
  const hardLines = Math.max(1, normalized.split('\n').length);
  const estimatedLineWidth = Math.max(1, normalized.length * size * 0.58);
  return Math.max(hardLines, Math.ceil(estimatedLineWidth / availableWidth));
}

function appendCellDiagnostics(
  visuals: Visual[],
  scope: RenderScope,
  context: EvaluationContext,
  cellId: string
): void {
  const bounds = {
    x: scope.offsetX,
    y: scope.offsetY,
    width: scope.boundsWidth,
    height: scope.boundsHeight
  };
  const visibleBounds = visuals
    .map((visual) => ({ visual, bounds: visualBounds(visual) }))
    .filter((entry): entry is { visual: Visual; bounds: Bounds } => !!entry.bounds && visualOpacity(entry.visual) > 0.01);

  for (const entry of visibleBounds) {
    if (!containsBounds(bounds, entry.bounds, 1)) {
      context.diagnostics.push({
        severity: 'warning',
        message: `Visual "${entry.visual.id}" overflows layout cell "${cellId}".`,
        path: `${cellId}.${entry.visual.id}`
      });
    }
  }

  for (let leftIndex = 0; leftIndex < visibleBounds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < visibleBounds.length; rightIndex += 1) {
      const left = visibleBounds[leftIndex];
      const right = visibleBounds[rightIndex];
      if (visualLayer(left.visual) !== visualLayer(right.visual)) continue;
      if (!boundsOverlap(left.bounds, right.bounds, 1)) continue;
      if (overlapArea(left.bounds, right.bounds) <= 16) continue;
      context.diagnostics.push({
        severity: 'warning',
        message: `Visuals "${left.visual.id}" and "${right.visual.id}" overlap in layout cell "${cellId}" on layer ${visualLayer(left.visual)}.`,
        path: `${cellId}.${left.visual.id}.${right.visual.id}`
      });
    }
  }
}

type Bounds = { x: number; y: number; width: number; height: number };

function visualBounds(visual: Visual): Bounds | null {
  const x = Number(visual.attributes.get('x'));
  const y = Number(visual.attributes.get('y'));
  const width = Number(visual.attributes.get('width'));
  const height = Number(visual.attributes.get('height'));
  if (![x, y, width, height].every(Number.isFinite)) return null;
  const scaleX = finiteVisualAttribute(visual, 'scaleX', 1);
  const scaleY = finiteVisualAttribute(visual, 'scaleY', 1);
  const rotationDeg = finiteVisualAttribute(visual, 'rotation', 0);
  const rotationCenterX = finiteVisualAttribute(visual, 'rotationCenterX', 0.5);
  const rotationCenterY = finiteVisualAttribute(visual, 'rotationCenterY', 0.5);
  const pivotX = x + width * rotationCenterX;
  const pivotY = y + height * rotationCenterY;
  const radians = rotationDeg * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height }
  ].map((point) => {
    const scaledX = pivotX + (point.x - pivotX) * scaleX;
    const scaledY = pivotY + (point.y - pivotY) * scaleY;
    if (Math.abs(rotationDeg) < 0.0001) return { x: scaledX, y: scaledY };
    const dx = scaledX - pivotX;
    const dy = scaledY - pivotY;
    return {
      x: pivotX + dx * cos - dy * sin,
      y: pivotY + dx * sin + dy * cos
    };
  });
  const xs = corners.map((point) => point.x);
  const ys = corners.map((point) => point.y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  return {
    x: left,
    y: top,
    width: Math.max(0, Math.max(...xs) - left),
    height: Math.max(0, Math.max(...ys) - top)
  };
}

function finiteVisualAttribute(visual: Visual, key: string, fallback: number): number {
  return finiteMapNumber(visual.attributes, key, fallback);
}

function finiteMapNumber(attributes: Map<string, unknown>, key: string, fallback: number): number {
  const value = Number(attributes.get(key));
  return Number.isFinite(value) ? value : fallback;
}

function visualLayer(visual: Visual): number {
  const layer = Number(visual.attributes.get('layer') ?? 0);
  return Number.isFinite(layer) ? layer : 0;
}

function visualOpacity(visual: Visual): number {
  const opacity = Number(visual.attributes.get('opacity') ?? 1);
  return Number.isFinite(opacity) ? opacity : 1;
}

function containsBounds(container: Bounds, child: Bounds, tolerance: number): boolean {
  return (
    child.x >= container.x - tolerance &&
    child.y >= container.y - tolerance &&
    child.x + child.width <= container.x + container.width + tolerance &&
    child.y + child.height <= container.y + container.height + tolerance
  );
}

function boundsOverlap(left: Bounds, right: Bounds, tolerance: number): boolean {
  return (
    left.x < right.x + right.width - tolerance &&
    left.x + left.width > right.x + tolerance &&
    left.y < right.y + right.height - tolerance &&
    left.y + left.height > right.y + tolerance
  );
}

function overlapArea(left: Bounds, right: Bounds): number {
  const width = Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x);
  const height = Math.min(left.y + left.height, right.y + right.height) - Math.max(left.y, right.y);
  return Math.max(0, width) * Math.max(0, height);
}

function timedProgress(
  context: EvaluationContext,
  startMs: number,
  durationMs: number,
  ease: ProgrammaticSpanEasing
): number {
  const raw = (context.timeMs - startMs) / Math.max(1, durationMs);
  return easeProgress(clamp(raw, 0, 1), ease);
}

function timedNumber(
  context: EvaluationContext,
  startMs: number,
  durationMs: number,
  from: number,
  to: number,
  ease: ProgrammaticSpanEasing
): number {
  return from + (to - from) * timedProgress(context, startMs, durationMs, ease);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
