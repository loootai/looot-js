// Request and response types for the looot REST API, written from the public OpenAPI
// (https://api.looot.ai/openapi.json) and the agent guide (https://api.looot.ai/llms-full.txt).
// Response objects stay open (`[key: string]: unknown`) because the gateway adds fields over time.

/** How providers are ordered inside a job. */
export type Prefer = "balanced" | "cheapest" | "reliable" | "fastest";

/** Whether an endpoint can run right now, needs the caller's own account, or has no key yet. */
export type Access = "runs_now" | "needs_your_account" | "coming_soon";

/** Lifecycle status of a run. */
export type RunStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "blocked"
  | "stopped"
  | "reconciliation_pending"
  | "pending_provider";

/** What a run found: a hit, a weak hit, nothing, an error, a rejected input, a skip, or still pending. */
export type RunOutcome = "hit" | "weak" | "miss" | "error" | "rejected" | "skipped" | "pending";

// ---------- catalog overview (free, no token) ----------

export interface OverviewParams {
  /** summary (default), platforms, jobs or full. full is large. */
  depth?: "summary" | "platforms" | "jobs" | "full";
  category?: string;
  platform?: string;
  /** Matching jobs for a word such as "email" or "phone", at most 25. */
  topic?: string;
}

export interface OverviewCounts {
  providerCount: number;
  endpointCount: number;
  runnableCount: number;
  /** Lowest price per call in USD, provider price plus platform fee. */
  cheapestPerCall: number | null;
  /** Lowest price per result in USD. Never compared with cheapestPerCall. */
  cheapestPerResult: number | null;
}

export interface OverviewJob extends OverviewCounts {
  /** The job id, e.g. people.email.verify. Run it with endpointId "job:<id>". */
  id: string;
  title: string;
  category?: string;
  platform?: string;
  [key: string]: unknown;
}

export interface OverviewPlatform extends OverviewCounts {
  id: string;
  title: string;
  jobCount: number;
  jobs?: OverviewJob[];
  [key: string]: unknown;
}

export interface OverviewCategory extends OverviewCounts {
  id: string;
  title: string;
  platformCount: number;
  jobCount: number;
  platforms?: OverviewPlatform[];
  [key: string]: unknown;
}

export interface CatalogOverview {
  revision: string;
  builtAt: string;
  totals?: {
    categories: number;
    platforms: number;
    jobs: number;
    providers: number;
    endpoints: number;
    runnableEndpoints: number;
  };
  categories?: OverviewCategory[];
  /** Present when `topic` was passed. */
  topic?: string;
  matchCount?: number;
  truncated?: boolean;
  jobs?: OverviewJob[];
  [key: string]: unknown;
}

// ---------- public catalog (free, no token) ----------

export interface PublicCatalogParams {
  q?: string;
  /** Job id with dots turned into underscores, e.g. people_email_verify. */
  capability?: string;
  category?: string;
  provider?: string;
  limit?: number;
  cursor?: string;
}

export interface PublicCatalogParameter {
  name: string;
  location: string;
  required: boolean;
  description?: string;
}

