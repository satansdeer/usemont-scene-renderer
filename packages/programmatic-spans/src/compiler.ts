import { parse } from '@babel/parser';

import { compileProceduralRenderProgram } from './procedural.js';

import type {
  ProgrammaticSpanAnimation,
  ProgrammaticSpanCompileResult,
  ProgrammaticSpanDiagnostic,
  ProgrammaticSpanEasing,
  ProgrammaticSpanExpression,
  ProgrammaticSpanLiteral,
  ProgrammaticSpanNode,
  ProgrammaticSpanNodeKind,
  ProgrammaticSpanSetting,
  ProgrammaticSpanSettingType,
  ProgrammaticSpanSpec,
  ProgrammaticSpanToken,
  ProgrammaticSpanVariable,
  ProgrammaticSpanVariableType
} from './types.js';

type BabelNode = Record<string, any>;

type CompiledTextEffectPreset = {
  props: Record<string, ProgrammaticSpanExpression>;
  animations: ProgrammaticSpanAnimation[];
};

type CompiledRenderEffectPreset = {
  props: Record<string, ProgrammaticSpanExpression>;
};

const NODE_KIND_BY_JSX_NAME: Record<string, ProgrammaticSpanNodeKind> = {
  Scene: 'scene',
  Group: 'group',
  Rect: 'rect',
  'Shape.Rect': 'rect',
  Circle: 'circle',
  'Shape.Circle': 'circle',
  Ellipse: 'ellipse',
  'Shape.Ellipse': 'ellipse',
  Triangle: 'triangle',
  'Shape.Triangle': 'triangle',
  Arc: 'arc',
  'Shape.Arc': 'arc',
  Diamond: 'diamond',
  'Shape.Diamond': 'diamond',
  Star: 'star',
  'Shape.Star': 'star',
  Callout: 'calloutBox',
  CalloutBox: 'calloutBox',
  'Shape.Callout': 'calloutBox',
  'Shape.CalloutBox': 'calloutBox',
  Line: 'line',
  'Shape.Line': 'line',
  Arrow: 'arrow',
  'Shape.Arrow': 'arrow',
  TurnArrow: 'turnArrow',
  'Shape.TurnArrow': 'turnArrow',
  Text: 'text',
  Image: 'image',
  Bitmap: 'image',
  Vector: 'image',
  Gif: 'image',
  Lottie: 'lottie',
  LottieAnimation: 'lottie',
  Model: 'model3d',
  Model3D: 'model3d',
  Cursor: 'cursor',
  ClickPulse: 'click-pulse',
  CursorClick: 'cursor-click',
  Motion: 'motion-box',
  MotionBox: 'motion-box',
  TransformBox: 'motion-box',
  AnimationContainer: 'motion-box',
  'Animation.Container': 'motion-box',
  BrowserWindow: 'browser-window',
  TrafficLights: 'traffic-lights',
  CTAButton: 'cta-button',
  DataChart: 'data-chart',
  Flowchart: 'flowchart',
  DecisionTree: 'decision-tree',
  VStack: 'v-stack',
  HStack: 'h-stack',
  Stack: 'v-stack',
  Row: 'h-stack',
  Bento: 'bento',
  Cell: 'cell',
  ProceduralVisual: 'procedural-visual',
  'Procedural.Visual': 'procedural-visual',
  Effect: 'effect',
  CameraEffect: 'effect'
};

const VARIABLE_TYPE_BY_HELPER: Record<string, ProgrammaticSpanVariableType> = {
  stringVar: 'string',
  numberVar: 'number',
  colorVar: 'color',
  booleanVar: 'boolean'
};

const SETTING_TYPE_BY_HELPER: Record<string, ProgrammaticSpanSettingType> = {
  stringSetting: 'string',
  textSetting: 'string',
  numberSetting: 'number',
  colorSetting: 'color',
  booleanSetting: 'boolean',
  pointSetting: 'point',
  rectSetting: 'rect',
  selectSetting: 'select',
  choiceSetting: 'select'
};

const SUPPORTED_EXPRESSION_CALLS = new Set([
  'color.mix',
  'color.lighten',
  'color.darken',
  'color.readableText'
]);

const VALID_EASINGS = new Set<ProgrammaticSpanEasing>([
  'linear',
  'inQuad',
  'outQuad',
  'inOutQuad',
  'outCubic',
  'inOutCubic'
]);

export function compileProgrammaticSpanTsx(source: string): ProgrammaticSpanCompileResult {
  const diagnostics: ProgrammaticSpanDiagnostic[] = [];
  let ast: BabelNode;

  try {
    ast = parse(source, {
      sourceType: 'module',
      plugins: ['typescript', 'jsx']
    }) as unknown as BabelNode;
  } catch (error) {
    return {
      spec: null,
      diagnostics: [
        {
          severity: 'error',
          message: error instanceof Error ? error.message : String(error)
        }
      ]
    };
  }

  const defaultExport = findDefaultExport(ast);
  if (!defaultExport) {
    diagnostics.push({
      severity: 'error',
      message: 'Expected `export default defineSpanScene({...})`.'
    });
    return { spec: null, diagnostics };
  }

  const call = unwrapDefaultExportCall(defaultExport);
  if (!call || getIdentifierName(call.callee) !== 'defineSpanScene') {
    diagnostics.push({
      severity: 'error',
      message: 'Default export must call `defineSpanScene`.'
    });
    return { spec: null, diagnostics };
  }

  const config = call.arguments?.[0];
  if (!config || config.type !== 'ObjectExpression') {
    diagnostics.push({
      severity: 'error',
      message: '`defineSpanScene` expects one object argument.'
    });
    return { spec: null, diagnostics };
  }

  const id = readStringProperty(config, 'id') ?? 'programmatic-span';
  const width = readNumberProperty(config, 'width') ?? 1920;
  const height = readNumberProperty(config, 'height') ?? 1080;
  const durationMs = readNumberProperty(config, 'durationMs') ?? 6000;
  const clampedDurationMs = Math.max(1, durationMs);
  const editModeTimeMs = readNumberProperty(config, 'editModeTimeMs') ?? readNumberProperty(config, 'editPreviewMs') ?? 0;
  const variables = readVariables(config, diagnostics);
  const settings = readSettings(config, diagnostics);
  const tokens = readTokens(config, diagnostics);
  const renderJsx = findRenderReturnJsx(config);

  if (!renderJsx) {
    diagnostics.push({
      severity: 'error',
      message: '`render` must return a JSX `<Scene>` element.'
    });
    return { spec: null, diagnostics };
  }

  const root = compileJsxNode(renderJsx, diagnostics, 'Scene', source);
  if (!root || root.kind !== 'scene') {
    diagnostics.push({
      severity: 'error',
      message: '`render` must return `<Scene>` as the root element.'
    });
    return { spec: null, diagnostics };
  }

  appendAuthoringDiagnostics(settings, tokens, root, diagnostics);

  const spec: ProgrammaticSpanSpec = {
    schemaVersion: 1,
    id,
    width,
    height,
    durationMs: clampedDurationMs,
    editModeTimeMs: Math.max(0, Math.min(clampedDurationMs, editModeTimeMs)),
    variables,
    settings,
    tokens,
    root: {
      ...root,
      props: {
        ...root.props,
        width,
        height
      }
    }
  };

  return { spec, diagnostics };
}

function findDefaultExport(ast: BabelNode): BabelNode | null {
  const body = ast.program?.body;
  if (!Array.isArray(body)) return null;
  return body.find((node) => node.type === 'ExportDefaultDeclaration') ?? null;
}

