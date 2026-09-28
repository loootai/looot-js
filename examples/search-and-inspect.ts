// Free, needs LOOOT_TOKEN (catalog.read): search a job, then inspect the top endpoint.
// Run: LOOOT_TOKEN=... node examples/search-and-inspect.ts
import { Looot } from "../src/index.ts";

const looot = new Looot();

const found = await looot.search({ q: "verify an email", prefer: "cheapest", limit: 5 });
for (const e of found.endpoints) {
  console.log(`${e.endpointId.padEnd(28)} ${e.access} ${e.estimatedPrice} ${e.priceBasis ?? ""}`);
}

const top = found.endpoints.find((e) => e.access === "runs_now");
if (top) {
  const spec = await looot.inspect(top.endpointId);
  console.log(spec.endpoint.price?.estimateFormula);
  console.log(JSON.stringify(spec.inputSchema, null, 2));
}
