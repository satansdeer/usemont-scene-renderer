import type { ProgrammaticSpanNodeKind, ProgrammaticSpanVariableType } from './types.js';

export type ProgrammaticSpanPresetCategory = 'primitive' | 'interaction' | 'chart' | 'diagram' | 'media' | 'shape';
export type ProgrammaticSpanReusableKind = 'element' | 'block';
export type ProgrammaticSpanSceneTemplateSourceKind = 'example' | 'scene-brief';
export type ProgrammaticSpanEffectCategory = 'camera' | 'render';
export type ProgrammaticSpanLayoutCategory = 'stack' | 'grid' | 'motion';
export type ProgrammaticSpanTextEffectCategory = 'number' | 'reveal';

export interface ProgrammaticSpanPresetProp {
  name: string;
  type: ProgrammaticSpanVariableType | 'number[]';
  required?: boolean;
  default?: string | number | boolean | number[];
  description: string;
}

export interface ProgrammaticSpanPresetDefinition {
  id: ProgrammaticSpanNodeKind;
  kind: ProgrammaticSpanReusableKind;
  jsxTag: string;
  title: string;
  description: string;
  category: ProgrammaticSpanPresetCategory;
  tags: string[];
  exampleId: string;
  props: ProgrammaticSpanPresetProp[];
  hyperframes?: {
    name: string;
    type: 'block' | 'component' | 'example';
    source: string;
    note: string;
  };
}

export interface ProgrammaticSpanSceneTemplateDefinition {
  id: string;
  title: string;
  description: string;
  sourceKind: ProgrammaticSpanSceneTemplateSourceKind;
  exampleId?: string;
  briefId?: string;
  designSystemId?: string;
  tags: string[];
  notes: string;
}

export interface ProgrammaticSpanEffectDefinition {
  id: string;
  jsxTag:
    | 'CameraEffect'
    | 'Effect'
    | 'RenderEffect.Blur'
    | 'RenderEffect.Shadow'
    | 'RenderEffect.Glow'
    | 'RenderEffect.TiltShift';
  title: string;
  description: string;
  category: ProgrammaticSpanEffectCategory;
  tags: string[];
  exampleId: string;
  props: ProgrammaticSpanPresetProp[];
  notes: string;
}

export interface ProgrammaticSpanTextEffectDefinition {
  id: string;
  jsxTag:
    | 'TextEffect.Count'
    | 'TextEffect.CountUp'
    | 'TextEffect.GrowingNumber'
    | 'TextEffect.Number'
    | 'TextEffect.Reveal'
    | 'TextEffect.Typewriter'
    | 'TextEffect.WordReveal'
    | 'TextEffect.LetterFlyIn'
    | 'TextEffect.WordDrop'
    | 'TextEffect.Wipe';
  title: string;
  description: string;
  category: ProgrammaticSpanTextEffectCategory;
  tags: string[];
  exampleId: string;
  props: ProgrammaticSpanPresetProp[];
  notes: string;
}

export interface ProgrammaticSpanLayoutDefinition {
  id: string;
  jsxTag: 'VStack' | 'HStack' | 'Bento' | 'Cell' | 'MotionBox';
  title: string;
  description: string;
  category: ProgrammaticSpanLayoutCategory;
  tags: string[];
  exampleId: string;
  props: ProgrammaticSpanPresetProp[];
  notes: string;
}

