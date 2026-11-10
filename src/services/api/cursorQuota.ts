import type { CursorQuotaData, CursorQuotaWindow, CursorSpend } from '@/types';
import { isRecord } from '@/utils/helpers';

export const CURSOR_DASHBOARD_URL = 'https://api2.cursor.sh/aiserver.v1.DashboardService';

export const CURSOR_REQUEST_HEADERS = {
  Authorization: 'Bearer $TOKEN$',
  'Content-Type': 'application/json',
  'Connect-Protocol-Version': '1',
};

const asRecord = (value: unknown): Record<string, unknown> => (isRecord(value) ? value : {});

const parseJson = (payload: unknown): Record<string, unknown> | null => {
  if (typeof payload !== 'string') return isRecord(payload) ? payload : null;
  try {
    const parsed: unknown = JSON.parse(payload);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Connect JSON sends int64 fields as strings and the other numbers as numbers. */
const parseNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};

const parseRemainingPercent = (usedPercent: unknown): number | null => {
  const used = parseNumber(usedPercent);
  if (used === null) return null;
  return Number((100 - Math.min(100, Math.max(0, used))).toFixed(1));
};

const parseSpend = (used: unknown, limit: unknown): CursorSpend | null => {
  const usedCents = parseNumber(used);
  const limitCents = parseNumber(limit);
  if (usedCents === null || limitCents === null || limitCents <= 0) return null;
  return { usedCents, limitCents };
};

/**
 * Reads GetCurrentPeriodUsage and GetPlanInfo responses. Only the fields that the quota card
 * shows are kept. Returns null when the usage response is not a usage object.
 */
export function parseCursorQuotaPayload(
  usagePayload: unknown,
  planPayload: unknown,
  observedAtMs: number
): CursorQuotaData | null {
  const usage = parseJson(usagePayload);
  if (!usage || !isRecord(usage.planUsage)) return null;
  const planUsage = usage.planUsage;
  const spendLimit = asRecord(usage.spendLimitUsage);
  const cycleStartMs = parseNumber(usage.billingCycleStart);
  const cycleEndMs = parseNumber(usage.billingCycleEnd);
  const periodHours =
    cycleStartMs !== null && cycleEndMs !== null ? (cycleEndMs - cycleStartMs) / 3_600_000 : 0;
  const window = (id: CursorQuotaWindow['id'], usedPercent: unknown): CursorQuotaWindow => ({
    id,
    remainingPercent: parseRemainingPercent(usedPercent),
    resetAtMs: cycleEndMs,
    periodHours,
  });
  const planName = asRecord(asRecord(parseJson(planPayload)).planInfo).planName;
  const individualLimit = parseNumber(spendLimit.individualLimit);
  const individualRemaining = parseNumber(spendLimit.individualRemaining);

  return {
    windows: [
      window('auto', planUsage.autoPercentUsed),
      window('api', planUsage.apiPercentUsed),
    ],
    observedAtMs,
    plan: typeof planName === 'string' && planName.trim() ? planName.trim() : null,
    onDemand:
      individualLimit !== null && individualRemaining !== null
        ? parseSpend(individualLimit - individualRemaining, individualLimit)
        : null,
    undocumented: {
      includedSpend: parseSpend(planUsage.includedSpend, planUsage.limit),
      totalRemainingPercent: parseRemainingPercent(planUsage.totalPercentUsed),
    },
    cycleEndMs,
  };
}