function unwrapDefaultExportCall(defaultExport: BabelNode): BabelNode | null {
  const declaration = defaultExport.declaration;
  if (!declaration) return null;
  if (declaration.type === 'CallExpression') return declaration;
  if (declaration.type === 'TSAsExpression' && declaration.expression?.type === 'CallExpression') {
    return declaration.expression;
  }
  return null;
}

function getIdentifierName(node: BabelNode | null | undefined): string | null {
  if (!node) return null;
  if (node.type === 'Identifier') return node.name ?? null;
  return null;
}

function objectProperties(node: BabelNode): BabelNode[] {
  return Array.isArray(node.properties) ? node.properties : [];
}

function propertyKeyName(prop: BabelNode): string | null {
  const key = prop.key;
  if (!key) return null;
  if (key.type === 'Identifier') return key.name ?? null;
  if (key.type === 'StringLiteral') return key.value ?? null;
  return null;
}

function findObjectProperty(node: BabelNode, name: string): BabelNode | null {
  return (
    objectProperties(node).find((prop) => prop.type === 'ObjectProperty' && propertyKeyName(prop) === name) ??
    null
  );
}

function readStringProperty(node: BabelNode, name: string): string | null {
  const prop = findObjectProperty(node, name);
  const value = prop?.value;
  if (!value) return null;
  const literal = expressionToLiteral(value);
  return typeof literal === 'string' ? literal : null;
}

function readNumberProperty(node: BabelNode, name: string): number | null {
  const prop = findObjectProperty(node, name);
  const value = prop?.value;
  if (!value) return null;
  const literal = expressionToLiteral(value);
  return typeof literal === 'number' && Number.isFinite(literal) ? literal : null;
}

function readVariables(
  config: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[]
): ProgrammaticSpanVariable[] {
  const prop = findObjectProperty(config, 'variables');
  const variablesNode = prop?.value;
  if (!variablesNode || variablesNode.type !== 'ObjectExpression') return [];

  const variables: ProgrammaticSpanVariable[] = [];
  for (const entry of objectProperties(variablesNode)) {
    if (entry.type !== 'ObjectProperty') continue;
    const id = propertyKeyName(entry);
    if (!id) continue;
    const value = entry.value;
    if (value?.type !== 'CallExpression') {
      diagnostics.push({
        severity: 'warning',
        message: `Variable "${id}" must use stringVar, numberVar, colorVar, or booleanVar.`,
        path: `variables.${id}`
      });
      continue;
    }
    const helper = getIdentifierName(value.callee);
    const type = helper ? VARIABLE_TYPE_BY_HELPER[helper] : undefined;
    if (!type) {
      diagnostics.push({
        severity: 'warning',
        message: `Unsupported variable helper for "${id}".`,
        path: `variables.${id}`
      });
      continue;
    }
    const defaultValue = expressionToLiteral(value.arguments?.[0]) ?? defaultValueForVariable(type);
    const options =
      value.arguments?.[1]?.type === 'ObjectExpression'
        ? objectExpressionToRecord(value.arguments[1])
        : {};
    variables.push({
      id,
      type,
      default: defaultValue,
      ...(typeof options.label === 'string' ? { label: options.label } : {})
    });
  }
  return variables;
}

function defaultValueForVariable(type: ProgrammaticSpanVariableType): ProgrammaticSpanLiteral {
  switch (type) {
    case 'string':
    case 'color':
      return '';
    case 'number':
      return 0;
    case 'boolean':
      return false;
  }
}

function readSettings(
  config: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[]
): ProgrammaticSpanSetting[] {
  const prop = findObjectProperty(config, 'settings');
  const settingsNode = prop?.value;
  if (!settingsNode || settingsNode.type !== 'ObjectExpression') return [];

  const settings: ProgrammaticSpanSetting[] = [];
  for (const entry of objectProperties(settingsNode)) {
    if (entry.type !== 'ObjectProperty') continue;
    const id = propertyKeyName(entry);
    if (!id) continue;
    const value = entry.value;
    if (value?.type !== 'CallExpression') {
      diagnostics.push({
        severity: 'warning',
        message: `Setting "${id}" must use a supported setting helper.`,
        path: `settings.${id}`
      });
      continue;
    }
    const helper = getIdentifierName(value.callee);
    const type = helper ? SETTING_TYPE_BY_HELPER[helper] : undefined;
    if (!type) {
      diagnostics.push({
        severity: 'warning',
        message: `Unsupported setting helper for "${id}".`,
        path: `settings.${id}`
      });
      continue;
    }

    const { defaultValue, options } = settingCallDefaultsAndOptions(type, value);
    const stringOptions = Array.isArray(options.options)
      ? options.options.filter((option): option is string => typeof option === 'string')
      : undefined;
    const overlay = typeof options.overlay === 'string' && isProgrammaticSettingOverlay(options.overlay)
      ? options.overlay
      : options.overlay === true
        ? defaultOverlayForSettingType(type)
        : undefined;

    settings.push({
      id,
      type,
      default: defaultValue,
      ...(typeof options.label === 'string' ? { label: options.label } : {}),
      ...(typeof options.min === 'number' ? { min: options.min } : {}),
      ...(typeof options.max === 'number' ? { max: options.max } : {}),
      ...(typeof options.step === 'number' ? { step: options.step } : {}),
      ...(stringOptions ? { options: stringOptions } : {}),
      ...(overlay ? { overlay } : {}),
      ...(typeof options.overlayGroup === 'string' ? { overlayGroup: options.overlayGroup } : {}),
      ...(typeof options.overlayOrder === 'number' ? { overlayOrder: options.overlayOrder } : {}),
      ...(typeof options.overlayOriginVisualId === 'string' ? { overlayOriginVisualId: options.overlayOriginVisualId } : {}),
      ...(typeof options.visualId === 'string' ? { visualId: options.visualId } : {})
    });
  }
  return settings;
}

function settingCallDefaultsAndOptions(
  type: ProgrammaticSpanSettingType,
  value: BabelNode
): { defaultValue: ProgrammaticSpanLiteral; options: Record<string, ProgrammaticSpanLiteral> } {
  const firstArg = value.arguments?.[0];
  const secondArg = value.arguments?.[1];
  const secondOptions = secondArg?.type === 'ObjectExpression' ? objectExpressionToRecord(secondArg) : {};

  if (firstArg?.type === 'ObjectExpression') {
    const record = objectExpressionToRecord(firstArg);
    if (Object.prototype.hasOwnProperty.call(record, 'default')) {
      const { default: defaultValue, ...inlineOptions } = record;
      return {
        defaultValue: defaultValue ?? defaultValueForSetting(type),
        options: { ...inlineOptions, ...secondOptions }
      };
    }
    if (type === 'point' || type === 'rect') {
      return {
        defaultValue: { ...(defaultValueForSetting(type) as Record<string, ProgrammaticSpanLiteral>), ...record },
        options: secondOptions
      };
    }
    return {
      defaultValue: defaultValueForSetting(type),
      options: { ...record, ...secondOptions }
    };
  }

  const defaultValue = expressionToLiteral(firstArg) ?? defaultValueForSetting(type);
  return {
    defaultValue,
    options: secondOptions
  };
}

function defaultValueForSetting(type: ProgrammaticSpanSettingType): ProgrammaticSpanLiteral {
  switch (type) {
    case 'point':
      return { x: 0, y: 0 };
    case 'rect':
      return { x: 0, y: 0, width: 100, height: 100 };
    case 'select':
      return '';
    default:
      return defaultValueForVariable(type);
  }
}

