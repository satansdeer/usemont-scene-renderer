# Usemont Scene Renderer

Public scene model and programmatic frame renderer packages used by Mont and the Mont programmatic template Studio.

## Packages

- `@usemont/scene-model` - public visual IR, scene config, shape helpers, interpolation helpers, and `createVisual`.
- `@usemont/scene-renderer` - reusable programmatic frame renderer APIs for authoring/preview surfaces.

V1 scope is programmatic template frames. The full Mont timeline/editor renderer, project state adapters, auth, media authorization, telemetry, catalog, and LLM integrations stay outside this repository.

## Development

```sh
pnpm install
pnpm check
pnpm build
```

`pnpm check` runs:

- TypeScript checks for both packages.
- Public package boundary checks.
- `npm pack` plus clean consumer install/import validation.

## Public Boundary

Public packages must not import Mont app internals such as `$lib`, `$types`, Supabase, API server code, telemetry, MCP, backend code, or editor stores. Provider interfaces should be used for assets, fonts, media loading, diagnostics, and optional telemetry.

## Publishing

Publish order:

1. `@usemont/scene-model`
2. `@usemont/scene-renderer`

Use `0.x` versions until the frame/visual contract stabilizes. Before publishing, run:

```sh
pnpm check
pnpm --filter @usemont/scene-model publish --access public
pnpm --filter @usemont/scene-renderer publish --access public
```
