import { DEFAULT_PROGRAMMATIC_SPAN_DESIGN_SYSTEM, getProgrammaticSpanDesignSystem } from './designSystems.js';
import { PROGRAMMATIC_SPAN_PRESETS } from './presets.js';
import type { ProgrammaticSpanDesignSystem, ProgrammaticSpanDesignSystemId } from './designSystems.js';
import type { ProgrammaticSpanDiagnostic } from './types.js';

export type ProgrammaticSpanSceneBriefId = string;
export type ProgrammaticSpanSceneBriefSegmentType = 'b-roll' | 'talking-head';
export type ProgrammaticSpanSceneBriefLayoutType =
  | 'split-progress'
  | 'design-system-diagram'
  | 'edit-zoom';

export interface ProgrammaticSpanSceneBriefText {
  headline: string;
  body?: string;
  callout?: string;
  leftTitle?: string;
  rightTitle?: string;
  labels?: string[];
}

export interface ProgrammaticSpanSceneBriefMotion {
  style: string;
  beats: string[];
  emphasisTarget?: string;
  camera?: string;
}

export interface ProgrammaticSpanSceneBrief {
  schemaVersion: 1;
  id: ProgrammaticSpanSceneBriefId;
  title: string;
  segmentType: ProgrammaticSpanSceneBriefSegmentType;
  sourceText: string;
  durationMs: number;
  designSystemId: ProgrammaticSpanDesignSystemId;
  narrativeGoal: string;
  visualMetaphor: string;
  layout: {
    type: ProgrammaticSpanSceneBriefLayoutType;
    description: string;
  };
  onscreenText: ProgrammaticSpanSceneBriefText;
  motion: ProgrammaticSpanSceneBriefMotion;
  presetTags: string[];
  notes?: string[];
}

export interface ProgrammaticSpanSceneBriefValidationResult {
  diagnostics: ProgrammaticSpanDiagnostic[];
}

const SUPPORTED_PRESET_TAGS = new Set(PROGRAMMATIC_SPAN_PRESETS.map((preset) => preset.jsxTag));

export const TRANSCRIPT_INSPIRED_SCENE_BRIEFS: ProgrammaticSpanSceneBrief[] = [
  {
    schemaVersion: 1,
    id: 'split-generation-progress',
    title: 'Split Generation Progress',
    segmentType: 'b-roll',
    sourceText: 'Split view: prompts queue on the left, generation progress and preview on the right.',
    durationMs: 6800,
    designSystemId: DEFAULT_PROGRAMMATIC_SPAN_DESIGN_SYSTEM.id,
    narrativeGoal: 'Show the production pipeline turning script moments into a queue of b-roll generations.',
    visualMetaphor: 'A calm command center where prompts become rendered scenes.',
    layout: {
      type: 'split-progress',
      description: 'Browser window with prompt list on the left and video generation progress on the right.'
    },
    onscreenText: {
      headline: 'Script moments become b-roll scenes',
      body: 'Queue scene briefs while recording, editing, or preparing voiceover.',
      callout: '7 scenes queued',
      leftTitle: 'Brief queue',
      rightTitle: 'Render progress',
      labels: ['Design system', 'Scene brief JSON', 'Static TSX']
    },
    motion: {
      style: 'calm staggered reveal with a late accent zoom',
      beats: ['window enters', 'brief list staggers', 'progress chart fills', 'accent card zooms'],
      emphasisTarget: 'accent progress card',
      camera: 'subtle push-in during the final third'
    },
    presetTags: ['BrowserWindow', 'CTAButton', 'DataChart']
  },
  {
    schemaVersion: 1,
    id: 'design-system-consistency',
    title: 'Design System Consistency',
    segmentType: 'b-roll',
    sourceText: 'Design systems make repeated b-roll scenes feel consistent and personal.',
    durationMs: 6200,
    designSystemId: DEFAULT_PROGRAMMATIC_SPAN_DESIGN_SYSTEM.id,
    narrativeGoal: 'Explain why a design system comes before one-off generated graphics.',
    visualMetaphor: 'A decision diagram that routes every generated scene through brand tokens.',
    layout: {
      type: 'design-system-diagram',
      description: 'Flowchart showing design system as the control point for all generated b-roll.'
    },
    onscreenText: {
      headline: 'Does it match the channel?',
      body: 'Consistency beats one-off novelty for expensive products.',
      callout: 'Reusable visual identity',
      leftTitle: 'Use tokens',
      rightTitle: 'Avoid random style'
    },
    motion: {
      style: 'diagram cards draw in sequence',
      beats: ['root question appears', 'branches draw', 'final identity card lands'],
      emphasisTarget: 'final identity card',
      camera: 'none'
    },
    presetTags: ['Flowchart', 'DecisionTree']
  },
  {
    schemaVersion: 1,
    id: 'dramatic-zoom-edit',
    title: 'Dramatic Zoom Edit',
    segmentType: 'b-roll',
    sourceText: 'Select a time range and ask the agent for a dramatic zoom on a specific card.',
    durationMs: 5600,
    designSystemId: DEFAULT_PROGRAMMATIC_SPAN_DESIGN_SYSTEM.id,
    narrativeGoal: 'Show the iterative edit loop after the first generated scene is close but needs emphasis.',
    visualMetaphor: 'A selected timeline range locks onto an accent card and pushes in.',
    layout: {
      type: 'edit-zoom',
      description: 'Editor-like card with selected range and accent target for a dramatic zoom instruction.'
    },
    onscreenText: {
      headline: 'Patch the best moment',
      body: 'Select the range, name the target, and let the agent update the scene.',
      callout: 'dramatic zoom',
      labels: ['0:04.2', '0:05.1', 'pink card']
    },
    motion: {
      style: 'late zoom with highlighted selection range',
      beats: ['editor frame enters', 'selection range appears', 'target card zooms'],
      emphasisTarget: 'pink card',
      camera: 'dramatic zoom on the selected target'
    },
    presetTags: ['BrowserWindow', 'CTAButton']
  }
];

