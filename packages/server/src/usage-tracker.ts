import { execSync } from 'child_process';

const CACHE_TTL = 30_000; // 30秒キャッシュ

// ---- Rate limit types (from Anthropic OAuth usage API) ----

export interface RateLimitWindow {
  utilization: number;  // 0-100
  resetsAt: string;     // ISO timestamp
}

export interface ExtraUsage {
  isEnabled: boolean;
  monthlyLimit: number;
  usedCredits: number;
}

export interface UsageData {
  fiveHour: RateLimitWindow | null;
  sevenDay: RateLimitWindow | null;
  sevenDaySonnet: RateLimitWindow | null;
  sevenDayOpus: RateLimitWindow | null;
  extraUsage: ExtraUsage | null;
  // ccusage cost data
  cost: CostData | null;
}

export interface ModelBreakdown {
  modelName: string;
  cost: number;
}

export interface CostData {
  totalCostUsd: number;
  modelBreakdowns: ModelBreakdown[];
  month: string;
}

// ---- OAuth token retrieval ----

function getOAuthToken(): string | null {
  try {
    const raw = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w',
      { encoding: 'utf-8', timeout: 5000 },
    ).trim();
    const data = JSON.parse(raw);
    return data?.claudeAiOauth?.accessToken ?? null;
  } catch {
    return null;
  }
}

// ---- Anthropic usage API ----

interface RawWindow { utilization: number; resets_at: string }

function parseWindow(raw: RawWindow | null): RateLimitWindow | null {
  if (!raw) return null;
  return { utilization: raw.utilization, resetsAt: raw.resets_at };
}

async function fetchRateLimits(): Promise<Omit<UsageData, 'cost'>> {
  const token = getOAuthToken();
  if (!token) return { fiveHour: null, sevenDay: null, sevenDaySonnet: null, sevenDayOpus: null, extraUsage: null };

  const res = await fetch('https://api.anthropic.com/api/oauth/usage', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'anthropic-beta': 'oauth-2025-04-20',
      'Content-Type': 'application/json',
    },
  });

  if (!res.ok) throw new Error(`Usage API ${res.status}`);
  const body = await res.json() as Record<string, unknown>;

  return {
    fiveHour: parseWindow(body.five_hour as RawWindow | null),
    sevenDay: parseWindow(body.seven_day as RawWindow | null),
    sevenDaySonnet: parseWindow(body.seven_day_sonnet as RawWindow | null),
    sevenDayOpus: parseWindow(body.seven_day_opus as RawWindow | null),
    extraUsage: body.extra_usage ? {
      isEnabled: (body.extra_usage as Record<string, unknown>).is_enabled as boolean,
      monthlyLimit: (body.extra_usage as Record<string, unknown>).monthly_limit as number,
      usedCredits: (body.extra_usage as Record<string, unknown>).used_credits as number,
    } : null,
  };
}

// ---- ccusage cost data ----

async function fetchCostData(): Promise<CostData | null> {
  try {
    const { loadMonthlyUsageData } = await import('ccusage/data-loader');
    const monthly = await loadMonthlyUsageData();
    const current = monthly[0];
    if (!current) return null;
    return {
      totalCostUsd: current.totalCost ?? 0,
      modelBreakdowns: (current.modelBreakdowns ?? []).map((m: Record<string, unknown>) => ({
        modelName: String(m.modelName ?? ''),
        cost: Number(m.cost ?? 0),
      })),
      month: current.month ?? '',
    };
  } catch (err) {
    console.error('ccusage error:', err);
    return null;
  }
}

// ---- Cached getter ----

let cache: { data: UsageData; ts: number } | null = null;

export async function getUsage(): Promise<UsageData> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  const [rateLimits, cost] = await Promise.all([
    fetchRateLimits().catch(() => ({ fiveHour: null, sevenDay: null, sevenDaySonnet: null, sevenDayOpus: null, extraUsage: null })),
    fetchCostData().catch(() => null),
  ]);

  const data: UsageData = { ...rateLimits, cost };
  cache = { data, ts: Date.now() };
  return data;
}
