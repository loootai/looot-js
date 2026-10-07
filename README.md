# looot for TypeScript

A small typed client for the [looot](https://looot.ai) REST API. looot is one gateway to about
2,500 data provider operations (email find and verify, company enrichment, SEO and SERP data,
social profiles, web scraping) with one token, one prepaid balance and one run contract.

The client is hand-written over `fetch` from the public OpenAPI at
https://api.looot.ai/openapi.json. It has no runtime dependencies and runs on Node 22.18+, Bun,
Deno and modern browsers.

> Status: public, MIT. The npm name `looot` belongs to the looot CLI, so this package is
> `looot-js`. It is not on npm yet; until then install from GitHub.

## Install

```bash
npm install github:loootai/looot-js     # until the npm release
```

## 60-second quickstart

Browsing is free and needs no token:

```ts
import { Looot } from "looot-js";

const looot = new Looot();
const overview = await looot.catalogOverview({ topic: "email" });
for (const job of overview.jobs ?? []) console.log(job.id, job.providerCount, job.cheapestPerCall);
```

Search, inspect and run need an agent token. Create one at looot.ai (Settings, Agent tokens)
and export it; the client reads `LOOOT_TOKEN`:

```ts
const found = await looot.search({ q: "verify an email", prefer: "cheapest" });
const spec = await looot.inspect(found.endpoints[0].endpointId);

// Paid. Top up first: looot.balance() shows the minimum.
const run = await looot.runJob({
  job: "people.email.verify",
  input: { email: "jane.doe@example.com" },
  prefer: "cheapest",
  fallback: { maxAttempts: 3, maxCostUsd: 0.05 },
  wait: 30,
});
if (run.status === "completed") console.log(run.outcome, run.normalized, run.actualCost);
else console.error(run.status, run.error);
```

## Methods

| Method | Route | Token | Cost |
| --- | --- | --- | --- |
| `catalogOverview({ depth, category, platform, topic })` | `GET /v1/catalog/overview` | no | free |
| `publicCatalog({ q, capability, category, provider, limit, cursor })` | `GET /v1/public-catalog` | no | free |
| `publicCatalogItem(id)` | `GET /v1/public-catalog/{id}` | no | free |
| `search({ q, capability, prefer, maxPriceMicros, ... })` | `GET /v1/catalog/search` | yes | free |
| `inspect(endpointId)` | `GET /v1/operations/{id}` | yes | free |
| `run({ endpointId, input, idempotencyKey, wait, fallback })` | `POST /v1/runs` | yes | paid |
| `runJob({ job, input, prefer, fallback, wait })` | `POST /v1/runs` with `job:<id>` | yes | paid |
| `getRun(runId)`, `listRuns({ status, capability, limit, cursor })` | `GET /v1/runs...` | yes | free |
| `cancelRun(runId)`, `runAttempts(runId)` | `/v1/runs/{id}/cancel`, `/attempts` | yes | free |
| `balance()` | `GET /v1/balance` | yes (`usage.read`) | free |

Notes that matter:

- A resolved `run` is not success. Check `run.status` and `run.error`: a bad input or an unknown
  endpoint answers 201 with `status: "failed"`.
- `idempotencyKey` is generated when you omit it. Pass your own to make a retry after a crash
  return the same run instead of starting a second one.
- `wait` is seconds (0 to 60). Without it the run comes back `queued`; poll `getRun`.
- `runJob` sends `endpointId: "job:<id>"`. `prefer` is sent as `fallback.prefer`, so setting it
  turns fallback on. Only attempts that ran are charged, inside one hold.
- HTTP errors throw `LoootError` with `status`, `code` (e.g. `insufficient_balance`),
  `requestId` and the raw `body` (a 402 body carries `topUp.checkoutUrl`).

## Examples

```bash
node examples/overview.ts                                   # free, no token
LOOOT_TOKEN=... node examples/search-and-inspect.ts         # free, token
LOOOT_TOKEN=... node examples/runs-and-balance.ts           # free, token
LOOOT_TOKEN=... node examples/run-job-with-fallback.ts jane.doe@example.com   # PAID
```

## Develop

```bash
npm install                  # typescript 5.9.3 only, scripts disabled by .npmrc
npm run typecheck
npm test                     # offline, fake fetch
npm run test:live            # free routes only; search runs only if LOOOT_TOKEN is set
npm run build                # emits dist/
npm run scan                 # leak scanner
git config core.hooksPath .githooks
```

## Links

- API reference: https://api.looot.ai/openapi.json
- Agent guide: https://api.looot.ai/llms.txt and https://api.looot.ai/llms-full.txt
- Docs: https://looot.ai/docs
- MCP server: https://api.looot.ai/mcp

## License

MIT. See [LICENSE](LICENSE).
