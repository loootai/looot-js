# Changelog

## 0.1.0 (unreleased)

- First client: `catalogOverview`, `publicCatalog`, `publicCatalogItem`, `search`, `inspect`,
  `run`, `runJob` (`job:<id>`, `prefer`, `fallback`), `getRun`, `listRuns`, `cancelRun`,
  `runAttempts`, `balance`.
- `LoootError` maps the gateway's `{ error: { code, message, requestId } }` body.
- Package name `looot-js` is a placeholder. `looot` on npm is the CLI.
