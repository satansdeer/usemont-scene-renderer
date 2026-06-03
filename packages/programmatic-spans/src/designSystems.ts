import type { ProgrammaticSpanEasing } from './types.js';

export type ProgrammaticSpanDesignSystemId = string;
export type ProgrammaticSpanDensity = 'airy' | 'balanced' | 'dense';
export type ProgrammaticSpanMotionPace = 'calm' | 'snappy' | 'dramatic';
export type ProgrammaticSpanCameraZoomStyle = 'none' | 'subtle' | 'dramatic';

export interface ProgrammaticSpanDesignSystemPalette {
  background: string;
  foreground: string;
  muted: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  accent: string;
  accentSecondary: string;
  positive: string;
  warning: string;
  danger: string;
}

export interface ProgrammaticSpanDesignSystemTypography {
  fontFamily: string;
  heroSize: number;
  titleSize: number;
  bodySize: number;
  labelSize: number;
  heroWeight: string;
  bodyWeight: string;
  labelWeight: string;
}

export interface ProgrammaticSpanDesignSystemSurfaces {
  radiusSm: number;
  radiusMd: number;
  radiusLg: number;
  borderWidth: number;
  panelPadding: number;
  chromeHeaderHeight: number;
}

export interface ProgrammaticSpanDesignSystemDiagram {
  rootFill: string;
  branchFill: string;
  finalFill: string;
  connectorColor: string;
  nodeTextColor: string;
}

export interface ProgrammaticSpanDesignSystemMotion {
  pace: ProgrammaticSpanMotionPace;
  enterMs: number;
  staggerMs: number;
  primaryEase: ProgrammaticSpanEasing;
  secondaryEase: ProgrammaticSpanEasing;
}

export interface ProgrammaticSpanDesignSystemCamera {
  zoomStyle: ProgrammaticSpanCameraZoomStyle;
  zoomScale: number;
  panAmplitude: number;
}

export interface ProgrammaticSpanDesignSystemDensityTokens {
  density: ProgrammaticSpanDensity;
  safeMargin: number;
  gridGap: number;
}

export interface ProgrammaticSpanDesignSystem {
  id: ProgrammaticSpanDesignSystemId;
  name: string;
  description: string;
  palette: ProgrammaticSpanDesignSystemPalette;
  typography: ProgrammaticSpanDesignSystemTypography;
  surfaces: ProgrammaticSpanDesignSystemSurfaces;
  diagram: ProgrammaticSpanDesignSystemDiagram;
  motion: ProgrammaticSpanDesignSystemMotion;
  density: ProgrammaticSpanDesignSystemDensityTokens;
  camera: ProgrammaticSpanDesignSystemCamera;
}

export const DEFAULT_PROGRAMMATIC_SPAN_DESIGN_SYSTEM: ProgrammaticSpanDesignSystem = {
  id: 'mont-founder-clean',
  name: 'Mont Founder Clean',
  description: 'High-contrast product b-roll with teal accents, crisp browser chrome, and calm reveal motion.',
  palette: {
    background: '#0f172a',
    foreground: '#f8fafc',
    muted: '#94a3b8',
    surface: '#f8fafc',
    surfaceAlt: '#e0f2fe',
    border: '#bae6fd',
    accent: '#14b8a6',
    accentSecondary: '#ec4899',
    positive: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444'
  },
  typography: {
    fontFamily: 'Inter, Arial, sans-serif',
    heroSize: 58,
    titleSize: 40,
    bodySize: 24,
    labelSize: 18,
    heroWeight: '800',
    bodyWeight: '500',
    labelWeight: '700'
  },
  surfaces: {
    radiusSm: 12,
    radiusMd: 20,
    radiusLg: 28,
    borderWidth: 2,
    panelPadding: 36,
    chromeHeaderHeight: 64
  },
  diagram: {
    rootFill: '#fef3c7',
    branchFill: '#dcfce7',
    finalFill: '#dbeafe',
    connectorColor: '#f59e0b',
    nodeTextColor: '#0f172a'
  },
  motion: {
    pace: 'calm',
    enterMs: 520,
    staggerMs: 160,
    primaryEase: 'outCubic',
    secondaryEase: 'outQuad'
  },
  density: {
    density: 'balanced',
    safeMargin: 72,
    gridGap: 28
  },
  camera: {
    zoomStyle: 'subtle',
    zoomScale: 1.035,
    panAmplitude: 22
  }
};

export const PROGRAMMATIC_SPAN_DESIGN_SYSTEMS: ProgrammaticSpanDesignSystem[] = [
  DEFAULT_PROGRAMMATIC_SPAN_DESIGN_SYSTEM,
  {
    id: 'editorial-graphite',
    name: 'Editorial Graphite',
    description: 'Neutral editorial frames with restrained red accents and denser information layout.',
    palette: {
      background: '#1c1917',
      foreground: '#fafaf9',
      muted: '#a8a29e',
      surface: '#fafaf9',
      surfaceAlt: '#f5f5f4',
      border: '#d6d3d1',
      accent: '#dc2626',
      accentSecondary: '#f97316',
      positive: '#16a34a',
      warning: '#d97706',
      danger: '#b91c1c'
    },
    typography: {
      fontFamily: 'Inter, Arial, sans-serif',
      heroSize: 54,
      titleSize: 36,
      bodySize: 22,
      labelSize: 16,
      heroWeight: '800',
      bodyWeight: '500',
      labelWeight: '700'
    },
    surfaces: {
      radiusSm: 8,
      radiusMd: 16,
      radiusLg: 24,
      borderWidth: 2,
      panelPadding: 32,
      chromeHeaderHeight: 58
    },
    diagram: {
      rootFill: '#fee2e2',
      branchFill: '#ffedd5',
      finalFill: '#e7e5e4',
      connectorColor: '#dc2626',
      nodeTextColor: '#1c1917'
    },
    motion: {
      pace: 'snappy',
      enterMs: 420,
      staggerMs: 120,
      primaryEase: 'outCubic',
      secondaryEase: 'outQuad'
    },
    density: {
      density: 'dense',
      safeMargin: 60,
      gridGap: 22
    },
    camera: {
      zoomStyle: 'dramatic',
      zoomScale: 1.08,
      panAmplitude: 34
    }
  }
];

export function getProgrammaticSpanDesignSystem(
  id: ProgrammaticSpanDesignSystemId | null | undefined
): ProgrammaticSpanDesignSystem {
  return (
    PROGRAMMATIC_SPAN_DESIGN_SYSTEMS.find((designSystem) => designSystem.id === id) ??
    DEFAULT_PROGRAMMATIC_SPAN_DESIGN_SYSTEM
  );
}