function isProgrammaticSettingOverlay(value: string): value is NonNullable<ProgrammaticSpanSetting['overlay']> {
  return value === 'frame' || value === 'point' || value === 'offset' || value === 'value';
}

function defaultOverlayForSettingType(
  type: ProgrammaticSpanSettingType
): NonNullable<ProgrammaticSpanSetting['overlay']> {
  if (type === 'rect') return 'frame';
  if (type === 'point') return 'point';
  return 'value';
}

function readTokens(
  config: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[]
): ProgrammaticSpanToken[] {
  const prop = findObjectProperty(config, 'tokens');
  const tokensNode = prop?.value;
  if (!tokensNode || tokensNode.type !== 'ObjectExpression') return [];

  const tokens: ProgrammaticSpanToken[] = [];
  for (const entry of objectProperties(tokensNode)) {
    if (entry.type !== 'ObjectProperty') continue;
    const id = propertyKeyName(entry);
    if (!id) continue;
    const value = expressionToProgrammaticExpression(entry.value);
    if (value === undefined) {
      diagnostics.push({
        severity: 'warning',
        message: `Token "${id}" must use a literal, settings reference, token reference, or supported color helper.`,
        path: `tokens.${id}`
      });
      continue;
    }
    tokens.push({ id, value });
  }
  return tokens;
}

function appendAuthoringDiagnostics(
  settings: ProgrammaticSpanSetting[],
  tokens: ProgrammaticSpanToken[],
  root: ProgrammaticSpanNode,
  diagnostics: ProgrammaticSpanDiagnostic[]
): void {
  const settingsById = new Map(settings.map((setting) => [setting.id, setting]));
  const tokensById = new Map(tokens.map((token) => [token.id, token]));
  const nodeIds = collectNodeIds(root);
  const rootRefs = collectNodeRefs(root);
  const reachableTokenIds = collectReachableTokenIds(tokensById, rootRefs.tokenRefs);
  const tokenRefs = [
    ...rootRefs.tokenRefs,
    ...tokens
      .filter((token) => reachableTokenIds.has(token.id))
      .flatMap((token) => collectExpressionRefs(token.value).tokenRefs)
  ];
  const settingRefs = [
    ...rootRefs.settingRefs,
    ...tokens
      .filter((token) => reachableTokenIds.has(token.id))
      .flatMap((token) => collectExpressionRefs(token.value).settingRefs)
  ];
  const usedSettings = new Set(settingRefs.map((ref) => ref.name));

  for (const ref of settingRefs) {
    const setting = settingsById.get(ref.name);
    if (!setting) {
      diagnostics.push({
        severity: 'error',
        message: `Setting "${ref.name}" is referenced but not declared.`,
        path: ref.path.length ? `settings.${ref.name}.${ref.path.join('.')}` : `settings.${ref.name}`
      });
      continue;
    }
    const invalidPathMessage = invalidSettingPathMessage(setting, ref.path);
    if (invalidPathMessage) {
      diagnostics.push({
        severity: 'warning',
        message: invalidPathMessage,
        path: `settings.${ref.name}.${ref.path.join('.')}`
      });
    }
  }

  for (const ref of tokenRefs) {
    if (!tokensById.has(ref.name)) {
      diagnostics.push({
        severity: 'error',
        message: `Token "${ref.name}" is referenced but not declared.`,
        path: ref.path.length ? `tokens.${ref.name}.${ref.path.join('.')}` : `tokens.${ref.name}`
      });
    }
  }

  for (const setting of settings) {
    if (!usedSettings.has(setting.id)) {
      diagnostics.push({
        severity: 'warning',
        message: `Setting "${setting.id}" is declared but never used by render output.`,
        path: `settings.${setting.id}`
      });
    }
    if (setting.visualId && !nodeIds.has(setting.visualId)) {
      diagnostics.push({
        severity: 'error',
        message: `Setting "${setting.id}" targets missing visual "${setting.visualId}".`,
        path: `settings.${setting.id}.visualId`
      });
    }
  }

  for (const token of tokens) {
    if (!reachableTokenIds.has(token.id)) {
      diagnostics.push({
        severity: 'warning',
        message: `Token "${token.id}" is declared but never used by render output.`,
        path: `tokens.${token.id}`
      });
    }
  }
}

function collectNodeIds(root: ProgrammaticSpanNode): Set<string> {
  const ids = new Set<string>();
  const visit = (node: ProgrammaticSpanNode) => {
    ids.add(node.id);
    for (const child of node.children) visit(child);
  };
  visit(root);
  return ids;
}

function collectNodeRefs(root: ProgrammaticSpanNode): {
  settingRefs: Array<{ name: string; path: string[] }>;
  tokenRefs: Array<{ name: string; path: string[] }>;
} {
  const refs = {
    settingRefs: [] as Array<{ name: string; path: string[] }>,
    tokenRefs: [] as Array<{ name: string; path: string[] }>
  };
  const visitExpression = (expression: ProgrammaticSpanExpression | null | undefined) => {
    const expressionRefs = collectExpressionRefs(expression);
    refs.settingRefs.push(...expressionRefs.settingRefs);
    refs.tokenRefs.push(...expressionRefs.tokenRefs);
  };
  const visitNode = (node: ProgrammaticSpanNode) => {
    for (const value of Object.values(node.props)) visitExpression(value);
    for (const animation of node.animations) {
      visitExpression(animation.from);
      visitExpression(animation.to);
    }
    for (const child of node.children) visitNode(child);
  };
  visitNode(root);
  return refs;
}

function collectExpressionRefs(expression: ProgrammaticSpanExpression | null | undefined): {
  settingRefs: Array<{ name: string; path: string[] }>;
  tokenRefs: Array<{ name: string; path: string[] }>;
} {
  const refs = {
    settingRefs: [] as Array<{ name: string; path: string[] }>,
    tokenRefs: [] as Array<{ name: string; path: string[] }>
  };
  const visit = (value: ProgrammaticSpanExpression | null | undefined) => {
    if (!value || typeof value !== 'object' || Array.isArray(value) || !('kind' in value)) return;
    if (value.kind === 'setting-ref' && typeof value.name === 'string' && Array.isArray(value.path)) {
      refs.settingRefs.push({ name: value.name, path: value.path as string[] });
    } else if (value.kind === 'token-ref' && typeof value.name === 'string' && Array.isArray(value.path)) {
      refs.tokenRefs.push({ name: value.name, path: value.path as string[] });
    } else if (value.kind === 'call' && Array.isArray(value.args)) {
      for (const arg of value.args) visit(arg);
    } else if (value.kind === 'procedural-render') {
      const settingRefs = Array.isArray((value as { settingRefs?: unknown }).settingRefs)
        ? (value as { settingRefs: unknown[] }).settingRefs
        : [];
      const tokenRefs = Array.isArray((value as { tokenRefs?: unknown }).tokenRefs)
        ? (value as { tokenRefs: unknown[] }).tokenRefs
        : [];
      for (const name of settingRefs) {
        if (typeof name === 'string') refs.settingRefs.push({ name, path: [] });
      }
      for (const name of tokenRefs) {
        if (typeof name === 'string') refs.tokenRefs.push({ name, path: [] });
      }
    }
  };
  visit(expression);
  return refs;
}