export function getTranscriptInspiredSceneBrief(
  id: ProgrammaticSpanSceneBriefId
): ProgrammaticSpanSceneBrief {
  return TRANSCRIPT_INSPIRED_SCENE_BRIEFS.find((brief) => brief.id === id) ?? TRANSCRIPT_INSPIRED_SCENE_BRIEFS[0];
}

export function validateProgrammaticSpanSceneBrief(
  brief: ProgrammaticSpanSceneBrief
): ProgrammaticSpanSceneBriefValidationResult {
  const diagnostics: ProgrammaticSpanDiagnostic[] = [];

  if (brief.schemaVersion !== 1) {
    diagnostics.push({ severity: 'error', message: 'Scene brief schemaVersion must be 1.', path: 'schemaVersion' });
  }
  if (!brief.id.trim()) {
    diagnostics.push({ severity: 'error', message: 'Scene brief needs an id.', path: 'id' });
  }
  if (!brief.narrativeGoal.trim()) {
    diagnostics.push({ severity: 'error', message: 'Scene brief needs a narrative goal.', path: 'narrativeGoal' });
  }
  if (!brief.onscreenText.headline.trim()) {
    diagnostics.push({ severity: 'error', message: 'Scene brief needs headline text.', path: 'onscreenText.headline' });
  }
  if (!Number.isFinite(brief.durationMs) || brief.durationMs < 1000) {
    diagnostics.push({ severity: 'error', message: 'Scene brief duration must be at least 1000ms.', path: 'durationMs' });
  }
  if (getProgrammaticSpanDesignSystem(brief.designSystemId).id !== brief.designSystemId) {
    diagnostics.push({ severity: 'warning', message: 'Unknown design system id; default will be used.', path: 'designSystemId' });
  }

  for (const tag of brief.presetTags) {
    if (!SUPPORTED_PRESET_TAGS.has(tag)) {
      diagnostics.push({ severity: 'error', message: `Unsupported preset tag "${tag}".`, path: 'presetTags' });
    }
  }

  return { diagnostics };
}

export function createProgrammaticSpanSceneSourceFromBrief(
  brief: ProgrammaticSpanSceneBrief,
  designSystem: ProgrammaticSpanDesignSystem = getProgrammaticSpanDesignSystem(brief.designSystemId)
): string {
  switch (brief.layout.type) {
    case 'design-system-diagram':
      return createDiagramSceneSource(brief, designSystem);
    case 'edit-zoom':
      return createEditZoomSceneSource(brief, designSystem);
    case 'split-progress':
    default:
      return createSplitProgressSceneSource(brief, designSystem);
  }
}

