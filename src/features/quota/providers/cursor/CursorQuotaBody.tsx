import { useTranslation } from 'react-i18next';
import type { CursorQuotaState, CursorSpend } from '@/types';
import { useNow } from '@/hooks/useNow';
import { buildResetDisplay } from '@/utils/quota';
import { QuotaResetLabel } from '../../components/QuotaResetLabel';
import type { QuotaBodyProps, QuotaClassMap } from '../../types';

const formatSpend = (spend: CursorSpend, locale: string | undefined) => {
  const format = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
  return `${format.format(spend.usedCents / 100)} / ${format.format(spend.limitCents / 100)}`;
};

const spendPercent = (spend: CursorSpend) => (100 * spend.usedCents) / spend.limitCents;

/** The Cursor dashboard fills its bars with the used share, so this bar does the same. */
function UsedBar({ percent, classes }: { percent: number; classes: QuotaClassMap }) {
  const width = Math.min(100, Math.max(0, percent));
  return (
    <div
      className={classes.quotaBar}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
    >
      <div
        className={`${classes.quotaBarFill} ${classes.quotaBarFillHigh}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

function UsageRow({
  label,
  value,
  percent,
  classes,
}: {
  label: string;
  value: string;
  percent: number | null;
  classes: QuotaClassMap;
}) {
  return (
    <div className={classes.quotaRow}>
      <div className={classes.quotaRowHeader}>
        <span className={classes.quotaModel}>{label}</span>
        <div className={classes.quotaMeta}>
          <span className={classes.quotaPercent}>{value}</span>
        </div>
      </div>
      {percent !== null && <UsedBar percent={percent} classes={classes} />}
    </div>
  );
}

export function CursorQuotaBody({ quota, classes }: QuotaBodyProps<CursorQuotaState>) {
  const { t, i18n } = useTranslation();
  const now = useNow();
  const locale = i18n.resolvedLanguage;
  const reset = buildResetDisplay(null, quota.cycleEndMs, now, locale);
  const { includedSpend, totalUsedPercent } = quota.undocumented;
  const usedText = (percent: number | null) =>
    percent === null
      ? t('cursor_quota.unavailable')
      : t('cursor_quota.used', { percent: Math.round(percent) });

  return (
    <>
      {(quota.plan || reset) && (
        <div className={classes.codexPlan}>
          {quota.plan && (
            <span className={classes.codexPlanItem}>
              <span className={classes.codexPlanLabel}>{t('cursor_quota.plan_label')}</span>
              <span className={classes.codexPlanValue}>
                {quota.planPrice ? `${quota.plan} ${quota.planPrice}` : quota.plan}
              </span>
            </span>
          )}
          {reset && (
            <span className={classes.codexPlanItem}>
              <span className={classes.codexPlanLabel}>{t('cursor_quota.resets')}</span>
              <QuotaResetLabel display={reset} classes={classes} />
            </span>
          )}
        </div>
      )}
      {quota.windows.map((window) => (
        <UsageRow
          key={window.id}
          label={t(`cursor_quota.${window.id}`)}
          value={usedText(window.usedPercent)}
          percent={window.usedPercent}
          classes={classes}
        />
      ))}
      {quota.onDemand && (
        <UsageRow
          label={t('cursor_quota.on_demand')}
          value={formatSpend(quota.onDemand, locale)}
          percent={spendPercent(quota.onDemand)}
          classes={classes}
        />
      )}
      {(totalUsedPercent !== null || includedSpend) && (
        <div className={classes.quotaUndocumented}>
          <div className={classes.quotaMessage}>{t('cursor_quota.undocumented_note')}</div>
          {totalUsedPercent !== null && (
            <div className={classes.quotaRowHeader}>
              <span className={classes.quotaModel}>{t('cursor_quota.total_undocumented')}</span>
              <div className={classes.quotaMeta}>
                <span className={classes.quotaPercent}>{usedText(totalUsedPercent)}</span>
              </div>
            </div>
          )}
          {includedSpend && (
            <div className={classes.quotaRowHeader}>
              <span className={classes.quotaModel}>
                {t('cursor_quota.included_undocumented')}
              </span>
              <div className={classes.quotaMeta}>
                <span className={classes.quotaPercent}>{formatSpend(includedSpend, locale)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
