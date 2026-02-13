import { useState, useEffect } from 'react';

export interface RateLimitWindow {
  utilization: number;
  resetsAt: string;
}

export interface CostData {
  totalCostUsd: number;
  modelBreakdowns: { modelName: string; cost: number }[];
  month: string;
}

export interface UsageData {
  fiveHour: RateLimitWindow | null;
  sevenDay: RateLimitWindow | null;
  sevenDaySonnet: RateLimitWindow | null;
  sevenDayOpus: RateLimitWindow | null;
  cost: CostData | null;
}

export function useUsage(intervalMs = 30_000): UsageData | null {
  const [data, setData] = useState<UsageData | null>(null);

  useEffect(() => {
    let active = true;

    const fetchUsage = async () => {
      try {
        const res = await fetch('/api/usage');
        if (res.ok && active) setData(await res.json());
      } catch { /* ignore */ }
    };

    fetchUsage();
    const timer = setInterval(fetchUsage, intervalMs);
    return () => { active = false; clearInterval(timer); };
  }, [intervalMs]);

  return data;
}