export const PROGRAMMATIC_SPAN_ELEMENTS: ProgrammaticSpanPresetDefinition[] = [
  {
    id: 'image',
    kind: 'element',
    jsxTag: 'Image',
    title: 'Image Media',
    description: 'Bitmap, SVG/vector, or GIF visual rendered through the existing scene image path. Aliases: Bitmap, Vector, Gif.',
    category: 'media',
    tags: ['media', 'image', 'bitmap', 'svg', 'gif'],
    exampleId: 'media-showcase',
    props: [
      { name: 'src', type: 'string', required: true, description: 'Image URL, uploaded asset URL, data URI, or `asset("...")` helper result.' },
      { name: 'x', type: 'number', required: true, description: 'Media left position.' },
      { name: 'y', type: 'number', required: true, description: 'Media top position.' },
      { name: 'width', type: 'number', required: true, description: 'Media box width.' },
      { name: 'height', type: 'number', required: true, description: 'Media box height.' },
      { name: 'contentType', type: 'string', description: 'Optional MIME type, useful for uploaded GIF URLs.' },
      { name: 'originalName', type: 'string', description: 'Optional filename, useful for detecting GIF assets.' },
      { name: 'fit', type: 'string', default: 'stretch', description: 'Fit mode: contain, cover, or stretch.' },
      { name: 'mediaSpeed', type: 'number', default: 1, description: 'Local GIF playback speed.' }
    ],
    hyperframes: {
      name: 'media',
      type: 'component',
      source: 'mont-native-programmatic-span',
      note: 'Maps directly to Mont image visuals; bitmap, SVG, and GIF use the existing GPU renderer media loader.'
    }
  },
  {
    id: 'lottie',
    kind: 'element',
    jsxTag: 'Lottie',
    title: 'Lottie Animation',
    description: 'JSON Lottie animation rendered through the scene Lottie path with deterministic local media time.',
    category: 'media',
    tags: ['media', 'lottie', 'animation'],
    exampleId: 'media-showcase',
    props: [
      { name: 'src', type: 'string', required: true, description: 'Lottie JSON URL, uploaded asset URL, or `asset("...")` helper result.' },
      { name: 'x', type: 'number', required: true, description: 'Animation left position.' },
      { name: 'y', type: 'number', required: true, description: 'Animation top position.' },
      { name: 'width', type: 'number', required: true, description: 'Animation box width.' },
      { name: 'height', type: 'number', required: true, description: 'Animation box height.' },
      { name: 'contentType', type: 'string', description: 'Optional MIME type for uploaded Lottie assets.' },
      { name: 'originalName', type: 'string', description: 'Optional filename for uploaded Lottie assets.' },
      { name: 'fit', type: 'string', default: 'contain', description: 'Fit mode: contain, cover, or stretch.' },
      { name: 'mediaSpeed', type: 'number', default: 1, description: 'Local animation playback speed.' }
    ],
    hyperframes: {
      name: 'lottie',
      type: 'component',
      source: 'mont-native-programmatic-span',
      note: 'Uses Mont Lottie visuals; no DOM animation library is introduced.'
    }
  },
  {
    id: 'model3d',
    kind: 'element',
    jsxTag: 'Model3D',
    title: '3D Model',
    description: 'GLB/GLTF model visual rendered by the existing GPU 3D model path.',
    category: 'media',
    tags: ['media', '3d', 'model', 'glb', 'gltf'],
    exampleId: 'media-showcase',
    props: [
      { name: 'src', type: 'string', required: true, description: 'GLB/GLTF URL, uploaded asset URL, or `asset("...")` helper result.' },
      { name: 'x', type: 'number', required: true, description: 'Model viewport left position.' },
      { name: 'y', type: 'number', required: true, description: 'Model viewport top position.' },
      { name: 'width', type: 'number', required: true, description: 'Model viewport width.' },
      { name: 'height', type: 'number', required: true, description: 'Model viewport height.' },
      { name: 'contentType', type: 'string', description: 'Optional MIME type for uploaded GLB/GLTF assets.' },
      { name: 'originalName', type: 'string', description: 'Optional filename or display name.' },
      { name: 'yaw', type: 'number', default: 0, description: 'Model yaw in degrees.' },
      { name: 'pitch', type: 'number', default: 0, description: 'Model pitch in degrees.' },
      { name: 'assetScale', type: 'number', default: 1, description: 'Scale applied inside the model viewport.' }
    ],
    hyperframes: {
      name: 'model3d',
      type: 'component',
      source: 'mont-native-programmatic-span',
      note: 'Maps to Mont model3d visuals and keeps 3D rendering in the GPU renderer.'
    }
  },
  {
    id: 'star',
    kind: 'element',
    jsxTag: 'Shape.Star',
    title: 'Star Shape',
    description: 'Native parametric star rendered by the existing GPU shape path.',
    category: 'shape',
    tags: ['shape', 'star', 'badge', 'accent'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 120, description: 'Shape box width.' },
      { name: 'height', type: 'number', default: 120, description: 'Shape box height.' },
      { name: 'fill', type: 'color', default: '#facc15', description: 'Shape fill color.' },
      { name: 'cornerRadius', type: 'number', default: 8, description: 'Rounded star point radius.' }
    ]
  },
  {
    id: 'arrow',
    kind: 'element',
    jsxTag: 'Shape.Arrow',
    title: 'Arrow Shape',
    description: 'Native parametric arrow with head, shaft, tail, and wing controls.',
    category: 'shape',
    tags: ['shape', 'arrow', 'flow', 'direction'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 260, description: 'Arrow box width.' },
      { name: 'height', type: 'number', default: 96, description: 'Arrow box height.' },
      { name: 'fill', type: 'color', default: '#14b8a6', description: 'Arrow fill color.' },
      { name: 'headLength', type: 'number', default: 42, description: 'Head length as percent of width.' },
      { name: 'shaftWidth', type: 'number', default: 44, description: 'Shaft width as percent of height.' },
      { name: 'wingConcavity', type: 'number', default: 0, description: 'Concavity amount as percent.' }
    ]
  },
  {
    id: 'turnArrow',
    kind: 'element',
    jsxTag: 'Shape.TurnArrow',
    title: 'Turn Arrow Shape',
    description: 'Native parametric turn arrow for loops, returns, and process bends.',
    category: 'shape',
    tags: ['shape', 'arrow', 'turn', 'loop'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 260, description: 'Turn arrow box width.' },
      { name: 'height', type: 'number', default: 96, description: 'Turn arrow box height.' },
      { name: 'fill', type: 'color', default: '#38bdf8', description: 'Turn arrow fill color.' },
      { name: 'headLength', type: 'number', default: 42, description: 'Head length as percent of width.' },
      { name: 'tailWidth', type: 'number', default: 44, description: 'Tail width as percent of height.' }
    ]
  },
  {
    id: 'calloutBox',
    kind: 'element',
    jsxTag: 'Shape.CalloutBox',
    title: 'Callout Shape',
    description: 'Native speech/callout box with configurable pointer side, offset, and size.',
    category: 'shape',
    tags: ['shape', 'callout', 'annotation', 'speech'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 220, description: 'Callout box width.' },
      { name: 'height', type: 'number', default: 120, description: 'Callout box height.' },
      { name: 'fill', type: 'color', default: '#ffffff', description: 'Callout fill color.' },
      { name: 'pointerSide', type: 'string', default: 'bottom', description: 'Pointer side: none, top, right, bottom, or left.' },
      { name: 'pointerOffset', type: 'number', default: 50, description: 'Pointer offset as percent along the selected side.' }
    ]
  },
  {
    id: 'line',
    kind: 'element',
    jsxTag: 'Shape.Line',
    title: 'Line Shape',
    description: 'Native curved line with percent-based control handles and optional structured linePath.',
    category: 'shape',
    tags: ['shape', 'line', 'connector', 'curve'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 260, description: 'Line box width.' },
      { name: 'height', type: 'number', default: 90, description: 'Line box height.' },
      { name: 'stroke', type: 'color', default: '#38bdf8', description: 'Line stroke color.' },
      { name: 'strokeWidth', type: 'number', default: 6, description: 'Line stroke width.' },
      { name: 'control1Y', type: 'number', default: 18, description: 'First Bezier control y percent.' },
      { name: 'control2Y', type: 'number', default: 82, description: 'Second Bezier control y percent.' }
    ]
  },
  {
    id: 'arc',
    kind: 'element',
    jsxTag: 'Shape.Arc',
    title: 'Arc Shape',
    description: 'Native donut arc with sweep and thickness controls.',
    category: 'shape',
    tags: ['shape', 'arc', 'progress', 'donut'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 120, description: 'Arc box width.' },
      { name: 'height', type: 'number', default: 120, description: 'Arc box height.' },
      { name: 'fill', type: 'color', default: '#22c55e', description: 'Arc fill color.' },
      { name: 'sweep', type: 'number', default: 72, description: 'Arc sweep as percent of a full circle.' },
      { name: 'thickness', type: 'number', default: 30, description: 'Arc thickness as percent.' }
    ]
  },
  {
    id: 'triangle',
    kind: 'element',
    jsxTag: 'Shape.Triangle',
    title: 'Triangle Shape',
    description: 'Native triangle shape for markers, play indicators, and composition accents.',
    category: 'shape',
    tags: ['shape', 'triangle', 'marker'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 120, description: 'Shape box width.' },
      { name: 'height', type: 'number', default: 120, description: 'Shape box height.' },
      { name: 'fill', type: 'color', default: '#a78bfa', description: 'Shape fill color.' },
      { name: 'cornerRadius', type: 'number', default: 8, description: 'Rounded corner radius.' }
    ]
  },
  {
    id: 'diamond',
    kind: 'element',
    jsxTag: 'Shape.Diamond',
    title: 'Diamond Shape',
    description: 'Native diamond shape for decisions, milestones, and accents.',
    category: 'shape',
    tags: ['shape', 'diamond', 'decision'],
    exampleId: 'shape-showcase',
    props: [
      { name: 'width', type: 'number', default: 120, description: 'Shape box width.' },
      { name: 'height', type: 'number', default: 120, description: 'Shape box height.' },
      { name: 'fill', type: 'color', default: '#fb7185', description: 'Shape fill color.' },
      { name: 'cornerRadius', type: 'number', default: 8, description: 'Rounded corner radius.' }
    ]
  },
  {
    id: 'browser-window',
    kind: 'element',
    jsxTag: 'BrowserWindow',
    title: 'Browser Window',
    description: 'GPU browser chrome with top-only rounded header and centered traffic lights.',
    category: 'primitive',
    tags: ['ui', 'browser', 'chrome'],
    exampleId: 'dashboard-window',
    props: [
      { name: 'x', type: 'number', required: true, description: 'Window left position.' },
      { name: 'y', type: 'number', required: true, description: 'Window top position.' },
      { name: 'width', type: 'number', required: true, description: 'Window width.' },
      { name: 'height', type: 'number', required: true, description: 'Window height.' },
      { name: 'headerHeight', type: 'number', default: 66, description: 'Browser chrome header height.' },
      { name: 'radius', type: 'number', default: 28, description: 'Outer window corner radius.' },
      { name: 'fill', type: 'color', default: '#f8fafc', description: 'Content surface fill.' },
      { name: 'headerFill', type: 'color', default: '#e2e8f0', description: 'Header fill.' }
    ],
    hyperframes: {
      name: 'product-promo',
      type: 'example',
      source: '/private/tmp/hyperframes-study/registry/examples/product-promo',
      note: 'Adapted as Mont-native UI chrome; Hyperframes HTML/GSAP is not used at runtime.'
    }
  },
  {
    id: 'traffic-lights',
    kind: 'element',
    jsxTag: 'TrafficLights',
    title: 'Traffic Lights',
    description: 'macOS-style red/yellow/green window controls with center-based positioning.',
    category: 'primitive',
    tags: ['ui', 'browser', 'chrome'],
    exampleId: 'chrome-controls',
    props: [
      { name: 'x', type: 'number', required: true, description: 'Center x of the first control.' },
      { name: 'y', type: 'number', required: true, description: 'Center y shared by all controls.' },
      { name: 'radius', type: 'number', default: 9, description: 'Control radius.' },
      { name: 'gap', type: 'number', default: 30, description: 'Distance between control centers.' }
    ]
  },
  {
    id: 'cursor',
    kind: 'element',
    jsxTag: 'Cursor',
    title: 'Cursor',
    description: 'Cursor asset visual anchored by hotspot coordinates for product-demo motion.',
    category: 'primitive',
    tags: ['ui', 'cursor', 'demo'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'x', type: 'number', required: true, description: 'Cursor hotspot x position.' },
      { name: 'y', type: 'number', required: true, description: 'Cursor hotspot y position.' },
      { name: 'width', type: 'number', default: 56, description: 'Cursor rendered width.' },
      { name: 'height', type: 'number', default: 56, description: 'Cursor rendered height.' },
      { name: 'asset', type: 'string', default: 'mac-cursor', description: 'Cursor asset key such as mac-cursor or mac-pointer-hand.' },
      { name: 'hotspotX', type: 'number', default: 6, description: 'Hotspot x offset inside the cursor asset.' },
      { name: 'hotspotY', type: 'number', default: 4, description: 'Hotspot y offset inside the cursor asset.' }
    ]
  },
  {
    id: 'click-pulse',
    kind: 'element',
    jsxTag: 'ClickPulse',
    title: 'Click Pulse',
    description: 'Dissipating click ring anchored by center coordinates.',
    category: 'interaction',
    tags: ['ui', 'cursor', 'click', 'pulse'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'centerX', type: 'number', required: true, description: 'Pulse center x position.' },
      { name: 'centerY', type: 'number', required: true, description: 'Pulse center y position.' },
      { name: 'start', type: 'string', default: '0ms', description: 'Pulse start time.' },
      { name: 'duration', type: 'string', default: '780ms', description: 'Pulse duration.' },
      { name: 'startRadius', type: 'number', default: 10, description: 'Initial ring radius.' },
      { name: 'endRadius', type: 'number', default: 46, description: 'Final ring radius.' },
      { name: 'color', type: 'color', default: '#14b8a6', description: 'Pulse stroke color.' },
      { name: 'maxOpacity', type: 'number', default: 0.42, description: 'Peak pulse opacity.' }
    ]
  },
  {
    id: 'cta-button',
    kind: 'element',
    jsxTag: 'CTAButton',
    title: 'CTA Button',
    description: 'Single-line fitted call-to-action button with centered label.',
    category: 'primitive',
    tags: ['ui', 'button', 'text-fit'],
    exampleId: 'launch-card',
    props: [
      { name: 'label', type: 'string', required: true, description: 'Button label.' },
      { name: 'x', type: 'number', required: true, description: 'Button left position.' },
      { name: 'y', type: 'number', required: true, description: 'Button top position.' },
      { name: 'width', type: 'number', required: true, description: 'Button width.' },
      { name: 'height', type: 'number', required: true, description: 'Button height.' },
      { name: 'fill', type: 'color', default: '#14b8a6', description: 'Button fill.' },
      { name: 'size', type: 'number', default: 24, description: 'Maximum label font size.' },
      { name: 'paddingX', type: 'number', default: 24, description: 'Horizontal label padding.' },
      { name: 'labelYOffset', type: 'number', default: -1, description: 'Optical vertical label correction.' },
      { name: 'hoverStart', type: 'string', default: '0ms', description: 'Optional hover reaction start time.' },
      { name: 'clickStart', type: 'string', default: '0ms', description: 'Optional click press start time.' },
      { name: 'hoverLift', type: 'number', default: -4, description: 'Vertical hover lift in scene pixels.' },
      { name: 'pressOffset', type: 'number', default: 5, description: 'Vertical press dip in scene pixels.' }
    ]
  }
];