function createSplitProgressSceneSource(
  brief: ProgrammaticSpanSceneBrief,
  designSystem: ProgrammaticSpanDesignSystem
): string {
  const palette = designSystem.palette;
  const typography = designSystem.typography;
  const surfaces = designSystem.surfaces;
  const motion = designSystem.motion;
  const labels = brief.onscreenText.labels ?? ['Design system', 'Scene brief JSON', 'Static TSX'];

  return `export default defineSpanScene({
  id: ${literal(brief.id)},
  width: 1280,
  height: 720,
  durationMs: ${safeDuration(brief.durationMs)},
  variables: {
    headline: stringVar(${literal(brief.onscreenText.headline)}),
    body: stringVar(${literal(brief.onscreenText.body ?? brief.narrativeGoal)}),
    callout: stringVar(${literal(brief.onscreenText.callout ?? 'Queued')}),
    accent: colorVar(${literal(palette.accent)})
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill=${literal(palette.background)} layer={0} />
        <Rect id="accent-glow" x={894} y={118} width={286} height={286} radius={143} fill=${literal(palette.accentSecondary)} opacity={0.34} layer={1}>
          <Animate prop="scale" from={0.88} to={1.04} start="3400ms" duration="1200ms" ease="inOutCubic" />
        </Rect>
        <BrowserWindow id="pipeline-window" x={104} y={82} width={1072} height={556} headerHeight={${surfaces.chromeHeaderHeight}} radius={${surfaces.radiusLg}} fill=${literal(palette.surface)} headerFill=${literal('#e2e8f0')} stroke=${literal(palette.border)} strokeWidth={${surfaces.borderWidth}} layer={2}>
          <Animate prop="opacity" from={0} to={1} start="0ms" duration="${motion.enterMs}ms" ease="${motion.secondaryEase}" />
          <Animate prop="y" from={118} to={82} start="0ms" duration="${motion.enterMs}ms" ease="${motion.primaryEase}" />
          <Bento id="pipeline-layout" x={48} y={92} width={976} height={406} columns={12} rows={6} gap={20}>
            <Cell id="copy-cell" col={1} row={1} colSpan={8} rowSpan={3} mode="position">
              <VStack id="copy-stack" x={0} y={0} width="100%" height={146} gap={10}>
                <Text id="headline" text={vars.headline} width="100%" height={72} size={${typography.heroSize}} weight=${literal(typography.heroWeight)} color=${literal('#0f172a')} layer={4}>
                  <Animate prop="opacity" from={0} to={1} start="360ms" duration="360ms" ease="outQuad" />
                </Text>
                <Text id="body" text={vars.body} width="88%" height={64} size={${typography.bodySize}} weight=${literal(typography.bodyWeight)} color=${literal('#475569')} layer={4} />
              </VStack>
            </Cell>
            <Cell id="queue-cell" col={1} row={4} colSpan={5} rowSpan={3} mode="position">
              <Rect id="queue-card" x={0} y={0} width="100%" height="100%" radius={${surfaces.radiusMd}} fill=${literal(palette.surfaceAlt)} stroke=${literal(palette.border)} strokeWidth={${surfaces.borderWidth}} layer={4}>
                <Animate prop="opacity" from={0} to={1} start="820ms" duration="300ms" ease="outQuad" />
              </Rect>
              <VStack id="queue-stack" x={32} y={30} width={280} height={138} gap={10}>
                <Text id="queue-title" text=${literal(brief.onscreenText.leftTitle ?? 'Brief queue')} width={220} height={34} size={${typography.labelSize + 2}} weight=${literal(typography.labelWeight)} color=${literal('#0f172a')} layer={5} />
                <Text id="queue-line-1" text=${literal(labels[0] ?? 'Design system')} width={260} height={28} size={${typography.labelSize}} color=${literal('#334155')} layer={5} />
                <Text id="queue-line-2" text=${literal(labels[1] ?? 'Scene brief JSON')} width={280} height={28} size={${typography.labelSize}} color=${literal('#334155')} layer={5} />
                <Text id="queue-line-3" text=${literal(labels[2] ?? 'Static TSX')} width={260} height={28} size={${typography.labelSize}} color=${literal('#334155')} layer={5} />
              </VStack>
            </Cell>
            <Cell id="progress-cell" col={7} row={3} colSpan={6} rowSpan={4} mode="position">
              <Rect id="progress-card" x={0} y={0} width={418} height={246} radius={${surfaces.radiusLg}} fill=${literal('#ffffff')} stroke=${literal(palette.border)} strokeWidth={${surfaces.borderWidth}} layer={4}>
                <Animate prop="opacity" from={0} to={1} start="1160ms" duration="320ms" ease="outQuad" />
                <Animate prop="scale" from={0.96} to={${designSystem.camera.zoomScale}} start="3900ms" duration="900ms" ease="inOutCubic" />
              </Rect>
              <DataChart id="progress-chart" title=${literal(brief.onscreenText.rightTitle ?? 'Render progress')} values={[74, 118, 156, 206]} x={34} y={28} width={276} height={144} titleSize={24} titleWidth="100%" showCallout={false} calloutColor={vars.accent} layer={5} />
              <CTAButton id="callout" label={vars.callout} x={164} y={184} width={184} height={46} radius={15} size={20} fill={vars.accent} layer={8} />
            </Cell>
          </Bento>
        </BrowserWindow>
      </Scene>
    );
  }
});`;
}

