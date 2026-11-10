/**
 * Cursor quota data layer. React-free / SCSS-free.
 *
 * The CLIProxyAPI management api-call exchanges the stored Cursor API key for an access token
 * and puts it in place of $TOKEN$, so the browser never sees the key or the token.
 */

import type { TFunction } from 'i18next';
import type { AuthFileItem, CursorQuotaData, CursorQuotaState } from '@/types';
import { apiCallApi, getApiCallErrorMessage } from '@/services/api';
import {
  CURSOR_DASHBOARD_URL,
  CURSOR_REQUEST_HEADERS,
  parseCursorQuotaPayload,
} from '@/services/api/cursorQuota';
import { captureQuotaCacheGeneration, commitIfQuotaCacheCurrent } from '@/stores/useQuotaStore';
import { createStatusError, isDisabledAuthFile, resolveAuthProvider } from '@/utils/quota';
import { normalizeAuthIndex } from '@/utils/authIndex';
import type { QuotaProviderData } from '../types';

const requestDashboard = (authIndex: string, method: string) =>
  apiCallApi.request({
    authIndex,
    method: 'POST',
    url: `${CURSOR_DASHBOARD_URL}/${method}`,
    header: { ...CURSOR_REQUEST_HEADERS },
    data: '{}',
  });

const fetchCursorQuota = async (file: AuthFileItem, t: TFunction): Promise<CursorQuotaData> => {
  const authIndex = normalizeAuthIndex(file['auth_index'] ?? file.authIndex);
  if (!authIndex) {
    throw new Error(t('cursor_quota.missing_auth_index'));
  }

  const generation = captureQuotaCacheGeneration(file.name);
  const assertCurrent = () => {
    if (!commitIfQuotaCacheCurrent(generation, () => {})) {
      throw new Error(t('cursor_quota.stale_request'));
    }
  };

  const [usage, plan] = await Promise.all([
    requestDashboard(authIndex, 'GetCurrentPeriodUsage'),
    requestDashboard(authIndex, 'GetPlanInfo'),
  ]);
  assertCurrent();

  if (usage.statusCode < 200 || usage.statusCode >= 300) {
    throw createStatusError(getApiCallErrorMessage(usage), usage.statusCode);
  }

  const planBody = plan.statusCode >= 200 && plan.statusCode < 300 ? plan.body ?? plan.bodyText : null;
  const quota = parseCursorQuotaPayload(usage.body ?? usage.bodyText, planBody, Date.now());
  if (!quota) {
    throw new Error(t('cursor_quota.empty_data'));
  }
  return {
    ...quota,
    windows: quota.windows.map((window) => ({ ...window, label: t(`cursor_quota.${window.id}`) })),
  };
};

const emptyData = (): CursorQuotaData => ({
  windows: [],
  observedAtMs: null,
  plan: null,
  onDemand: null,
  cycleEndMs: null,
});

export const CURSOR_CONFIG: QuotaProviderData<CursorQuotaState, CursorQuotaData> = {
  type: 'cursor',
  i18nPrefix: 'cursor_quota',
  filterFn: (file) => resolveAuthProvider(file) === 'cursor' && !isDisabledAuthFile(file),
  fetchQuota: fetchCursorQuota,
  storeSelector: (state) => state.cursorQuota,
  storeSetter: 'setCursorQuota',
  buildLoadingState: () => ({ status: 'loading', ...emptyData() }),
  buildSuccessState: (data) => ({ status: 'success', ...data }),
  buildErrorState: (error, errorStatus) => ({
    status: 'error',
    ...emptyData(),
    error,
    errorStatus,
  }),
};