function collectReachableTokenIds(
  tokensById: Map<string, ProgrammaticSpanToken>,
  rootRefs: Array<{ name: string; path: string[] }>
): Set<string> {
  const reachable = new Set<string>();
  const visit = (tokenId: string) => {
    if (reachable.has(tokenId)) return;
    const token = tokensById.get(tokenId);
    if (!token) return;
    reachable.add(tokenId);
    for (const ref of collectExpressionRefs(token.value).tokenRefs) visit(ref.name);
  };
  for (const ref of rootRefs) visit(ref.name);
  return reachable;
}

function invalidSettingPathMessage(setting: ProgrammaticSpanSetting, path: string[]): string | null {
  if (path.length === 0) return null;
  const allowed = setting.type === 'point'
    ? new Set(['x', 'y'])
    : setting.type === 'rect'
      ? new Set(['x', 'y', 'width', 'height'])
      : null;
  if (!allowed) {
    return `Setting "${setting.id}" is a ${setting.type} setting and does not expose nested fields.`;
  }
  const invalid = path.find((part) => !allowed.has(part));
  return invalid ? `Setting "${setting.id}" does not expose "${invalid}".` : null;
}

function findRenderReturnJsx(config: BabelNode): BabelNode | null {
  for (const prop of objectProperties(config)) {
    if (propertyKeyName(prop) !== 'render') continue;
    if (prop.type === 'ObjectMethod') return findReturnedJsx(prop.body);
    if (prop.type === 'ObjectProperty') {
      const value = prop.value;
      if (!value) continue;
      if (value.type === 'ArrowFunctionExpression' && isJsxElement(value.body)) return value.body;
      if (
        (value.type === 'ArrowFunctionExpression' || value.type === 'FunctionExpression') &&
        value.body?.type === 'BlockStatement'
      ) {
        return findReturnedJsx(value.body);
      }
    }
  }
  return null;
}

function findReturnedJsx(block: BabelNode): BabelNode | null {
  const body = block?.body;
  if (!Array.isArray(body)) return null;
  for (const statement of body) {
    if (statement.type !== 'ReturnStatement') continue;
    if (isJsxElement(statement.argument)) return statement.argument;
  }
  return null;
}

function isJsxElement(node: BabelNode | null | undefined): node is BabelNode {
  return !!node && (node.type === 'JSXElement' || node.type === 'JSXFragment');
}

function compileJsxNode(
  jsx: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  source: string
): ProgrammaticSpanNode | null {
  if (jsx.type === 'JSXFragment') {
    diagnostics.push({
      severity: 'error',
      message: 'Fragments are not supported yet; use `<Group>`.',
      path
    });
    return null;
  }

  const jsxName = getJsxElementName(jsx.openingElement?.name);
  if (!jsxName) {
    diagnostics.push({ severity: 'error', message: 'Unsupported JSX element name.', path });
    return null;
  }

  const kind = NODE_KIND_BY_JSX_NAME[jsxName];
  if (!kind) {
    if (jsxName !== 'Animate') {
      diagnostics.push({
        severity: 'warning',
        message: `Ignoring unsupported element <${jsxName}>.`,
        path
      });
    }
    return null;
  }

  const props = readJsxProps(jsx.openingElement, diagnostics, path, source);
  const id = String(resolveLiteralForId(props.id) ?? `${kind}-${path.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`);
  const animations: ProgrammaticSpanAnimation[] = [];
  const children: ProgrammaticSpanNode[] = [];

  for (const child of jsx.children ?? []) {
    if (child.type === 'JSXText') continue;
    if (child.type === 'JSXExpressionContainer' && child.expression?.type === 'JSXEmptyExpression') continue;
    if (!isJsxElement(child)) continue;

    const childName = child.type === 'JSXElement' ? getJsxElementName(child.openingElement?.name) : null;
    if (childName === 'Animate') {
      const animation = compileAnimation(child, diagnostics, `${path}.${id}.Animate`, source);
      if (animation) animations.push(animation);
      continue;
    }
    if (childName?.startsWith('Animation.') && !NODE_KIND_BY_JSX_NAME[childName]) {
      animations.push(
        ...compileAnimationPreset(childName, child, diagnostics, `${path}.${id}.${childName}`, props, source)
      );
      continue;
    }
    if (childName?.startsWith('TextEffect.')) {
      const textEffect = compileTextEffectPreset(
        childName,
        child,
        diagnostics,
        `${path}.${id}.${childName}`,
        kind,
        props,
        source
      );
      if (textEffect) {
        Object.assign(props, textEffect.props);
        animations.push(...textEffect.animations);
      }
      continue;
    }
    if (isRenderEffectPresetName(childName)) {
      const renderEffect = compileRenderEffectPreset(
        childName,
        child,
        diagnostics,
        `${path}.${id}.${childName}`,
        source
      );
      if (renderEffect) {
        Object.assign(props, renderEffect.props);
      }
      continue;
    }

    const node = compileJsxNode(child, diagnostics, `${path}.${id}.${children.length}`, source);
    if (node) children.push(node);
  }

  return {
    id,
    kind,
    props,
    children,
    animations,
    startMs: readTimeProp(props.start, 0),
    durationMs: props.duration == null ? null : readTimeProp(props.duration, 0)
  };
}

function resolveLiteralForId(value: ProgrammaticSpanExpression | undefined): ProgrammaticSpanLiteral | null {
  if (value && typeof value === 'object' && !Array.isArray(value) && 'kind' in value) return null;
  return value ?? null;
}

function getJsxElementName(name: BabelNode | null | undefined): string | null {
  if (!name) return null;
  if (name.type === 'JSXIdentifier') return name.name ?? null;
  if (name.type === 'JSXMemberExpression') {
    const objectName = getJsxElementName(name.object);
    const propertyName = getJsxElementName(name.property);
    return objectName && propertyName ? `${objectName}.${propertyName}` : null;
  }
  return null;
}

function readJsxProps(
  openingElement: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  source: string
): Record<string, ProgrammaticSpanExpression> {
  const props: Record<string, ProgrammaticSpanExpression> = {};
  for (const attr of openingElement.attributes ?? []) {
    if (attr.type === 'JSXSpreadAttribute') {
      diagnostics.push({
        severity: 'warning',
        message: 'Spread attributes are not supported in static programmatic spans.',
        path
      });
      continue;
    }
    if (attr.type !== 'JSXAttribute') continue;
    const name = attr.name?.name;
    if (!name) continue;
    if (!attr.value) {
      props[name] = true;
      continue;
    }
    if (name === 'render') {
      const value = jsxProceduralRenderValue(attr.value, diagnostics, `${path}.${name}`, source);
      if (value !== undefined) props[name] = value;
      continue;
    }
    const value = jsxAttributeValue(attr.value, diagnostics, `${path}.${name}`);
    if (value !== undefined) {
      props[name] = value;
    }
  }
  return props;
}

function jsxProceduralRenderValue(
  value: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  source: string
): ProgrammaticSpanExpression | undefined {
  if (value.type !== 'JSXExpressionContainer') {
    diagnostics.push({
      severity: 'warning',
      message: '`render` must be an arrow function expression.',
      path
    });
    return undefined;
  }
  const expression = value.expression;
  if (!expression || expression.type === 'JSXEmptyExpression') return undefined;
  if (expression.type !== 'ArrowFunctionExpression' && expression.type !== 'FunctionExpression') {
    diagnostics.push({
      severity: 'warning',
      message: '`render` must be an arrow function or function expression.',
      path
    });
    return undefined;
  }
  const param = expression.params?.[0]?.type === 'Identifier' && expression.params[0].name
    ? expression.params[0].name
    : 'api';
  const start = Number(expression.start);
  const end = Number(expression.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    diagnostics.push({
      severity: 'warning',
      message: 'Could not read procedural render source.',
      path
    });
    return undefined;
  }
  const program = compileProceduralRenderProgram(source.slice(start, end), param, diagnostics, path);
  return program
    ? {
        kind: 'procedural-render',
        source: program.source,
        param: program.param,
        settingRefs: program.settingRefs,
        tokenRefs: program.tokenRefs
      }
    : undefined;
}

