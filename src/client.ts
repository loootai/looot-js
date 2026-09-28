// A small typed client for the looot REST API over fetch. No runtime dependencies.
import type {
  AttemptList,
  Balance,
  CatalogOverview,
  FallbackOptions,
  InspectResult,
  ListRunsParams,
  OverviewParams,
  Prefer,
  PublicCatalogItem,
  PublicCatalogPage,
  PublicCatalogParams,
  Run,
  RunList,
  RunParams,
  SearchParams,
  SearchResult,
} from "./types.ts";

/** The hosted looot API. */
export const DEFAULT_BASE_URL = "https://api.looot.ai";

export interface LoootOptions {
  /** Agent token (cs_ms_...). Defaults to the LOOOT_TOKEN environment variable. */
  token?: string;
  /** Defaults to https://api.looot.ai. */
  baseUrl?: string;
  /** Per-request timeout in ms. Default 75 000, enough for a 60 s inline wait. */
  timeoutMs?: number;
  /** Custom fetch, for tests or proxies. */
  fetch?: typeof fetch;
}

/** Thrown for any non-2xx answer. `code` is the gateway's error code, e.g. insufficient_balance. */
export class LoootError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | undefined;
  readonly body: unknown;

  constructor(status: number, code: string, message: string, requestId: string | undefined, body: unknown) {
    super(message);
    this.name = "LoootError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
    this.body = body;
  }
}

/** Options for runJob: the job id plus the usual run options. */
export interface RunJobParams extends Omit<RunParams, "endpointId"> {
  /** A job id from the catalog overview, e.g. people.email.verify. */
  job: string;
  /** Provider order inside the job. Sets fallback.prefer, which turns fallback on. */
  prefer?: Prefer;
}

type Query = Record<string, string | number | boolean | undefined>;

function readEnvToken(): string | undefined {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  const value = env?.LOOOT_TOKEN?.trim();
  return value ? value : undefined;
}

function newIdempotencyKey(): string {
  return `sdk-${globalThis.crypto.randomUUID()}`;
}

/** Client for the looot REST API. */
export class Looot {
  readonly baseUrl: string;
  readonly #token: string | undefined;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  constructor(options: LoootOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, "");
    this.#token = options.token ?? readEnvToken();
    this.#timeoutMs = options.timeoutMs ?? 75_000;
    this.#fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  }

  /** Free, no token. Categories, platforms and jobs with counts and cheapest prices. */
  catalogOverview(params: OverviewParams = {}): Promise<CatalogOverview> {
    return this.#request("GET", "/v1/catalog/overview", { query: { ...params }, auth: false });
  }

  /** Free, no token. Published catalog items with their parameters and price. */
  publicCatalog(params: PublicCatalogParams = {}): Promise<PublicCatalogPage> {
    return this.#request("GET", "/v1/public-catalog", { query: { ...params }, auth: false });
  }

  /** Free, no token. One published catalog item by id. */
  publicCatalogItem(catalogItemId: string): Promise<PublicCatalogItem> {
    return this.#request("GET", `/v1/public-catalog/${encodeURIComponent(catalogItemId)}`, { auth: false });
  }

  /** Free, needs a token with catalog.read. Ranked search across every provider. */
  search(params: SearchParams): Promise<SearchResult> {
    return this.#request("GET", "/v1/catalog/search", { query: { ...params } });
  }

  /** Free, needs a token. Input and output schema, price formula and estimated max cost. */
  inspect(endpointId: string): Promise<InspectResult> {
    return this.#request("GET", `/v1/operations/${encodeURIComponent(endpointId)}`);
  }

  /**
   * Paid. Holds the estimated cost, runs the endpoint and settles. A resolved promise is not
   * success: check `run.status` and `run.error`. Pass the same idempotencyKey to retry safely.
   */
  run(params: RunParams): Promise<Run> {
    const { wait, ...rest } = params;
    const body = { ...rest, idempotencyKey: params.idempotencyKey ?? newIdempotencyKey() };
    return this.#request("POST", "/v1/runs", {
      query: wait === undefined ? {} : { wait },
      body,
    });
  }

  /** Paid. Runs a job (endpointId "job:<id>"): looot picks the first provider that accepts the input. */
  runJob(params: RunJobParams): Promise<Run> {
    const { job, prefer, fallback, ...rest } = params;
    let fb: boolean | FallbackOptions | undefined = fallback;
    if (prefer) {
      fb = typeof fallback === "object" ? { ...fallback, prefer } : { prefer };
    }
    return this.run({ ...rest, endpointId: `job:${job}`, ...(fb === undefined ? {} : { fallback: fb }) });
  }

  /** One run: status, result, cost and error. */
  getRun(runId: string): Promise<Run> {
    return this.#request("GET", `/v1/runs/${encodeURIComponent(runId)}`);
  }

  /** Run history, newest first, as short summaries. */
  listRuns(params: ListRunsParams = {}): Promise<RunList> {
    return this.#request("GET", "/v1/runs", { query: { ...params } });
  }

  /** Cancels a queued or running run. */
  cancelRun(runId: string): Promise<Run> {
    return this.#request("POST", `/v1/runs/${encodeURIComponent(runId)}/cancel`);
  }

  /** Every attempt for a run with its receipt id and cost. */
  runAttempts(runId: string): Promise<AttemptList> {
    return this.#request("GET", `/v1/runs/${encodeURIComponent(runId)}/attempts`);
  }

  /** Available and reserved balance, plus the minimum top-up and a payment link. Needs usage.read. */
  balance(): Promise<Balance> {
    return this.#request("GET", "/v1/balance");
  }

  async #request<T>(
    method: "GET" | "POST",
    path: string,
    opts: { query?: Query; body?: unknown; auth?: boolean } = {},
  ): Promise<T> {
    const url = new URL(this.baseUrl + path);
    for (const [key, value] of Object.entries(opts.query ?? {})) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
    const headers: Record<string, string> = { accept: "application/json" };
    if (opts.auth !== false) {
      if (!this.#token) {
        throw new LoootError(401, "missing_token", `${method} ${path} needs a token: set LOOOT_TOKEN or pass { token }`, undefined, null);
      }
      headers.authorization = `Bearer ${this.#token}`;
    }
    if (opts.body !== undefined) headers["content-type"] = "application/json";

    const res = await this.#fetch(url, {
      method,
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
      signal: AbortSignal.timeout(this.#timeoutMs),
    });
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    if (!res.ok) {
      const err = (data as { error?: { code?: string; message?: string; requestId?: string } } | null)?.error;
      throw new LoootError(
        res.status,
        err?.code ?? `http_${res.status}`,
        err?.message ?? `${method} ${path} failed with HTTP ${res.status}`,
        err?.requestId,
        data,
      );
    }
    return data as T;
  }
}
