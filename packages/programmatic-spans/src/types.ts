import type { Visual } from '@usemont/scene-model';

export type ProgrammaticSpanNodeKind =
  | 'scene'
  | 'group'
  | 'rect'
  | 'circle'
  | 'ellipse'
  | 'triangle'
  | 'arc'
  | 'diamond'
  | 'star'
  | 'calloutBox'
  | 'line'
  | 'arrow'
  | 'turnArrow'
  | 'text'
  | 'image'
  | 'lottie'
  | 'model3d'
  | 'cursor'
  | 'click-pulse'
  | 'cursor-click'
  | 'motion-box'
  | 'browser-window'
  | 'traffic-lights'
  | 'cta-button'
  | 'data-chart'
  | 'flowchart'
  | 'decision-tree'
  | 'v-stack'
  | 'h-stack'
  | 'bento'
  | 'cell'
  | 'procedural-visual'
  | 'effect';

export type ProgrammaticSpanVariableType = 'string' | 'number' | 'color' | 'boolean';
export type ProgrammaticSpanSettingType = ProgrammaticSpanVariableType | 'point' | 'rect' | 'select';

export type ProgrammaticSpanLiteral =
  | string
  | number
  | boolean
  | null
  | ProgrammaticSpanLiteral[]
  | { [key: string]: ProgrammaticSpanLiteral };

export type ProgrammaticSpanExpression =
  | ProgrammaticSpanLiteral
  | { kind: 'variable-ref'; name: string }
  | { kind: 'setting-ref'; name: string; path: string[] }
  | { kind: 'token-ref'; name: string; path: string[] }
  | { kind: 'call'; callee: string; args: ProgrammaticSpanExpression[] }
  | {
      kind: 'procedural-render';
      source: string;
      param: string;
      settingRefs: string[];
      tokenRefs: string[];
    };

export interface ProgrammaticSpanVariable {
  id: string;
  type: ProgrammaticSpanVariableType;
  default: ProgrammaticSpanLiteral;
  label?: string;
}

export interface ProgrammaticSpanSetting {
  id: string;
  type: ProgrammaticSpanSettingType;
  default: ProgrammaticSpanLiteral;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  overlay?: 'frame' | 'point' | 'offset' | 'value';
  overlayGroup?: string;
  overlayOrder?: number;
  overlayOriginVisualId?: string;
  visualId?: string;
}

export interface ProgrammaticSpanToken {
  id: string;
  value: ProgrammaticSpanExpression;
}

export interface ProgrammaticSpanAnimation {
  prop: string;
  from: ProgrammaticSpanExpression | null;
  to: ProgrammaticSpanExpression;
  startMs: number;
  durationMs: number;
  ease: ProgrammaticSpanEasing;
}

export type ProgrammaticSpanEasing =
  | 'linear'
  | 'inQuad'
  | 'outQuad'
  | 'inOutQuad'
  | 'outCubic'
  | 'inOutCubic';

export interface ProgrammaticSpanNode {
  id: string;
  kind: ProgrammaticSpanNodeKind;
  props: Record<string, ProgrammaticSpanExpression>;
  children: ProgrammaticSpanNode[];
  animations: ProgrammaticSpanAnimation[];
  startMs: number;
  durationMs: number | null;
}

export interface ProgrammaticSpanSpec {
  schemaVersion: 1;
  id: string;
  width: number;
  height: number;
  durationMs: number;
  editModeTimeMs: number;
  variables: ProgrammaticSpanVariable[];
  settings: ProgrammaticSpanSetting[];
  tokens: ProgrammaticSpanToken[];
  root: ProgrammaticSpanNode;
}

export type ProgrammaticSpanEffectKind = 'camera';

export interface ProgrammaticSpanCameraEffect {
  id: string;
  kind: ProgrammaticSpanEffectKind;
  centerX: number;
  centerY: number;
  zoom: number;
  rotationDeg: number;
  blurPx: number;
  opacity: number;
}

export type ProgrammaticSpanEffect = ProgrammaticSpanCameraEffect;

export type ProgrammaticSpanDiagnosticSeverity = 'error' | 'warning' | 'info';

export interface ProgrammaticSpanDiagnostic {
  severity: ProgrammaticSpanDiagnosticSeverity;
  message: string;
  path?: string;
}

export interface ProgrammaticSpanCompileResult {
  spec: ProgrammaticSpanSpec | null;
  diagnostics: ProgrammaticSpanDiagnostic[];
}

export interface ProgrammaticSpanFrame {
  visuals: Visual[];
  effects: ProgrammaticSpanEffect[];
  diagnostics: ProgrammaticSpanDiagnostic[];
}

export type ProgrammaticSpanVariables = Record<string, ProgrammaticSpanLiteral>;
export type ProgrammaticSpanSettings = Record<string, ProgrammaticSpanLiteral>;
export type ProgrammaticSpanTokens = Record<string, ProgrammaticSpanLiteral>;
