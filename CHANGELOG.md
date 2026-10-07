# Changelog

## 0.1.0 (2026-10-08)

- First client: `catalogOverview`, `publicCatalog`, `publicCatalogItem`, `search`, `inspect`,
  `run`, `runJob` (`job:<id>`, `prefer`, `fallback`), `getRun`, `listRuns`, `cancelRun`,
  `runAttempts`, `balance`.
- `LoootError` maps the gateway's `{ error: { code, message, requestId } }` body.
- MIT licence. Package name is `looot-js`; `looot` on npm is the CLI.
- `wait` is sent as a query parameter, as documented at https://api.looot.ai/openapi.json.
