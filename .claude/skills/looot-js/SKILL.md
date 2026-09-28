---
name: looot-js
description: Work on looot-js, the hand-written TypeScript client for the public looot REST API. Use when adding or changing a method, a type, an example or a test, or when preparing a release.
---

# looot-js

## What this repo is

A dependency-free TypeScript client over `fetch` for `https://api.looot.ai`. Types in
`src/types.ts` follow the public OpenAPI and `llms-full.txt`; response objects stay open so a
new gateway field never breaks a caller. `src/client.ts` has one method per route.

## Build and test

```bash
npm install                  # typescript 5.9.3, install scripts off (.npmrc)
npm run typecheck
npm test                     # offline, fake fetch
npm run test:live            # free routes only (overview, public catalog); search if LOOOT_TOKEN
npm run build                # dist/ via tsconfig.build.json
npm run scan
git config core.hooksPath .githooks
```

Node 22.18+ runs the `.ts` tests directly (type stripping), so source must stay erasable:
no enums, no namespaces, no parameter properties.

## Adding a method

1. Find the route in `https://api.looot.ai/openapi.json` and its wording in `llms-full.txt`.
2. Add request and response types to `src/types.ts`. Type only fields the public docs name.
3. Add the method with a one-line JSDoc that says token and cost.
4. Add an offline test with the fake fetch. Add a live test only for a free route.

## Release later (only after the owner says yes)

1. Pick the npm name (the `looot` name is the CLI). Remove `"private": true`.
2. Bump `package.json` and `CHANGELOG.md`, `npm run ci`, `npm publish`, tag `vX.Y.Z`.

## Public looot surface this repo may use

`https://api.looot.ai/openapi.json`, `/llms.txt`, `/llms-full.txt`, `/catalog/*.md`, the REST
routes under `https://api.looot.ai/v1/`, and `https://looot.ai/docs`.

## Never

- Copy code, types or text from the private gateway repo. Work from the public OpenAPI only.
- Commit a token, key, `.env` file or any secret.
- Write internal hosts, local machine paths, workspace or customer ids, or personal emails.
- Name private repos or private branches.
- Call a paid route (`run`, `runJob`, `discover_smart`) from a test.