export const PROGRAMMATIC_SPAN_BLOCKS: ProgrammaticSpanPresetDefinition[] = [
  {
    id: 'cursor-click',
    kind: 'block',
    jsxTag: 'CursorClick',
    title: 'Cursor Click',
    description: 'Cursor movement, click dip, and dissipating pulse coordinated from one target.',
    category: 'interaction',
    tags: ['ui', 'cursor', 'click', 'demo'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'fromX', type: 'number', required: true, description: 'Initial cursor hotspot x position.' },
      { name: 'fromY', type: 'number', required: true, description: 'Initial cursor hotspot y position.' },
      { name: 'toX', type: 'number', required: true, description: 'Clicked cursor hotspot x position.' },
      { name: 'toY', type: 'number', required: true, description: 'Clicked cursor hotspot y position.' },
      { name: 'moveStart', type: 'string', default: '0ms', description: 'Cursor movement start time.' },
      { name: 'moveDuration', type: 'string', default: '900ms', description: 'Cursor movement duration.' },
      { name: 'clickStart', type: 'string', default: '940ms', description: 'Cursor dip and pulse start time.' },
      { name: 'dip', type: 'number', default: 10, description: 'Cursor dip distance during click.' },
      { name: 'pulseColor', type: 'color', default: '#14b8a6', description: 'Click pulse color.' },
      { name: 'cursorWidth', type: 'number', default: 56, description: 'Rendered cursor width.' }
    ]
  },
  {
    id: 'data-chart',
    kind: 'block',
    jsxTag: 'DataChart',
    title: 'Data Chart',
    description: 'Animated bar chart with staggered reveal and callout text.',
    category: 'chart',
    tags: ['data', 'chart', 'statistics'],
    exampleId: 'data-chart',
    props: [
      { name: 'title', type: 'string', required: true, description: 'Chart title.' },
      { name: 'values', type: 'number[]', default: [180, 260, 330, 220, 370], description: 'Bar values in scene pixels.' },
      { name: 'x', type: 'number', default: 96, description: 'Chart group left position.' },
      { name: 'y', type: 'number', default: 74, description: 'Chart group top position.' },
      { name: 'barInsetX', type: 'number', default: 24, description: 'Horizontal inset between y-axis edges and the bar group.' },
      { name: 'showCallout', type: 'boolean', default: true, description: 'Whether the chart renders its own callout label and line.' }
    ],
    hyperframes: {
      name: 'data-chart',
      type: 'block',
      source: '/private/tmp/hyperframes-study/registry/blocks/data-chart',
      note: 'Adapted from the animated chart concept into Mont GPU primitives.'
    }
  },
  {
    id: 'flowchart',
    kind: 'block',
    jsxTag: 'Flowchart',
    title: 'Flowchart',
    description: 'Animated decision diagram with cards and connectors.',
    category: 'diagram',
    tags: ['diagram', 'flowchart', 'decision'],
    exampleId: 'flowchart-plan',
    props: [
      { name: 'root', type: 'string', required: true, description: 'Root question.' },
      { name: 'left', type: 'string', default: 'Yes: turn it into a preset', description: 'Left branch label.' },
      { name: 'right', type: 'string', default: 'No: keep it as source', description: 'Right branch label.' },
      { name: 'final', type: 'string', default: 'Compiler returns IR, diagnostics, and MCP-ready payload', description: 'Final card label.' }
    ],
    hyperframes: {
      name: 'flowchart',
      type: 'block',
      source: '/private/tmp/hyperframes-study/registry/blocks/flowchart',
      note: 'Adapted from the Hyperframes animated decision-tree block into Mont GPU primitives.'
    }
  },
  {
    id: 'decision-tree',
    kind: 'block',
    jsxTag: 'DecisionTree',
    title: 'Decision Tree',
    description: 'Alias of Flowchart for question/branch examples.',
    category: 'diagram',
    tags: ['diagram', 'flowchart', 'decision'],
    exampleId: 'decision-tree',
    props: [
      { name: 'root', type: 'string', required: true, description: 'Root question.' },
      { name: 'left', type: 'string', default: 'Yes: turn it into a preset', description: 'Left branch label.' },
      { name: 'right', type: 'string', default: 'No: keep it as source', description: 'Right branch label.' },
      { name: 'final', type: 'string', default: 'Compiler returns IR, diagnostics, and MCP-ready payload', description: 'Final card label.' }
    ],
    hyperframes: {
      name: 'decision-tree',
      type: 'example',
      source: '/private/tmp/hyperframes-study/registry/examples/decision-tree',
      note: 'Adapted as the Mont-native flowchart preset example.'
    }
  }
];

