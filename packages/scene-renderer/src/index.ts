import type { SceneConfig, Visual } from '@usemont/scene-model';
export * from './canvasProgrammaticFrameRenderer.js';
export * from './programmaticFramePlan.js';

export type SceneRendererAssetRequest = {
  src: string;
  contentType?: string;
  visualId?: string;
  kind?: 'image' | 'lottie' | 'model3d' | 'gif' | 'svg' | 'unknown';
};

export type SceneRendererResolvedAsset = {
  url?: string;
  blob?: Blob;
  contentType?: string;
  cacheKey?: string;
  dispose?: () => void;
};

export type SceneRendererAssetResolver = (
  request: SceneRendererAssetRequest
) => Promise<SceneRendererResolvedAsset | null> | SceneRendererResolvedAsset | null;

export type ProgrammaticSceneRendererProps = {
  visuals: Visual[];
  sceneWidth: number;
  sceneHeight: number;
  timestampMs: number;
  sceneConfig?: Partial<SceneConfig>;
  assetResolver?: SceneRendererAssetResolver;
};

export const PROGRAMMATIC_SCENE_RENDERER_PUBLIC_CONTRACT_VERSION = 1;