function jsxAttributeValue(
  value: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string
): ProgrammaticSpanExpression | undefined {
  if (value.type === 'StringLiteral') return value.value ?? '';
  if (value.type === 'JSXExpressionContainer') {
    const expression = value.expression;
    if (expression?.type === 'JSXEmptyExpression') return undefined;
    const supportedExpression = expressionToProgrammaticExpression(expression);
    if (supportedExpression !== undefined) return supportedExpression;
  }
  diagnostics.push({
    severity: 'warning',
    message: 'Only literal JSX props, `vars.name`, `settings.name`, `tokens.name`, and supported color helpers are supported.',
    path
  });
  return undefined;
}

function compileAnimation(
  jsx: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  source: string
): ProgrammaticSpanAnimation | null {
  const props = readJsxProps(jsx.openingElement, diagnostics, path, source);
  const propValue = resolveLiteralForId(props.prop);
  if (typeof propValue !== 'string' || !propValue) {
    diagnostics.push({ severity: 'warning', message: '<Animate> needs a string `prop`.', path });
    return null;
  }
  const to = props.to;
  if (to === undefined) {
    diagnostics.push({ severity: 'warning', message: '<Animate> needs a `to` value.', path });
    return null;
  }
  const easeLiteral = resolveLiteralForId(props.ease);
  const ease = typeof easeLiteral === 'string' && VALID_EASINGS.has(easeLiteral as ProgrammaticSpanEasing)
    ? easeLiteral as ProgrammaticSpanEasing
    : 'linear';

  return {
    prop: propValue,
    from: props.from ?? null,
    to,
    startMs: readTimeProp(props.start, 0),
    durationMs: Math.max(1, readTimeProp(props.duration, 300)),
    ease
  };
}

function compileAnimationPreset(
  name: string,
  jsx: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  parentProps: Record<string, ProgrammaticSpanExpression>,
  source: string
): ProgrammaticSpanAnimation[] {
  const props = readJsxProps(jsx.openingElement, diagnostics, path, source);
  const startMs = readTimeProp(props.start, 0);
  const ease = readEaseProp(props.ease, 'outQuad');

  switch (name) {
    case 'Animation.FadeIn':
      return [
        animationRecord('opacity', props.from ?? 0, props.to ?? 1, startMs, readDurationProp(props.duration, 300), ease)
      ];
    case 'Animation.FadeOut':
      return [
        animationRecord('opacity', props.from ?? 1, props.to ?? 0, startMs, readDurationProp(props.duration, 300), ease)
      ];
    case 'Animation.Pulse':
      return compilePulseAnimationPreset(props, startMs, readDurationProp(props.duration, 420));
    case 'Animation.SettleIn':
      return compileSettleInAnimationPreset(props, parentProps, startMs, readDurationProp(props.duration, 620));
    case 'Animation.SwoopIn':
      return compileSwoopInAnimationPreset(props, parentProps, startMs, readDurationProp(props.duration, 720));
    case 'Animation.SwoopOut':
      return compileSwoopOutAnimationPreset(props, parentProps, startMs, readDurationProp(props.duration, 620));
    case 'Animation.Sequence':
      return compileSequenceAnimationPreset(props, diagnostics, path, startMs);
    default:
      diagnostics.push({
        severity: 'warning',
        message: `Ignoring unsupported animation preset <${name}>.`,
        path
      });
      return [];
  }
}

function compilePulseAnimationPreset(
  props: Record<string, ProgrammaticSpanExpression>,
  startMs: number,
  durationMs: number
): ProgrammaticSpanAnimation[] {
  const prop = stringLiteral(props.prop) ?? 'scale';
  const from = props.from ?? 1;
  const peak = props.peak ?? props.peakScale ?? 1.06;
  const to = props.to ?? 1;
  const upDuration = Math.max(1, Math.round(durationMs * numberLiteral(props.upPortion, 0.45)));
  return [
    animationRecord(prop, from, peak, startMs, upDuration, readEaseProp(props.easeIn, 'outCubic')),
    animationRecord(prop, peak, to, startMs + upDuration, Math.max(1, durationMs - upDuration), readEaseProp(props.easeOut, 'outQuad'))
  ];
}

function compileSettleInAnimationPreset(
  props: Record<string, ProgrammaticSpanExpression>,
  parentProps: Record<string, ProgrammaticSpanExpression>,
  startMs: number,
  durationMs: number
): ProgrammaticSpanAnimation[] {
  const settleStart = startMs + Math.max(1, Math.round(durationMs * 0.68));
  const settleDuration = Math.max(1, durationMs - (settleStart - startMs));
  const animations: ProgrammaticSpanAnimation[] = [
    animationRecord('opacity', props.opacityFrom ?? 0, props.opacityTo ?? 1, startMs, Math.max(1, Math.round(durationMs * 0.55)), 'outQuad'),
    animationRecord('scale', props.scaleFrom ?? 0.98, props.scaleOvershoot ?? 1.012, startMs, settleStart - startMs, 'outCubic'),
    animationRecord('scale', props.scaleOvershoot ?? 1.012, props.scaleTo ?? parentProps.scale ?? 1, settleStart, settleDuration, 'outQuad'),
    animationRecord('rotation', props.rotationFrom ?? -4, props.rotationOvershoot ?? 1.5, startMs, settleStart - startMs, 'outCubic'),
    animationRecord('rotation', props.rotationOvershoot ?? 1.5, parentProps.rotation ?? 0, settleStart, settleDuration, 'outQuad')
  ];

  const parentX = numberLiteral(parentProps.x, null);
  const dx = numberLiteral(props.dx, 28);
  if (parentX !== null && dx !== 0) {
    const overshootX = numberLiteral(props.overshootX, -Math.sign(dx) * Math.max(2, Math.abs(dx) * 0.16));
    animations.push(
      animationRecord('x', parentX + dx, parentX + overshootX, startMs, settleStart - startMs, 'outCubic'),
      animationRecord('x', parentX + overshootX, parentX, settleStart, settleDuration, 'outQuad')
    );
  }

  const parentY = numberLiteral(parentProps.y, null);
  const dy = numberLiteral(props.dy, 0);
  if (parentY !== null && dy !== 0) {
    const overshootY = numberLiteral(props.overshootY, -Math.sign(dy) * Math.max(2, Math.abs(dy) * 0.16));
    animations.push(
      animationRecord('y', parentY + dy, parentY + overshootY, startMs, settleStart - startMs, 'outCubic'),
      animationRecord('y', parentY + overshootY, parentY, settleStart, settleDuration, 'outQuad')
    );
  }

  return animations;
}