export const PROGRAMMATIC_SPAN_EFFECTS: ProgrammaticSpanEffectDefinition[] = [
  {
    id: 'camera-zoom-effect',
    jsxTag: 'CameraEffect',
    title: 'Camera Zoom',
    description: 'Scene-level camera push-in with GPU blur without mutating individual visuals.',
    category: 'camera',
    tags: ['camera', 'zoom', 'blur'],
    exampleId: 'camera-zoom-effect',
    props: [
      { name: 'centerX', type: 'number', default: 640, description: 'Scene-space camera anchor x.' },
      { name: 'centerY', type: 'number', default: 360, description: 'Scene-space camera anchor y.' },
      { name: 'zoom', type: 'number', default: 1, description: 'Camera zoom multiplier.' },
      { name: 'rotation', type: 'number', default: 0, description: 'Camera rotation in degrees.' },
      { name: 'blur', type: 'number', default: 0, description: 'GPU texture blur radius in source pixels.' },
      { name: 'opacity', type: 'number', default: 1, description: 'Optional global source opacity multiplier.' }
    ],
    notes: 'Use when the whole frame should push toward a focal point.'
  },
  {
    id: 'camera-rotate-blur-effect',
    jsxTag: 'CameraEffect',
    title: 'Camera Rotate Blur',
    description: 'Scene-level camera tilt, push, and GPU blur for dramatic transition beats.',
    category: 'camera',
    tags: ['camera', 'rotation', 'zoom', 'blur'],
    exampleId: 'camera-rotate-blur-effect',
    props: [
      { name: 'centerX', type: 'number', default: 640, description: 'Scene-space camera anchor x.' },
      { name: 'centerY', type: 'number', default: 360, description: 'Scene-space camera anchor y.' },
      { name: 'zoom', type: 'number', default: 1, description: 'Camera zoom multiplier.' },
      { name: 'rotation', type: 'number', default: 0, description: 'Camera rotation in degrees.' },
      { name: 'blur', type: 'number', default: 0, description: 'GPU texture blur radius in source pixels.' },
      { name: 'opacity', type: 'number', default: 1, description: 'Optional global source opacity multiplier.' }
    ],
    notes: 'Use for whole-scene motion. Use regular visual animations when only one object should move.'
  },
  {
    id: 'render-blur-effect',
    jsxTag: 'RenderEffect.Blur',
    title: 'Visual Blur',
    description: 'Per-visual GPU blur applied after the object is rasterized.',
    category: 'render',
    tags: ['render', 'blur', 'visual'],
    exampleId: 'render-effects-showcase',
    props: [
      { name: 'amount', type: 'number', default: 8, description: 'Blur radius in source pixels.' }
    ],
    notes: 'Use inside a visual node, for example `<Shape.Diamond><RenderEffect.Blur amount={8} /></Shape.Diamond>`.'
  },
  {
    id: 'render-shadow-effect',
    jsxTag: 'RenderEffect.Shadow',
    title: 'Visual Shadow',
    description: 'Per-visual projected shadow using the existing GPU renderer shadow attributes.',
    category: 'render',
    tags: ['render', 'shadow', 'depth'],
    exampleId: 'render-effects-showcase',
    props: [
      { name: 'blur', type: 'number', default: 18, description: 'Shadow blur radius.' },
      { name: 'x', type: 'number', default: 0, description: 'Horizontal shadow offset.' },
      { name: 'y', type: 'number', default: 12, description: 'Vertical shadow offset.' },
      { name: 'color', type: 'color', default: '#020617', description: 'Shadow color.' },
      { name: 'opacity', type: 'number', default: 32, description: 'Shadow opacity from 0 to 100.' }
    ],
    notes: 'Equivalent to setting shadowBlur, shadowOffsetX/Y, shadowColor, and shadowOpacity on the parent visual.'
  },
  {
    id: 'render-glow-effect',
    jsxTag: 'RenderEffect.Glow',
    title: 'Visual Glow',
    description: 'Glow shorthand backed by the renderer shadow pipeline with zero offset.',
    category: 'render',
    tags: ['render', 'glow', 'highlight'],
    exampleId: 'render-effects-showcase',
    props: [
      { name: 'color', type: 'color', default: '#67e8f9', description: 'Glow color.' },
      { name: 'blur', type: 'number', default: 26, description: 'Glow blur radius.' },
      { name: 'opacity', type: 'number', default: 62, description: 'Glow opacity from 0 to 100.' }
    ],
    notes: 'Use when an element should emit light. It cannot stack with a separate shadow because both map to the same native shadow attributes.'
  },
  {
    id: 'render-tilt-shift-effect',
    jsxTag: 'RenderEffect.TiltShift',
    title: 'Tilt Shift',
    description: 'Per-visual tilt-shift blur using the existing renderer post-effect.',
    category: 'render',
    tags: ['render', 'tilt-shift', 'focus'],
    exampleId: 'render-effects-showcase',
    props: [
      { name: 'blur', type: 'number', default: 12, description: 'Maximum blur radius.' },
      { name: 'center', type: 'number', default: 50, description: 'Focus center as percent.' },
      { name: 'focus', type: 'number', default: 34, description: 'In-focus band size as percent.' },
      { name: 'feather', type: 'number', default: 24, description: 'Feather size as percent.' }
    ],
    notes: 'Use inside any visual node when a local object should have a focused band instead of blurring the whole scene.'
  }
];

