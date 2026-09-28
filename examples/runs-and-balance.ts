// Free, needs LOOOT_TOKEN (runs.read, usage.read): balance, recent runs and one run's receipts.
// Run: LOOOT_TOKEN=... node examples/runs-and-balance.ts
import { Looot } from "../src/index.ts";

const looot = new Looot();

const balance = await looot.balance();
console.log(`available $${balance.available}, reserved $${balance.reserved}, minimum top-up $${balance.topUpLink?.minimumUsd}`);

const recent = await looot.listRuns({ limit: 5 });
for (const r of recent.runs ?? []) console.log(r.runId, r.status, r.endpointId, r.actualCost);

const first = recent.runs?.[0];
if (first) {
  const { attempts } = await looot.runAttempts(first.runId);
  // Each attempt carries its provider, status, cost and receipt. Print it whole.
  for (const a of attempts) console.log(JSON.stringify(a));
}
