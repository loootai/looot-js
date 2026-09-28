// Offline tests: a fake fetch records each request, so nothing leaves the machine.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Looot, LoootError } from "../src/index.ts";

interface Call {
  url: URL;
  method: string;
  headers: Record<string, string>;
  body: unknown;
}

function fakeFetch(status: number, payload: unknown) {
  const calls: Call[] = [];
  const fn = (async (input: URL | RequestInfo, init?: RequestInit) => {
    calls.push({
      url: new URL(String(input)),
      method: init?.method ?? "GET",
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    });
    return new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { fn, calls };
}

test("catalogOverview sends no Authorization header", async () => {
  const { fn, calls } = fakeFetch(200, { revision: "1", builtAt: "x" });
  await new Looot({ token: "t", fetch: fn }).catalogOverview({ topic: "email" });
  assert.equal(calls[0]!.url.pathname, "/v1/catalog/overview");
  assert.equal(calls[0]!.url.searchParams.get("topic"), "email");
  assert.equal(calls[0]!.headers.authorization, undefined);
});

test("search sends the bearer token and drops undefined params", async () => {
  const { fn, calls } = fakeFetch(200, { endpoints: [] });
  await new Looot({ token: "abc", fetch: fn }).search({ q: "verify an email", prefer: "cheapest", limit: undefined });
  assert.equal(calls[0]!.headers.authorization, "Bearer abc");
  assert.equal(calls[0]!.url.searchParams.get("prefer"), "cheapest");
  assert.equal(calls[0]!.url.searchParams.has("limit"), false);
});

test("a token route without a token fails before any request", async () => {
  const { fn, calls } = fakeFetch(200, {});
  await assert.rejects(
    new Looot({ token: "", fetch: fn }).balance(),
    (e: unknown) => e instanceof LoootError && e.code === "missing_token",
  );
  assert.equal(calls.length, 0);
});

test("runJob posts job:<id>, puts wait in the query and prefer in fallback", async () => {
  const { fn, calls } = fakeFetch(201, { runId: "run_1", status: "completed" });
  const run = await new Looot({ token: "t", fetch: fn }).runJob({
    job: "people.email.verify",
    input: { email: "jane.doe@example.com" },
    wait: 20,
    prefer: "cheapest",
    idempotencyKey: "k1",
  });
  assert.equal(run.runId, "run_1");
  const call = calls[0]!;
  assert.equal(call.method, "POST");
  assert.equal(call.url.searchParams.get("wait"), "20");
  assert.deepEqual(call.body, {
    endpointId: "job:people.email.verify",
    input: { email: "jane.doe@example.com" },
    idempotencyKey: "k1",
    fallback: { prefer: "cheapest" },
  });
});

test("run keeps an explicit fallback object and generates an idempotency key", async () => {
  const { fn, calls } = fakeFetch(201, { runId: "run_2", status: "queued" });
  await new Looot({ token: "t", fetch: fn }).run({
    endpointId: "icypeas-email-verify",
    input: { email: "jane.doe@example.com" },
    fallback: { maxAttempts: 2, maxCostUsd: 0.05 },
  });
  const body = calls[0]!.body as Record<string, unknown>;
  assert.deepEqual(body.fallback, { maxAttempts: 2, maxCostUsd: 0.05 });
  assert.match(String(body.idempotencyKey), /^sdk-/);
});

test("maps the gateway error body to LoootError", async () => {
  const { fn } = fakeFetch(402, {
    error: { code: "insufficient_balance", message: "Top up to continue", requestId: "req_1" },
    topUp: { minimumUsd: 5 },
  });
  await assert.rejects(
    new Looot({ token: "t", fetch: fn }).run({ endpointId: "x", input: {} }),
    (e: unknown) =>
      e instanceof LoootError && e.status === 402 && e.code === "insufficient_balance" && e.requestId === "req_1",
  );
});
