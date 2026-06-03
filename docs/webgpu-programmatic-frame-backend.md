# WebGPU Programmatic Frame Backend Plan

The public renderer scope is programmatic template frames, not the full Mont timeline/editor renderer. The same frame IR must render in Mont and in Creator Studio, but editor state, timeline composition, authenticated media resolution, telemetry, catalog APIs, and selection overlays stay outside this repo.

## Current Public Boundary

- `@usemont/scene-model` owns the public `Visual` IR and shape helpers.
- `@usemont/programmatic-spans` owns TSX compile/evaluate, Taffy layout, settings/tokens, text effects, procedural visual evaluation, and diagnostics.
- `@usemont/scene-renderer` owns reusable frame rendering. The first backend is deterministic Canvas2D.
- `createProgrammaticSceneFramePlan` is the backend-safe planning boundary: it sorts visuals, normalizes attribute reads, and reports unsupported visual types before any backend draws.

## Staged Extraction

1. Keep Canvas2D as the deterministic reference backend and expand operation/golden coverage for representative templates.
2. Move backend-neutral frame planning into `@usemont/scene-renderer` first. This is now in `programmaticFramePlan.ts` and must stay free of Mont app imports.
3. Introduce a public `ProgrammaticFrameBackend` interface with `prepare(plan, providers)` and `draw(timestampMs)` methods. Providers cover assets, fonts, Lottie/model loading, debug logging, and optional telemetry hooks.
4. Extract WebGPU-safe renderer-core modules only after their inputs are plain public records:
   - shape path tessellation and geometry buffers,
   - text atlas/font provider interface,
   - image/Lottie/model resource handles,
   - effect normalization for blur, shadow, glow, tilt shift, and camera effects.
5. Add a WebGPU backend behind feature detection. Unsupported browser/runtime cases keep using Canvas2D, and unsupported visual types draw explicit diagnostic placeholders.
6. Add cross-backend browser smoke and golden-frame comparison for the same fixed timestamps used by the Canvas2D smoke.

## Non-Goals

- Do not move `WebGpuSceneRenderer.svelte` wholesale into this repo.
- Do not import Supabase, OpenRouter, Mont API clients, editor stores, timeline state, MCP code, telemetry implementations, or authenticated media fetchers.
- Do not make the public backend depend on a specific Studio layout. Studio and Mont should compose the same renderer package through host adapters.

## Next Backend-Safe Modules

The next useful public modules are:

- `programmaticEffectPlan.ts` for normalized blur/shadow/glow/tilt-shift/camera effect records.
- `programmaticAssetPlan.ts` for resolving visual asset requests into provider calls without Mont auth coupling.
- `programmaticTextPlan.ts` for stable text wrapping, font loading, and glyph atlas inputs shared by Canvas2D and WebGPU.
