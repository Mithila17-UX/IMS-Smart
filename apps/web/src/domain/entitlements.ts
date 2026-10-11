/**
 * Domain: Entitlement resolution
 *
 * Pure functions — NO Firebase imports, NO side effects.
 * These functions are the single source of truth for "can this client do this?".
 * Used by:
 *   - EntitlementGuard (UI)
 *   - Cloud Functions (double-check before writes)
 *   - Unit tests (90%+ coverage required)
 */
import type { ModuleId } from "@/registry/modules";
import type { TileId } from "@/registry/tiles";
import type { ReportId } from "@/registry/reports";
import type { SettingsTabId } from "@/registry/settingsTabs";
import type { PresetDefinition } from "@/registry/presets";

/** Client status values. */
export type ClientStatus = "active" | "read_only" | "blocked";

/** The shape of the entitlements document stored in Firestore. */
export interface ClientEntitlements {
  status: ClientStatus;
  /** Free-text reason for non-active status (optional). */
  statusReason?: string;
  /** Free-text billing note visible only in the super admin console. */
  billingNote?: string;
  modules: Partial<Record<ModuleId, boolean>>;
  tiles: Partial<Record<TileId, boolean>>;
  reports: Partial<Record<ReportId, boolean>>;
  settingsTabs: Partial<Record<SettingsTabId, boolean>>;
  /** Maximum number of non-super-admin users allowed for this client. */
  maxUsers: number;
  /** ISO timestamp of when the entitlements were last changed. */
  updatedAt: string;
  /** UID of the super admin who last changed the entitlements. */
  updatedBy: string;
}

/** What kind of feature to check. */
export type EntitlementKind = "module" | "tile" | "report" | "settingsTab";

/**
 * Check whether a specific feature is enabled for a client.
 *
 * Rules (in order):
 *   1. Blocked clients → nothing is enabled.
 *   2. Read-only clients → reads are allowed; writes are not (caller responsibility).
 *      isEnabled() returns true for reads on read_only clients.
 *   3. The feature switch in entitlements must be explicitly true.
 *
 * @param entitlements The client's entitlements document.
 * @param kind The type of feature (module, tile, report, settingsTab).
 * @param id The feature's ID.
 * @returns true if the client can access this feature.
 */
export function isEnabled(
  entitlements: ClientEntitlements,
  kind: EntitlementKind,
  id: ModuleId | TileId | ReportId | SettingsTabId,
): boolean {
  // Blocked clients can't do anything
  if (entitlements.status === "blocked") return false;

  switch (kind) {
    case "module":
      return entitlements.modules[id as ModuleId] === true;
    case "tile":
      return entitlements.tiles[id as TileId] === true;
    case "report":
      return entitlements.reports[id as ReportId] === true;
    case "settingsTab":
      return entitlements.settingsTabs[id as SettingsTabId] === true;
    default:
      return false;
  }
}

/**
 * Check whether a client can write data (not just read).
 * Read-only clients can see everything but cannot create or update records.
 */
export function isWritable(entitlements: ClientEntitlements): boolean {
  return entitlements.status === "active";
}

/**
 * Check whether a client is completely blocked (no access at all).
 */
export function isBlocked(entitlements: ClientEntitlements): boolean {
  return entitlements.status === "blocked";
}

/**
 * Validate that all declared dependencies of a module are also enabled.
 *
 * The Super Admin console calls this before saving, and offers to enable missing ones.
 *
 * @param modules The current module switch map.
 * @param moduleId The module to validate.
 * @param allModules The full module registry (passed in to keep domain pure).
 * @returns Array of dependency moduleIds that are missing (empty = all satisfied).
 */
export function getMissingDependencies(
  modules: Partial<Record<ModuleId, boolean>>,
  moduleId: ModuleId,
  allModules: ReadonlyArray<{ id: ModuleId; dependencies: ModuleId[] }>,
): ModuleId[] {
  const def = allModules.find((m) => m.id === moduleId);
  if (!def) return [];

  return def.dependencies.filter((dep) => modules[dep] !== true);
}

/**
 * Special case: dayClose requires stock AND (liveOrders OR dailyEntry).
 * This cannot be expressed as a simple list of dependencies, so it is a named rule.
 *
 * @returns true if the dependency requirement for dayClose is satisfied.
 */
export function isDayCloseDependencySatisfied(
  modules: Partial<Record<ModuleId, boolean>>,
): boolean {
  return (
    modules["stock"] === true &&
    (modules["liveOrders"] === true || modules["dailyEntry"] === true)
  );
}

/**
 * Apply a preset's switches to an existing entitlements object.
 * The preset is applied as a base; the caller can then override individual switches.
 *
 * WHY: When the super admin creates a client from a preset, they pick the preset
 * and then adjust. This function merges the preset onto the entitlements.
 *
 * @param base The existing entitlements (typically empty/defaults for a new client).
 * @param preset The preset to apply.
 * @returns A new entitlements object with the preset applied (does not mutate base).
 */
export function applyPreset(
  base: ClientEntitlements,
  preset: PresetDefinition,
): ClientEntitlements {
  return {
    ...base,
    modules: { ...base.modules, ...preset.modules },
    tiles: { ...base.tiles, ...preset.tiles },
    reports: { ...base.reports, ...preset.reports },
    settingsTabs: { ...base.settingsTabs, ...preset.settingsTabs },
  };
}

/**
 * Build a default (empty) entitlements object for a new client.
 * All switches default to false; the super admin applies a preset or sets manually.
 */
export function makeDefaultEntitlements(
  createdBy: string,
): ClientEntitlements {
  return {
    status: "active",
    modules: {},
    tiles: {},
    reports: {},
    settingsTabs: {},
    maxUsers: 10,
    updatedAt: new Date().toISOString(),
    updatedBy: createdBy,
  };
}

/**
 * Get a human-readable status message for a non-active client.
 * Shown to users when they encounter access restrictions.
 */
export function getStatusMessage(
  entitlements: ClientEntitlements,
  featureName?: string,
): string {
  switch (entitlements.status) {
    case "blocked":
      return entitlements.statusReason
        ? `Access blocked: ${entitlements.statusReason}`
        : "Your account has been blocked. Please contact support.";
    case "read_only":
      return entitlements.statusReason
        ? `Account is in read-only mode: ${entitlements.statusReason}`
        : "Your account is in read-only mode. You can view data but cannot make changes.";
    case "active":
      return featureName
        ? `The "${featureName}" feature is not enabled for your account.`
        : "This feature is not enabled for your account.";
  }
}