export const PROGRAMMATIC_SPAN_TEXT_EFFECTS: ProgrammaticSpanTextEffectDefinition[] = [
  {
    id: 'count-text-effect',
    jsxTag: 'TextEffect.Count',
    title: 'Count Number',
    description: 'Formats a text node as an animated number with prefix, suffix, decimals, and step rounding.',
    category: 'number',
    tags: ['text', 'number', 'metric', 'count'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'from', type: 'number', default: 0, description: 'Starting numeric value.' },
      { name: 'to', type: 'number', required: true, description: 'Ending numeric value.' },
      { name: 'start', type: 'string', default: '0ms', description: 'Count-up start time.' },
      { name: 'duration', type: 'string', default: '700ms', description: 'Count-up duration.' },
      { name: 'step', type: 'string', default: 'decimal', description: 'Display step: integer, decimal, hundredth, or a numeric step.' },
      { name: 'prefix', type: 'string', default: '', description: 'Text before the number.' },
      { name: 'suffix', type: 'string', default: '', description: 'Text after the number.' },
      { name: 'decimals', type: 'number', default: 1, description: 'Fixed decimal places in the rendered number.' }
    ],
    notes: 'Use inside `<Text>` for metrics such as `<TextEffect.Count from={1.0} to={4.8} step="decimal" suffix="x" />`. It can count up or down depending on `from` and `to`.'
  },
  {
    id: 'reveal-text-effect',
    jsxTag: 'TextEffect.Reveal',
    title: 'Reveal Text',
    description: 'General text reveal engine for characters, words, or lines with typewriter, fade, fly, drop, scale, and wipe styles.',
    category: 'reveal',
    tags: ['text', 'reveal', 'characters', 'words'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'style', type: 'string', default: 'fade', description: 'Reveal style: typewriter, fade, fly, drop, scale, or wipe.' },
      { name: 'unit', type: 'string', default: 'characters', description: 'Reveal unit: characters, words, or lines.' },
      { name: 'direction', type: 'string', default: 'left', description: 'Motion or wipe direction: left, right, top, or bottom.' },
      { name: 'start', type: 'string', default: '0ms', description: 'Reveal start time.' },
      { name: 'duration', type: 'string', default: '900ms', description: 'Reveal duration.' },
      { name: 'stagger', type: 'number', default: 0, description: 'Per-unit stagger in milliseconds for split reveal styles.' },
      { name: 'distance', type: 'number', default: 24, description: 'Travel distance for fly/drop styles.' },
      { name: 'scaleFrom', type: 'number', default: 1, description: 'Initial unit scale for fly/scale styles.' },
      { name: 'stableWrap', type: 'string', default: 'final', description: 'Use final text wrapping while revealing, or "none" for live reflow.' }
    ],
    notes: 'Use when presets are too restrictive, for example `<TextEffect.Reveal unit="words" style="fly" direction="bottom" />`.'
  },
  {
    id: 'typewriter-text-effect',
    jsxTag: 'TextEffect.Typewriter',
    title: 'Typewriter Reveal',
    description: 'Reveals a text node progressively by characters or words while keeping layout sized to the full text.',
    category: 'reveal',
    tags: ['text', 'headline', 'typewriter', 'reveal'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'start', type: 'string', default: '0ms', description: 'Reveal start time.' },
      { name: 'duration', type: 'string', default: '900ms', description: 'Reveal duration.' },
      { name: 'unit', type: 'string', default: 'characters', description: 'Reveal unit: characters or words.' },
      { name: 'stableWrap', type: 'string', default: 'final', description: 'Use final text wrapping while revealing, or "none" for live reflow.' },
      { name: 'cursor', type: 'boolean', default: false, description: 'Whether to append a cursor while typing.' },
      { name: 'cursorChar', type: 'string', default: '|', description: 'Cursor character when cursor is enabled.' }
    ],
    notes: 'Use inside `<Text>` for headline reveals such as `<TextEffect.Typewriter start="420ms" duration="920ms" />`.'
  },
  {
    id: 'word-reveal-text-effect',
    jsxTag: 'TextEffect.WordReveal',
    title: 'Word Reveal',
    description: 'Word-by-word reveal preset backed by the same stable reveal engine.',
    category: 'reveal',
    tags: ['text', 'words', 'reveal'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'style', type: 'string', default: 'fade', description: 'Reveal style, usually fade, fly, drop, or typewriter.' },
      { name: 'start', type: 'string', default: '0ms', description: 'Reveal start time.' },
      { name: 'duration', type: 'string', default: '900ms', description: 'Reveal duration.' },
      { name: 'stagger', type: 'number', default: 80, description: 'Per-word stagger for split reveal styles.' }
    ],
    notes: 'Use as a clear authoring alias for `<TextEffect.Reveal unit="words" />`.'
  },
  {
    id: 'letter-fly-in-text-effect',
    jsxTag: 'TextEffect.LetterFlyIn',
    title: 'Letter Fly In',
    description: 'Characters fly in from a direction while fading from transparent and settling from a slight zoom.',
    category: 'reveal',
    tags: ['text', 'letters', 'fly', 'zoom'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'direction', type: 'string', default: 'bottom', description: 'Entry direction: left, right, top, or bottom.' },
      { name: 'start', type: 'string', default: '0ms', description: 'Reveal start time.' },
      { name: 'duration', type: 'string', default: '900ms', description: 'Reveal duration.' },
      { name: 'stagger', type: 'number', default: 28, description: 'Per-letter stagger in milliseconds.' },
      { name: 'distance', type: 'number', default: 28, description: 'Travel distance in scene pixels.' },
      { name: 'scaleFrom', type: 'number', default: 1.18, description: 'Initial letter scale.' }
    ],
    notes: 'Use for punchier title reveals when typewriter feels too mechanical.'
  },
  {
    id: 'word-drop-text-effect',
    jsxTag: 'TextEffect.WordDrop',
    title: 'Word Drop',
    description: 'Words drop in from a direction with opacity and stagger.',
    category: 'reveal',
    tags: ['text', 'words', 'drop'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'direction', type: 'string', default: 'top', description: 'Entry direction: left, right, top, or bottom.' },
      { name: 'start', type: 'string', default: '0ms', description: 'Reveal start time.' },
      { name: 'duration', type: 'string', default: '900ms', description: 'Reveal duration.' },
      { name: 'stagger', type: 'number', default: 80, description: 'Per-word stagger in milliseconds.' },
      { name: 'distance', type: 'number', default: 34, description: 'Travel distance in scene pixels.' }
    ],
    notes: 'Use for word-level b-roll headings or callouts.'
  },
  {
    id: 'wipe-text-effect',
    jsxTag: 'TextEffect.Wipe',
    title: 'Text Wipe',
    description: 'Directional text wipe using the shared stable reveal engine.',
    category: 'reveal',
    tags: ['text', 'wipe', 'reveal'],
    exampleId: 'text-effects-showcase',
    props: [
      { name: 'direction', type: 'string', default: 'left', description: 'Wipe direction: left, right, top, or bottom.' },
      { name: 'unit', type: 'string', default: 'characters', description: 'Wipe unit: characters, words, or lines.' },
      { name: 'start', type: 'string', default: '0ms', description: 'Reveal start time.' },
      { name: 'duration', type: 'string', default: '900ms', description: 'Reveal duration.' }
    ],
    notes: 'Use for mask-like text entrances while preserving final wrapping.'
  }
];

