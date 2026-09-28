// PAID: verifies one email through the job, cheapest provider first, with fallback.
// Needs LOOOT_TOKEN (runs.execute) and a topped-up balance. Costs a few tenths of a cent.
// Run: LOOOT_TOKEN=... node examples/run-job-with-fallback.ts jane.doe@example.com
import { Looot, LoootError } from "../src/index.ts";

const email = process.argv[2];
if (!email) throw new Error("usage: node examples/run-job-with-fallback.ts <email>");

const looot = new Looot();
try {
  const run = await looot.runJob({
    job: "people.email.verify",
    input: { email },
    prefer: "cheapest",
    fallback: { maxAttempts: 3, maxCostUsd: 0.05 },
    wait: 30,
  });
  console.log(run.status, run.outcome, `served by ${run.route?.servedBy ?? run.endpointId}`);
  console.log("normalized:", run.normalized ?? "(none)");
  console.log("charged:", run.actualCost);
  if (run.status === "failed") console.error(run.error);
} catch (e) {
  if (e instanceof LoootError && e.code === "insufficient_balance") {
    console.error("Top up first:", (e.body as { topUp?: { checkoutUrl?: string } }).topUp?.checkoutUrl);
  } else {
    throw e;
  }
}