export interface PublicCatalogItem {
  catalogItemId: string;
  providerId: string;
  operationId: string;
  title: string;
  description: string;
  categories: string[];
  capabilities: string[];
  parameters: PublicCatalogParameter[];
  price: {
    state: string;
    amountMicros?: number | null;
    currency?: string;
    unit?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface PublicCatalogPage {
  items: PublicCatalogItem[];
  nextCursor: string | null;
  [key: string]: unknown;
}

// ---------- catalog search (token, free) ----------

export interface SearchParams {
  /** Plain words, e.g. "verify an email". Optional when a filter is set. */
  q?: string;
  limit?: number;
  offset?: number;
  category?: string;
  platform?: string;
  provider?: string;
  /** A job id, e.g. people.email.find. */
  capability?: string;
  keyless?: boolean;
  verified?: boolean;
  mock?: boolean;
  maxPriceMicros?: number;
  prefer?: Prefer;
}

export interface Works {
  rate: number | null;
  runs: number;
  p50Ms: number | null;
  thin: boolean;
  [key: string]: unknown;
}

export interface CatalogEndpoint {
  endpointId: string;
  provider?: string;
  name?: string;
  /** The job id the endpoint does. */
  capability?: string;
  category?: string;
  access?: Access;
  estimatedPrice?: number | string | null;
  priceBasis?: string;
  costPerSuccessUsd?: number | null;
  works?: Works;
  async?: boolean;
  job?: { id: string; title: string };
  [key: string]: unknown;
}

export interface SearchResult {
  query?: string;
  total?: number;
  endpoints: CatalogEndpoint[];
  nextOffset?: number | null;
  prefer?: Prefer;
  warnings?: unknown[];
  priceHint?: unknown;
  [key: string]: unknown;
}

// ---------- inspect (token, free) ----------

export interface InspectResult {
  endpoint: {
    id: string;
    capability?: string;
    price?: { estimateFormula?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  inputSchema?: Record<string, unknown>;
  usageHints?: Record<string, unknown>;
  [key: string]: unknown;
}

// ---------- runs (token, paid) ----------

export interface FallbackOptions {
  /** false turns fallback off, the same as omitting it. */
  enabled?: boolean;
  /** Dispatched attempts, 1 to 10, default 3. */
  maxAttempts?: number;
  /** Cap for the whole route in USD. Can only lower the default. */
  maxCostUsd?: number;
  /** Order of the job's other providers, default balanced. */
  prefer?: Prefer;
  /** Endpoint or provider ids never tried, at most 50. */
  exclude?: string[];
  /** Stop at the first empty answer, default false. */
  stopAtFirstMiss?: boolean;
}

export interface RunParams {
  /** A catalog endpoint id, or "job:<job id>" to let looot pick the provider. */
  endpointId: string;
  input: Record<string, unknown>;
  /** Same key and same body replays the original run. Generated when omitted. */
  idempotencyKey?: string;
  /** Seconds to wait inline, 0 to 60. Omitted means return queued at once. */
  wait?: number | boolean;
  fallback?: boolean | FallbackOptions;
  output?: Record<string, unknown>;
}

export interface RunError {
  code: string;
  message: string;
  requestId?: string;
  providerStatus?: number | null;
  whoseError?: "provider" | "gateway" | "customer";
  retryable?: boolean;
  retryHint?: string;
  [key: string]: unknown;
}

export interface RouteAttempt {
  n: number;
  endpointId: string;
  provider: string;
  outcome: RunOutcome;
  status: string;
  chargedUsd: number;
  ms: number;
  reason?: string;
  [key: string]: unknown;
}

export interface Run {
  runId: string;
  status: RunStatus;
  endpointId?: string;
  result?: unknown;
  normalized?: Record<string, unknown>;
  outcome?: RunOutcome;
  outcomeReason?: string;
  estimatedCost?: number;
  actualCost?: number | null;
  error?: RunError | null;
  replayed?: boolean;
  requestedJob?: Record<string, unknown>;
  route?: {
    servedBy?: string;
    outcome?: RunOutcome;
    chargedUsd?: number;
    capped?: boolean;
    attempts?: RouteAttempt[];
    skipped?: { endpointId: string; code: string; reason: string }[];
    summary?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface ListRunsParams {
  status?: RunStatus;
  /** A job id such as people.email.verify. */
  capability?: string;
  limit?: number;
  cursor?: string;
  includeResult?: boolean;
}

export interface RunList {
  runs?: Run[];
  nextCursor?: string | null;
  [key: string]: unknown;
}

export interface Attempt {
  providerId: string;
  status: string;
  costMicros?: number;
  [key: string]: unknown;
}

export interface AttemptList {
  attempts: Attempt[];
  [key: string]: unknown;
}

// ---------- balance (token, free) ----------

export interface Balance {
  available: number;
  reserved: number;
  topUpUrl?: string | null;
  topUpLink?: {
    minimumUsd: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