export const PROGRAMMATIC_SPAN_LAYOUTS: ProgrammaticSpanLayoutDefinition[] = [
  {
    id: 'v-stack-layout',
    jsxTag: 'VStack',
    title: 'Vertical Stack',
    description: 'Taffy-backed vertical flow for text blocks, buttons, and card interiors.',
    category: 'stack',
    tags: ['layout', 'stack', 'vertical'],
    exampleId: 'v-stack-layout',
    props: [
      { name: 'x', type: 'number', required: true, description: 'Layout left position.' },
      { name: 'y', type: 'number', required: true, description: 'Layout top position.' },
      { name: 'width', type: 'number', required: true, description: 'Layout width.' },
      { name: 'height', type: 'number', required: true, description: 'Layout height.' },
      { name: 'gap', type: 'number', default: 16, description: 'Vertical space between children.' },
      { name: 'padding', type: 'number', default: 0, description: 'Inner padding for all sides.' }
    ],
    notes: 'Use instead of hand-positioning title/body/button blocks.'
  },
  {
    id: 'h-stack-layout',
    jsxTag: 'HStack',
    title: 'Horizontal Row',
    description: 'Taffy-backed horizontal row for badges, toolbars, paired cards, and controls.',
    category: 'stack',
    tags: ['layout', 'row', 'horizontal'],
    exampleId: 'h-stack-layout',
    props: [
      { name: 'x', type: 'number', required: true, description: 'Layout left position.' },
      { name: 'y', type: 'number', required: true, description: 'Layout top position.' },
      { name: 'width', type: 'number', required: true, description: 'Layout width.' },
      { name: 'height', type: 'number', required: true, description: 'Layout height.' },
      { name: 'gap', type: 'number', default: 16, description: 'Horizontal space between children.' },
      { name: 'align', type: 'string', default: 'center', description: 'Cross-axis alignment.' }
    ],
    notes: 'Use for rows of controls or cards where equal spacing matters.'
  },
  {
    id: 'bento-layout',
    jsxTag: 'Bento',
    title: 'Bento Grid',
    description: 'Taffy-backed grid for full-frame scene composition with stable cells and gaps.',
    category: 'grid',
    tags: ['layout', 'grid', 'bento'],
    exampleId: 'bento-layout',
    props: [
      { name: 'x', type: 'number', required: true, description: 'Grid left position.' },
      { name: 'y', type: 'number', required: true, description: 'Grid top position.' },
      { name: 'width', type: 'number', required: true, description: 'Grid width.' },
      { name: 'height', type: 'number', required: true, description: 'Grid height.' },
      { name: 'columns', type: 'number', default: 12, description: 'Number of equal-width columns.' },
      { name: 'rows', type: 'number', default: 6, description: 'Number of equal-height rows.' },
      { name: 'gap', type: 'number', default: 20, description: 'Space between grid cells.' }
    ],
    notes: 'Use for whole-scene layout before adding detailed internal motion.'
  },
  {
    id: 'cell-layout',
    jsxTag: 'Cell',
    title: 'Bento Cell',
    description: 'Grid child that gives nested visuals a stable content box.',
    category: 'grid',
    tags: ['layout', 'grid', 'cell'],
    exampleId: 'bento-layout',
    props: [
      { name: 'col', type: 'number', required: true, description: '1-based starting column.' },
      { name: 'row', type: 'number', required: true, description: '1-based starting row.' },
      { name: 'colSpan', type: 'number', default: 1, description: 'Number of columns spanned.' },
      { name: 'rowSpan', type: 'number', default: 1, description: 'Number of rows spanned.' },
      { name: 'padding', type: 'number', default: 0, description: 'Inner cell padding.' },
      { name: 'align', type: 'string', default: 'start', description: 'Horizontal placement for children without x/centerX.' },
      { name: 'justify', type: 'string', default: 'start', description: 'Vertical placement for children without y/centerY.' }
    ],
    notes: 'Use `mode="fit"` for a single child that should fill the cell. Use `align="center" justify="center"` to center a child without hand-computed x/y.'
  },
  {
    id: 'motion-box-layout',
    jsxTag: 'MotionBox',
    title: 'Motion Box',
    description: 'Layout-sized animation container for pulsing, zooming, or rotating a complete child composition.',
    category: 'motion',
    tags: ['layout', 'motion', 'animation', 'transform'],
    exampleId: 'product-promo',
    props: [
      { name: 'width', type: 'number', required: true, description: 'Container width, often provided by a layout cell or percentage.' },
      { name: 'height', type: 'number', required: true, description: 'Container height, often provided by a layout cell or percentage.' },
      { name: 'scale', type: 'number', default: 1, description: 'Uniform child composition scale.' },
      { name: 'scaleX', type: 'number', default: 1, description: 'Horizontal child composition scale.' },
      { name: 'scaleY', type: 'number', default: 1, description: 'Vertical child composition scale.' },
      { name: 'rotation', type: 'number', default: 0, description: 'Rotation in degrees around the pivot.' },
      { name: 'pivotX', type: 'string', default: '50%', description: 'Pivot x. Percentages are relative to the container.' },
      { name: 'pivotY', type: 'string', default: '50%', description: 'Pivot y. Percentages are relative to the container.' }
    ],
    notes: 'Use inside `Cell`, `VStack`, or `HStack` when the layout should stay stable but the full child composition needs a pulse or zoom.'
  }
];

