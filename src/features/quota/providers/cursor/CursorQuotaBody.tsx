import { useTranslation } from 'react-i18next';
import type { CursorQuotaState, CursorSpend } from '@/types';
import { useNow } from '@/hooks/useNow';
import { buildResetDisplay } from '@/utils/quota';
import { QuotaMeter } from '../../components/QuotaMeter';
import { QuotaResetLabel } from '../../components/QuotaResetLabel';
import { collectQuotaRowInstants, pickUrgentRowId } from '../../resetSchedule';
import type { QuotaBodyProps } from '../../types';

const formatSpend = (spend: CursorSpend, locale: string | undefined) => {
  const format = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
  return `${format.format(spend.usedCents / 100)} / ${format.format(spend.limitCents / 100)}`;
};

export function CursorQuotaBody({ quota, classes }: QuotaBodyProps<CursorQuotaState>) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const locale = i18n.resolvedLanguage;
  const urgentRow = pickUrgentRowId(collectQuotaRowInstants('cursor', quota), now);
  return (
    <>
      {(quota.plan || quota.onDemand) && (
        <div className={classes.codexPlan}>
          {quota.plan && (
            <span className={classes.codexPlanItem}>
              <span className={classes.codexPlanLabel}>{t('cursor_quota.plan_label')}</span>
              <span className={classes.codexPlanValue}>{quota.plan}</span>
            </span>
          )}
          {quota.onDemand && (
            <span className={classes.codexPlanItem}>
              <span className={classes.codexPlanLabel}>{t('cursor_quota.on_demand')}</span>
              <span className={classes.codexPlanValue}>{formatSpend(quota.onDemand, locale)}</span>
            </span>
          )}
        </div>
      )}
      {quota.windows.map((window, index) => {
        const reset = buildResetDisplay(null, window.resetAtMs, now, locale);
        const label = t(`cursor_quota.${window.id}`);
        return (
          <div key={window.id} className={classes.quotaRow}>
            <div className={classes.quotaRowHeader}>
              <span className={classes.quotaModel}>{label}</span>
              <div className={classes.quotaMeta}>
                <span className={classes.quotaPercent}>
                  {window.remainingPercent === null
                    ? t('cursor_quota.unavailable')
                    : `${window.remainingPercent}%`}
                </span>
                {reset ? (
                  <QuotaResetLabel
                    display={reset}
                    classes={classes}
                    soon={window.id === urgentRow}
                  />
                ) : (
                  <span className={classes.quotaReset}>{t('cursor_quota.reset_unknown')}</span>
                )}
              </div>
            </div>
            <div
              role={window.remainingPercent === null ? undefined : 'meter'}
              aria-label={window.remainingPercent === null ? undefined : label}
              aria-valuemin={window.remainingPercent === null ? undefined : 0}
              aria-valuemax={window.remainingPercent === null ? undefined : 100}
              aria-valuenow={window.remainingPercent ?? undefined}
            >
              <QuotaMeter percent={window.remainingPercent} classes={classes} index={index} />
            </div>
          </div>
        );
      })}
      {quota.undocumented.totalRemainingPercent !== null && (
        <div className={`${classes.quotaRowHeader} ${classes.quotaUndocumented}`}>
          <span className={classes.quotaModel}>{t('cursor_quota.total_undocumented')}</span>
          <div className={classes.quotaMeta}>
            <span className={classes.quotaPercent}>{quota.undocumented.totalRemainingPercent}%</span>
          </div>
        </div>
      )}
      {quota.undocumented.includedSpend && (
        <div className={`${classes.quotaRowHeader} ${classes.quotaUndocumented}`}>
          <span className={classes.quotaModel}>{t('cursor_quota.included_undocumented')}</span>
          <div className={classes.quotaMeta}>
            <span className={classes.quotaPercent}>
              {formatSpend(quota.undocumented.includedSpend, locale)}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