function compileSwoopInAnimationPreset(
  props: Record<string, ProgrammaticSpanExpression>,
  parentProps: Record<string, ProgrammaticSpanExpression>,
  startMs: number,
  durationMs: number
): ProgrammaticSpanAnimation[] {
  const settleStart = startMs + Math.max(1, Math.round(durationMs * numberLiteral(props.settlePortion, 0.72)));
  const settleDuration = Math.max(1, durationMs - (settleStart - startMs));
  const dx = numberLiteral(props.dx, 42);
  const dy = numberLiteral(props.dy, 24);
  const animations: ProgrammaticSpanAnimation[] = [
    animationRecord('opacity', props.opacityFrom ?? 0, props.opacityTo ?? parentProps.opacity ?? 1, startMs, Math.max(1, Math.round(durationMs * 0.58)), 'outQuad'),
    animationRecord('scale', props.scaleFrom ?? 0.985, props.scaleOvershoot ?? 1.012, startMs, settleStart - startMs, 'outCubic'),
    animationRecord('scale', props.scaleOvershoot ?? 1.012, props.scaleTo ?? parentProps.scale ?? 1, settleStart, settleDuration, 'outQuad'),
    animationRecord('rotation', props.rotationFrom ?? -3.6, props.rotationOvershoot ?? 1.2, startMs, settleStart - startMs, 'outCubic'),
    animationRecord('rotation', props.rotationOvershoot ?? 1.2, props.rotationTo ?? parentProps.rotation ?? 0, settleStart, settleDuration, 'outQuad')
  ];
  pushSwoopPositionAnimations(animations, parentProps, props, startMs, settleStart, settleDuration, dx, dy, 'in');
  return animations;
}

function compileSwoopOutAnimationPreset(
  props: Record<string, ProgrammaticSpanExpression>,
  parentProps: Record<string, ProgrammaticSpanExpression>,
  startMs: number,
  durationMs: number
): ProgrammaticSpanAnimation[] {
  const liftStart = startMs + Math.max(1, Math.round(durationMs * numberLiteral(props.liftPortion, 0.24)));
  const liftDuration = liftStart - startMs;
  const exitDuration = Math.max(1, durationMs - liftDuration);
  const dx = numberLiteral(props.dx, -42);
  const dy = numberLiteral(props.dy, 24);
  const animations: ProgrammaticSpanAnimation[] = [
    animationRecord('opacity', props.opacityFrom ?? parentProps.opacity ?? 1, props.opacityTo ?? 0, startMs + Math.max(1, Math.round(durationMs * 0.18)), Math.max(1, Math.round(durationMs * 0.7)), 'outQuad'),
    animationRecord('scale', props.scaleFrom ?? parentProps.scale ?? 1, props.scaleOvershoot ?? 1.012, startMs, liftDuration, 'outQuad'),
    animationRecord('scale', props.scaleOvershoot ?? 1.012, props.scaleTo ?? 0.985, liftStart, exitDuration, 'inOutCubic'),
    animationRecord('rotation', props.rotationFrom ?? parentProps.rotation ?? 0, props.rotationOvershoot ?? 1.2, startMs, liftDuration, 'outQuad'),
    animationRecord('rotation', props.rotationOvershoot ?? 1.2, props.rotationTo ?? -3.6, liftStart, exitDuration, 'inOutCubic')
  ];
  pushSwoopPositionAnimations(animations, parentProps, props, startMs, liftStart, exitDuration, dx, dy, 'out');
  return animations;
}

function pushSwoopPositionAnimations(
  animations: ProgrammaticSpanAnimation[],
  parentProps: Record<string, ProgrammaticSpanExpression>,
  props: Record<string, ProgrammaticSpanExpression>,
  startMs: number,
  pivotMs: number,
  settleOrExitDuration: number,
  dx: number,
  dy: number,
  direction: 'in' | 'out'
): void {
  const parentX = numberLiteral(parentProps.x, null);
  const parentY = numberLiteral(parentProps.y, null);
  if (parentX !== null && dx !== 0) {
    const overshootX = numberLiteral(props.overshootX, -Math.sign(dx) * Math.max(2, Math.abs(dx) * 0.16));
    if (direction === 'in') {
      animations.push(
        animationRecord('x', parentX + dx, parentX + overshootX, startMs, pivotMs - startMs, 'outCubic'),
        animationRecord('x', parentX + overshootX, parentX, pivotMs, settleOrExitDuration, 'outQuad')
      );
    } else {
      animations.push(
        animationRecord('x', parentX, parentX + overshootX, startMs, pivotMs - startMs, 'outQuad'),
        animationRecord('x', parentX + overshootX, parentX + dx, pivotMs, settleOrExitDuration, 'inOutCubic')
      );
    }
  }
  if (parentY !== null && dy !== 0) {
    const overshootY = numberLiteral(props.overshootY, -Math.sign(dy) * Math.max(2, Math.abs(dy) * 0.16));
    if (direction === 'in') {
      animations.push(
        animationRecord('y', parentY + dy, parentY + overshootY, startMs, pivotMs - startMs, 'outCubic'),
        animationRecord('y', parentY + overshootY, parentY, pivotMs, settleOrExitDuration, 'outQuad')
      );
    } else {
      animations.push(
        animationRecord('y', parentY, parentY + overshootY, startMs, pivotMs - startMs, 'outQuad'),
        animationRecord('y', parentY + overshootY, parentY + dy, pivotMs, settleOrExitDuration, 'inOutCubic')
      );
    }
  }
}

function compileTextEffectPreset(
  name: string,
  jsx: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  parentKind: ProgrammaticSpanNodeKind,
  parentProps: Record<string, ProgrammaticSpanExpression>,
  source: string
): CompiledTextEffectPreset | null {
  const props = readJsxProps(jsx.openingElement, diagnostics, path, source);
  if (parentKind !== 'text') {
    diagnostics.push({
      severity: 'warning',
      message: `<${name}> only applies inside <Text>.`,
      path
    });
    return null;
  }

  switch (name) {
    case 'TextEffect.Count':
    case 'TextEffect.CountUp':
    case 'TextEffect.GrowingNumber':
    case 'TextEffect.Number': {
      const parentText = parseNumberTextParts(stringLiteral(parentProps.text));
      const step = props.step ?? defaultNumberStep(props.decimals, parentText?.decimals ?? 0);
      const decimals = props.decimals ?? decimalsFromStepExpression(step, parentText?.decimals ?? 0);
      return {
        props: {
          textNumberMode: 'count',
          textNumberPrefix: props.prefix ?? parentText?.prefix ?? '',
          textNumberSuffix: props.suffix ?? parentText?.suffix ?? '',
          textNumberDecimals: decimals,
          textNumberStep: step,
          textNumberTrimTrailingZeros: props.trimTrailingZeros ?? false
        },
        animations: [
          animationRecord(
            'textNumberValue',
            props.from ?? 0,
            props.to ?? parentText?.value ?? 0,
            readTimeProp(props.start, 0),
            readDurationProp(props.duration, 700),
            readEaseProp(props.ease, 'outCubic')
          )
        ]
      };
    }
    case 'TextEffect.Reveal': {
      const style = stringLiteral(props.style) ?? 'fade';
      return compileRevealTextEffectPreset(props, parentProps, {
        name,
        style,
        unit: stringLiteral(props.unit) ?? stringLiteral(props.by) ?? 'characters',
        direction: stringLiteral(props.direction) ?? 'left',
        defaultEase: style === 'typewriter' || style === 'wipe' ? 'linear' : 'outCubic'
      });
    }
    case 'TextEffect.Typewriter':
      return compileRevealTextEffectPreset(props, parentProps, {
        name,
        style: 'typewriter',
        unit: stringLiteral(props.unit) ?? stringLiteral(props.by) ?? 'characters',
        direction: 'left',
        defaultEase: 'linear'
      });
    case 'TextEffect.WordReveal': {
      const style = stringLiteral(props.style) ?? 'fade';
      return compileRevealTextEffectPreset(props, parentProps, {
        name,
        style,
        unit: 'words',
        direction: stringLiteral(props.direction) ?? 'left',
        defaultEase: style === 'typewriter' || style === 'wipe' ? 'linear' : 'outCubic',
        defaultStagger: 80
      });
    }
    case 'TextEffect.LetterFlyIn':
      return compileRevealTextEffectPreset(props, parentProps, {
        name,
        style: 'fly',
        unit: 'characters',
        direction: stringLiteral(props.direction) ?? 'bottom',
        defaultEase: 'outCubic',
        defaultDistance: 28,
        defaultScaleFrom: 1.18,
        defaultStagger: 28
      });
    case 'TextEffect.WordDrop':
      return compileRevealTextEffectPreset(props, parentProps, {
        name,
        style: 'drop',
        unit: 'words',
        direction: stringLiteral(props.direction) ?? 'top',
        defaultEase: 'outCubic',
        defaultDistance: 34,
        defaultStagger: 80
      });
    case 'TextEffect.Wipe':
      return compileRevealTextEffectPreset(props, parentProps, {
        name,
        style: 'wipe',
        unit: stringLiteral(props.unit) ?? stringLiteral(props.by) ?? 'characters',
        direction: stringLiteral(props.direction) ?? 'left',
        defaultEase: 'linear'
      });
    default:
      diagnostics.push({
        severity: 'warning',
        message: `Ignoring unsupported text effect <${name}>.`,
        path
      });
      return null;
  }
}

