/**
 * Domain: Settings version resolution
 *
 * Pure functions — NO Firebase imports, NO side effects.
 *
 * WHY versioned settings exist:
 *   Prices, deposit rates, due days, etc. change over time.
 *   Every sale stores the values AT the moment of sale.
 *   getSettingAt() lets us ask "what was the deposit rate at 14:23 on Thursday?"
 *   without scanning everything — we just find the latest version ≤ the timestamp.
 *
 * How versions are stored in Firestore:
 *   Collection: clients/{clientId}/settingVersions
 *   Document fields: { key, value, effectiveFrom (ISO string), changedBy, clientId }
 *   New version = new document. Never update in place.
 */

/** One version of a setting. */
export interface SettingVersion {
  key: string;
  value: boolean | number | string;
  /** ISO 8601 timestamp when this version became effective. */
  effectiveFrom: string;
  /** UID of the user who created this version. */
  changedBy: string;
  /** Optional free-text reason for the change. */
  changeReason?: string;
}

/**
 * Resolve the value of a setting at a specific point in time.
 *
 * Algorithm:
 *   1. Filter versions for this key.
 *   2. Filter those whose effectiveFrom ≤ atTimestamp.
 *   3. Sort by effectiveFrom descending.
 *   4. Take the first (most recent effective version).
 *   5. If none found, return the defaultValue.
 *
 * @param key The setting key (from the settings registry).
 * @param versions All version documents for this client (pre-fetched by the repository).
 * @param atTimestamp ISO timestamp of the point in time to query.
 * @param defaultValue Fallback when no version exists yet.
 * @returns The setting value valid at atTimestamp.
 */
export function getSettingAt(
  key: string,
  versions: readonly SettingVersion[],
  atTimestamp: string,
  defaultValue: boolean | number | string,
): boolean | number | string {
  const at = new Date(atTimestamp).getTime();

  const applicableVersions = versions
    .filter((v) => v.key === key && new Date(v.effectiveFrom).getTime() <= at)
    .sort(
      (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime(),
    );

  // The most recent version at or before atTimestamp
  return applicableVersions[0]?.value ?? defaultValue;
}

/**
 * Get the current (now) value of a setting.
 * Convenience wrapper around getSettingAt.
 */
export function getCurrentSetting(
  key: string,
  versions: readonly SettingVersion[],
  defaultValue: boolean | number | string,
): boolean | number | string {
  return getSettingAt(key, versions, new Date().toISOString(), defaultValue);
}

/**
 * Get the full version history for a single key, most recent first.
 * Used by the History button in the Settings UI.
 */
export function getVersionHistory(
  key: string,
  versions: readonly SettingVersion[],
): SettingVersion[] {
  return versions
    .filter((v) => v.key === key)
    .sort(
      (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime(),
    );
}

/**
 * Validate a proposed new setting version.
 *
 * @returns null if valid, or an error message string if invalid.
 */
export function validateNewVersion(
  key: string,
  newValue: boolean | number | string,
  currentValue: boolean | number | string | undefined,
  options: {
    min?: number;
    max?: number;
    warnThresholdPercent?: number;
  } = {},
): { error: string | null; warning: string | null } {
  // Integer bounds check
  if (typeof newValue === "number") {
    if (options.min !== undefined && newValue < options.min) {
      return {
        error: `Value cannot be less than ${options.min}.`,
        warning: null,
      };
    }
    if (options.max !== undefined && newValue > options.max) {
      return {
        error: `Value cannot be greater than ${options.max}.`,
        warning: null,
      };
    }
  }

  // Warn on large percentage changes
  let warning: string | null = null;
  if (
    typeof newValue === "number" &&
    typeof currentValue === "number" &&
    currentValue !== 0 &&
    options.warnThresholdPercent !== undefined
  ) {
    const changePct = Math.abs((newValue - currentValue) / currentValue) * 100;
    if (changePct >= options.warnThresholdPercent) {
      warning = `This changes "${key}" by ${changePct.toFixed(0)}%. Please confirm this is intentional.`;
    }
  }

  return { error: null, warning };
}

/**
 * Build a new SettingVersion object (to be saved to Firestore).
 * The caller is responsible for writing it.
 */
export function buildNewVersion(
  key: string,
  value: boolean | number | string,
  changedBy: string,
  effectiveFrom: Date,
  changeReason?: string,
): SettingVersion {
  return {
    key,
    value,
    effectiveFrom: effectiveFrom.toISOString(),
    changedBy,
    ...(changeReason ? { changeReason } : {}),
  };
}
