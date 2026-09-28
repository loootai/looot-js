// Live tests against looot's FREE routes only. No run is ever created here.
// catalogOverview and publicCatalog need no token. search runs only when LOOOT_TOKEN is set
// (it is free but needs catalog.read); otherwise it is skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Looot, LoootError } from "../src/index.ts";

const client = new Looot();
const hasToken = Boolean(process.env.LOOOT_TOKEN);

test("catalogOverview returns totals and categories", async () => {
  const o = await client.catalogOverview();
  assert.ok(o.totals && o.totals.endpoints > 0, "expected endpoints in the catalog");
  assert.ok(o.categories && o.categories.length > 0);
});

test("catalogOverview topic=email lists people.email.verify", async () => {
  const o = await client.catalogOverview({ topic: "email" });
  const job = o.jobs?.find((j) => j.id === "people.email.verify");
  assert.ok(job, "people.email.verify should be a job");
  assert.ok(job.providerCount >= 1);
});

test("publicCatalog filters by capability and lists each endpoint's inputs", async () => {
  const page = await client.publicCatalog({ capability: "people_email_verify", limit: 5 });
  assert.ok(page.items.length > 0);
  for (const item of page.items) {
    assert.ok(item.parameters.some((p) => p.name === "email" && p.required), `${item.catalogItemId} takes email`);
  }
});

test("publicCatalogItem returns one item", async () => {
  const item = await client.publicCatalogItem("icypeas-email-verify");
  assert.equal(item.catalogItemId, "icypeas-email-verify");
});

test("a token route without a token is refused, not charged", async () => {
  const anon = new Looot({ token: "", baseUrl: "https://api.looot.ai" });
  // An empty token counts as missing, so the SDK refuses before sending anything.
  await assert.rejects(anon.search({ q: "verify an email" }), (e: unknown) => e instanceof LoootError);
});

test("search ranks endpoints for a plain-English job", { skip: !hasToken && "LOOOT_TOKEN not set" }, async () => {
  const r = await client.search({ q: "verify an email", limit: 3 });
  assert.ok(Array.isArray(r.endpoints));
});