function isRenderEffectPresetName(name: string | null | undefined): name is string {
  return !!name && (
    name.startsWith('RenderEffect.') ||
    name.startsWith('VisualEffect.') ||
    name === 'Effect.Blur' ||
    name === 'Effect.Shadow' ||
    name === 'Effect.Glow' ||
    name === 'Effect.TiltShift'
  );
}

function compileRenderEffectPreset(
  name: string,
  jsx: BabelNode,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  source: string
): CompiledRenderEffectPreset | null {
  const props = readJsxProps(jsx.openingElement, diagnostics, path, source);
  const shortName = name.split('.').pop() ?? name;
  switch (shortName) {
    case 'Blur':
      return {
        props: {
          blur: props.amount ?? props.blur ?? props.px ?? 8
        }
      };
    case 'Shadow':
      return {
        props: {
          shadowBlur: props.blur ?? props.shadowBlur ?? 18,
          shadowOffsetX: props.x ?? props.offsetX ?? props.shadowOffsetX ?? 0,
          shadowOffsetY: props.y ?? props.offsetY ?? props.shadowOffsetY ?? 12,
          shadowColor: props.color ?? props.shadowColor ?? '#020617',
          shadowOpacity: props.opacity ?? props.shadowOpacity ?? 32
        }
      };
    case 'Glow':
      return {
        props: {
          shadowBlur: props.blur ?? props.glowBlur ?? 26,
          shadowOffsetX: props.x ?? props.offsetX ?? 0,
          shadowOffsetY: props.y ?? props.offsetY ?? 0,
          shadowColor: props.color ?? props.glowColor ?? '#67e8f9',
          shadowOpacity: props.opacity ?? props.glowOpacity ?? 62
        }
      };
    case 'TiltShift':
      return {
        props: {
          tiltShiftBlur: props.blur ?? props.amount ?? props.tiltShiftBlur ?? 12,
          tiltShiftCenter: props.center ?? props.tiltShiftCenter ?? 50,
          tiltShiftFocus: props.focus ?? props.tiltShiftFocus ?? 34,
          tiltShiftFeather: props.feather ?? props.tiltShiftFeather ?? 24
        }
      };
    default:
      diagnostics.push({
        severity: 'warning',
        message: `Ignoring unsupported render effect <${name}>.`,
        path
      });
      return null;
  }
}

function compileRevealTextEffectPreset(
  props: Record<string, ProgrammaticSpanExpression>,
  parentProps: Record<string, ProgrammaticSpanExpression>,
  defaults: {
    name: string;
    style: string;
    unit: string;
    direction: string;
    defaultEase: ProgrammaticSpanEasing;
    defaultDistance?: number;
    defaultScaleFrom?: number;
    defaultStagger?: number;
  }
): CompiledTextEffectPreset {
  const parentText = stringLiteral(parentProps.text);
  const defaultDuration = parentText ? Math.max(320, Array.from(parentText).length * 48) : 900;
  const durationMs = readDurationProp(props.duration, defaultDuration);
  return {
    props: {
      textRevealMode: 'reveal',
      textRevealStyle: props.style ?? defaults.style,
      textRevealUnit: props.unit ?? props.by ?? defaults.unit,
      textRevealDirection: props.direction ?? defaults.direction,
      textRevealStableWrap: props.stableWrap ?? 'final',
      textRevealCursor: props.cursor ?? false,
      textRevealCursorChar: props.cursorChar ?? '|',
      textRevealDistance: props.distance ?? defaults.defaultDistance ?? 24,
      textRevealScaleFrom: props.scaleFrom ?? defaults.defaultScaleFrom ?? 1,
      textRevealOpacityFrom: props.opacityFrom ?? (defaults.style === 'typewriter' || defaults.style === 'wipe' ? 1 : 0),
      textRevealStaggerMs: props.stagger ?? defaults.defaultStagger ?? 0,
      textRevealDurationMs: durationMs
    },
    animations: [
      animationRecord(
        'textRevealProgress',
        props.from ?? 0,
        props.to ?? 1,
        readTimeProp(props.start, 0),
        durationMs,
        readEaseProp(props.ease, defaults.defaultEase)
      )
    ]
  };
}

function compileSequenceAnimationPreset(
  props: Record<string, ProgrammaticSpanExpression>,
  diagnostics: ProgrammaticSpanDiagnostic[],
  path: string,
  startMs: number
): ProgrammaticSpanAnimation[] {
  const frames = literalRecordArray(props.frames);
  if (frames.length < 2) {
    diagnostics.push({
      severity: 'warning',
      message: '<Animation.Sequence> needs a literal `frames` array with at least two frames.',
      path
    });
    return [];
  }

  const sortedFrames = frames
    .map((frame) => ({ frame, at: readTimeProp(frame.at, Number.NaN) }))
    .filter((entry) => Number.isFinite(entry.at))
    .sort((left, right) => left.at - right.at);
  if (sortedFrames.length < 2) {
    diagnostics.push({
      severity: 'warning',
      message: '<Animation.Sequence> frames need finite `at` times.',
      path
    });
    return [];
  }

  const animations: ProgrammaticSpanAnimation[] = [];
  const lastByProp = new Map<string, { at: number; value: ProgrammaticSpanExpression }>();
  for (const { frame, at } of sortedFrames) {
    const ease = readEaseProp(frame.ease, 'linear');
    for (const [prop, value] of Object.entries(frame)) {
      if (prop === 'at' || prop === 'ease') continue;
      const previous = lastByProp.get(prop);
      if (previous && at > previous.at) {
        animations.push(animationRecord(prop, previous.value, value, startMs + previous.at, Math.max(1, at - previous.at), ease));
      }
      lastByProp.set(prop, { at, value });
    }
  }

  return animations;
}

function animationRecord(
  prop: string,
  from: ProgrammaticSpanExpression,
  to: ProgrammaticSpanExpression,
  startMs: number,
  durationMs: number,
  ease: ProgrammaticSpanEasing
): ProgrammaticSpanAnimation {
  return { prop, from, to, startMs, durationMs: Math.max(1, durationMs), ease };
}