function createDiagramSceneSource(
  brief: ProgrammaticSpanSceneBrief,
  designSystem: ProgrammaticSpanDesignSystem
): string {
  const palette = designSystem.palette;
  const typography = designSystem.typography;

  return `export default defineSpanScene({
  id: ${literal(brief.id)},
  width: 1280,
  height: 720,
  durationMs: ${safeDuration(brief.durationMs)},
  variables: {
    root: stringVar(${literal(brief.onscreenText.headline)}),
    final: stringVar(${literal(brief.onscreenText.callout ?? 'Reusable visual identity')})
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill=${literal(palette.background)} layer={0} />
        <Text id="title" text=${literal(brief.onscreenText.body ?? brief.narrativeGoal)} x={116} y={72} width={760} height={58} size={${typography.titleSize}} weight=${literal(typography.heroWeight)} color=${literal(palette.foreground)} layer={2} />
        <Flowchart id="diagram" root={vars.root} left=${literal(brief.onscreenText.leftTitle ?? 'Use tokens')} right=${literal(brief.onscreenText.rightTitle ?? 'Avoid random style')} final={vars.final} x={0} y={28} layer={3} />
      </Scene>
    );
  }
});`;
}

function createEditZoomSceneSource(
  brief: ProgrammaticSpanSceneBrief,
  designSystem: ProgrammaticSpanDesignSystem
): string {
  const palette = designSystem.palette;
  const typography = designSystem.typography;
  const surfaces = designSystem.surfaces;

  return `export default defineSpanScene({
  id: ${literal(brief.id)},
  width: 1280,
  height: 720,
  durationMs: ${safeDuration(brief.durationMs)},
  variables: {
    headline: stringVar(${literal(brief.onscreenText.headline)}),
    body: stringVar(${literal(brief.onscreenText.body ?? brief.narrativeGoal)}),
    callout: stringVar(${literal(brief.onscreenText.callout ?? 'dramatic zoom')}),
    accent: colorVar(${literal(palette.accentSecondary)})
  },
  render({ vars }) {
    return (
      <Scene>
        <Rect id="background" x={0} y={0} width={1280} height={720} fill=${literal(palette.background)} layer={0} />
        <BrowserWindow id="editor" x={142} y={96} width={996} height={514} headerHeight={${surfaces.chromeHeaderHeight}} radius={${surfaces.radiusLg}} fill=${literal(palette.surface)} headerFill=${literal('#e7e5e4')} stroke=${literal(palette.border)} strokeWidth={${surfaces.borderWidth}} layer={2}>
          <Animate prop="opacity" from={0} to={1} start="0ms" duration="420ms" ease="outQuad" />
          <Bento id="editor-layout" x={54} y={94} width={888} height={390} columns={12} rows={6} gap={18}>
            <Cell id="copy-cell" col={1} row={1} colSpan={8} rowSpan={3} mode="position">
              <VStack id="copy-stack" x={0} y={0} width="100%" height={140} gap={8}>
                <Text id="headline" text={vars.headline} width="100%" height={64} size={${typography.heroSize - 4}} weight=${literal(typography.heroWeight)} color=${literal('#1c1917')} layer={4} />
                <Text id="body" text={vars.body} width="96%" height={58} size={${typography.bodySize}} weight=${literal(typography.bodyWeight)} color=${literal('#57534e')} layer={4} />
              </VStack>
            </Cell>
            <Cell id="target-cell" col={9} row={1} colSpan={4} rowSpan={3} align="center" justify="center">
              <MotionBox id="target-motion" width={224} height={160} pivotX="50%" pivotY="50%">
                <Animate prop="scale" from={0.96} to={${designSystem.camera.zoomScale}} start="2800ms" duration="900ms" ease="inOutCubic" />
                <Rect id="target-card" x={0} y={0} width="100%" height="100%" radius={26} fill={vars.accent} opacity={0.92} layer={5} />
                <Text id="callout" text={vars.callout} x={38} y={62} width={150} height={36} size={24} weight="800" color=${literal('#ffffff')} align="center" layer={6} />
              </MotionBox>
            </Cell>
            <Cell id="timeline-cell" col={1} row={5} colSpan={11} rowSpan={1} mode="position">
              <Rect id="timeline" x={18} y={0} width={770} height={50} radius={15} fill=${literal('#292524')} layer={4} />
              <Rect id="selection" x={364} y={8} width={158} height={34} radius={12} fill={vars.accent} opacity={0.72} layer={5}>
                <Animate prop="opacity" from={0} to={0.72} start="1150ms" duration="300ms" ease="outQuad" />
              </Rect>
            </Cell>
            <Cell id="patch-cell" col={1} row={6} colSpan={3} rowSpan={1} mode="position">
              <CTAButton id="patch" label="Apply patch" x={4} y={2} width={158} height={46} radius={15} size={19} fill=${literal(palette.accent)} layer={6} />
            </Cell>
          </Bento>
        </BrowserWindow>
      </Scene>
    );
  }
});`;
}

function safeDuration(durationMs: number): number {
  if (!Number.isFinite(durationMs)) return 5000;
  return Math.max(1000, Math.min(12000, Math.round(durationMs)));
}

function literal(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
}
