# Usemont Scene Renderer

Public scene model and programmatic frame renderer packages used by Mont and the Mont programmatic template Studio.

## Packages

- `@usemont/scene-model` - public visual IR, scene config, shape helpers, interpolation helpers, and `createVisual`.
- `@usemont/programmatic-spans` - TSX compiler, evaluator, Taffy layout, settings/tokens, default assets, presets, and procedural visual helpers for programmatic template frames.
- `@usemont/scene-renderer` - reusable programmatic frame renderer APIs for authoring/preview surfaces.

V1 scope is programmatic template frames. The full Mont timeline/editor renderer, project state adapters, auth, media authorization, telemetry, catalog, and LLM integrations stay outside this repository.

## Development

```sh
pnpm install
pnpm check
pnpm build
```

`pnpm check` runs:

- TypeScript checks for all packages.
- Deterministic programmatic renderer smoke coverage for representative templates.
- Real-browser canvas smoke coverage for the shared renderer host.
- Public package boundary checks.
- `npm pack` plus clean consumer install/import validation.

The browser smoke uses Playwright Chromium. On a fresh machine, install the browser once:

```sh
pnpm exec playwright install chromium
```

## Local Consumer Linking

Consumers should import the published package names directly:

```ts
import { compileProgrammaticSpanTsx } from '@usemont/programmatic-spans';
import { drawProgrammaticSceneFrame } from '@usemont/scene-renderer';
```

For local development, keep those imports unchanged and link the packages at the package-manager layer. In a consumer repo, prefer `pnpm.overrides`, `pnpm link`, or workspace protocol overrides that point `@usemont/scene-model`, `@usemont/programmatic-spans`, and `@usemont/scene-renderer` at this checkout. Do not add source imports to Mont app internals or to this repository's `src` paths.

## Public Boundary

Public packages must not import Mont app internals such as `$lib`, `$types`, Supabase, API server code, telemetry, MCP, backend code, or editor stores. Provider interfaces should be used for assets, fonts, media loading, diagnostics, and optional telemetry.

The staged WebGPU extraction path is documented in [docs/webgpu-programmatic-frame-backend.md](docs/webgpu-programmatic-frame-backend.md).

## Publishing

Publish order:

1. `@usemont/scene-model`
2. `@usemont/programmatic-spans`
3. `@usemont/scene-renderer`

Use `0.x` versions until the frame/visual contract stabilizes. Before publishing, run:

```sh
pnpm check
pnpm --filter @usemont/scene-model publish --access public
pnpm --filter @usemont/programmatic-spans publish --access public
pnpm --filter @usemont/scene-renderer publish --access public
```