function readEaseProp(
  value: ProgrammaticSpanExpression | undefined,
  fallback: ProgrammaticSpanEasing
): ProgrammaticSpanEasing {
  const literal = resolveLiteralForId(value);
  return typeof literal === 'string' && VALID_EASINGS.has(literal as ProgrammaticSpanEasing)
    ? literal as ProgrammaticSpanEasing
    : fallback;
}

function readDurationProp(value: ProgrammaticSpanExpression | undefined, fallback: number): number {
  return Math.max(1, readTimeProp(value, fallback));
}

function readTimeProp(value: ProgrammaticSpanExpression | undefined, fallback: number): number {
  if (value == null) return fallback;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  const msMatch = /^(-?\d+(?:\.\d+)?)ms$/.exec(trimmed);
  if (msMatch) return Number(msMatch[1]);
  const secMatch = /^(-?\d+(?:\.\d+)?)s$/.exec(trimmed);
  if (secMatch) return Number(secMatch[1]) * 1000;
  const bare = Number(trimmed);
  return Number.isFinite(bare) ? bare : fallback;
}

function stringLiteral(value: ProgrammaticSpanExpression | undefined): string | null {
  const literal = resolveLiteralForId(value);
  return typeof literal === 'string' ? literal : null;
}

function numberLiteral(value: ProgrammaticSpanExpression | undefined, fallback: number): number;
function numberLiteral(value: ProgrammaticSpanExpression | undefined, fallback: null): number | null;
function numberLiteral(
  value: ProgrammaticSpanExpression | undefined,
  fallback: number | null
): number | null {
  const literal = resolveLiteralForId(value);
  return typeof literal === 'number' && Number.isFinite(literal) ? literal : fallback;
}

function parseNumberTextParts(text: string | null): {
  value: number;
  prefix: string;
  suffix: string;
  decimals: number;
} | null {
  if (!text) return null;
  const match = /(-?\d+(?:\.\d+)?)/.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return null;
  const decimalPart = match[1].split('.')[1] ?? '';
  return {
    value,
    prefix: text.slice(0, match.index),
    suffix: text.slice(match.index + match[1].length),
    decimals: decimalPart.length
  };
}

function defaultNumberStep(
  decimalsExpression: ProgrammaticSpanExpression | undefined,
  fallbackDecimals: number
): number {
  const decimals = numberLiteral(decimalsExpression, fallbackDecimals);
  return 1 / Math.pow(10, Math.max(0, decimals));
}

function decimalsFromStepExpression(
  step: ProgrammaticSpanExpression | undefined,
  fallback: number
): number {
  const literal = resolveLiteralForId(step);
  if (typeof literal === 'string') {
    if (literal === 'integer') return 0;
    if (literal === 'decimal') return 1;
    if (literal === 'hundredth') return 2;
  }
  if (typeof literal !== 'number' || !Number.isFinite(literal) || literal <= 0) return fallback;
  const normalized = literal.toString().toLowerCase();
  if (!normalized.includes('.') && !normalized.includes('e-')) return 0;
  if (normalized.includes('e-')) {
    const exponent = Number(normalized.split('e-')[1]);
    return Number.isFinite(exponent) ? Math.max(0, exponent) : fallback;
  }
  return Math.max(0, normalized.split('.')[1]?.length ?? 0);
}

function literalRecordArray(value: ProgrammaticSpanExpression | undefined): Record<string, ProgrammaticSpanLiteral>[] {
  const literal = resolveLiteralForId(value);
  if (!Array.isArray(literal)) return [];
  return literal.filter((entry): entry is Record<string, ProgrammaticSpanLiteral> =>
    !!entry && typeof entry === 'object' && !Array.isArray(entry)
  );
}

function expressionToReference(expression: BabelNode | null | undefined): ProgrammaticSpanExpression | null {
  const path = memberExpressionPath(expression);
  if (path.length === 2 && path[0] === 'vars') {
    return { kind: 'variable-ref', name: path[1] };
  }
  if (path.length >= 2 && path[0] === 'settings') {
    return { kind: 'setting-ref', name: path[1], path: path.slice(2) };
  }
  if (path.length >= 2 && path[0] === 'tokens') {
    return { kind: 'token-ref', name: path[1], path: path.slice(2) };
  }
  return null;
}

function expressionToProgrammaticExpression(
  expression: BabelNode | null | undefined
): ProgrammaticSpanExpression | undefined {
  const reference = expressionToReference(expression);
  if (reference) return reference;
  const call = expressionToSupportedCall(expression);
  if (call) return call;
  return expressionToLiteral(expression);
}

function expressionToSupportedCall(expression: BabelNode | null | undefined): ProgrammaticSpanExpression | null {
  if (!expression || expression.type !== 'CallExpression') return null;
  const callee = memberExpressionPath(expression.callee).join('.');
  if (!SUPPORTED_EXPRESSION_CALLS.has(callee)) return null;
  const args: ProgrammaticSpanExpression[] = [];
  for (const arg of expression.arguments ?? []) {
    const value = expressionToProgrammaticExpression(arg);
    if (value === undefined) return null;
    args.push(value);
  }
  return { kind: 'call', callee, args };
}

function memberExpressionPath(expression: BabelNode | null | undefined): string[] {
  if (!expression) return [];
  if (expression.type === 'Identifier') return expression.name ? [expression.name] : [];
  if (expression.type !== 'MemberExpression') return [];
  const objectPath = memberExpressionPath(expression.object);
  const propertyName = memberPropertyName(expression.property);
  return objectPath.length > 0 && propertyName ? [...objectPath, propertyName] : [];
}

function memberPropertyName(property: BabelNode | null | undefined): string | null {
  if (!property) return null;
  if (property.type === 'Identifier') return property.name ?? null;
  if (property.type === 'StringLiteral') return property.value ?? null;
  return null;
}

function expressionToLiteral(expression: BabelNode | null | undefined): ProgrammaticSpanLiteral | undefined {
  if (!expression) return undefined;
  switch (expression.type) {
    case 'StringLiteral':
      return expression.value ?? '';
    case 'NumericLiteral':
      return Number(expression.value);
    case 'BooleanLiteral':
      return Boolean(expression.value);
    case 'NullLiteral':
      return null;
    case 'UnaryExpression': {
      const argument = expressionToLiteral(expression.argument);
      if (typeof argument === 'number' && expression.operator === '-') return -argument;
      return undefined;
    }
    case 'ArrayExpression':
      return (expression.elements ?? []).map((element: BabelNode | null) => expressionToLiteral(element) ?? null);
    case 'ObjectExpression':
      return objectExpressionToRecord(expression);
    case 'CallExpression':
      return callExpressionToLiteral(expression);
    default:
      return undefined;
  }
}

function callExpressionToLiteral(expression: BabelNode): ProgrammaticSpanLiteral | undefined {
  const calleeName = getIdentifierName(expression.callee);
  if (calleeName !== 'asset' && calleeName !== 'media') return undefined;
  const firstArg = expression.arguments?.[0];
  if (!firstArg) return undefined;
  return expressionToLiteral(firstArg);
}

function objectExpressionToRecord(node: BabelNode): Record<string, ProgrammaticSpanLiteral> {
  const out: Record<string, ProgrammaticSpanLiteral> = {};
  for (const prop of objectProperties(node)) {
    if (prop.type !== 'ObjectProperty') continue;
    const key = propertyKeyName(prop);
    if (!key) continue;
    const value = expressionToLiteral(prop.value);
    if (value !== undefined) out[key] = value;
  }
  return out;
}
