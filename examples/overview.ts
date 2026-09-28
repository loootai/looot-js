// Free, no token: what the catalog covers, then the jobs that match "email".
// Run: node examples/overview.ts
import { Looot } from "../src/index.ts";

const looot = new Looot();

const summary = await looot.catalogOverview();
console.log(`${summary.totals?.endpoints} endpoints, ${summary.totals?.jobs} jobs, ${summary.totals?.providers} providers`);

const email = await looot.catalogOverview({ topic: "email" });
for (const job of email.jobs ?? []) {
  console.log(`${job.id.padEnd(32)} ${job.providerCount} providers, from $${job.cheapestPerCall ?? "?"} per call`);
}