export const PROGRAMMATIC_SPAN_PRESETS: ProgrammaticSpanPresetDefinition[] = [
  ...PROGRAMMATIC_SPAN_ELEMENTS,
  ...PROGRAMMATIC_SPAN_BLOCKS
];

export const PROGRAMMATIC_SPAN_SCENE_TEMPLATES: ProgrammaticSpanSceneTemplateDefinition[] = [
  {
    id: 'product-promo',
    title: 'Product Promo',
    description: 'Full product b-roll scene with browser chrome, headline, metric, CTA, cursor, and click accent.',
    sourceKind: 'example',
    exampleId: 'product-promo',
    tags: ['product', 'browser', 'cta'],
    notes: 'Use as a complete scene template for product demo moments, not as a reusable element.'
  },
  {
    id: 'dashboard-window',
    title: 'Dashboard Window',
    description: 'Full dashboard-style b-roll scene using browser chrome, chart, metric side card, and CTA.',
    sourceKind: 'example',
    exampleId: 'dashboard-window',
    tags: ['dashboard', 'chart', 'browser'],
    notes: 'Use when the whole frame is an app/dashboard explanation.'
  },
  {
    id: 'split-generation-progress',
    title: 'Split Generation Progress',
    description: 'Transcript-inspired production pipeline scene generated from a structured scene brief.',
    sourceKind: 'scene-brief',
    briefId: 'split-generation-progress',
    designSystemId: 'mont-founder-clean',
    tags: ['pipeline', 'briefs', 'generation'],
    notes: 'Use for complete b-roll scenes that show script moments turning into generated scenes.'
  },
  {
    id: 'design-system-consistency',
    title: 'Design System Consistency',
    description: 'Full diagram scene explaining why design systems should control repeated generated b-roll.',
    sourceKind: 'scene-brief',
    briefId: 'design-system-consistency',
    designSystemId: 'mont-founder-clean',
    tags: ['design-system', 'diagram', 'consistency'],
    notes: 'Use for narrative explanation scenes about brand consistency and reusable visual identity.'
  },
  {
    id: 'dramatic-zoom-edit',
    title: 'Dramatic Zoom Edit',
    description: 'Full editor-like scene showing selected time range and targeted dramatic zoom edit.',
    sourceKind: 'scene-brief',
    briefId: 'dramatic-zoom-edit',
    designSystemId: 'mont-founder-clean',
    tags: ['editor', 'zoom', 'iteration'],
    notes: 'Use for complete scenes that demonstrate iterative agent edits after first generation.'
  }
];

export function getProgrammaticSpanPresetByTag(
  jsxTag: string
): ProgrammaticSpanPresetDefinition | null {
  return PROGRAMMATIC_SPAN_PRESETS.find((preset) => preset.jsxTag === jsxTag) ?? null;
}

export function getProgrammaticSpanElementByTag(
  jsxTag: string
): ProgrammaticSpanPresetDefinition | null {
  return PROGRAMMATIC_SPAN_ELEMENTS.find((element) => element.jsxTag === jsxTag) ?? null;
}

export function getProgrammaticSpanBlockByTag(
  jsxTag: string
): ProgrammaticSpanPresetDefinition | null {
  return PROGRAMMATIC_SPAN_BLOCKS.find((block) => block.jsxTag === jsxTag) ?? null;
}

export function getProgrammaticSpanEffectByTag(
  jsxTag: string
): ProgrammaticSpanEffectDefinition | null {
  return PROGRAMMATIC_SPAN_EFFECTS.find((effect) => effect.jsxTag === jsxTag) ?? null;
}

export function getProgrammaticSpanLayoutByTag(
  jsxTag: string
): ProgrammaticSpanLayoutDefinition | null {
  return PROGRAMMATIC_SPAN_LAYOUTS.find((layout) => layout.jsxTag === jsxTag) ?? null;
}

export function getProgrammaticSpanTextEffectByTag(
  jsxTag: string
): ProgrammaticSpanTextEffectDefinition | null {
  return PROGRAMMATIC_SPAN_TEXT_EFFECTS.find((effect) => effect.jsxTag === jsxTag) ?? null;
}

export function getProgrammaticSpanSceneTemplate(
  id: string
): ProgrammaticSpanSceneTemplateDefinition | null {
  return PROGRAMMATIC_SPAN_SCENE_TEMPLATES.find((template) => template.id === id) ?? null;
}
